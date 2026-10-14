'use strict';

class JobMatchResource {
  /**
   * Transform JobMatch model to detailed explainable report JSON
   */
  static toArray(match) {
    if (!match) return null;

    let matchedSkills = match.matched_skills;
    if (typeof matchedSkills === 'string') {
      try { matchedSkills = JSON.parse(matchedSkills); } catch (_) { matchedSkills = []; }
    }
    let missingSkills = match.missing_skills;
    if (typeof missingSkills === 'string') {
      try { missingSkills = JSON.parse(missingSkills); } catch (_) { missingSkills = []; }
    }
    let gapAnalysis = match.gap_analysis;
    if (typeof gapAnalysis === 'string') {
      try { gapAnalysis = JSON.parse(gapAnalysis); } catch (_) { gapAnalysis = null; }
    }

    const data = {
      id: Number(match.id),
      user_id: Number(match.user_id),
      job_post_id: Number(match.job_post_id),
      match_score: Number(match.match_score),
      match_level: match.match_level,
      matched_skills_count: Number(match.matched_skills_count || 0),
      missing_skills_count: Number(match.missing_skills_count || 0),
      matched_skills: Array.isArray(matchedSkills) ? matchedSkills : [],
      missing_skills: Array.isArray(missingSkills) ? missingSkills : [],
      gap_analysis: gapAnalysis || {
        must_have_gaps: [],
        nice_to_have_gaps: [],
        experience_gap: null,
        recommendation_action: 'Assess requirements'
      },
      explanation: match.explanation || '',
      calculated_at: match.calculated_at ? new Date(match.calculated_at).toISOString() : null,
      is_stale: Boolean(match.is_stale)
    };

    if (match.jobPost) {
      data.job = {
        id: Number(match.jobPost.id),
        title: match.jobPost.title,
        company_id: Number(match.jobPost.company_id),
        company: match.jobPost.company ? {
          id: Number(match.jobPost.company.id),
          name: match.jobPost.company.name,
          logo_url: match.jobPost.company.logo_url || null
        } : null,
        work_mode: match.jobPost.work_mode,
        job_type: match.jobPost.job_type,
        experience_level: match.jobPost.experience_level
      };
    }

    if (match.user) {
      data.candidate = {
        id: Number(match.user.id),
        name: match.user.name,
        email: match.user.email
      };
    }

    return data;
  }

  /**
   * Concise summary format for embedding in job feeds
   */
  static toSummary(match) {
    if (!match) return null;

    return {
      match_score: Number(match.match_score),
      match_level: match.match_level,
      matched_skills_count: Number(match.matched_skills_count || 0),
      missing_skills_count: Number(match.missing_skills_count || 0)
    };
  }

  /**
   * Collection transform
   */
  static collection(matches) {
    if (!Array.isArray(matches)) return [];
    return matches.map(item => this.toArray(item));
  }
}

module.exports = JobMatchResource;
