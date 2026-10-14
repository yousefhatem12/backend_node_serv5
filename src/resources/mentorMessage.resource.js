'use strict';

class MentorMessageResource {
  static toArray(message) {
    if (!message) return null;

    let suggestedActions = message.suggested_actions;
    if (typeof suggestedActions === 'string') {
      try { suggestedActions = JSON.parse(suggestedActions); } catch (_) {}
    }

    return {
      id: Number(message.id),
      conversation_id: Number(message.conversation_id),
      sender: message.sender,
      message: message.message,
      suggested_actions: Array.isArray(suggestedActions) ? suggestedActions : null,
      created_at: message.created_at || message.createdAt
    };
  }

  static collection(messages) {
    if (!Array.isArray(messages)) return [];
    return messages.map(m => this.toArray(m));
  }
}

module.exports = MentorMessageResource;
