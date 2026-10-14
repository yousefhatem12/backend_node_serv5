'use strict';

const { Op } = require('sequelize');
const db = require('../models');
const MatchEngineService = require('./matchEngine.service');

class RecommendationService {
  /**
   * Get personalized job recommendations for candidate
   */
  static async getPersonalizedRecommendations(userId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page, 10) || 15));
    const minScore = query.min_score !== undefined ? parseFloat(query.min_score) : 30.0;

    // 1. Fetch candidate profile and saved job IDs
    let savedJobIds = new Set();
    const candidateProfile = await db.CandidateProfile.findOne({
      where: { user_id: userId },
      include: [{ model: db.CareerPreference, as: 'careerPreference' }]
    });

    if (candidateProfile) {
      const savedJobs = await db.SavedJob.findAll({
        where: { candidate_profile_id: candidateProfile.id },
        attributes: ['job_post_id']
      });
      savedJobIds = new Set(savedJobs.map(sj => Number(sj.job_post_id)));
    }

    // 3. Query active, non-expired jobs
    const now = new Date();
    const jobWhere = {
      is_active: true,
      [Op.or]: [
        { expires_at: null },
        { expires_at: { [Op.gt]: now } }
      ]
    };

    if (query.work_mode) jobWhere.work_mode = query.work_mode;
    if (query.job_type) jobWhere.job_type = query.job_type;
    if (query.employment_type) jobWhere.employment_type = query.employment_type;

    const candidateJobs = await db.JobPost.findAll({
      where: jobWhere,
      include: [
        { model: db.Company, as: 'company' },
        {
          model: db.JobSkill,
          as: 'jobSkills',
          include: [{ model: db.Skill, as: 'skill' }]
        }
      ],
      order: [['published_at', 'DESC']],
      limit: 100 // Pool size for candidate ranking
    });

    // 4. Calculate or retrieve match scores for candidates
    const matchPromises = candidateJobs.map(async (job) => {
      try {
        const match = await MatchEngineService.calculateMatch(userId, job.id);
        return { job, match };
      } catch (err) {
        return null;
      }
    });

    const evaluated = (await Promise.all(matchPromises)).filter(Boolean);

    // 5. Filter by minScore and sort descending by match_score
    const filtered = evaluated
      .filter(item => Number(item.match.match_score) >= minScore)
      .sort((a, b) => {
        const scoreDiff = Number(b.match.match_score) - Number(a.match.match_score);
        if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
        return new Date(b.job.published_at || 0) - new Date(a.job.published_at || 0);
      });

    // 6. Paginate results
    const total = filtered.length;
    const offset = (page - 1) * perPage;
    const paginatedItems = filtered.slice(offset, offset + perPage);

    return {
      items: paginatedItems,
      savedJobIds,
      pagination: {
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage) || 1
      }
    };
  }

  /**
   * Aggregate prioritized skill gaps across candidate's saved jobs and high-matching roles
   */
  static async getCandidateSkillGaps(userId) {
    // 1. Fetch user's candidate profile and saved jobs
    const candidateProfile = await db.CandidateProfile.findOne({
      where: { user_id: userId }
    });

    let targetJobIds = [];
    if (candidateProfile) {
      const savedJobs = await db.SavedJob.findAll({
        where: { candidate_profile_id: candidateProfile.id },
        attributes: ['job_post_id']
      });
      targetJobIds = savedJobs.map(sj => Number(sj.job_post_id));
    }

    // 2. Also fetch candidate's top matches
    const topMatches = await db.JobMatch.findAll({
      where: {
        user_id: userId,
        match_score: { [Op.gte]: 40.0 }
      },
      order: [['match_score', 'DESC']],
      limit: 15
    });

    topMatches.forEach(m => {
      if (!targetJobIds.includes(m.job_post_id)) {
        targetJobIds.push(m.job_post_id);
      }
    });

    // Ensure we calculate matches for target jobs
    const skillGapStats = new Map();
    let jobsAnalyzed = 0;

    for (const jobPostId of targetJobIds) {
      try {
        const match = await MatchEngineService.calculateMatch(userId, jobPostId);
        jobsAnalyzed++;

        let missingSkillsList = match.missing_skills;
        if (typeof missingSkillsList === 'string') {
          try { missingSkillsList = JSON.parse(missingSkillsList); } catch (_) { missingSkillsList = []; }
        }

        if (Array.isArray(missingSkillsList)) {
          missingSkillsList.forEach(skill => {
            const skillName = skill.name;
            const isReq = Boolean(skill.is_required);
            const imp = skill.importance || 3;

            if (!skillGapStats.has(skillName)) {
              skillGapStats.set(skillName, {
                id: skill.id || null,
                name: skillName,
                is_required: isReq,
                occurrences: 1,
                total_importance: imp,
                highest_importance: imp
              });
            } else {
              const existing = skillGapStats.get(skillName);
              existing.occurrences++;
              existing.total_importance += imp;
              existing.is_required = existing.is_required || isReq;
              existing.highest_importance = Math.max(existing.highest_importance, imp);
            }
          });
        }
      } catch (_) {}
    }

    // Rank missing skills by priority score = occurrences * (total_importance / occurrences)
    const rankedGaps = Array.from(skillGapStats.values()).map(g => {
      const avgImportance = Number((g.total_importance / g.occurrences).toFixed(1));
      const priorityScore = Number((g.occurrences * avgImportance).toFixed(1));
      return {
        id: g.id,
        name: g.name,
        is_required: g.is_required,
        frequency_count: g.occurrences,
        average_importance: avgImportance,
        priority_score: priorityScore
      };
    }).sort((a, b) => b.priority_score - a.priority_score);

    const mustHaveGaps = rankedGaps.filter(g => g.is_required);
    const niceToHaveGaps = rankedGaps.filter(g => !g.is_required);

    return {
      total_jobs_analyzed: jobsAnalyzed,
      total_unique_gaps: rankedGaps.length,
      top_gaps: rankedGaps.slice(0, 10),
      must_have_gaps: mustHaveGaps.slice(0, 5),
      nice_to_have_gaps: niceToHaveGaps.slice(0, 5),
      recommended_action: rankedGaps.length > 0
        ? `Focus your upcoming learning roadmap on ${rankedGaps.slice(0, 3).map(g => g.name).join(', ')} to increase your job competitiveness.`
        : 'No critical skill gaps identified. Your profile strongly matches target vacancies!'
    };
  }

  /**
   * Admin inspection of calculated matches
   */
  static async adminListMatches(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page, 10) || 15));
    const offset = (page - 1) * perPage;

    const where = {};
    if (query.user_id) where.user_id = query.user_id;
    if (query.job_post_id) where.job_post_id = query.job_post_id;
    if (query.match_level) where.match_level = query.match_level;

    const { count, rows } = await db.JobMatch.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: db.JobPost,
          as: 'jobPost',
          attributes: ['id', 'title', 'company_id'],
          include: [
            {
              model: db.Company,
              as: 'company',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      limit: perPage,
      offset,
      order: [['calculated_at', 'DESC']]
    });

    return {
      matches: rows,
      pagination: {
        total: count,
        page,
        per_page: perPage,
        total_pages: Math.ceil(count / perPage) || 1
      }
    };
  }
}

module.exports = RecommendationService;
