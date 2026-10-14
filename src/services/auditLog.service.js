'use strict';

const db = require('../models');
const { Op } = require('sequelize');

class AuditLogService {
  /**
   * Record administrative audit entry
   */
  static async logAction({
    actorId,
    action,
    entityType,
    entityId,
    source = 'admin_portal',
    oldValues = null,
    newValues = null,
    req = null
  }) {
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || null;
      userAgent = req.headers['user-agent'] ? req.headers['user-agent'].substring(0, 255) : null;
    }

    return await db.AuditLog.create({
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      source,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  /**
   * List audit logs with multi-factor filters
   */
  static async listLogs(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.per_page || query.limit, 10) || 15));
    const offset = (page - 1) * limit;

    const where = {};

    if (query.actor_id) {
      where.actor_id = query.actor_id;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.entity_type) {
      where.entity_type = query.entity_type;
    }
    if (query.entity_id) {
      where.entity_id = query.entity_id;
    }
    if (query.source) {
      where.source = query.source;
    }

    if (query.date_from || query.date_to) {
      where.created_at = {};
      if (query.date_from) where.created_at[Op.gte] = new Date(query.date_from);
      if (query.date_to) where.created_at[Op.lte] = new Date(query.date_to);
    }

    if (query.search) {
      where[Op.or] = [
        { action: { [Op.like]: `%${query.search}%` } },
        { entity_type: { [Op.like]: `%${query.search}%` } }
      ];
    }

    const { count, rows } = await db.AuditLog.findAndCountAll({
      where,
      include: [{ model: db.User, as: 'actor', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      logs: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }
}

module.exports = AuditLogService;
