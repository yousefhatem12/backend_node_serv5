'use strict';

const MentorChatService = require('../services/mentorChat.service');
const MentorConversationResource = require('../resources/mentorConversation.resource');
const MentorMessageResource = require('../resources/mentorMessage.resource');
const { paginated, buildPaginationMeta } = require('../utils/response');

class MentorChatController {
  /**
   * POST /api/mentor/conversations
   * Start a new mentor session
   */
  static async start(req, res, next) {
    try {
      const conversation = await MentorChatService.startConversation(req.user.id, req.body);
      return res.status(201).json({
        status: 'success',
        message: 'Conversation started successfully.',
        data: MentorConversationResource.toArray(conversation)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/mentor/conversations
   * List candidate's conversation sessions
   */
  static async list(req, res, next) {
    try {
      const result = await MentorChatService.listConversations(req.user.id, req.query);
      const baseUrl = req.get ? `${req.protocol}://${req.get('host')}/api/mentor/conversations` : '/api/mentor/conversations';
      const { meta, links } = buildPaginationMeta(
        result.total,
        result.page,
        result.limit,
        baseUrl
      );

      return paginated(res, MentorConversationResource.collection(result.conversations), meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/mentor/conversations/:conversation
   * Retrieve conversation with full message history
   */
  static async getById(req, res, next) {
    try {
      const conversationId = req.params.conversation;
      const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
      const conversation = await MentorChatService.getConversation(conversationId, req.user.id, { isAdmin });

      return res.status(200).json({
        status: 'success',
        data: MentorConversationResource.toArray(conversation)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/mentor/conversations/:conversation/messages
   * Send a message and receive context-grounded AI mentor reply
   */
  static async sendMessage(req, res, next) {
    try {
      const conversationId = req.params.conversation;
      const result = await MentorChatService.sendMessage(conversationId, req.user.id, req.body);

      return res.status(200).json({
        status: 'success',
        message: 'Message sent successfully.',
        data: {
          user_message: MentorMessageResource.toArray(result.user_message),
          mentor_reply: MentorMessageResource.toArray(result.mentor_message)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/mentor/conversations/:conversation
   * Update title or archive conversation
   */
  static async update(req, res, next) {
    try {
      const conversationId = req.params.conversation;
      const conversation = await MentorChatService.updateConversation(conversationId, req.user.id, req.body);

      return res.status(200).json({
        status: 'success',
        message: 'Conversation updated successfully.',
        data: MentorConversationResource.toArray(conversation)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/mentor/conversations/:conversation
   * Delete conversation session
   */
  static async delete(req, res, next) {
    try {
      const conversationId = req.params.conversation;
      await MentorChatService.deleteConversation(conversationId, req.user.id);

      return res.status(200).json({
        status: 'success',
        message: 'Conversation deleted successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/mentor/context-preview
   * Preview grounded context payload constructed for candidate
   */
  static async getContextPreview(req, res, next) {
    try {
      const context = await MentorChatService.getContextPreview(req.user.id, req.query);
      return res.status(200).json({
        status: 'success',
        data: context
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = MentorChatController;
