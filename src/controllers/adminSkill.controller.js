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
}

module.exports = AdminSkillController;
