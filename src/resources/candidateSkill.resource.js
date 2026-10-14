const SkillResource = require('./skill.resource');

class CandidateSkillResource {
  /**
   * Transform candidate skill model to response object
   */
  static toArray(candidateSkill) {
    if (!candidateSkill) return null;
    return {
      id: Number(candidateSkill.id),
      skill_id: Number(candidateSkill.skill_id),
      source: candidateSkill.source,
      proficiency_level: candidateSkill.proficiency_level,
      is_verified: candidateSkill.is_verified,
      skill: candidateSkill.skill ? SkillResource.toArray(candidateSkill.skill) : null
    };
  }

  /**
   * Transform collection of candidate skills
   */
  static collection(candidateSkills) {
    if (!Array.isArray(candidateSkills)) return [];
    return candidateSkills.map(cs => this.toArray(cs));
  }
}

module.exports = CandidateSkillResource;
