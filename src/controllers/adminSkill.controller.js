const skillService = require('../services/skill.service');
const SkillResource = require('../resources/skill.resource');
const SkillAliasResource = require('../resources/skillAlias.resource');
const { success } = require('../utils/response');

class AdminSkillController {
  /**
   * POST /api/admin/skills
   */
  static async createSkill(req, res, next) {
    try {
      const skill = await skillService.createSkill(req.body);
      return res.status(201).json({
        data: SkillResource.toArray(skill)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/admin/skills/:id
   */
  static async updateSkill(req, res, next) {
    try {
      const skill = await skillService.updateSkill(req.params.id, req.body);
      return success(res, SkillResource.toArray(skill));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/skills/:sourceSkillId/merge
   */
  static async mergeSkills(req, res, next) {
    try {
      const { target_skill_id } = req.body;
      const result = await skillService.mergeSkills(req.params.sourceSkillId, target_skill_id);
      return res.status(200).json({
        data: {
          id: Number(result.targetSkill.id),
          name: result.targetSkill.name
        },
        meta: {
          reassigned_candidate_skills: result.reassigned_candidate_skills,
          reassigned_job_skills: result.reassigned_job_skills
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/skills/:id/aliases
   */
  static async listAliases(req, res, next) {
    try {
      const aliases = await skillService.listAliases(req.params.id);
      return success(res, SkillAliasResource.collection(aliases));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/skills/:id/aliases
   */
  static async addAlias(req, res, next) {
    try {
      const alias = await skillService.addAlias(req.params.id, req.body.alias);
      return res.status(201).json({
        data: SkillAliasResource.toArray(alias)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/admin/skills/:id/aliases/:aliasId
   */
  static async updateAlias(req, res, next) {
    try {
      const alias = await skillService.updateAlias(req.params.id, req.params.aliasId, req.body.alias);
      return success(res, SkillAliasResource.toArray(alias));
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/admin/skills/:id/aliases/:aliasId
   */
  static async deleteAlias(req, res, next) {
    try {
      await skillService.deleteAlias(req.params.id, req.params.aliasId);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  // --- TAXONOMY CRUD ENDPOINTS ---

  /**
   * GET /admin/taxonomy/skills
   */
  static async listTaxonomySkills(req, res, next) {
    try {
      const result = await skillService.listTaxonomySkills(req.query);
      return res.status(200).json({
        status: 'success',
        data: SkillResource.taxonomyCollection(result.skills),
        taxonomy_summary: result.taxonomy_summary,
        meta: {
          current_page: result.page,
          per_page: result.limit,
          total: result.total,
          last_page: result.totalPages
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /admin/taxonomy/skills
   */
  static async createTaxonomySkill(req, res, next) {
    try {
      const result = await skillService.createTaxonomySkill(req.body);
      if (result.alias) {
        return res.status(201).json({
          status: 'success',
          message: 'Skill alias created successfully.',
          data: {
            alias: SkillAliasResource.toArray(result.alias),
            skill: SkillResource.toTaxonomyArray(result.skill)
          }
        });
      }

      return res.status(201).json({
        status: 'success',
        message: 'Canonical skill created successfully.',
        data: SkillResource.toTaxonomyArray(result)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /admin/taxonomy/skills/:id
   */
  static async updateTaxonomySkill(req, res, next) {
    try {
      const skill = await skillService.updateTaxonomySkill(req.params.id, req.body);
      return res.status(200).json({
        status: 'success',
        message: 'Taxonomy entry updated successfully.',
        data: SkillResource.toTaxonomyArray(skill)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /admin/taxonomy/skills/:id
   */
  static async deleteTaxonomySkill(req, res, next) {
    try {
      const permanent = req.query.permanent || (req.body && req.body.permanent);
      const result = await skillService.deleteTaxonomySkill(req.params.id, permanent);
      return res.status(200).json({
        status: 'success',
        message: result.permanent
          ? 'Taxonomy entry removed permanently.'
          : 'Taxonomy entry deactivated successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminSkillController;
