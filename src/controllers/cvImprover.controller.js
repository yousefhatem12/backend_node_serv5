'use strict';

const CvImproverService = require('../services/cvImprover.service');
const CvImprovementResource = require('../resources/cvImprovement.resource');
const { success, actionSuccess, paginated, buildPaginationMeta } = require('../utils/response');

class CvImproverController {
  /**
   * POST /api/candidate/cv-improvements/analyze
   */
  static async analyze(req, res, next) {
    try {
      const record = await CvImproverService.analyze({
        userId: req.user.id,
        jobPostId: req.body.job_post_id,
        targetRole: req.body.target_role
      });
      return actionSuccess(res, 'CV improvement analysis completed successfully.', CvImprovementResource.toArray(record), 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/candidate/cv-improvements/latest
   */
  static async getLatest(req, res, next) {
    try {
      const record = await CvImproverService.getLatest(req.user.id);
      return success(res, CvImprovementResource.toArray(record));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/candidate/cv-improvements
   */
  static async listHistory(req, res, next) {
    try {
      const result = await CvImproverService.list(req.user.id, req.query);
      const baseUrl = `${req.protocol}://${req.get('host')}/api/candidate/cv-improvements`;
      const { meta, links } = buildPaginationMeta(result.total, result.page, result.limit, baseUrl);
      return paginated(res, CvImprovementResource.collection(result.items), meta, links);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CvImproverController;
