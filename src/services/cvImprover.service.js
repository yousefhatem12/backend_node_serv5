'use strict';

const db = require('../models');
const { NotFoundError } = require('../utils/errors');
const AiCvImproverService = require('./aiCvImprover.service');

class CvImproverService {
  /**
   * Run targeted CV and profile improvement analysis
   */
  static async analyze({ userId, jobPostId = null, targetRole = null }) {
    const candidateProfile = await db.CandidateProfile.findOne({
      where: { user_id: userId },
      include: [
        { model: db.Experience, as: 'experiences' },
        {
          model: db.CandidateSkill,
          as: 'candidateSkills',
          include: [{ model: db.Skill, as: 'skill' }]
        },
        { model: db.CareerPreference, as: 'careerPreference' }
      ]
    });

    let job = null;
    if (jobPostId) {
      job = await db.JobPost.findByPk(jobPostId, {
        include: [
          {
            model: db.JobSkill,
            as: 'jobSkills',
            include: [{ model: db.Skill, as: 'skill' }]
          }
        ]
      });
      if (!job) {
        throw new NotFoundError('Target job post not found.');
      }
    }

    // Get latest CV document & extraction
    let cvDocument = null;
    let cvText = '';
    if (candidateProfile) {
      cvDocument = await db.CvDocument.findOne({
        where: { candidate_profile_id: candidateProfile.id, status: 'completed' },
        include: [{ model: db.CvExtraction, as: 'extractions' }],
        order: [['version', 'DESC']]
      });

      if (cvDocument && Array.isArray(cvDocument.extractions) && cvDocument.extractions.length > 0) {
        cvText = cvDocument.extractions.map(e => e.raw_text || '').join('\n');
      }
    }

    const skills = (candidateProfile && candidateProfile.candidateSkills)
      ? candidateProfile.candidateSkills.map(cs => cs.skill).filter(Boolean)
      : [];

    const experiences = (candidateProfile && candidateProfile.experiences)
      ? candidateProfile.experiences
      : [];

    const jobSkills = (job && job.jobSkills)
      ? job.jobSkills.map(js => js.skill ? js.skill.name : null).filter(Boolean)
      : [];

    const resolvedRole = targetRole
      || (job ? job.title : null)
      || (candidateProfile && candidateProfile.careerPreference ? candidateProfile.careerPreference.target_role : null)
      || (candidateProfile ? candidateProfile.job_title : null)
      || 'Software Engineer';

    const analysis = await AiCvImproverService.analyze({
      profile: candidateProfile,
      experiences,
      skills,
      cvText,
      targetRole: resolvedRole,
      job: job ? { id: job.id, title: job.title, skills: jobSkills } : null
    });

    const record = await db.CvImprovementAnalysis.create({
      user_id: userId,
      cv_document_id: cvDocument ? cvDocument.id : null,
      job_post_id: job ? job.id : null,
      target_role: analysis.target_role,
      overall_score: analysis.overall_score,
      critical_issues: analysis.critical_issues,
      missing_keywords: analysis.missing_keywords,
      bullet_improvements: analysis.bullet_improvements,
      structural_tips: analysis.structural_tips
    });

    return record;
  }

  /**
   * Get latest CV improvement analysis for candidate
   */
  static async getLatest(userId) {
    const analysis = await db.CvImprovementAnalysis.findOne({
      where: { user_id: userId },
      include: [
        { model: db.JobPost, as: 'jobPost', attributes: ['id', 'title'] }
      ],
      order: [['created_at', 'DESC']]
    });

    if (!analysis) {
      throw new NotFoundError('No CV improvement analysis found. Please run an analysis first.');
    }

    return analysis;
  }

  /**
   * List CV improvement history
   */
  static async list(userId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.per_page || query.limit, 10) || 15));
    const offset = (page - 1) * limit;

    const { count, rows } = await db.CvImprovementAnalysis.findAndCountAll({
      where: { user_id: userId },
      include: [
        { model: db.JobPost, as: 'jobPost', attributes: ['id', 'title'] }
      ],
      order: [['created_at', 'DESC']],
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

module.exports = CvImproverService;
