'use strict';

class AiReviewItemResource {
  static toArray(item) {
    if (!item) return null;

    let proposedPayload = item.proposed_payload;
    if (typeof proposedPayload === 'string') {
      try { proposedPayload = JSON.parse(proposedPayload); } catch (_) {}
    }

    let correctedPayload = item.corrected_payload;
    if (typeof correctedPayload === 'string') {
      try { correctedPayload = JSON.parse(correctedPayload); } catch (_) {}
    }

    const res = {
      id: Number(item.id),
      entity_type: item.entity_type,
      entity_id: Number(item.entity_id),
      source: item.source,
      status: item.status,
      trigger_reason: item.trigger_reason,
      confidence: Number(parseFloat(item.confidence || 0).toFixed(2)),
      raw_input: item.raw_input || null,
      proposed_payload: proposedPayload,
      corrected_payload: correctedPayload || null,
      reviewer: item.reviewer ? {
        id: Number(item.reviewer.id),
        name: item.reviewer.name
      } : null,
      decision_reason: item.decision_reason || null,
      reviewer_notes: item.reviewer_notes || null,
      reviewed_at: item.reviewed_at ? new Date(item.reviewed_at).toISOString() : null,
      created_at: item.created_at || item.createdAt
    };

    if (Array.isArray(item.audits)) {
      res.audits = item.audits.map(audit => ({
        id: Number(audit.id),
        actor: audit.actor ? { id: Number(audit.actor.id), name: audit.actor.name } : null,
        action: audit.action,
        old_status: audit.old_status,
        new_status: audit.new_status,
        decision_reason: audit.decision_reason || null,
        reviewer_notes: audit.reviewer_notes || null,
        created_at: audit.created_at || audit.createdAt
      }));
    }

    return res;
  }

  static collection(items) {
    if (!Array.isArray(items)) return [];
    return items.map(item => this.toArray(item));
  }
}

module.exports = AiReviewItemResource;
