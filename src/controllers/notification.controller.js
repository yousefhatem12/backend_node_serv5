const notificationService = require('../services/notification.service');
const NotificationResource = require('../resources/notification.resource');
const { success, actionSuccess, paginated, buildPaginationMeta } = require('../utils/response');

class NotificationController {
  /**
   * GET /api/notifications
   */
  static async list(req, res, next) {
    try {
      const result = await notificationService.listNotifications(req.user.id, req.query);
      const { meta, links } = buildPaginationMeta(
        result.count,
        result.page,
        result.perPage,
        `${req.protocol}://${req.get('host')}/api/notifications`
      );
      return paginated(res, NotificationResource.collection(result.rows), meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/notifications/unread-count
   */
  static async unreadCount(req, res, next) {
    try {
      const result = await notificationService.getUnreadCount(req.user.id);
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/notifications/:notification/read
   */
  static async markAsRead(req, res, next) {
    try {
      const result = await notificationService.markAsRead(req.user.id, req.params.notification);
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/notifications/read-all
   */
  static async markAllAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user.id);
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/notifications/compose
   */
  static async adminCompose(req, res, next) {
    try {
      const result = await notificationService.broadcastNotification(req.body);
      return res.status(201).json({
        status: 'success',
        message: 'Notification(s) broadcasted successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = NotificationController;
