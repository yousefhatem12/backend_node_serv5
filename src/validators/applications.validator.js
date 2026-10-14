const { z } = require('zod');

const VALID_STATUSES = [
  'submitted',
  'under_review',
  'shortlisted',
  'interview',
  'offer',
  'rejected',
  'withdrawn'
];

const listApplicationsQuerySchema = z.object({
  query: z.object({
    status: z.enum(VALID_STATUSES).optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1).optional(),
    per_page: z.coerce.number().int().positive().max(100).default(15).optional()
  })
});

const applicationParamSchema = z.object({
  params: z.object({
    application: z.coerce.number().int().positive({ message: 'The application parameter must be a positive integer.' })
  })
});

const createApplicationSchema = z.object({
  job_id: z.coerce.number({ required_error: 'The job_id is required.' })
    .int()
    .positive({ message: 'The job_id must be a positive integer.' }),
  cover_letter: z.string().trim().max(5000).optional().nullable(),
  cv_document_id: z.coerce.number().int().positive().optional().nullable()
});

const updateApplicationStatusSchema = z.object({
  status: z.enum(VALID_STATUSES, { required_error: 'The status field is required.' }),
  notes: z.string().trim().max(1000).optional().nullable()
});

const updateApplicationNotesSchema = z.object({
  notes: z.string().trim().max(2000).optional().nullable()
});

module.exports = {
  listApplicationsQuerySchema,
  applicationParamSchema,
  createApplicationSchema,
  updateApplicationStatusSchema,
  updateApplicationNotesSchema
};
