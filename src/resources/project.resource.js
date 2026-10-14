const BaseResource = require('./base.resource');

class ProjectResource extends BaseResource {
  static toArray(item) {
    if (!item) return null;
    return {
      id: item.id,
      name: item.name,
      description: item.description || null,
      technologies: item.technologies || [],
      project_url: item.project_url || null,
      github_url: item.github_url || null,
      start_date: item.start_date || null,
      end_date: item.end_date || null,
      source: item.source || 'manual'
    };
  }
}

module.exports = ProjectResource;
