'use strict';

const { z } = require('zod');

// --- AI Review Items ---
const listAiReviewItemsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(15),
    status: z.enum(['pending', 'approved', 'corrected', 'rejected']).optional(),
    entity_type: z.string().optional(),
    source: z.string().optional(),
    confidence_min: z.coerce.number().min(0).max(1).optional(),
    confidence_max: z.coerce.number().min(0).max(1).optional(),
    reason: z.string().optional(),
    created_from: z.string().optional(),
    created_to: z.string().optional()
  })
});

const aiReviewItemParamSchema = z.object({
  params: z.object({
    aiReviewItem: z.coerce.number().int().positive({ message: 'The aiReviewItem id must be a positive integer.' })
  })
});

const approveAiReviewSchema = z.object({
  decision_reason: z.string().max(500).optional(),
  reviewer_notes: z.string().optional()
});

const correctAiReviewSchema = z.object({
  corrected_value: z.any().refine(val => val !== undefined && val !== null, {
    message: 'corrected_value is required.'
  }),
  decision_reason: z.string().max(500).optional(),
  reviewer_notes: z.string().optional()
});

const rejectAiReviewSchema = z.object({
  decision_reason: z.string().max(500).optional(),
  reviewer_notes: z.string().optional()
});


// --- Audit Logs ---
const listAuditLogsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(15),
    action: z.string().optional(),
    entity_type: z.string().optional(),
    entity_id: z.coerce.number().int().positive().optional(),
    actor_id: z.coerce.number().int().positive().optional(),
    source: z.string().optional(),
    created_from: z.string().optional(),
    created_to: z.string().optional()
  })
});

// --- Admin Users ---
const listAdminUsersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(15),
    role: z.enum(['candidate', 'admin', 'super_admin']).optional(),
    is_active: z.union([
      z.boolean(),
      z.enum(['true', 'false', '1', '0'])
    ]).optional(),
    search: z.string().optional(),
    created_from: z.string().optional(),
    created_to: z.string().optional()
  })
});

const adminUserParamSchema = z.object({
  params: z.object({
    user: z.coerce.number().int().positive({ message: 'The user id must be a positive integer.' })
  })
});

const updateUserStatusSchema = z.object({
  body: z.object({
    is_active: z.boolean({ required_error: 'is_active is required.' })
  })
});

const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.enum(['candidate', 'admin', 'super_admin'], {
      required_error: 'role is required and must be candidate, admin, or super_admin.'
    })
  })
});

module.exports = {
  listAiReviewItemsQuerySchema,
  aiReviewItemParamSchema,
  approveAiReviewSchema,
  correctAiReviewSchema,
  rejectAiReviewSchema,
  listAuditLogsQuerySchema,
  listAdminUsersQuerySchema,
  adminUserParamSchema,
  updateUserStatusSchema,
  updateUserRoleSchema
};
