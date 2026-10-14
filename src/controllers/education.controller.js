const candidateProfileService = require('../services/candidateProfile.service');
const EducationResource = require('../resources/education.resource');
const { success } = require('../utils/response');

class EducationController {
  /**
   * GET /api/candidate/educations
   */
  static async index(req, res, next) {
    try {
      const items = await candidateProfileService.listEducations(req.user.id);
      return success(res, EducationResource.collection(items));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/candidate/educations
   */
  static async create(req, res, next) {
    try {
      const item = await candidateProfileService.createEducation(req.user.id, req.body);
      return res.status(201).json({
        data: EducationResource.toArray(item)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/candidate/educations/:id
   */
  static async show(req, res, next) {
    try {
      const item = await candidateProfileService.getEducation(req.user.id, req.params.id);
      return success(res, EducationResource.toArray(item));
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/candidate/educations/:id
   */
  static async update(req, res, next) {
    try {
      const item = await candidateProfileService.updateEducation(req.user.id, req.params.id, req.body);
      return success(res, EducationResource.toArray(item));
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/candidate/educations/:id
   */
  static async destroy(req, res, next) {
    try {
      await candidateProfileService.deleteEducation(req.user.id, req.params.id);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

module.exports = EducationController;
