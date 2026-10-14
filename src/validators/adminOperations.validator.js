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
    user: z.coerce.number().int().positive({ message: 'The user id must be a positive integer.' }).optional(),
    id: z.coerce.number().int().positive({ message: 'The user id must be a positive integer.' }).optional(),
    userId: z.coerce.number().int().positive({ message: 'The user id must be a positive integer.' }).optional()
  }).refine(data => data.user !== undefined || data.id !== undefined || data.userId !== undefined, {
    message: 'The user id must be a positive integer.'
  })
});

const createAdminUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.').optional(),
    full_name: z.string().trim().min(1, 'Full name is required.').optional(),
    email: z.string().trim().email('Must be a valid email address.'),
    role: z.preprocess(
      (val) => {
        if (!val) return 'candidate';
        if (typeof val !== 'string') return val;
        const lower = val.trim().toLowerCase();
        if (lower.includes('admin') && lower.includes('super')) return 'super_admin';
        if (lower.includes('admin')) return 'admin';
        if (lower.includes('candidate')) return 'candidate';
        return lower;
      },
      z.enum(['candidate', 'admin', 'super_admin'])
    ).default('candidate'),
    password: z.string().min(6, 'Password must be at least 6 characters.').optional(),
    phone: z.string().optional().nullable(),
    is_active: z.preprocess(
      (val) => {
        if (val === undefined || val === null) return true;
        if (val === 'true' || val === true || val === 1 || val === '1') return true;
        if (val === 'false' || val === false || val === 0 || val === '0') return false;
        return true;
      },
      z.boolean()
    ).default(true)
  }).refine(data => Boolean(data.name || data.full_name), {
    message: 'Name is required.',
    path: ['name']
  })
});

const updateAdminUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.').optional(),
    full_name: z.string().trim().min(1, 'Full name is required.').optional(),
    email: z.string().trim().email('Must be a valid email address.').optional(),
    role: z.preprocess(
      (val) => {
        if (typeof val !== 'string') return val;
        const lower = val.trim().toLowerCase();
        if (lower.includes('admin') && lower.includes('super')) return 'super_admin';
        if (lower.includes('admin')) return 'admin';
        if (lower.includes('candidate')) return 'candidate';
        return lower;
      },
      z.enum(['candidate', 'admin', 'super_admin'])
    ).optional(),
    is_active: z.preprocess(
      (val) => {
        if (val === undefined || val === null) return undefined;
        if (val === 'true' || val === true || val === 1 || val === '1') return true;
        if (val === 'false' || val === false || val === 0 || val === '0') return false;
        return undefined;
      },
      z.boolean().optional()
    ).optional(),
    password: z.string().min(6, 'Password must be at least 6 characters.').optional(),
    phone: z.string().optional().nullable()
  })
});

const updateUserStatusSchema = z.object({
  body: z.object({
    is_active: z.preprocess(
      (val) => {
        if (val === 'true' || val === true || val === 1 || val === '1') return true;
        if (val === 'false' || val === false || val === 0 || val === '0') return false;
        return val;
      },
      z.boolean({ required_error: 'is_active is required.' })
    )
  })
});

const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.preprocess(
      (val) => {
        if (typeof val !== 'string') return val;
        const lower = val.trim().toLowerCase();
        if (lower.includes('admin') && lower.includes('super')) return 'super_admin';
        if (lower.includes('admin')) return 'admin';
        if (lower.includes('candidate')) return 'candidate';
        return lower;
      },
      z.enum(['candidate', 'admin', 'super_admin'], {
        required_error: 'role is required and must be candidate, admin, or super_admin.'
      })
    )
  })
});

// --- Skills & Taxonomy Management ---
const listTaxonomySkillsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(15),
    search: z.string().optional(),
    q: z.string().optional(),
    category: z.string().optional(),
    skill_category_id: z.coerce.number().int().positive().optional(),
    is_verified: z.union([z.boolean(), z.enum(['true', 'false', '1', '0'])]).optional()
  }).partial()
});

const taxonomySkillParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive({ message: 'The skill id must be a positive integer.' })
  })
});

const createTaxonomySkillSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.').optional(),
    alias: z.string().trim().min(1).optional(),
    skill_id: z.coerce.number().int().positive().optional(),
    canonical_skill_id: z.coerce.number().int().positive().optional(),
    category: z.string().trim().max(100).optional().nullable(),
    skill_category_id: z.coerce.number().int().positive().optional().nullable(),
    aliases: z.array(z.string().trim().min(1)).optional(),
    is_verified: z.union([z.boolean(), z.enum(['true', 'false', '1', '0'])]).optional(),
    type: z.enum(['skill', 'alias', 'canonical']).optional()
  }).refine(data => Boolean(data.name || (data.alias && (data.skill_id || data.canonical_skill_id))), {
    message: 'Either name (for canonical skill) or alias with skill_id must be provided.',
    path: ['name']
  })
});

const updateTaxonomySkillSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    category: z.string().trim().max(100).optional().nullable(),
    skill_category_id: z.coerce.number().int().positive().optional().nullable(),
    is_verified: z.union([z.boolean(), z.enum(['true', 'false', '1', '0'])]).optional(),
    is_active: z.union([z.boolean(), z.enum(['true', 'false', '1', '0'])]).optional(),
    aliases: z.array(z.string().trim().min(1)).optional(),
    alias: z.string().trim().min(1).optional()
  })
});

// --- Sources Management ---
const sourceParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'The source identifier must not be empty.' })
  })
});

// --- Moderation & Merging ---
const mergeDuplicatesSchema = z.object({
  body: z.object({
    entity_type: z.preprocess(
      (val) => typeof val === 'string' ? val.trim().toLowerCase() : val,
      z.enum(['job', 'jobs', 'job_post', 'job_posts', 'company', 'companies'], {
        required_error: 'entity_type is required (job or company).'
      })
    ),
    source_id: z.coerce.number().int().positive().optional(),
    duplicate_id: z.coerce.number().int().positive().optional(),
    target_id: z.coerce.number().int().positive().optional(),
    primary_id: z.coerce.number().int().positive().optional(),
    reason: z.string().max(500).optional()
  }).refine(data => Boolean((data.source_id || data.duplicate_id) && (data.target_id || data.primary_id)), {
    message: 'Both source_id (duplicate) and target_id (primary) are required.',
    path: ['source_id']
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
  createAdminUserSchema,
  updateAdminUserSchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
  listTaxonomySkillsQuerySchema,
  taxonomySkillParamSchema,
  createTaxonomySkillSchema,
  updateTaxonomySkillSchema,
  sourceParamSchema,
  mergeDuplicatesSchema
};
