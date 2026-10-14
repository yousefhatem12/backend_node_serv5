'use strict';

const db = require('../models');
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');
const MentorContextBuilder = require('./mentorContextBuilder.service');
const AiMentorService = require('./aiMentor.service');

class MentorChatService {
  /**
   * Start a new mentor conversation session
   */
  static async startConversation(userId, payload = {}) {
    const { title, context_mode = 'general', context_metadata = {}, message } = payload;

    // 1. Build initial context
    const context = await MentorContextBuilder.buildContext(userId, {
      context_mode,
      context_metadata
    });

    const conversationTitle = title || (message
      ? (message.length > 40 ? `${message.substring(0, 40)}...` : message)
      : `Mentorship: ${context_mode.charAt(0).toUpperCase() + context_mode.slice(1)} Guidance`);

    const transaction = await db.sequelize.transaction();

    try {
      const conversation = await db.MentorConversation.create({
        user_id: userId,
        title: conversationTitle,
        context_mode,
        context_metadata,
        last_message_at: new Date()
      }, { transaction });

      if (message && message.trim().length > 0) {
        // User message
        await db.MentorMessage.create({
          conversation_id: conversation.id,
          sender: 'user',
          message: message.trim()
        }, { transaction });

        // Generate grounded AI mentor reply
        const aiResponse = await AiMentorService.reply(message.trim(), context, []);

        // Mentor message
        await db.MentorMessage.create({
          conversation_id: conversation.id,
          sender: 'mentor',
          message: aiResponse.reply,
          suggested_actions: aiResponse.suggested_actions || null,
          context_snapshot: context
        }, { transaction });
      }

      await transaction.commit();

      return await this.getConversation(conversation.id, userId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Send a message in an existing conversation and receive AI mentor response
   */
  static async sendMessage(conversationId, userId, payload) {
    const { message } = payload;
    if (!message || !message.trim()) {
      throw new ValidationError('Message cannot be empty.');
    }

    const conversation = await db.MentorConversation.findByPk(conversationId);
    if (!conversation) {
      throw new NotFoundError('Mentor conversation not found.');
    }

    if (Number(conversation.user_id) !== Number(userId)) {
      throw new ForbiddenError('You do not have access to this conversation.');
    }

    if (conversation.is_archived) {
      throw new ValidationError('Cannot send messages in an archived conversation.');
    }

    // 1. Fetch conversation history
    const existingMessages = await db.MentorMessage.findAll({
      where: { conversation_id: conversationId },
      order: [['created_at', 'ASC']],
      limit: 20
    });

    // 2. Build freshly updated context
    const context = await MentorContextBuilder.buildContext(userId, {
      context_mode: conversation.context_mode,
      context_metadata: conversation.context_metadata || {}
    });

    const transaction = await db.sequelize.transaction();

    try {
      // Create user message
      const userMessage = await db.MentorMessage.create({
        conversation_id: conversationId,
        sender: 'user',
        message: message.trim()
      }, { transaction });

      // Generate AI response
      const aiResponse = await AiMentorService.reply(
        message.trim(),
        context,
        existingMessages.map(m => ({ sender: m.sender, message: m.message }))
      );

      // Create mentor message
      const mentorMessage = await db.MentorMessage.create({
        conversation_id: conversationId,
        sender: 'mentor',
        message: aiResponse.reply,
        suggested_actions: aiResponse.suggested_actions || null,
        context_snapshot: context
      }, { transaction });

      conversation.last_message_at = new Date();
      await conversation.save({ transaction });

      await transaction.commit();

      return {
        user_message: userMessage,
        mentor_message: mentorMessage,
        conversation
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Retrieve conversation details with full message history
   */
  static async getConversation(conversationId, userId, { isAdmin = false } = {}) {
    const conversation = await db.MentorConversation.findByPk(conversationId, {
      include: [
        {
          model: db.MentorMessage,
          as: 'messages'
        }
      ],
      order: [[{ model: db.MentorMessage, as: 'messages' }, 'created_at', 'ASC']]
    });

    if (!conversation) {
      throw new NotFoundError('Mentor conversation not found.');
    }

    if (!isAdmin && Number(conversation.user_id) !== Number(userId)) {
      throw new ForbiddenError('You do not have permission to view this conversation.');
    }

    return conversation;
  }

  /**
   * List candidate's conversations
   */
  static async listConversations(userId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 15));
    const offset = (page - 1) * limit;

    const where = { user_id: userId };
    if (query.is_archived !== undefined) {
      where.is_archived = query.is_archived === 'true' || query.is_archived === true;
    }
    if (query.context_mode) {
      where.context_mode = query.context_mode;
    }

    const { count, rows } = await db.MentorConversation.findAndCountAll({
      where,
      include: [
        {
          model: db.MentorMessage,
          as: 'messages',
          limit: 1,
          order: [['created_at', 'DESC']]
        }
      ],
      order: [['last_message_at', 'DESC'], ['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      conversations: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Update conversation (rename or archive)
   */
  static async updateConversation(conversationId, userId, payload) {
    const conversation = await db.MentorConversation.findByPk(conversationId);
    if (!conversation) {
      throw new NotFoundError('Mentor conversation not found.');
    }

    if (Number(conversation.user_id) !== Number(userId)) {
      throw new ForbiddenError('You do not have permission to modify this conversation.');
    }

    if (payload.title !== undefined) conversation.title = payload.title.trim();
    if (payload.is_archived !== undefined) conversation.is_archived = Boolean(payload.is_archived);

    await conversation.save();
    return conversation;
  }

  /**
   * Delete conversation
   */
  static async deleteConversation(conversationId, userId) {
    const conversation = await db.MentorConversation.findByPk(conversationId);
    if (!conversation) {
      throw new NotFoundError('Mentor conversation not found.');
    }

    if (Number(conversation.user_id) !== Number(userId)) {
      throw new ForbiddenError('You do not have permission to delete this conversation.');
    }

    await conversation.destroy();
    return true;
  }

  /**
   * Context preview
   */
  static async getContextPreview(userId, query = {}) {
    return await MentorContextBuilder.buildContext(userId, query);
  }
}

module.exports = MentorChatService;
