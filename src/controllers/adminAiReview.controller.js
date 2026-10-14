'use strict';

const AiReviewService = require('../services/aiReview.service');
const AiReviewItemResource = require('../resources/aiReviewItem.resource');
const { success, actionSuccess, paginated, buildPaginationMeta } = require('../utils/response');

class AdminAiReviewController {
  /**
   * GET /api/admin/ai-review-items
   */
  static async listItems(req, res, next) {
    try {
      const result = await AiReviewService.listItems(req.query);
      const baseUrl = `${req.protocol}://${req.get('host')}/api/admin/ai-review-items`;
      const { meta, links } = buildPaginationMeta(result.total, result.page, result.limit, baseUrl);
      return paginated(res, AiReviewItemResource.collection(result.items), meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/ai-review-items/:aiReviewItem
   */
  static async showItem(req, res, next) {
    try {
      const item = await AiReviewService.getItem(req.params.aiReviewItem);
      return success(res, AiReviewItemResource.toArray(item));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/ai-review-items/:aiReviewItem/approve
   */
  static async approveItem(req, res, next) {
    try {
      const item = await AiReviewService.approveItem(
        req.params.aiReviewItem,
        req.user.id,
        req.body,
        req
      );
      return actionSuccess(res, 'AI review item approved successfully.', AiReviewItemResource.toArray(item));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/ai-review-items/:aiReviewItem/correct
   */
  static async correctItem(req, res, next) {
    try {
      const item = await AiReviewService.correctItem(
        req.params.aiReviewItem,
        req.user.id,
        req.body,
        req
      );
      return actionSuccess(res, 'AI review item corrected successfully.', AiReviewItemResource.toArray(item));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/ai-review-items/:aiReviewItem/reject
   */
  static async rejectItem(req, res, next) {
    try {
      const item = await AiReviewService.rejectItem(
        req.params.aiReviewItem,
        req.user.id,
        req.body,
        req
      );
      return actionSuccess(res, 'AI review item rejected successfully.', AiReviewItemResource.toArray(item));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminAiReviewController;
