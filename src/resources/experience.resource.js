const BaseResource = require('./base.resource');

class ExperienceResource extends BaseResource {
  static toArray(item) {
    if (!item) return null;
    return {
      id: item.id,
      job_title: item.job_title,
      company_name: item.company_name,
      employment_type: item.employment_type || 'full-time',
      country: item.country || null,
      city: item.city || null,
      start_date: item.start_date,
      end_date: item.end_date || null,
      is_current: Boolean(item.is_current),
      description: item.description || null,
      technologies: item.technologies || [],
      source: item.source || 'manual'
    };
  }
}

module.exports = ExperienceResource;
