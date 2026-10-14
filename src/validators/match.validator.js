'use strict';

const { z } = require('zod');

const jobMatchParamSchema = z.object({
  params: z.object({
    jobPost: z.coerce.number().int().positive({ message: 'The job post id must be a positive integer.' })
  })
});

const recommendationsQuerySchema = z.object({
  query: z.object({
    min_score: z.coerce.number().min(0).max(100).default(30.0).optional(),
    work_mode: z.enum(['remote', 'hybrid', 'on-site']).optional(),
    job_type: z.enum(['job', 'internship']).optional(),
    employment_type: z.enum(['full-time', 'part-time', 'contract']).optional(),
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(15)
  }).partial()
});

const adminListMatchesQuerySchema = z.object({
  query: z.object({
    user_id: z.coerce.number().int().positive().optional(),
    job_post_id: z.coerce.number().int().positive().optional(),
    match_level: z.enum(['low', 'moderate', 'good', 'strong']).optional(),
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(15)
  }).partial()
});

module.exports = {
  jobMatchParamSchema,
  recommendationsQuerySchema,
  adminListMatchesQuerySchema
};
