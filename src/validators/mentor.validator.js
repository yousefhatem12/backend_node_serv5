'use strict';

const { z } = require('zod');

const VALID_CONTEXT_MODES = ['general', 'job', 'roadmap', 'interview_prep', 'application'];

const conversationParamSchema = z.object({
  params: z.object({
    conversation: z.coerce.number().int().positive({ message: 'The conversation parameter must be a positive integer.' })
  })
});

const createConversationSchema = z.object({
  title: z.string().trim().max(255).optional().nullable(),
  context_mode: z.enum(VALID_CONTEXT_MODES).optional(),
  context_metadata: z.record(z.any()).optional().nullable(),
  message: z.string().trim().min(1).max(5000).optional().nullable()
});

const sendMessageSchema = z.object({
  message: z.string({ required_error: 'The message field is required.' })
    .trim()
    .min(1, { message: 'Message cannot be empty.' })
    .max(5000, { message: 'Message is too long (max 5000 characters).' })
});

const updateConversationSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  is_archived: z.boolean().optional()
});

const listConversationsQuerySchema = z.object({
  query: z.object({
    is_archived: z.enum(['true', 'false']).optional(),
    context_mode: z.enum(VALID_CONTEXT_MODES).optional(),
    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(50).default(15).optional()
  })
});

module.exports = {
  conversationParamSchema,
  createConversationSchema,
  sendMessageSchema,
  updateConversationSchema,
  listConversationsQuerySchema
};
