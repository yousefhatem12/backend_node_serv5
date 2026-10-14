const { Op } = require('sequelize');
const db = require('../models');
const { NotFoundError, ValidationError } = require('../utils/errors');
const candidateProfileService = require('./candidateProfile.service');

class SkillService {
  /**
   * Search skills taxonomy with query keyword and alias resolution
   * @param {string} q
   */
  async search(q) {
    if (!q || typeof q !== 'string') return [];
    const query = q.trim();
    const normalized = query.toLowerCase();

    // 1. Search directly in canonical skills
    const directSkills = await db.Skill.findAll({
      where: {
        [Op.or]: [
          { normalized_name: { [Op.like]: `%${normalized}%` } },
          { name: { [Op.like]: `%${query}%` } }
        ]
      },
      include: [{ model: db.SkillCategory, as: 'skillCategory' }],
      limit: 25
    });

    // 2. Search in aliases and resolve to canonical skills
    const aliasMatches = await db.SkillAlias.findAll({
      where: {
        [Op.or]: [
          { normalized_alias: { [Op.like]: `%${normalized}%` } },
          { alias: { [Op.like]: `%${query}%` } }
        ]
      },
      include: [
        {
          model: db.Skill,
          as: 'skill',
          include: [{ model: db.SkillCategory, as: 'skillCategory' }]
        }
      ],
      limit: 25
    });

    // 3. Deduplicate by canonical skill ID
    const skillMap = new Map();
    for (const skill of directSkills) {
      skillMap.set(Number(skill.id), skill);
    }
    for (const match of aliasMatches) {
      if (match.skill && !skillMap.has(Number(match.skill.id))) {
        skillMap.set(Number(match.skill.id), match.skill);
      }
    }

    return Array.from(skillMap.values());
  }

  /**
   * Resolve or create canonical skill by name, resolving aliases if any
   */
  async findOrCreateByName(name, category = null, skillCategoryId = null) {
    const trimmed = name.trim();
    const normalized = trimmed.toLowerCase();

    // Check aliases first
    const alias = await db.SkillAlias.findOne({
      where: { normalized_alias: normalized },
      include: [{ model: db.Skill, as: 'skill' }]
    });

    if (alias && alias.skill) {
      return alias.skill;
    }

    // Check canonical skills
    let skill = await db.Skill.findOne({
      where: { normalized_name: normalized }
    });

    if (!skill) {
      skill = await db.Skill.create({
        name: trimmed,
        normalized_name: normalized,
        category: category || null,
        skill_category_id: skillCategoryId || null,
        is_verified: true
      });
    }

    return skill;
  }

  /**
   * List all skills attached to candidate profile
   */
  async getCandidateSkills(userId) {
    const profile = await candidateProfileService.getOrCreateProfile(userId);
    return db.CandidateSkill.findAll({
      where: { candidate_profile_id: profile.id },
      include: [{ model: db.Skill, as: 'skill' }],
      order: [['id', 'ASC']]
    });
  }

  /**
   * Attach a skill to candidate profile by skill name
   */
  async addCandidateSkill(userId, { name, proficiency_level = 'intermediate', source = 'manual' }) {
    const profile = await candidateProfileService.getOrCreateProfile(userId);
    const skill = await this.findOrCreateByName(name);

    let [candidateSkill, created] = await db.CandidateSkill.findOrCreate({
      where: {
        candidate_profile_id: profile.id,
        skill_id: skill.id
      },
      defaults: {
        candidate_profile_id: profile.id,
        skill_id: skill.id,
        source: source || 'manual',
        proficiency_level: proficiency_level || 'intermediate',
        is_verified: false
      }
    });

    if (!created && proficiency_level) {
      candidateSkill.proficiency_level = proficiency_level;
      await candidateSkill.save();
    }

    // Reload with associated skill
    return db.CandidateSkill.findByPk(candidateSkill.id, {
      include: [{ model: db.Skill, as: 'skill' }]
    });
  }

  /**
   * Remove a skill from candidate profile
   */
  async deleteCandidateSkill(userId, candidateSkillId) {
    const profile = await candidateProfileService.getOrCreateProfile(userId);
    const candidateSkill = await db.CandidateSkill.findOne({
      where: {
        id: candidateSkillId,
        candidate_profile_id: profile.id
      }
    });

    if (!candidateSkill) {
      throw new NotFoundError('Candidate skill not found.');
    }

    await candidateSkill.destroy();
  }

  // --- ADMIN OPERATIONS ---

  /**
   * Create new canonical skill in taxonomy
   */
  async createSkill({ name, skill_category_id = null, category = null }) {
    const trimmed = name.trim();
    const normalized = trimmed.toLowerCase();

    const existing = await db.Skill.findOne({
      where: { normalized_name: normalized }
    });

    if (existing) {
      throw new ValidationError('A skill with this name already exists.');
    }

    return db.Skill.create({
      name: trimmed,
      normalized_name: normalized,
      skill_category_id: skill_category_id || null,
      category: category || null,
      is_verified: true
    });
  }

  /**
   * Update canonical skill
   */
  async updateSkill(skillId, data) {
    const skill = await db.Skill.findByPk(skillId);
    if (!skill) {
      throw new NotFoundError('Skill not found.');
    }

    if (data.name) {
      const normalized = data.name.trim().toLowerCase();
      const existing = await db.Skill.findOne({
        where: {
          normalized_name: normalized,
          id: { [Op.ne]: skillId }
        }
      });
      if (existing) {
        throw new ValidationError('A skill with this name already exists.');
      }
      skill.name = data.name.trim();
      skill.normalized_name = normalized;
    }

    if (data.skill_category_id !== undefined) {
      skill.skill_category_id = data.skill_category_id;
    }
    if (data.category !== undefined) {
      skill.category = data.category;
    }

    await skill.save();
    return skill;
  }

  /**
   * Merge source skill into target skill
   */
  async mergeSkills(sourceSkillId, targetSkillId) {
    if (Number(sourceSkillId) === Number(targetSkillId)) {
      throw new ValidationError('Cannot merge a skill into itself.');
    }

    const sourceSkill = await db.Skill.findByPk(sourceSkillId);
    if (!sourceSkill) {
      throw new NotFoundError('Source skill not found.');
    }

    const targetSkill = await db.Skill.findByPk(targetSkillId);
    if (!targetSkill) {
      throw new NotFoundError('Target skill not found.');
    }

    let reassignedCandidateSkills = 0;

    await db.sequelize.transaction(async (t) => {
      // 1. Reassign candidate skills
      const candidateSkills = await db.CandidateSkill.findAll({
        where: { skill_id: sourceSkillId },
        transaction: t
      });

      for (const cs of candidateSkills) {
        const existingTarget = await db.CandidateSkill.findOne({
          where: {
            candidate_profile_id: cs.candidate_profile_id,
            skill_id: targetSkillId
          },
          transaction: t
        });

        if (existingTarget) {
          // Candidate already has target skill, remove duplicate source
          await cs.destroy({ transaction: t });
        } else {
          cs.skill_id = targetSkillId;
          await cs.save({ transaction: t });
          reassignedCandidateSkills++;
        }
      }

      // 2. Reassign any existing aliases from source to target
      await db.SkillAlias.update(
        { skill_id: targetSkillId },
        { where: { skill_id: sourceSkillId }, transaction: t }
      );

      // 3. Create alias from source skill's name pointing to target
      const existingAlias = await db.SkillAlias.findOne({
        where: { normalized_alias: sourceSkill.normalized_name },
        transaction: t
      });

      if (!existingAlias) {
        await db.SkillAlias.create({
          skill_id: targetSkillId,
          alias: sourceSkill.name,
          normalized_alias: sourceSkill.normalized_name
        }, { transaction: t });
      }

      // 4. Delete source skill
      await sourceSkill.destroy({ transaction: t });
    });

    return {
      targetSkill,
      reassigned_candidate_skills: reassignedCandidateSkills,
      reassigned_job_skills: 0
    };
  }

  // --- ADMIN ALIASES CRUD ---

  async listAliases(skillId) {
    const skill = await db.Skill.findByPk(skillId);
    if (!skill) {
      throw new NotFoundError('Skill not found.');
    }
    return db.SkillAlias.findAll({
      where: { skill_id: skillId },
      order: [['id', 'ASC']]
    });
  }

  async addAlias(skillId, aliasText) {
    const skill = await db.Skill.findByPk(skillId);
    if (!skill) {
      throw new NotFoundError('Skill not found.');
    }

    const trimmed = aliasText.trim();
    const normalized = trimmed.toLowerCase();

    const existing = await db.SkillAlias.findOne({
      where: { normalized_alias: normalized }
    });
    if (existing) {
      throw new ValidationError('Alias is already registered.');
    }

    return db.SkillAlias.create({
      skill_id: skillId,
      alias: trimmed,
      normalized_alias: normalized
    });
  }

  async updateAlias(skillId, aliasId, aliasText) {
    const alias = await db.SkillAlias.findOne({
      where: { id: aliasId, skill_id: skillId }
    });
    if (!alias) {
      throw new NotFoundError('Skill alias not found.');
    }

    const trimmed = aliasText.trim();
    const normalized = trimmed.toLowerCase();

    const existing = await db.SkillAlias.findOne({
      where: {
        normalized_alias: normalized,
        id: { [Op.ne]: aliasId }
      }
    });
    if (existing) {
      throw new ValidationError('Alias is already registered.');
    }

    alias.alias = trimmed;
    alias.normalized_alias = normalized;
    await alias.save();

    return alias;
  }

  async deleteAlias(skillId, aliasId) {
    const alias = await db.SkillAlias.findOne({
      where: { id: aliasId, skill_id: skillId }
    });
    if (!alias) {
      throw new NotFoundError('Skill alias not found.');
    }
    await alias.destroy();
  }

  // --- COMPLETE TAXONOMY MANAGEMENT ---

  /**
   * List canonical skills, categories, and aliases with pagination & search
   */
  async listTaxonomySkills(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.per_page || query.limit, 10) || 15));
    const offset = (page - 1) * limit;

    const where = {};

    const search = (query.search || query.q || '').trim();
    if (search) {
      const normalized = search.toLowerCase();
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { normalized_name: { [Op.like]: `%${normalized}%` } },
        { category: { [Op.like]: `%${search}%` } }
      ];
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.skill_category_id) {
      where.skill_category_id = query.skill_category_id;
    }

    if (query.is_verified !== undefined) {
      where.is_verified = query.is_verified === true || query.is_verified === 'true' || query.is_verified === '1';
    }

    const { count, rows } = await db.Skill.findAndCountAll({
      where,
      include: [
        { model: db.SkillCategory, as: 'skillCategory' },
        { model: db.SkillAlias, as: 'aliases' }
      ],
      order: [['id', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    let totalCategories = 0;
    let totalAliases = 0;
    try {
      if (db.SkillCategory) totalCategories = await db.SkillCategory.count();
      if (db.SkillAlias) totalAliases = await db.SkillAlias.count();
    } catch (_) {}

    return {
      skills: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 1,
      taxonomy_summary: {
        total_canonical_skills: count,
        total_categories: totalCategories,
        total_aliases: totalAliases
      }
    };
  }

  /**
   * Create a new canonical skill or alias
   */
  async createTaxonomySkill(payload) {
    // 1. Alias creation branch
    if (payload.type === 'alias' || (payload.alias && (payload.skill_id || payload.canonical_skill_id))) {
      const targetSkillId = payload.canonical_skill_id || payload.skill_id;
      const aliasRecord = await this.addAlias(targetSkillId, payload.alias);
      const skill = await db.Skill.findByPk(targetSkillId, {
        include: [
          { model: db.SkillCategory, as: 'skillCategory' },
          { model: db.SkillAlias, as: 'aliases' }
        ]
      });
      return {
        alias: aliasRecord,
        skill
      };
    }

    // 2. Canonical skill creation branch
    const name = (payload.name || '').trim();
    if (!name) {
      throw new ValidationError('Skill name is required.');
    }

    const normalized = name.toLowerCase();
    const existing = await db.Skill.findOne({ where: { normalized_name: normalized } });
    if (existing) {
      throw new ValidationError('A skill with this name already exists.');
    }

    const skill = await db.Skill.create({
      name,
      normalized_name: normalized,
      skill_category_id: payload.skill_category_id || null,
      category: payload.category || null,
      is_verified: payload.is_verified !== undefined ? Boolean(payload.is_verified) : true
    });

    // Add any provided initial aliases
    if (Array.isArray(payload.aliases) && payload.aliases.length > 0) {
      for (const aliasText of payload.aliases) {
        if (typeof aliasText === 'string' && aliasText.trim()) {
          try {
            await this.addAlias(skill.id, aliasText.trim());
          } catch (_) {}
        }
      }
    }

    return db.Skill.findByPk(skill.id, {
      include: [
        { model: db.SkillCategory, as: 'skillCategory' },
        { model: db.SkillAlias, as: 'aliases' }
      ]
    });
  }

  /**
   * Update skill details or map aliases
   */
  async updateTaxonomySkill(skillId, data) {
    const skill = await db.Skill.findByPk(skillId, {
      include: [
        { model: db.SkillCategory, as: 'skillCategory' },
        { model: db.SkillAlias, as: 'aliases' }
      ]
    });

    if (!skill) {
      throw new NotFoundError('Skill not found.');
    }

    if (data.name && data.name.trim() !== skill.name) {
      const normalized = data.name.trim().toLowerCase();
      const existing = await db.Skill.findOne({
        where: {
          normalized_name: normalized,
          id: { [Op.ne]: skillId }
        }
      });
      if (existing) {
        throw new ValidationError('A skill with this name already exists.');
      }
      skill.name = data.name.trim();
      skill.normalized_name = normalized;
    }

    if (data.category !== undefined) {
      skill.category = data.category;
    }

    if (data.skill_category_id !== undefined) {
      skill.skill_category_id = data.skill_category_id;
    }

    if (data.is_verified !== undefined) {
      skill.is_verified = Boolean(data.is_verified);
    } else if (data.is_active !== undefined) {
      skill.is_verified = Boolean(data.is_active);
    }

    await skill.save();

    // Map single alias if provided
    if (data.alias && typeof data.alias === 'string' && data.alias.trim()) {
      try {
        await this.addAlias(skill.id, data.alias.trim());
      } catch (_) {}
    }

    // Map list of aliases if provided
    if (Array.isArray(data.aliases)) {
      for (const aliasItem of data.aliases) {
        if (typeof aliasItem === 'string' && aliasItem.trim()) {
          try {
            await this.addAlias(skill.id, aliasItem.trim());
          } catch (_) {}
        }
      }
    }

    return db.Skill.findByPk(skill.id, {
      include: [
        { model: db.SkillCategory, as: 'skillCategory' },
        { model: db.SkillAlias, as: 'aliases' }
      ]
    });
  }

  /**
   * Deactivate or remove an incorrect taxonomy entry
   */
  async deleteTaxonomySkill(skillId, permanent = false) {
    const skill = await db.Skill.findByPk(skillId);
    if (!skill) {
      throw new NotFoundError('Skill not found.');
    }

    const isPermanent = permanent === true || permanent === 'true' || permanent === 1 || permanent === '1';

    if (isPermanent) {
      if (db.sequelize && typeof db.sequelize.transaction === 'function') {
        await db.sequelize.transaction(async (t) => {
          if (db.SkillAlias) {
            await db.SkillAlias.destroy({ where: { skill_id: skill.id }, transaction: t });
          }
          if (db.CandidateSkill) {
            await db.CandidateSkill.destroy({ where: { skill_id: skill.id }, transaction: t });
          }
          if (db.JobSkill) {
            await db.JobSkill.destroy({ where: { skill_id: skill.id }, transaction: t });
          }
          await skill.destroy({ transaction: t });
        });
      } else {
        await skill.destroy();
      }

      return {
        id: Number(skillId),
        name: skill.name,
        action: 'deleted',
        permanent: true
      };
    }

    // Deactivate
    skill.is_verified = false;
    await skill.save();

    return {
      id: Number(skill.id),
      name: skill.name,
      action: 'deactivated',
      is_verified: false
    };
  }
}

module.exports = new SkillService();
