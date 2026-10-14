class SkillAliasResource {
  /**
   * Transform skill alias model to response object
   */
  static toArray(alias) {
    if (!alias) return null;
    return {
      id: Number(alias.id),
      skill_id: Number(alias.skill_id),
      alias: alias.alias,
      normalized_alias: alias.normalized_alias
    };
  }

  /**
   * Transform collection of skill aliases
   */
  static collection(aliases) {
    if (!Array.isArray(aliases)) return [];
    return aliases.map(a => this.toArray(a));
  }
}

module.exports = SkillAliasResource;
