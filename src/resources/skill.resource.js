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
   * Transform collection of skills
   */
  static collection(skills) {
    if (!Array.isArray(skills)) return [];
    return skills.map(skill => this.toArray(skill));
  }
}

module.exports = SkillResource;
