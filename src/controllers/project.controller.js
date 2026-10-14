const candidateProfileService = require('../services/candidateProfile.service');
const ProjectResource = require('../resources/project.resource');
const { success } = require('../utils/response');

class ProjectController {
  /**
   * GET /api/candidate/projects
   */
  static async index(req, res, next) {
    try {
      const items = await candidateProfileService.listProjects(req.user.id);
      return success(res, ProjectResource.collection(items));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/candidate/projects
   */
  static async create(req, res, next) {
    try {
      const item = await candidateProfileService.createProject(req.user.id, req.body);
      return res.status(201).json({
        data: ProjectResource.toArray(item)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/candidate/projects/:id
   */
  static async show(req, res, next) {
    try {
      const item = await candidateProfileService.getProject(req.user.id, req.params.id);
      return success(res, ProjectResource.toArray(item));
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/candidate/projects/:id
   */
  static async update(req, res, next) {
    try {
      const item = await candidateProfileService.updateProject(req.user.id, req.params.id, req.body);
      return success(res, ProjectResource.toArray(item));
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/candidate/projects/:id
   */
  static async destroy(req, res, next) {
    try {
      await candidateProfileService.deleteProject(req.user.id, req.params.id);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProjectController;
