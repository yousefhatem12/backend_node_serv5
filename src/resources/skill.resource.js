class SkillResource {
  /**
   * Transform skill model to response object
   */
  static toArray(skill) {
    if (!skill) return null;
    return {
      id: Number(skill.id),
      name: skill.name,
      normalized_name: skill.normalized_name,
      category: skill.category || (skill.skillCategory ? skill.skillCategory.name : null)
    };
  }

  /**
   * Transform skill model for taxonomy endpoints including aliases and category details
   */
  static toTaxonomyArray(skill) {
    if (!skill) return null;
    return {
      id: Number(skill.id),
      name: skill.name,
      normalized_name: skill.normalized_name,
      category: skill.category || (skill.skillCategory ? skill.skillCategory.name : null),
      skill_category_id: skill.skill_category_id ? Number(skill.skill_category_id) : null,
      is_verified: skill.is_verified !== undefined ? Boolean(skill.is_verified) : true,
      aliases: Array.isArray(skill.aliases)
        ? skill.aliases.map(a => ({
            id: Number(a.id),
            alias: a.alias,
            normalized_alias: a.normalized_alias
          }))
        : []
    };
  }

  /**
   * Transform collection of skills
   */
  static collection(skills) {
    if (!Array.isArray(skills)) return [];
    return skills.map(skill => this.toArray(skill));
  }

  /**
   * Transform collection of taxonomy skills
   */
  static taxonomyCollection(skills) {
    if (!Array.isArray(skills)) return [];
    return skills.map(skill => this.toTaxonomyArray(skill));
  }
}

module.exports = SkillResource;
