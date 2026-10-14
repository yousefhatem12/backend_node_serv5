'use strict';

const db = require('../models');
const { NotFoundError } = require('../utils/errors');
const AiApplicationStrategyService = require('./aiApplicationStrategy.service');

class ApplicationStrategyService {
  /**
   * Assess candidate application readiness and generate strategic advice for a job post
   */
  static async assess({ userId, jobPostId }) {
    const candidateProfile = await db.CandidateProfile.findOne({
      where: { user_id: userId },
      include: [
        { model: db.Experience, as: 'experiences' },
        {
          model: db.CandidateSkill,
          as: 'candidateSkills',
          include: [{ model: db.Skill, as: 'skill' }]
        }
      ]
    });

    const job = await db.JobPost.findByPk(jobPostId, {
      include: [
        {
          model: db.JobSkill,
          as: 'jobSkills',
          include: [{ model: db.Skill, as: 'skill' }]
        },
        { model: db.Company, as: 'company' }
      ]
    });

    if (!job) {
      throw new NotFoundError('Target job post not found.');
    }

    const candidateSkills = (candidateProfile && candidateProfile.candidateSkills)
      ? candidateProfile.candidateSkills.map(cs => cs.skill).filter(Boolean)
      : [];

    const experiences = (candidateProfile && candidateProfile.experiences)
      ? candidateProfile.experiences
      : [];

    const assessment = await AiApplicationStrategyService.assess({
      profile: candidateProfile,
      candidateSkills,
      experiences,
      job
    });

    // Upsert application strategy record
    let strategy = await db.ApplicationStrategy.findOne({
      where: { user_id: userId, job_post_id: jobPostId }
    });

    if (strategy) {
      strategy.recommendation = assessment.recommendation;
      strategy.readiness_score = assessment.readiness_score;
      strategy.fit_level = assessment.fit_level;
      strategy.quick_wins = assessment.quick_wins;
      strategy.blocker_gaps = assessment.blocker_gaps;
      strategy.alternative_roles = assessment.alternative_roles;
      strategy.strategic_advice = assessment.strategic_advice;
      await strategy.save();
    } else {
      strategy = await db.ApplicationStrategy.create({
        user_id: userId,
        job_post_id: jobPostId,
        recommendation: assessment.recommendation,
        readiness_score: assessment.readiness_score,
        fit_level: assessment.fit_level,
        quick_wins: assessment.quick_wins,
        blocker_gaps: assessment.blocker_gaps,
        alternative_roles: assessment.alternative_roles,
        strategic_advice: assessment.strategic_advice
      });
    }

    return await db.ApplicationStrategy.findByPk(strategy.id, {
      include: [
        {
          model: db.JobPost,
          as: 'jobPost',
          attributes: ['id', 'title', 'employment_type', 'work_mode'],
          include: [{ model: db.Company, as: 'company', attributes: ['id', 'name', 'logo_url'] }]
        }
      ]
    });
  }

  /**
   * Get single application strategy assessment
   */
  static async getAssessment(strategyId, userId) {
    const strategy = await db.ApplicationStrategy.findOne({
      where: { id: strategyId, user_id: userId },
      include: [
        {
          model: db.JobPost,
          as: 'jobPost',
          attributes: ['id', 'title', 'employment_type', 'work_mode'],
          include: [{ model: db.Company, as: 'company', attributes: ['id', 'name', 'logo_url'] }]
        }
      ]
    });

    if (!strategy) {
      throw new NotFoundError('Application strategy assessment not found.');
    }

    return strategy;
  }

  /**
   * List candidate's assessment history
   */
  static async listHistory(userId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.per_page || query.limit, 10) || 15));
    const offset = (page - 1) * limit;

    const where = { user_id: userId };
    if (query.recommendation) {
      where.recommendation = query.recommendation;
    }
    if (query.fit_level) {
      where.fit_level = query.fit_level;
    }

    const { count, rows } = await db.ApplicationStrategy.findAndCountAll({
      where,
      include: [
        {
          model: db.JobPost,
          as: 'jobPost',
          attributes: ['id', 'title'],
          include: [{ model: db.Company, as: 'company', attributes: ['id', 'name'] }]
        }
      ],
      order: [['updated_at', 'DESC']],
      limit,
      offset
    });

    return {
      items: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }
}

module.exports = ApplicationStrategyService;
