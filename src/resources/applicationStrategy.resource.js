'use strict';

class ApplicationStrategyResource {
  static toArray(strategy) {
    if (!strategy) return null;

    return {
      id: Number(strategy.id),
      user_id: Number(strategy.user_id),
      job_post_id: Number(strategy.job_post_id),
      recommendation: strategy.recommendation,
      readiness_score: Number(strategy.readiness_score || 0),
      fit_level: strategy.fit_level,
      quick_wins: Array.isArray(strategy.quick_wins) ? strategy.quick_wins : [],
      blocker_gaps: Array.isArray(strategy.blocker_gaps) ? strategy.blocker_gaps : [],
      alternative_roles: Array.isArray(strategy.alternative_roles) ? strategy.alternative_roles : [],
      strategic_advice: strategy.strategic_advice || null,
      job: strategy.jobPost ? {
        id: Number(strategy.jobPost.id),
        title: strategy.jobPost.title,
        employment_type: strategy.jobPost.employment_type || null,
        work_mode: strategy.jobPost.work_mode || null,
        company: strategy.jobPost.company ? {
          id: Number(strategy.jobPost.company.id),
          name: strategy.jobPost.company.name,
          logo_url: strategy.jobPost.company.logo_url || null
        } : null
      } : null,
      created_at: strategy.created_at || strategy.createdAt,
      updated_at: strategy.updated_at || strategy.updatedAt
    };
  }

  static collection(strategies) {
    if (!Array.isArray(strategies)) return [];
    return strategies.map(s => this.toArray(s));
  }
}

module.exports = ApplicationStrategyResource;
