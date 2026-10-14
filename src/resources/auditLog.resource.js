'use strict';

class AuditLogResource {
  static toArray(log) {
    if (!log) return null;

    let oldValues = log.old_values;
    if (typeof oldValues === 'string') {
      try { oldValues = JSON.parse(oldValues); } catch (_) {}
    }

    let newValues = log.new_values;
    if (typeof newValues === 'string') {
      try { newValues = JSON.parse(newValues); } catch (_) {}
    }

    return {
      id: Number(log.id),
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id ? Number(log.entity_id) : null,
      source: log.source,
      actor: log.actor ? {
        id: Number(log.actor.id),
        name: log.actor.name
      } : null,
      old_values: oldValues || null,
      new_values: newValues || null,
      ip_address: log.ip_address || null,
      user_agent: log.user_agent || null,
      created_at: log.created_at || log.createdAt
    };
  }

  static collection(logs) {
    if (!Array.isArray(logs)) return [];
    return logs.map(l => this.toArray(l));
  }
}

module.exports = AuditLogResource;
