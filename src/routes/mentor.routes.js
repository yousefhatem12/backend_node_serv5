'use strict';

const express = require('express');
const router = express.Router();

const MentorChatController = require('../controllers/mentorChat.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { ensureActiveCandidate } = require('../middlewares/roles.middleware');
const {
  validate,
  createConversationSchema,
  conversationParamSchema,
  sendMessageSchema,
  updateConversationSchema,
  listConversationsQuerySchema
} = require('../validators');

// Context Preview
router.get(
  '/context-preview',
  authMiddleware,
  ensureActiveCandidate,
  MentorChatController.getContextPreview
);

// Start conversation session
router.post(
  '/conversations',
  authMiddleware,
  ensureActiveCandidate,
  validate(createConversationSchema),
  MentorChatController.start
);

// List candidate conversations
router.get(
  '/conversations',
  authMiddleware,
  ensureActiveCandidate,
  validate(listConversationsQuerySchema),
  MentorChatController.list
);

// Get conversation details & message history
router.get(
  '/conversations/:conversation',
  authMiddleware,
  validate(conversationParamSchema),
  MentorChatController.getById
);

// Send message & receive AI reply
router.post(
  '/conversations/:conversation/messages',
  authMiddleware,
  ensureActiveCandidate,
  validate(conversationParamSchema),
  validate(sendMessageSchema),
  MentorChatController.sendMessage
);

// Update conversation (title or archive)
router.patch(
  '/conversations/:conversation',
  authMiddleware,
  ensureActiveCandidate,
  validate(conversationParamSchema),
  validate(updateConversationSchema),
  MentorChatController.update
);

// Delete conversation
router.delete(
  '/conversations/:conversation',
  authMiddleware,
  ensureActiveCandidate,
  validate(conversationParamSchema),
  MentorChatController.delete
);

module.exports = router;
