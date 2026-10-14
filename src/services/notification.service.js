const { Op } = require('sequelize');
const db = require('../models');
const { NotFoundError } = require('../utils/errors');

class NotificationService {
  /**
   * List notifications for a specific user with pagination and optional unread filter
   */
  async listNotifications(userId, query = {}) {
    const { unread_only, page = 1, per_page = 15 } = query;
    const where = { user_id: userId };

    if (unread_only === true || unread_only === 'true') {
      where.read_at = null;
    }

    const limit = Number(per_page);
    const offset = (Number(page) - 1) * limit;

    const { rows, count } = await db.Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit,
      offset
    });

    return {
      rows,
      count,
      page: Number(page),
      perPage: limit
    };
  }

  /**
   * Get unread notifications badge count
   */
  async getUnreadCount(userId) {
    const count = await db.Notification.count({
      where: {
        user_id: userId,
        read_at: null
      }
    });

    return { count };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(userId, notificationId) {
    const notification = await db.Notification.findByPk(notificationId);

    if (!notification || Number(notification.user_id) !== Number(userId)) {
      throw new NotFoundError('Notification not found.');
    }

    if (!notification.read_at) {
      notification.read_at = new Date();
      await notification.save();
    }

    return {
      id: Number(notification.id),
      read_at: notification.read_at ? new Date(notification.read_at).toISOString() : null
    };
  }

  /**
   * Mark all unread notifications for a user as read
   */
  async markAllAsRead(userId) {
    const [affectedCount] = await db.Notification.update(
      { read_at: new Date() },
      {
        where: {
          user_id: userId,
          read_at: null
        }
      }
    );

    return {
      updated_count: affectedCount
    };
  }

  /**
   * Create an in-app notification for a user
   */
  async createNotification(userId, data) {
    return db.Notification.create({
      user_id: userId,
      title: data.title,
      body: data.body,
      type: data.type || 'system',
      data: data.data || null,
      read_at: null
    });
  }

  /**
   * Admin Composer: Broadcast or targeted notification creation
   */
  async broadcastNotification(data) {
    const { target_type = 'all', user_ids = [], title, body, type = 'system_announcement', data: payload } = data;

    let targetUsers = [];

    if (target_type === 'all') {
      targetUsers = await db.User.findAll({
        attributes: ['id'],
        where: { is_active: true },
        raw: true
      });
    } else if (target_type === 'candidates') {
      targetUsers = await db.User.findAll({
        attributes: ['id'],
        where: { is_active: true, role: 'candidate' },
        raw: true
      });
    } else if (target_type === 'user_ids' && user_ids.length > 0) {
      targetUsers = await db.User.findAll({
        attributes: ['id'],
        where: { id: { [Op.in]: user_ids }, is_active: true },
        raw: true
      });
    }

    if (targetUsers.length === 0) {
      return {
        target_type,
        recipients_count: 0,
        title,
        type
      };
    }

    const now = new Date();
    const records = targetUsers.map(u => ({
      user_id: u.id,
      title,
      body,
      type,
      data: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null,
      read_at: null,
      created_at: now,
      updated_at: now
    }));

    await db.Notification.bulkCreate(records);

    return {
      target_type,
      recipients_count: records.length,
      title,
      type
    };
  }
}

module.exports = new NotificationService();
