'use strict';

const db = require('../models');
const { Op } = require('sequelize');
const { NotFoundError, ValidationError } = require('../utils/errors');
const AuditLogService = require('./auditLog.service');

class AiReviewService {
  /**
   * List AI review items with filters and pagination
   */
  static async listItems(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.per_page || query.limit, 10) || 15));
    const offset = (page - 1) * limit;

    const where = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.entity_type) {
      where.entity_type = query.entity_type;
    }
    if (query.source) {
      where.source = query.source;
    }
    if (query.reason || query.trigger_reason) {
      where.trigger_reason = query.reason || query.trigger_reason;
    }

    if (query.confidence_min !== undefined || query.confidence_max !== undefined) {
      where.confidence = {};
      if (query.confidence_min !== undefined) where.confidence[Op.gte] = parseFloat(query.confidence_min);
      if (query.confidence_max !== undefined) where.confidence[Op.lte] = parseFloat(query.confidence_max);
    }

    if (query.created_from || query.created_to) {
      where.created_at = {};
      if (query.created_from) where.created_at[Op.gte] = new Date(query.created_from);
      if (query.created_to) where.created_at[Op.lte] = new Date(query.created_to);
    }

    const { count, rows } = await db.AiReviewItem.findAndCountAll({
      where,
      include: [
        { model: db.User, as: 'reviewer', attributes: ['id', 'name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      items: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Retrieve low-confidence CV/job extractions or ambiguous skill mappings flagged for human review
   */
  static async listQueue(query = {}) {
    const queueQuery = { ...query };
    if (!queueQuery.status) {
      queueQuery.status = 'pending';
    }

    const page = Math.max(1, parseInt(queueQuery.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queueQuery.per_page || queueQuery.limit, 10) || 15));
    const offset = (page - 1) * limit;

    const where = {};
    if (queueQuery.status) where.status = queueQuery.status;
    if (queueQuery.entity_type) where.entity_type = queueQuery.entity_type;
    if (queueQuery.source) where.source = queueQuery.source;
    if (queueQuery.reason || queueQuery.trigger_reason) {
      where.trigger_reason = queueQuery.reason || queueQuery.trigger_reason;
    }

    if (queueQuery.confidence_min !== undefined || queueQuery.confidence_max !== undefined) {
      where.confidence = {};
      if (queueQuery.confidence_min !== undefined) where.confidence[Op.gte] = parseFloat(queueQuery.confidence_min);
      if (queueQuery.confidence_max !== undefined) where.confidence[Op.lte] = parseFloat(queueQuery.confidence_max);
    }

    const { count, rows } = await db.AiReviewItem.findAndCountAll({
      where,
      include: [
        { model: db.User, as: 'reviewer', attributes: ['id', 'name', 'email'] }
      ],
      order: [['confidence', 'ASC'], ['created_at', 'DESC']],
      limit,
      offset
    });

    const pendingCount = await db.AiReviewItem.count({ where: { status: 'pending' } }).catch(() => 0);

    return {
      items: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 1,
      queue_summary: {
        total_in_queue: count,
        total_pending: pendingCount
      }
    };
  }

  /**
   * Get single AI review item with full proposed payload, raw input, reviewer and audits
   */
  static async getItem(itemId) {
    const item = await db.AiReviewItem.findByPk(itemId, {
      include: [
        { model: db.User, as: 'reviewer', attributes: ['id', 'name', 'email'] },
        {
          model: db.AiReviewAudit,
          as: 'audits',
          include: [{ model: db.User, as: 'actor', attributes: ['id', 'name', 'email'] }]
        }
      ],
      order: [[{ model: db.AiReviewAudit, as: 'audits' }, 'created_at', 'ASC']]
    });

    if (!item) {
      throw new NotFoundError('AI review item not found.');
    }

    return item;
  }

  /**
   * Approve AI review item
   */
  static async approveItem(itemId, actorId, payload = {}, req = null) {
    const item = await db.AiReviewItem.findByPk(itemId);
    if (!item) {
      throw new NotFoundError('AI review item not found.');
    }

    if (item.status !== 'pending') {
      throw new ValidationError(`Cannot approve an item with status "${item.status}".`);
    }

    const oldStatus = item.status;
    const decisionReason = payload.decision_reason || 'Approved as-is by admin review.';
    const reviewerNotes = payload.reviewer_notes || null;

    const transaction = await db.sequelize.transaction();
    try {
      item.status = 'approved';
      item.reviewer_id = actorId;
      item.decision_reason = decisionReason;
      item.reviewer_notes = reviewerNotes;
      item.reviewed_at = new Date();
      await item.save({ transaction });

      await db.AiReviewAudit.create({
        ai_review_item_id: item.id,
        actor_id: actorId,
        action: 'approved',
        old_status: oldStatus,
        new_status: 'approved',
        decision_reason: decisionReason,
        reviewer_notes: reviewerNotes
      }, { transaction });

      // Apply approved item into canonical database
      try {
        if (item.entity_type === 'skill' && db.Skill) {
          const skill = await db.Skill.findByPk(item.entity_id, { transaction });
          if (skill) {
            skill.is_verified = true;
            await skill.save({ transaction });
          }
        } else if (item.entity_type === 'job_post' && db.JobPost) {
          const job = await db.JobPost.findByPk(item.entity_id, { transaction });
          if (job && item.proposed_payload && typeof item.proposed_payload === 'object') {
            const updatable = ['title', 'canonical_role', 'description', 'job_type', 'employment_type', 'work_mode', 'experience_level'];
            for (const key of updatable) {
              if (item.proposed_payload[key] !== undefined) {
                job[key] = item.proposed_payload[key];
              }
            }
            await job.save({ transaction });
          }
        } else if (item.entity_type === 'cv_extraction' && db.CvExtraction) {
          const extraction = await db.CvExtraction.findByPk(item.entity_id, { transaction });
          if (extraction) {
            extraction.status = 'verified';
            await extraction.save({ transaction });
          }
        }
      } catch (_) {}

      await transaction.commit();

      // Log system audit
      await AuditLogService.logAction({
        actorId,
        action: 'ai_review.approve',
        entityType: 'AiReviewItem',
        entityId: item.id,
        source: 'admin_portal',
        oldValues: { status: oldStatus },
        newValues: { status: 'approved', decision_reason: decisionReason },
        req
      });

      return await this.getItem(item.id);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Correct AI review item with human-supplied corrected payload
   */
  static async correctItem(itemId, actorId, payload, req = null) {
    const { corrected_value, decision_reason, reviewer_notes } = payload;
    if (corrected_value === undefined || corrected_value === null) {
      throw new ValidationError('corrected_value is required to submit a correction.');
    }

    const item = await db.AiReviewItem.findByPk(itemId);
    if (!item) {
      throw new NotFoundError('AI review item not found.');
    }

    if (item.status !== 'pending') {
      throw new ValidationError(`Cannot correct an item with status "${item.status}".`);
    }

    const oldStatus = item.status;
    const reason = decision_reason || 'Applied manual human correction.';

    const transaction = await db.sequelize.transaction();
    try {
      item.status = 'corrected';
      item.corrected_payload = corrected_value;
      item.reviewer_id = actorId;
      item.decision_reason = reason;
      item.reviewer_notes = reviewer_notes || null;
      item.reviewed_at = new Date();
      await item.save({ transaction });

      await db.AiReviewAudit.create({
        ai_review_item_id: item.id,
        actor_id: actorId,
        action: 'corrected',
        old_status: oldStatus,
        new_status: 'corrected',
        decision_reason: reason,
        reviewer_notes: reviewer_notes || null,
        corrected_payload: corrected_value
      }, { transaction });

      // Apply corrected value into canonical database
      try {
        if (item.entity_type === 'skill' && db.Skill) {
          const skill = await db.Skill.findByPk(item.entity_id, { transaction });
          if (skill) {
            if (typeof corrected_value === 'string') {
              skill.name = corrected_value.trim();
              skill.normalized_name = corrected_value.trim().toLowerCase();
            } else if (typeof corrected_value === 'object' && corrected_value !== null) {
              if (corrected_value.name) {
                skill.name = corrected_value.name.trim();
                skill.normalized_name = corrected_value.name.trim().toLowerCase();
              }
              if (corrected_value.category) skill.category = corrected_value.category;
            }
            skill.is_verified = true;
            await skill.save({ transaction });
          }
        } else if (item.entity_type === 'job_post' && db.JobPost) {
          const job = await db.JobPost.findByPk(item.entity_id, { transaction });
          if (job && typeof corrected_value === 'object' && corrected_value !== null) {
            const updatable = ['title', 'canonical_role', 'description', 'job_type', 'employment_type', 'work_mode', 'experience_level'];
            for (const key of updatable) {
              if (corrected_value[key] !== undefined) {
                job[key] = corrected_value[key];
              }
            }
            await job.save({ transaction });
          }
        } else if (item.entity_type === 'cv_extraction' && db.CvExtraction) {
          const extraction = await db.CvExtraction.findByPk(item.entity_id, { transaction });
          if (extraction && typeof corrected_value === 'object') {
            extraction.extracted_data = corrected_value;
            extraction.status = 'verified';
            await extraction.save({ transaction });
          }
        }
      } catch (_) {}

      await transaction.commit();

      // Log system audit
      await AuditLogService.logAction({
        actorId,
        action: 'ai_review.correct',
        entityType: 'AiReviewItem',
        entityId: item.id,
        source: 'admin_portal',
        oldValues: { status: oldStatus },
        newValues: { status: 'corrected', decision_reason: reason, corrected_payload: corrected_value },
        req
      });

      return await this.getItem(item.id);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Reject AI review item
   */
  static async rejectItem(itemId, actorId, payload = {}, req = null) {
    const item = await db.AiReviewItem.findByPk(itemId);
    if (!item) {
      throw new NotFoundError('AI review item not found.');
    }

    if (item.status !== 'pending') {
      throw new ValidationError(`Cannot reject an item with status "${item.status}".`);
    }

    const oldStatus = item.status;
    const decisionReason = payload.decision_reason || 'Rejected by admin review.';
    const reviewerNotes = payload.reviewer_notes || null;

    const transaction = await db.sequelize.transaction();
    try {
      item.status = 'rejected';
      item.reviewer_id = actorId;
      item.decision_reason = decisionReason;
      item.reviewer_notes = reviewerNotes;
      item.reviewed_at = new Date();
      await item.save({ transaction });

      await db.AiReviewAudit.create({
        ai_review_item_id: item.id,
        actor_id: actorId,
        action: 'rejected',
        old_status: oldStatus,
        new_status: 'rejected',
        decision_reason: decisionReason,
        reviewer_notes: reviewerNotes
      }, { transaction });

      await transaction.commit();

      // Log system audit
      await AuditLogService.logAction({
        actorId,
        action: 'ai_review.reject',
        entityType: 'AiReviewItem',
        entityId: item.id,
        source: 'admin_portal',
        oldValues: { status: oldStatus },
        newValues: { status: 'rejected', decision_reason: decisionReason },
        req
      });

      return await this.getItem(item.id);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = AiReviewService;
