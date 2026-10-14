'use strict';

const { z } = require('zod');

const VALID_STATUSES = ['in_progress', 'completed', 'archived'];

const listRoadmapsQuerySchema = z.object({
  query: z.object({
    status: z.enum(VALID_STATUSES).optional(),
    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(50).default(15).optional()
  })
});

const roadmapParamSchema = z.object({
  params: z.object({
    roadmap: z.coerce.number().int().positive({ message: 'The roadmap parameter must be a positive integer.' })
  })
});

const roadmapTaskParamSchema = z.object({
  params: z.object({
    roadmapTask: z.coerce.number().int().positive({ message: 'The roadmapTask parameter must be a positive integer.' })
  })
});

const createRoadmapSchema = z.preprocess((val) => {
  if (val && typeof val === 'object') {
    const copy = { ...val };
    if (!copy.target_type) {
      if (copy.target_role && String(copy.target_role).trim().length > 0) {
        copy.target_type = 'role';
      } else if (copy.target_job_id || copy.job_post_id) {
        copy.target_type = 'job';
      } else {
        copy.target_type = 'role';
      }
    }
    if (copy.job_post_id && !copy.target_job_id) {
      copy.target_job_id = copy.job_post_id;
    }
    return copy;
  }
  return val;
}, z.object({
  target_type: z.enum(['role', 'job']).default('role'),
  target_role: z.string().trim().min(2, { message: 'target_role must be at least 2 characters.' }).max(150).optional().nullable(),
  target_job_id: z.coerce.number().int().positive({ message: 'target_job_id must be a positive integer.' }).optional().nullable(),
  job_post_id: z.coerce.number().int().positive().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable()
}).refine(data => {
  if (data.target_type === 'role') {
    return Boolean(data.target_role && data.target_role.trim().length > 0);
  }
  if (data.target_type === 'job') {
    return Boolean(data.target_job_id || data.job_post_id);
  }
  return true;
}, {
  message: 'target_role is required when target_type is "role", and target_job_id is required when target_type is "job".',
  path: ['target_role']
}));

const refreshRoadmapSchema = z.object({
  target_type: z.enum(['role', 'job']).optional(),
  target_role: z.string().trim().min(2).max(150).optional().nullable(),
  target_job_id: z.coerce.number().int().positive().optional().nullable()
});

const completeRoadmapTaskSchema = z.object({
  evidence: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  xp: z.coerce.number().int().positive().optional().nullable()
});

const addRoadmapXpSchema = z.preprocess((val) => {
  if (val && typeof val === 'object') {
    const copy = { ...val };
    if (copy.points !== undefined && copy.xp === undefined) {
      copy.xp = copy.points;
    } else if (copy.amount !== undefined && copy.xp === undefined) {
      copy.xp = copy.amount;
    }
    return copy;
  }
  return val;
}, z.object({
  xp: z.coerce.number().int().positive({ message: 'xp must be a positive integer.' }),
  reason: z.string().trim().max(255).optional().nullable(),
  roadmap_id: z.coerce.number().int().positive().optional().nullable(),
  task_id: z.coerce.number().int().positive().optional().nullable(),
  milestone_id: z.coerce.number().int().positive().optional().nullable()
}));

const getRoadmapXpQuerySchema = z.object({
  query: z.object({
    roadmap_id: z.coerce.number().int().positive().optional()
  }).optional()
});

module.exports = {
  listRoadmapsQuerySchema,
  roadmapParamSchema,
  roadmapTaskParamSchema,
  createRoadmapSchema,
  refreshRoadmapSchema,
  completeRoadmapTaskSchema,
  addRoadmapXpSchema,
  getRoadmapXpQuerySchema
};

