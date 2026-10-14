'use strict';

const MentorMessageResource = require('./mentorMessage.resource');

class MentorConversationResource {
  static toArray(conversation) {
    if (!conversation) return null;

    let metadata = conversation.context_metadata;
    if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch (_) {}
    }

    const res = {
      id: Number(conversation.id),
      user_id: Number(conversation.user_id),
      title: conversation.title,
      context_mode: conversation.context_mode,
      context_metadata: metadata || null,
      is_archived: Boolean(conversation.is_archived),
      last_message_at: conversation.last_message_at ? new Date(conversation.last_message_at).toISOString() : null,
      created_at: conversation.created_at || conversation.createdAt,
      updated_at: conversation.updated_at || conversation.updatedAt
    };

    if (Array.isArray(conversation.messages)) {
      res.messages = MentorMessageResource.collection(conversation.messages);
    }

    return res;
  }

  static toSummary(conversation) {
    if (!conversation) return null;

    let metadata = conversation.context_metadata;
    if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch (_) {}
    }

    const messages = conversation.messages || [];
    const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    return {
      id: Number(conversation.id),
      title: conversation.title,
      context_mode: conversation.context_mode,
      context_metadata: metadata || null,
      is_archived: Boolean(conversation.is_archived),
      last_message_at: conversation.last_message_at ? new Date(conversation.last_message_at).toISOString() : null,
      latest_message: latestMessage ? MentorMessageResource.toArray(latestMessage) : null,
      messages_count: messages.length,
      created_at: conversation.created_at || conversation.createdAt
    };
  }

  static collection(conversations) {
    if (!Array.isArray(conversations)) return [];
    return conversations.map(c => this.toSummary(c));
  }
}

module.exports = MentorConversationResource;
