'use strict';

const ApplicationStrategyService = require('../services/applicationStrategy.service');
const ApplicationStrategyResource = require('../resources/applicationStrategy.resource');
const { success, actionSuccess, paginated, buildPaginationMeta } = require('../utils/response');

class ApplicationStrategyController {
  /**
   * POST /api/application-strategy/assess
   */
  static async assess(req, res, next) {
    try {
      const strategy = await ApplicationStrategyService.assess({
        userId: req.user.id,
        jobPostId: req.body.job_post_id
      });
      return actionSuccess(res, 'Application readiness strategy assessed successfully.', ApplicationStrategyResource.toArray(strategy), 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/application-strategy/:strategy
   */
  static async getAssessment(req, res, next) {
    try {
      const strategy = await ApplicationStrategyService.getAssessment(req.params.strategy, req.user.id);
      return success(res, ApplicationStrategyResource.toArray(strategy));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/application-strategy
   */
  static async listHistory(req, res, next) {
    try {
      const result = await ApplicationStrategyService.listHistory(req.user.id, req.query);
      const baseUrl = `${req.protocol}://${req.get('host')}/api/application-strategy`;
      const { meta, links } = buildPaginationMeta(result.total, result.page, result.limit, baseUrl);
      return paginated(res, ApplicationStrategyResource.collection(result.items), meta, links);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ApplicationStrategyController;
