const db = require('../models');
const { NotFoundError, ValidationError } = require('../utils/errors');
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
}

module.exports = new CvService();
