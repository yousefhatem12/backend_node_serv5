const candidateProfileService = require('../services/candidateProfile.service');
const ExperienceResource = require('../resources/experience.resource');
const { success } = require('../utils/response');

class ExperienceController {
  /**
   * GET /api/candidate/experiences
   */
  static async index(req, res, next) {
    try {
      const items = await candidateProfileService.listExperiences(req.user.id);
      return success(res, ExperienceResource.collection(items));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/candidate/experiences
   */
  static async create(req, res, next) {
    try {
      const item = await candidateProfileService.createExperience(req.user.id, req.body);
      return res.status(201).json({
        data: ExperienceResource.toArray(item)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/candidate/experiences/:id
   */
  static async show(req, res, next) {
    try {
      const item = await candidateProfileService.getExperience(req.user.id, req.params.id);
      return success(res, ExperienceResource.toArray(item));
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/candidate/experiences/:id
   */
  static async update(req, res, next) {
    try {
      const item = await candidateProfileService.updateExperience(req.user.id, req.params.id, req.body);
      return success(res, ExperienceResource.toArray(item));
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/candidate/experiences/:id
   */
  static async destroy(req, res, next) {
    try {
      await candidateProfileService.deleteExperience(req.user.id, req.params.id);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ExperienceController;
