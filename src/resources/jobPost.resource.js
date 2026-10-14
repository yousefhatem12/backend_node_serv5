const CompanyResource = require('./company.resource');

class JobPostResource {
  /**
   * Transform JobPost model to response object matching API_README specifications
   */
  static toArray(job, options = {}) {
    if (!job) return null;

    const isSaved = options.isSaved !== undefined
      ? options.isSaved
      : Boolean(job.savedJobs && job.savedJobs.length > 0);

    const isExpired = job.isExpired
      ? job.isExpired()
      : Boolean(job.expires_at && new Date() > new Date(job.expires_at));

    // Separate required vs preferred skills
    const requiredSkills = [];
    const preferredSkills = [];

    if (Array.isArray(job.jobSkills)) {
      for (const js of job.jobSkills) {
        const item = {
          id: js.skill ? Number(js.skill.id) : Number(js.skill_id),
          name: js.skill ? js.skill.name : 'Unknown',
          importance: Number(js.importance),
          required_level: js.required_level || 'mid-level'
        };
        if (js.is_required) {
          requiredSkills.push(item);
        } else {
          preferredSkills.push(item);
        }
      }
    }

    const data = {
      id: Number(job.id),
      title: job.title,
      canonical_role: job.canonical_role || null,
      description: job.description,
      job_type: job.job_type,
      work_mode: job.work_mode,
      employment_type: job.employment_type,
      experience_level: job.experience_level,
      country: job.country || null,
      state: job.state || null,
      city: job.city || null,
      min_years_experience: job.min_years_experience !== null ? Number(job.min_years_experience) : 0,
      max_years_experience: job.max_years_experience !== null ? Number(job.max_years_experience) : null,
      salary_min: job.salary_min !== null ? Number(job.salary_min) : null,
      salary_max: job.salary_max !== null ? Number(job.salary_max) : null,
      salary_currency: job.salary_currency || 'EGP',
      source: job.source,
      source_url: job.source_url || null,
      application_method: job.application_method,
      external_apply_url: job.external_apply_url || null,
      published_at: job.published_at ? new Date(job.published_at).toISOString() : null,
      expires_at: job.expires_at ? new Date(job.expires_at).toISOString() : null,
      is_active: Boolean(job.is_active),
      is_expired: isExpired,
      is_saved: isSaved,
      company: job.company ? CompanyResource.toSummary(job.company) : null,
      required_skills: requiredSkills,
      preferred_skills: preferredSkills
    };

    if (options.match || job.match) {
      const m = options.match || job.match;
      data.match = {
        match_score: Number(m.match_score),
        match_level: m.match_level,
        matched_skills_count: Number(m.matched_skills_count || 0),
        missing_skills_count: Number(m.missing_skills_count || 0)
      };
    }

    return data;
  }

  /**
   * Transform collection of jobs
   */
  static collection(jobs, options = {}) {
    if (!Array.isArray(jobs)) return [];
    const savedJobIds = options.savedJobIds || new Set();
    return jobs.map(job => this.toArray(job, {
      isSaved: savedJobIds.has(Number(job.id)) || (job.savedJobs && job.savedJobs.length > 0)
    }));
  }
}

module.exports = JobPostResource;
