const path = require('path');
const fs = require('fs');
const db = require('../models');
const { NotFoundError, ValidationError, ForbiddenError, UnsupportedMediaTypeError } = require('../utils/errors');
const { t } = require('../utils/i18n');
const candidateProfileService = require('./candidateProfile.service');
const skillService = require('./skill.service');
const queueService = require('./queue/queue.service');

class CvService {
  /**
   * Upload CV file, increment version, and dispatch parsing job
   */
  async uploadCv(userId, file) {
    const profile = await candidateProfileService.getOrCreateProfile(userId);

    // Compute version: find max version for this candidate
    const maxVersion = await db.CvDocument.max('version', {
      where: { candidate_profile_id: profile.id }
    }) || 0;
    const newVersion = maxVersion + 1;

    // Mark previous documents as non-current
    await db.CvDocument.update(
      { is_current: false },
      { where: { candidate_profile_id: profile.id } }
    );

    // Create CV Document record
    const cvDocument = await db.CvDocument.create({
      candidate_profile_id: profile.id,
      original_filename: file.originalname,
      storage_path: file.path,
      mime_type: file.mimetype,
      file_size: file.size,
      version: newVersion,
      is_current: true,
      status: 'processing'
    });

    // Create initial extraction record
    const extraction = await db.CvExtraction.create({
      cv_document_id: cvDocument.id,
      attempt_number: 1,
      status: 'pending',
      started_at: new Date()
    });

    // Dispatch parsing job
    await queueService.dispatch('cv_parsing', {
      cvDocumentId: cvDocument.id,
      extractionId: extraction.id
    });

    // Reload with extractions
    return db.CvDocument.findByPk(cvDocument.id, {
      include: [{ model: db.CvExtraction, as: 'extractions' }]
    });
  }

  /**
   * Upload raw CV file without triggering parsing or AI extraction
   * Stores physical file directly and saves record/metadata
   */
  async uploadRawCv(userId, file) {
    let profile = await db.CandidateProfile.findOne({
      where: { user_id: userId }
    });
    if (!profile) {
      profile = await candidateProfileService.getOrCreateProfile(userId);
    }

    // Compute version: find max version for this candidate
    const maxVersion = await db.CvDocument.max('version', {
      where: { candidate_profile_id: profile.id }
    }) || 0;
    const newVersion = maxVersion + 1;

    // Mark previous documents as non-current
    await db.CvDocument.update(
      { is_current: false },
      { where: { candidate_profile_id: profile.id } }
    );

    // Create CV Document record without creating CvExtraction or queue job
    const cvDocument = await db.CvDocument.create({
      candidate_profile_id: profile.id,
      original_filename: file.originalname,
      storage_path: file.path,
      mime_type: file.mimetype,
      file_size: file.size,
      version: newVersion,
      is_current: true,
      status: 'completed',
      processed_at: new Date()
    });

    return cvDocument;
  }

  /**
   * Check extraction status and retrieved content
   */
  async getStatus(userId, cvDocumentId) {
    const profile = await candidateProfileService.getOrCreateProfile(userId);

    const doc = await db.CvDocument.findOne({
      where: {
        id: cvDocumentId,
        candidate_profile_id: profile.id
      },
      include: [
        {
          model: db.CvExtraction,
          as: 'extractions',
          order: [['attempt_number', 'DESC']]
        }
      ]
    });

    if (!doc) {
      throw new NotFoundError('CV document not found.');
    }

    return doc;
  }

  /**
   * List all uploaded CV versions for the candidate ordered by version DESC
   */
  async getHistory(userId) {
    const profile = await candidateProfileService.getOrCreateProfile(userId);

    return db.CvDocument.findAll({
      where: { candidate_profile_id: profile.id },
      order: [['version', 'DESC']]
    });
  }

  /**
   * Retry failed CV document parsing
   */
  async retryCv(userId, cvDocumentId) {
    const profile = await candidateProfileService.getOrCreateProfile(userId);

    const doc = await db.CvDocument.findOne({
      where: {
        id: cvDocumentId,
        candidate_profile_id: profile.id
      }
    });

    if (!doc) {
      throw new NotFoundError('CV document not found.');
    }

    const maxAttempt = await db.CvExtraction.max('attempt_number', {
      where: { cv_document_id: doc.id }
    }) || 1;

    const newExtraction = await db.CvExtraction.create({
      cv_document_id: doc.id,
      attempt_number: maxAttempt + 1,
      status: 'pending',
      started_at: new Date()
    });

    doc.status = 'processing';
    await doc.save();

    await queueService.dispatch('cv_parsing', {
      cvDocumentId: doc.id,
      extractionId: newExtraction.id
    });

    return doc;
  }

  /**
   * Validate candidate-reviewed extracted items and merge confirmed skills
   * and work experiences into candidate profile.
   */
  async verifyExtraction(userId, extractionId, { skills = [], experiences = [] }) {
    const profile = await candidateProfileService.getOrCreateProfile(userId);

    const extraction = await db.CvExtraction.findOne({
      where: { id: extractionId },
      include: [{ model: db.CvDocument, as: 'cvDocument' }]
    });

    if (!extraction || !extraction.cvDocument || extraction.cvDocument.candidate_profile_id !== profile.id) {
      throw new NotFoundError('CV extraction not found.');
    }

    // 1. Sync skills
    for (const item of skills) {
      if (item && item.name) {
        const candidateSkill = await skillService.addCandidateSkill(userId, {
          name: item.name,
          proficiency_level: item.proficiency_level || 'intermediate',
          source: 'cv'
        });
        candidateSkill.is_verified = true;
        await candidateSkill.save();
      }
    }

    // 2. Sync experiences
    for (const exp of experiences) {
      if (exp && exp.company_name && exp.title) {
        await db.Experience.create({
          candidate_profile_id: profile.id,
          company_name: exp.company_name,
          job_title: exp.title,
          start_date: exp.start_date,
          end_date: exp.end_date || null,
          is_current: !exp.end_date,
          description: exp.description || null,
          source: 'cv'
        });
      }
    }

    // Mark extraction as verified
    extraction.verified_at = new Date();
    await extraction.save();

    // Check and update profile completion
    profile.checkCompletion();
    await profile.save();

    return true;
  }

  /**
   * Retrieve and validate CV document for inline preview
   * Strict ownership check, physical file existence check, and PDF format verification
   */
  async getPreviewDocument(userId, cvDocumentId = null, locale = 'en') {
    let doc = null;

    if (!cvDocumentId || cvDocumentId === 'latest') {
      const profile = await db.CandidateProfile.findOne({
        where: { user_id: userId }
      });
      if (!profile) {
        throw new NotFoundError(t('cv.notFound', locale));
      }

      // First find active / current CV
      doc = await db.CvDocument.findOne({
        where: {
          candidate_profile_id: profile.id,
          is_current: true
        },
        include: [
          {
            model: db.CandidateProfile,
            as: 'candidateProfile',
            attributes: ['id', 'user_id']
          }
        ]
      });

      // Fallback to highest version / latest id
      if (!doc) {
        doc = await db.CvDocument.findOne({
          where: {
            candidate_profile_id: profile.id
          },
          order: [['version', 'DESC'], ['id', 'DESC']],
          include: [
            {
              model: db.CandidateProfile,
              as: 'candidateProfile',
              attributes: ['id', 'user_id']
            }
          ]
        });
      }
    } else {
      doc = await db.CvDocument.findByPk(cvDocumentId, {
        include: [
          {
            model: db.CandidateProfile,
            as: 'candidateProfile',
            attributes: ['id', 'user_id']
          }
        ]
      });
    }

    if (!doc) {
      throw new NotFoundError(t('cv.notFound', locale));
    }

    // Verify strict ownership: authenticated candidate must own this CV
    const ownerUserId = doc.candidateProfile ? Number(doc.candidateProfile.user_id) : null;
    if (ownerUserId !== Number(userId)) {
      throw new ForbiddenError(t('cv.forbidden', locale));
    }

    // Verify physical file exists in storage
    const resolvedPath = path.isAbsolute(doc.storage_path)
      ? doc.storage_path
      : path.resolve(process.cwd(), doc.storage_path);

    if (!fs.existsSync(resolvedPath)) {
      throw new NotFoundError(t('cv.fileNotFound', locale));
    }

    // Determine matching MIME type (application/pdf or matching document type)
    const originalExt = path.extname(doc.original_filename || '').toLowerCase();
    const storageExt = path.extname(doc.storage_path || '').toLowerCase();
    const ext = originalExt || storageExt;

    let mimeType = doc.mime_type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (ext === '.pdf') {
        mimeType = 'application/pdf';
      } else if (ext === '.docx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (ext === '.doc') {
        mimeType = 'application/msword';
      } else {
        mimeType = 'application/pdf';
      }
    }

    const fileSize = fs.existsSync(resolvedPath) ? fs.statSync(resolvedPath).size : doc.file_size;

    return {
      doc,
      filePath: resolvedPath,
      filename: doc.original_filename || (ext ? `cv${ext}` : 'cv.pdf'),
      mimeType,
      fileSize
    };
  }

  /**
   * Retrieve and validate any CV file (PDF, DOCX, DOC, etc.) for direct file return/download
   * Enforces strict candidate ownership and physical file existence
   */
  async getCvFile(userId, cvDocumentId = null, locale = 'en') {
    let doc = null;

    if (!cvDocumentId || cvDocumentId === 'latest') {
      const profile = await db.CandidateProfile.findOne({
        where: { user_id: userId }
      });
      if (!profile) {
        throw new NotFoundError(t('cv.notFound', locale));
      }

      // First find active / current CV
      doc = await db.CvDocument.findOne({
        where: {
          candidate_profile_id: profile.id,
          is_current: true
        },
        include: [
          {
            model: db.CandidateProfile,
            as: 'candidateProfile',
            attributes: ['id', 'user_id']
          }
        ]
      });

      // Fallback to highest version / latest id
      if (!doc) {
        doc = await db.CvDocument.findOne({
          where: {
            candidate_profile_id: profile.id
          },
          order: [['version', 'DESC'], ['id', 'DESC']],
          include: [
            {
              model: db.CandidateProfile,
              as: 'candidateProfile',
              attributes: ['id', 'user_id']
            }
          ]
        });
      }
    } else {
      doc = await db.CvDocument.findByPk(cvDocumentId, {
        include: [
          {
            model: db.CandidateProfile,
            as: 'candidateProfile',
            attributes: ['id', 'user_id']
          }
        ]
      });
    }

    if (!doc) {
      throw new NotFoundError(t('cv.notFound', locale));
    }

    // Verify strict ownership: authenticated candidate must own this CV
    const ownerUserId = doc.candidateProfile ? Number(doc.candidateProfile.user_id) : null;
    if (ownerUserId !== Number(userId)) {
      throw new ForbiddenError(t('cv.forbidden', locale));
    }

    // Verify physical file exists in storage
    const resolvedPath = path.isAbsolute(doc.storage_path)
      ? doc.storage_path
      : path.resolve(process.cwd(), doc.storage_path);

    if (!fs.existsSync(resolvedPath)) {
      throw new NotFoundError(t('cv.fileNotFound', locale));
    }

    const fileSize = fs.existsSync(resolvedPath) ? fs.statSync(resolvedPath).size : doc.file_size;

    return {
      doc,
      filePath: resolvedPath,
      filename: doc.original_filename || 'cv.pdf',
      mimeType: doc.mime_type || 'application/octet-stream',
      fileSize
    };
  }
}

module.exports = new CvService();
