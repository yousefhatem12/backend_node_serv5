class CompanyResource {
  /**
   * Transform Company model to response object
   */
  static toArray(company) {
    if (!company) return null;
    const res = {
      id: Number(company.id),
      name: company.name,
      normalized_name: company.normalized_name,
      industry: company.industry || null,
      country: company.country || null,
      city: company.city || null,
      website_url: company.website_url || null,
      linkedin_url: company.linkedin_url || null,
      logo_url: company.logo_url || null,
      description: company.description || null,
      is_verified: Boolean(company.is_verified),
      is_active: Boolean(company.is_active)
    };

    if (company.job_posts_count !== undefined) {
      res.job_posts_count = Number(company.job_posts_count);
    } else if (company.jobPosts) {
      res.job_posts_count = company.jobPosts.length;
    }

    if (company.aliases) {
      res.aliases = company.aliases.map(a => ({
        id: Number(a.id),
        alias: a.alias,
        normalized_alias: a.normalized_alias
      }));
    }

    return res;
  }

  /**
   * Minimal format for nested job post company object
   */
  static toSummary(company) {
    if (!company) return null;
    return {
      id: Number(company.id),
      name: company.name,
      logo_url: company.logo_url || null,
      is_verified: Boolean(company.is_verified),
      is_active: Boolean(company.is_active)
    };
  }

  /**
   * Transform collection of companies
   */
  static collection(companies) {
    if (!Array.isArray(companies)) return [];
    return companies.map(c => this.toArray(c));
  }
}

module.exports = CompanyResource;
