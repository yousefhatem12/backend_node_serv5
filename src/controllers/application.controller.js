const applicationService = require('../services/application.service');
const ApplicationResource = require('../resources/application.resource');
const { success, actionSuccess, paginated, buildPaginationMeta } = require('../utils/response');

class ApplicationController {
  /**
   * GET /api/applications
   */
  static async list(req, res, next) {
    try {
      const result = await applicationService.listApplications(req.user, req.query);
      const { meta, links } = buildPaginationMeta(
        result.count,
        result.page,
        result.perPage,
        `${req.protocol}://${req.get('host')}/api/applications`
      );
      return paginated(res, ApplicationResource.collection(result.rows), meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/applications/:application
   */
  static async show(req, res, next) {
    try {
      const application = await applicationService.getApplication(req.params.application, req.user);
      return success(res, ApplicationResource.toArray(application));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/applications (Candidate applies)
   */
  static async apply(req, res, next) {
    try {
      const application = await applicationService.apply(req.user.id, req.body);
      return res.status(201).json({
        status: 'success',
        message: 'Job application submitted successfully.',
        data: ApplicationResource.toActionPayload(application)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/applications/:application/status (Admin / Manager updates status)
   */
  static async updateStatus(req, res, next) {
    try {
      const application = await applicationService.updateStatus(
        req.params.application,
        req.user.id,
        req.body
      );
      return actionSuccess(res, 'Application status updated successfully.', {
        id: Number(application.id),
        status: application.status
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/applications/:application/withdraw (Candidate withdraws)
   */
  static async withdraw(req, res, next) {
    try {
      const application = await applicationService.withdraw(req.params.application, req.user.id);
      return actionSuccess(res, 'Application withdrawn successfully.', {
        id: Number(application.id),
        status: 'withdrawn'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/applications/:application/notes (Candidate personal tracker notes)
   */
  static async updateNotes(req, res, next) {
    try {
      const application = await applicationService.updateNotes(
        req.params.application,
        req.user.id,
        req.body.notes
      );
      return actionSuccess(res, 'Application notes updated successfully.', {
        id: Number(application.id),
        notes: application.notes
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ApplicationController;
