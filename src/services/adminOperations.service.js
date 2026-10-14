'use strict';

const db = require('../models');
const { Op, fn, col } = require('sequelize');
const { NotFoundError, ValidationError } = require('../utils/errors');
const AuditLogService = require('./auditLog.service');

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
