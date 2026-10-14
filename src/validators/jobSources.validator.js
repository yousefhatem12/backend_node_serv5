'use strict';

const { z } = require('zod');

const listJobSourcesQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    source_type: z.enum(['api', 'scraper', 'rss', 'manual']).optional(),
    collection_method: z.string().optional(),
    is_active: z.union([z.boolean(), z.enum(['true', 'false', '1', '0'])]).optional(),
    schedule_enabled: z.union([z.boolean(), z.enum(['true', 'false', '1', '0'])]).optional(),
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(15)
  }).partial()
});

const jobSourceParamSchema = z.object({
  params: z.object({
    jobSource: z.string().min(1, { message: 'Job source identifier is required.' })
  })
});

const createJobSourceSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(150),
  slug: z.string().max(150).optional(),
  source_type: z.enum(['api', 'scraper', 'rss', 'manual']).default('scraper'),
  collection_method: z.string().max(100).default('playwright'),
  base_url: z.string().url().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
  schedule_enabled: z.boolean().default(false),
  schedule_expression: z.string().max(100).optional().nullable(),
  schedule_cron: z.string().max(100).optional().nullable(),
  configuration: z.record(z.any()).optional().nullable(),
  notes: z.string().optional().nullable()
});

const updateJobSourceSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  slug: z.string().max(150).optional(),
  source_type: z.enum(['api', 'scraper', 'rss', 'manual']).optional(),
  collection_method: z.string().max(100).optional(),
  base_url: z.string().url().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
  schedule_enabled: z.boolean().optional(),
  schedule_expression: z.string().max(100).optional().nullable(),
  configuration: z.record(z.any()).optional().nullable(),
  notes: z.string().optional().nullable()
});

const triggerRunSchema = z.object({
  trigger_type: z.enum(['manual', 'scheduled']).default('manual'),
  items: z.array(z.record(z.any())).optional().nullable()
});

const listRunsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
    trigger_type: z.enum(['scheduled', 'manual']).optional(),
    job_source_id: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(15)
  }).partial()
});

const listRawJobsQuerySchema = z.object({
  query: z.object({
    ingestion_run_id: z.coerce.number().int().positive().optional(),
    job_source_id: z.coerce.number().int().positive().optional(),
    extraction_status: z.enum(['pending', 'processed', 'failed']).optional(),
    deduplication_status: z.enum(['unique', 'duplicate']).optional(),
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(15)
  }).partial()
});

const rawJobParamSchema = z.object({
  params: z.object({
    jobSource: z.string().optional(),
    rawJob: z.coerce.number().int().positive({ message: 'The raw job id must be a positive integer.' })
  })
});

module.exports = {
  listJobSourcesQuerySchema,
  jobSourceParamSchema,
  createJobSourceSchema,
  updateJobSourceSchema,
  triggerRunSchema,
  listRunsQuerySchema,
  listRawJobsQuerySchema,
  rawJobParamSchema
};
