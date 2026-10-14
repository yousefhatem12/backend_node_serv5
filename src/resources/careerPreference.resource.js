const BaseResource = require('./base.resource');

class CareerPreferenceResource extends BaseResource {
  static toArray(item) {
    if (!item) return null;
    return {
      id: item.id,
      target_role: item.target_role || null,
      job_type: item.job_type || 'full-time',
      work_mode: item.work_mode || 'remote',
      preferred_country: item.preferred_country || null,
      preferred_city: item.preferred_city || null,
      experience_level: item.experience_level || 'mid-level',
      career_goal: item.career_goal || null,
      open_to_relocation: Boolean(item.open_to_relocation),
      target_roles: item.target_roles || [],
      preferred_industries: item.preferred_industries || []
    };
  }
}

module.exports = CareerPreferenceResource;
