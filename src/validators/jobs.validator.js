const { z } = require('zod');

const optionalUrl = z.string().url('Must be a valid URL.').or(z.literal('')).nullish();

const emptyToUndefined = (val) => (val === '' || val === null ? undefined : val);

const listJobsQuerySchema = z.object({
  query: z.object({
    search: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    q: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    sort: z.preprocess(emptyToUndefined, z.string().trim().optional().default('newest')),
    company_id: z.preprocess((val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    }, z.number().int().positive().optional()),
    is_verified_company: z.preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional()),
    job_type: z.preprocess(emptyToUndefined, z.enum(['job', 'internship']).optional()),
    work_mode: z.preprocess(emptyToUndefined, z.enum(['remote', 'hybrid', 'on-site']).optional()),
    employment_type: z.preprocess(emptyToUndefined, z.enum(['full-time', 'part-time', 'contract']).optional()),
    experience_level: z.preprocess(emptyToUndefined, z.enum(['entry', 'mid-level', 'senior', 'lead']).optional()),
    country: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    state: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    city: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    application_method: z.preprocess(emptyToUndefined, z.enum(['internal', 'external']).optional()),
    required_skill_ids: z.preprocess((val) => {
      if (!val || val === '') return undefined;
      if (Array.isArray(val)) return val.map(Number);
      if (typeof val === 'string') return val.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
      if (typeof val === 'number') return [val];
      return undefined;
    }, z.array(z.number().int().positive()).optional()),
    preferred_skill_ids: z.preprocess((val) => {
      if (!val || val === '') return undefined;
      if (Array.isArray(val)) return val.map(Number);
      if (typeof val === 'string') return val.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
      if (typeof val === 'number') return [val];
      return undefined;
    }, z.array(z.number().int().positive()).optional()),
    page: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.number().int().positive().default(1).optional()),
    per_page: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.number().int().positive().max(100).default(15).optional()),
    limit: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.number().int().positive().max(100).optional())
  }).passthrough()
});

const listCompaniesQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    is_verified: z.preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional()),
    is_active: z.preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional()),
    industry: z.string().trim().optional(),
    country: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1).optional(),
    per_page: z.coerce.number().int().positive().max(100).default(15).optional()
  })
});

const jobPostParamSchema = z.object({
  params: z.object({
    jobPost: z.coerce.number().int().positive({ message: 'The jobPost parameter must be a positive integer.' })
  })
});

const companyParamSchema = z.object({
  params: z.object({
    company: z.union([z.coerce.number().int().positive(), z.string().min(1)]).optional(),
    id: z.union([z.coerce.number().int().positive(), z.string().min(1)]).optional(),
    companyId: z.union([z.coerce.number().int().positive(), z.string().min(1)]).optional()
  }).refine(data => data.company !== undefined || data.id !== undefined || data.companyId !== undefined, {
    message: 'The company parameter must be provided.'
  })
});

const sourceCompanyParamSchema = z.object({
  params: z.object({
    sourceCompany: z.coerce.number().int().positive({ message: 'The sourceCompany parameter must be a positive integer.' })
  })
});

const createCompanySchema = z.object({
  name: z.string({ required_error: 'The company name is required.' }).trim().min(1).max(150),
  industry: z.string().trim().max(100).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  website_url: optionalUrl,
  linkedin_url: optionalUrl,
  logo_url: optionalUrl,
  description: z.string().trim().optional().nullable(),
  is_verified: z.boolean().optional(),
  is_active: z.boolean().optional()
});

const updateCompanySchema = createCompanySchema.partial();

const mergeCompanySchema = z.object({
  target_company_id: z.coerce.number({ required_error: 'The target_company_id is required.' })
    .int()
    .positive({ message: 'The target_company_id must be a positive integer.' })
});

const jobSkillItemSchema = z.object({
  skill_id: z.coerce.number().int().positive(),
  importance: z.coerce.number().int().min(1).max(5).default(3).optional(),
  required_level: z.string().trim().optional().default('mid-level')
});

const createJobPostSchema = z.object({
  company_id: z.coerce.number({ required_error: 'The company_id is required.' }).int().positive(),
  title: z.string({ required_error: 'The job title is required.' }).trim().min(1).max(150),
  canonical_role: z.string().trim().max(150).optional().nullable(),
  description: z.string({ required_error: 'The job description is required.' }).trim().min(1),
  job_type: z.enum(['job', 'internship']).default('job').optional(),
  employment_type: z.enum(['full-time', 'part-time', 'contract']).default('full-time').optional(),
  work_mode: z.enum(['remote', 'hybrid', 'on-site']).default('on-site').optional(),
  experience_level: z.enum(['entry', 'mid-level', 'senior', 'lead']).default('mid-level').optional(),
  country: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  min_years_experience: z.coerce.number().int().min(0).default(0).optional().nullable(),
  max_years_experience: z.coerce.number().int().min(0).optional().nullable(),
  salary_min: z.coerce.number().min(0).optional().nullable(),
  salary_max: z.coerce.number().min(0).optional().nullable(),
  salary_currency: z.string().trim().max(10).default('EGP').optional(),
  source: z.enum(['internal', 'scraped', 'aggregated']).default('internal').optional(),
  source_url: optionalUrl,
  application_method: z.enum(['internal', 'external']).default('internal').optional(),
  external_apply_url: optionalUrl,
  is_active: z.boolean().default(true).optional(),
  published_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  required_skills: z.array(jobSkillItemSchema).optional().default([]),
  preferred_skills: z.array(jobSkillItemSchema).optional().default([])
});

const updateJobPostSchema = createJobPostSchema.partial();

module.exports = {
  listJobsQuerySchema,
  listCompaniesQuerySchema,
  jobPostParamSchema,
  companyParamSchema,
  sourceCompanyParamSchema,
  createCompanySchema,
  updateCompanySchema,
  mergeCompanySchema,
  createJobPostSchema,
  updateJobPostSchema
};
