const BaseResource = require('./base.resource');

class EducationResource extends BaseResource {
  static toArray(item) {
    if (!item) return null;
    return {
      id: item.id,
      institution: item.institution,
      degree: item.degree,
      field_of_study: item.field_of_study,
      education_level: item.education_level || 'bachelor',
      start_date: item.start_date,
      end_date: item.end_date || null,
      is_current: Boolean(item.is_current),
      grade: item.grade || null,
      description: item.description || null,
      source: item.source || 'manual'
    };
  }
}

module.exports = EducationResource;
