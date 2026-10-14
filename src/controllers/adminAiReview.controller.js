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
   * GET /api/admin/ai-review/queue
   * Retrieve low-confidence CV/job extractions or ambiguous skill mappings flagged for human review
   */
  static async getQueue(req, res, next) {
    try {
      const result = await AiReviewService.listQueue(req.query);
      const baseUrl = `${req.protocol}://${req.get('host')}/api/admin/ai-review/queue`;
      const { meta, links } = buildPaginationMeta(result.total, result.page, result.limit, baseUrl);
      return res.status(200).json({
        status: 'success',
        data: AiReviewItemResource.collection(result.items),
        queue_summary: result.queue_summary,
        meta,
        links
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/ai-review-items/:aiReviewItem
   * GET /api/admin/ai-review/:id
   */
  static async showItem(req, res, next) {
    try {
      const itemId = req.params.id || req.params.aiReviewItem;
      const item = await AiReviewService.getItem(itemId);
      return success(res, AiReviewItemResource.toArray(item));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/ai-review-items/:aiReviewItem/approve
   * POST /api/admin/ai-review/:id/approve
   */
  static async approveItem(req, res, next) {
    try {
      const itemId = req.params.id || req.params.aiReviewItem;
      const item = await AiReviewService.approveItem(
        itemId,
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
   * PATCH /api/admin/ai-review/:id/correct
   * POST /api/admin/ai-review/:id/correct
   */
  static async correctItem(req, res, next) {
    try {
      const itemId = req.params.id || req.params.aiReviewItem;
      const item = await AiReviewService.correctItem(
        itemId,
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
   * POST /api/admin/ai-review/:id/reject
   */
  static async rejectItem(req, res, next) {
    try {
      const itemId = req.params.id || req.params.aiReviewItem;
      const item = await AiReviewService.rejectItem(
        itemId,
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
