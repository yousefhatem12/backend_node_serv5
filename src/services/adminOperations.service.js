'use strict';

const db = require('../models');
const crypto = require('crypto');
const { Op, fn, col } = require('sequelize');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');
const AuditLogService = require('./auditLog.service');
const candidateProfileService = require('./candidateProfile.service');

class AdminOperationsService {
  /**
   * List platform users with filters, search, and pagination
   */
  static async listUsers(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.per_page || query.limit, 10) || 15));
    const offset = (page - 1) * limit;

    const where = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.is_active !== undefined) {
      if (typeof query.is_active === 'string') {
        where.is_active = query.is_active === 'true' || query.is_active === '1';
      } else {
        where.is_active = Boolean(query.is_active);
      }
    }

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: s } },
        { email: { [Op.like]: s } }
      ];
    }

    if (query.created_from || query.created_to) {
      where.created_at = {};
      if (query.created_from) where.created_at[Op.gte] = new Date(query.created_from);
      if (query.created_to) where.created_at[Op.lte] = new Date(query.created_to);
    }

    const { count, rows } = await db.User.findAndCountAll({
      where,
      include: [
        {
          model: db.CandidateProfile,
          as: 'candidateProfile',
          attributes: ['id', 'job_title', 'country', 'city', 'years_of_experience', 'profile_completed_at']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      users: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Get single user with profile and relevant associations
   */
  static async getUser(userId) {
    const user = await db.User.findByPk(userId, {
      include: [
        {
          model: db.CandidateProfile,
          as: 'candidateProfile',
          include: [
            {
              model: db.Application,
              as: 'applications',
              attributes: ['id', 'status', 'created_at']
            }
          ]
        }
      ]
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    return user;
  }

  /**
   * Create a new platform user directly from admin dashboard
   */
  static async createUser(payload, actorId, req = null) {
    const name = (payload.name || payload.full_name || '').trim();
    const email = (payload.email || '').trim().toLowerCase();

    if (!name || !email) {
      throw new ValidationError('Name and email are required.', {
        name: !name ? ['The name field is required.'] : [],
        email: !email ? ['The email field is required.'] : []
      });
    }

    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      throw new ValidationError('The email has already been taken.', {
        email: ['The email has already been taken.']
      });
    }

    let role = 'candidate';
    if (payload.role) {
      const lower = String(payload.role).trim().toLowerCase();
      if (lower.includes('admin') && lower.includes('super')) {
        role = 'super_admin';
      } else if (lower.includes('admin')) {
        role = 'admin';
      } else if (lower.includes('candidate')) {
        role = 'candidate';
      }
    }

    // Auto-generate random secure password if omitted by admin form
    const password = payload.password || `SkillMatch@${crypto.randomBytes(4).toString('hex')}!`;
    const isActive = payload.is_active !== undefined ? Boolean(payload.is_active) : true;

    const user = await db.User.create({
      name,
      email,
      password,
      role,
      phone: payload.phone || null,
      is_active: isActive,
      email_verified_at: new Date()
    });

    if (role === 'candidate') {
      await candidateProfileService.getOrCreateProfile(user.id);
    }

    await AuditLogService.logAction({
      actorId,
      action: 'user.created',
      entityType: 'User',
      entityId: user.id,
      source: 'admin_portal',
      newValues: {
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active
      },
      req
    });

    return user;
  }

  /**
   * Update active status of a user (moderation: suspend / activate)
   */
  static async updateUserStatus(userId, actorId, payload, req = null) {
    const user = await db.User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    if (Number(userId) === Number(actorId)) {
      throw new ValidationError('Cannot change your own active status.');
    }

    const newStatus = Boolean(payload.is_active);
    const oldStatus = Boolean(user.is_active);

    if (newStatus === oldStatus) {
      return user;
    }

    user.is_active = newStatus;
    await user.save();

    await AuditLogService.logAction({
      actorId,
      action: newStatus ? 'user.activated' : 'user.suspended',
      entityType: 'User',
      entityId: user.id,
      source: 'admin_portal',
      oldValues: { is_active: oldStatus },
      newValues: { is_active: newStatus },
      req
    });

    return user;
  }

  /**
   * Update user role (e.g. promote to admin or demote)
   */
  static async updateUserRole(userId, actorId, payload, req = null) {
    const user = await db.User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    if (Number(userId) === Number(actorId)) {
      throw new ValidationError('Cannot change your own role.');
    }

    const { role } = payload;
    const allowedRoles = ['candidate', 'admin', 'super_admin'];
    if (!allowedRoles.includes(role)) {
      throw new ValidationError(`Invalid role: ${role}. Must be one of: ${allowedRoles.join(', ')}`);
    }

    const oldRole = user.role;
    if (oldRole === role) {
      return user;
    }

    user.role = role;
    await user.save();

    await AuditLogService.logAction({
      actorId,
      action: 'user.role_updated',
      entityType: 'User',
      entityId: user.id,
      source: 'admin_portal',
      oldValues: { role: oldRole },
      newValues: { role },
      req
    });

    return user;
  }

  /**
   * Update full user details (name, email, role, is_active, phone, password)
   */
  static async updateUser(userId, actorId, payload, req = null) {
    const user = await db.User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const oldValues = {
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    };

    const newValues = {};

    // 1. Update Name
    if (payload.name || payload.full_name) {
      const name = (payload.name || payload.full_name).trim();
      if (name && name !== user.name) {
        user.name = name;
        newValues.name = name;
      }
    }

    // 2. Update Email (if changed)
    if (payload.email) {
      const email = payload.email.trim().toLowerCase();
      if (email !== user.email.toLowerCase()) {
        const existing = await db.User.findOne({
          where: {
            email,
            id: { [Op.ne]: user.id }
          }
        });
        if (existing) {
          throw new ValidationError('The email has already been taken.', {
            email: ['The email has already been taken.']
          });
        }
        user.email = email;
        newValues.email = email;
      }
    }

    // 3. Update Role (if provided)
    if (payload.role) {
      let role = String(payload.role).trim().toLowerCase();
      if (role.includes('admin') && role.includes('super')) {
        role = 'super_admin';
      } else if (role.includes('admin')) {
        role = 'admin';
      } else if (role.includes('candidate')) {
        role = 'candidate';
      }

      const allowedRoles = ['candidate', 'admin', 'super_admin'];
      if (!allowedRoles.includes(role)) {
        throw new ValidationError(`Invalid role: ${role}. Must be one of: ${allowedRoles.join(', ')}`);
      }

      if (Number(userId) === Number(actorId) && role !== user.role) {
        throw new ValidationError('Cannot change your own role.');
      }

      if (user.role !== role) {
        user.role = role;
        newValues.role = role;
      }
    }

    // 4. Update Status (if provided)
    if (payload.is_active !== undefined) {
      const isActive = Boolean(payload.is_active);
      if (Number(userId) === Number(actorId) && isActive !== user.is_active) {
        throw new ValidationError('Cannot change your own active status.');
      }
      if (user.is_active !== isActive) {
        user.is_active = isActive;
        newValues.is_active = isActive;
      }
    }

    // 5. Update Phone
    if (payload.phone !== undefined) {
      user.phone = payload.phone;
      newValues.phone = payload.phone;
    }

    // 6. Update Password
    if (payload.password) {
      user.password = payload.password;
      newValues.password = '***UPDATED***';
    }

    await user.save();

    if (Object.keys(newValues).length > 0) {
      await AuditLogService.logAction({
        actorId,
        action: 'user.updated',
        entityType: 'User',
        entityId: user.id,
        source: 'admin_portal',
        oldValues,
        newValues,
        req
      });
    }

    return user;
  }

  /**
   * Delete user and associated records
   * Accessible by Admin and Super Admin
   */
  static async deleteUser(userId, actorId, req = null) {
    const user = await db.User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    if (Number(userId) === Number(actorId)) {
      throw new ValidationError('Cannot delete your own user account.');
    }

    if (user.role === 'super_admin') {
      const actor = actorId ? await db.User.findByPk(actorId) : null;
      if (actor && actor.role !== 'super_admin') {
        throw new ForbiddenError('Only a super_admin can delete a super_admin account.');
      }
    }

    const deletedUserData = {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: user.role
    };

    if (db.sequelize && typeof db.sequelize.transaction === 'function') {
      await db.sequelize.transaction(async (t) => {
        // 1. Delete candidate profile and related records
        if (db.CandidateProfile) {
          const profile = await db.CandidateProfile.findOne({ where: { user_id: user.id }, transaction: t });
          if (profile) {
            if (db.CandidateSkill) await db.CandidateSkill.destroy({ where: { candidate_profile_id: profile.id }, transaction: t });
            if (db.WorkExperience) await db.WorkExperience.destroy({ where: { candidate_profile_id: profile.id }, transaction: t });
            if (db.Education) await db.Education.destroy({ where: { candidate_profile_id: profile.id }, transaction: t });
            if (db.PortfolioItem) await db.PortfolioItem.destroy({ where: { candidate_profile_id: profile.id }, transaction: t });
            if (db.CareerPreference) await db.CareerPreference.destroy({ where: { candidate_profile_id: profile.id }, transaction: t });
            if (db.CvDocument) {
              const docs = await db.CvDocument.findAll({ where: { candidate_profile_id: profile.id }, transaction: t });
              const docIds = docs.map(d => d.id);
              if (docIds.length > 0 && db.CvExtraction) {
                await db.CvExtraction.destroy({ where: { cv_document_id: docIds }, transaction: t });
              }
              await db.CvDocument.destroy({ where: { candidate_profile_id: profile.id }, transaction: t });
            }
            await profile.destroy({ transaction: t });
          }
        }

        // 2. Delete user notifications, matches, applications, etc.
        if (db.Notification) await db.Notification.destroy({ where: { user_id: user.id }, transaction: t });
        if (db.JobMatch) await db.JobMatch.destroy({ where: { user_id: user.id }, transaction: t });
        if (db.SavedJob) await db.SavedJob.destroy({ where: { user_id: user.id }, transaction: t });
        if (db.JobApplication) await db.JobApplication.destroy({ where: { user_id: user.id }, transaction: t });
        if (db.Roadmap) await db.Roadmap.destroy({ where: { user_id: user.id }, transaction: t });
        if (db.MentorConversation) await db.MentorConversation.destroy({ where: { user_id: user.id }, transaction: t });
        if (db.InterviewPrepSession) await db.InterviewPrepSession.destroy({ where: { user_id: user.id }, transaction: t });
        if (db.ApplicationStrategy) await db.ApplicationStrategy.destroy({ where: { user_id: user.id }, transaction: t });
        if (db.CvImprovementAnalysis) await db.CvImprovementAnalysis.destroy({ where: { user_id: user.id }, transaction: t });

        // 3. Destroy user
        await user.destroy({ transaction: t });
      });
    } else {
      await user.destroy();
    }

    try {
      await AuditLogService.logAction({
        actorId,
        action: 'user.deleted',
        entityType: 'User',
        entityId: deletedUserData.id,
        source: 'admin_portal',
        oldValues: deletedUserData,
        newValues: null,
        req
      });
    } catch (_) {}

    return deletedUserData;
  }

  /**
   * Platform statistics and operational overview
   */
  static async getStatistics() {
    // 1. Users
    const totalUsers = await db.User.count();
    const activeUsers = await db.User.count({ where: { is_active: true } });
    const usersByRole = await db.User.findAll({
      attributes: ['role', [fn('COUNT', col('id')), 'count']],
      group: ['role'],
      raw: true
    });
    const roleCounts = { candidate: 0, admin: 0, super_admin: 0 };
    for (const r of usersByRole) {
      roleCounts[r.role] = parseInt(r.count, 10);
    }

    // 2. Candidates
    const totalCandidateProfiles = await db.CandidateProfile.count();
    const completedCandidateProfiles = await db.CandidateProfile.count({
      where: { profile_completed_at: { [Op.ne]: null } }
    });

    // 3. Companies
    const totalCompanies = await db.Company.count();
    const verifiedCompanies = await db.Company.count({ where: { is_verified: true } });

    // 4. Jobs
    const totalJobs = await db.JobPost.count();
    const activeJobs = await db.JobPost.count({ where: { is_active: true } });

    // 5. Applications
    const totalApplications = await db.Application.count();
    const applicationsByStatus = await db.Application.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true
    });
    const appStatusCounts = {
      submitted: 0,
      under_review: 0,
      shortlisted: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0
    };
    for (const a of applicationsByStatus) {
      appStatusCounts[a.status] = parseInt(a.count, 10);
    }

    // 6. AI Review Queue
    const totalAiReviews = await db.AiReviewItem.count();
    const pendingAiReviews = await db.AiReviewItem.count({ where: { status: 'pending' } });
    const approvedAiReviews = await db.AiReviewItem.count({ where: { status: 'approved' } });
    const correctedAiReviews = await db.AiReviewItem.count({ where: { status: 'corrected' } });
    const rejectedAiReviews = await db.AiReviewItem.count({ where: { status: 'rejected' } });

    const avgConfidenceRaw = await db.AiReviewItem.findAll({
      attributes: [[fn('AVG', col('confidence')), 'avg_confidence']],
      raw: true
    });
    const avgConfidence = avgConfidenceRaw[0] && avgConfidenceRaw[0].avg_confidence
      ? Number(parseFloat(avgConfidenceRaw[0].avg_confidence).toFixed(2))
      : 0;

    // 7. Top Requested Skills
    const topSkillsRaw = await db.JobSkill.findAll({
      attributes: ['skill_id', [fn('COUNT', col('id')), 'demand_count']],
      group: ['skill_id'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: 10,
      raw: true
    });

    const skillIds = topSkillsRaw.map(item => item.skill_id);
    const skillsMap = {};
    if (skillIds.length > 0) {
      const skills = await db.Skill.findAll({
        where: { id: { [Op.in]: skillIds } },
        attributes: ['id', 'name'],
        raw: true
      });
      for (const s of skills) {
        skillsMap[s.id] = s.name;
      }
    }

    const topSkills = topSkillsRaw.map(item => ({
      skill_id: Number(item.skill_id),
      name: skillsMap[item.skill_id] || null,
      demand_count: parseInt(item.demand_count, 10)
    }));


    // 8. Sources Health
    const totalSources = await db.JobSource.count();
    const activeSources = await db.JobSource.count({ where: { is_active: true } });
    const totalRuns = await db.IngestionRun.count();
    const successfulRuns = await db.IngestionRun.count({ where: { status: 'completed' } });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        by_role: roleCounts
      },
      candidates: {
        total_profiles: totalCandidateProfiles,
        completed_profiles: completedCandidateProfiles
      },
      companies: {
        total: totalCompanies,
        verified: verifiedCompanies
      },
      jobs: {
        total: totalJobs,
        active: activeJobs
      },
      applications: {
        total: totalApplications,
        by_status: appStatusCounts
      },
      ai_review_queue: {
        total: totalAiReviews,
        pending: pendingAiReviews,
        approved: approvedAiReviews,
        corrected: correctedAiReviews,
        rejected: rejectedAiReviews,
        average_confidence: avgConfidence
      },
      top_requested_skills: topSkills,
      sources_health: {
        total_sources: totalSources,
        active_sources: activeSources,
        total_runs: totalRuns,
        successful_runs: successfulRuns
      }
    };
  }
}

module.exports = AdminOperationsService;
