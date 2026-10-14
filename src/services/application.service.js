const { Op } = require('sequelize');
const db = require('../models');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');
const candidateProfileService = require('./candidateProfile.service');

class ApplicationService {
  /**
   * List applications (Candidate sees their own, Admin sees all)
   */
  async listApplications(user, query = {}) {
    const { status, search, page = 1, per_page = 15 } = query;
    const where = {};

    if (user.role === 'candidate') {
      const profile = await candidateProfileService.getOrCreateProfile(user.id);
      where.candidate_profile_id = profile.id;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      const trimmed = search.trim();
      const matchingJobs = await db.JobPost.findAll({
        attributes: ['id'],
        where: {
          [Op.or]: [
            { title: { [Op.like]: `%${trimmed}%` } },
            { canonical_role: { [Op.like]: `%${trimmed}%` } }
          ]
        },
        raw: true
      });
      const jobIds = matchingJobs.map(j => j.id);
      where.job_post_id = { [Op.in]: jobIds.length > 0 ? jobIds : [0] };
    }

    const limit = Number(per_page);
    const offset = (Number(page) - 1) * limit;

    const { rows, count } = await db.Application.findAndCountAll({
      where,
      include: [
        {
          model: db.JobPost,
          as: 'job',
          include: [{ model: db.Company, as: 'company' }]
        },
        {
          model: db.CandidateProfile,
          as: 'candidateProfile',
          include: [{ model: db.User, as: 'user', attributes: ['id', 'name', 'email'] }]
        },
        {
          model: db.CvDocument,
          as: 'cvDocument'
        },
        {
          model: db.ApplicationStatusHistory,
          as: 'histories',
          include: [{ model: db.User, as: 'changedByUser', attributes: ['id', 'name'] }]
        }
      ],
      order: [['applied_at', 'DESC'], ['id', 'DESC']],
      distinct: true,
      limit,
      offset
    });

    return {
      rows,
      count,
      page: Number(page),
      perPage: limit
    };
  }

  /**
   * Get single application details with ownership check
   */
  async getApplication(applicationId, user) {
    const application = await db.Application.findByPk(applicationId, {
      include: [
        {
          model: db.JobPost,
          as: 'job',
          include: [{ model: db.Company, as: 'company' }]
        },
        {
          model: db.CandidateProfile,
          as: 'candidateProfile',
          include: [{ model: db.User, as: 'user', attributes: ['id', 'name', 'email'] }]
        },
        {
          model: db.CvDocument,
          as: 'cvDocument'
        },
        {
          model: db.ApplicationStatusHistory,
          as: 'histories',
          include: [{ model: db.User, as: 'changedByUser', attributes: ['id', 'name'] }]
        }
      ]
    });

    if (!application) {
      throw new NotFoundError('Job application not found.');
    }

    if (user.role === 'candidate') {
      const profile = await candidateProfileService.getOrCreateProfile(user.id);
      if (Number(application.candidate_profile_id) !== Number(profile.id)) {
        throw new NotFoundError('Job application not found.');
      }
    }

    return application;
  }

  /**
   * Candidate submits job application
   */
  async apply(userId, data) {
    const profile = await candidateProfileService.getOrCreateProfile(userId);
    const { job_id, cover_letter, cv_document_id } = data;

    const job = await db.JobPost.findByPk(job_id);
    if (!job || !job.is_active || job.isExpired()) {
      throw new ValidationError('This job posting is no longer accepting applications.');
    }

    // Check duplicate
    const existing = await db.Application.findOne({
      where: {
        candidate_profile_id: profile.id,
        job_post_id: job.id
      }
    });

    if (existing) {
      throw new ValidationError('You have already applied for this position.');
    }

    // Determine CV Document
    let resolvedCvDocId = cv_document_id || null;
    if (resolvedCvDocId) {
      const cvDoc = await db.CvDocument.findOne({
        where: { id: resolvedCvDocId, candidate_profile_id: profile.id }
      });
      if (!cvDoc) {
        throw new ValidationError('The selected CV document does not belong to your profile.');
      }
    } else {
      const currentCv = await db.CvDocument.findOne({
        where: { candidate_profile_id: profile.id, is_current: true }
      });
      if (currentCv) {
        resolvedCvDocId = currentCv.id;
      }
    }

    let application;

    await db.sequelize.transaction(async (t) => {
      application = await db.Application.create(
        {
          candidate_profile_id: profile.id,
          job_post_id: job.id,
          cv_document_id: resolvedCvDocId,
          status: 'submitted',
          cover_letter: cover_letter || null,
          applied_at: new Date()
        },
        { transaction: t }
      );

      await db.ApplicationStatusHistory.create(
        {
          application_id: application.id,
          changed_by_user_id: userId,
          from_status: null,
          to_status: 'submitted',
          notes: 'Application submitted by candidate'
        },
        { transaction: t }
      );
    });

    return application;
  }

  /**
   * Admin / Manager updates application status
   */
  async updateStatus(applicationId, userId, data) {
    const application = await db.Application.findByPk(applicationId);
    if (!application) {
      throw new NotFoundError('Job application not found.');
    }

    if (application.status === 'withdrawn') {
      throw new ValidationError('Cannot change status of a withdrawn application.');
    }

    if (application.status === data.status) {
      throw new ValidationError(`Application is already in '${data.status}' status.`);
    }

    const oldStatus = application.status;
    application.status = data.status;

    await db.sequelize.transaction(async (t) => {
      await application.save({ transaction: t });

      await db.ApplicationStatusHistory.create(
        {
          application_id: application.id,
          changed_by_user_id: userId,
          from_status: oldStatus,
          to_status: data.status,
          notes: data.notes || null
        },
        { transaction: t }
      );
    });

    return application;
  }

  /**
   * Candidate self-withdraws application
   */
  async withdraw(applicationId, userId) {
    const profile = await candidateProfileService.getOrCreateProfile(userId);
    const application = await db.Application.findByPk(applicationId);

    if (!application || Number(application.candidate_profile_id) !== Number(profile.id)) {
      throw new NotFoundError('Job application not found.');
    }

    if (application.status === 'withdrawn') {
      throw new ValidationError('Application is already withdrawn.');
    }

    if (['offer', 'rejected'].includes(application.status)) {
      throw new ValidationError('Cannot withdraw an application that has reached a final stage.');
    }

    const oldStatus = application.status;
    application.status = 'withdrawn';

    await db.sequelize.transaction(async (t) => {
      await application.save({ transaction: t });

      await db.ApplicationStatusHistory.create(
        {
          application_id: application.id,
          changed_by_user_id: userId,
          from_status: oldStatus,
          to_status: 'withdrawn',
          notes: 'Application withdrawn by candidate'
        },
        { transaction: t }
      );
    });

    return application;
  }

  /**
   * Candidate updates application notes (Tracker personal notes)
   */
  async updateNotes(applicationId, userId, notes) {
    const profile = await candidateProfileService.getOrCreateProfile(userId);
    const application = await db.Application.findByPk(applicationId);

    if (!application || Number(application.candidate_profile_id) !== Number(profile.id)) {
      throw new NotFoundError('Job application not found.');
    }

    application.notes = notes;
    await application.save();

    return application;
  }
}

module.exports = new ApplicationService();
