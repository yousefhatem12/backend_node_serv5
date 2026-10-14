const skillService = require('../services/skill.service');
const SkillResource = require('../resources/skill.resource');
const CandidateSkillResource = require('../resources/candidateSkill.resource');
const { success } = require('../utils/response');

class SkillController {
  /**
   * GET /api/skills/search?q=...
   */
  static async search(req, res, next) {
    try {
      const q = req.query.q || '';
      const items = await skillService.search(q);
      return success(res, SkillResource.collection(items));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/candidate/skills
   */
  static async listCandidateSkills(req, res, next) {
    try {
      const items = await skillService.getCandidateSkills(req.user.id);
      return success(res, CandidateSkillResource.collection(items));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/candidate/skills
   */
  static async addCandidateSkill(req, res, next) {
    try {
      const item = await skillService.addCandidateSkill(req.user.id, req.body);
      return res.status(201).json({
        data: CandidateSkillResource.toArray(item)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/candidate/skills/:id
   */
  static async deleteCandidateSkill(req, res, next) {
    try {
      await skillService.deleteCandidateSkill(req.user.id, req.params.id);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SkillController;
