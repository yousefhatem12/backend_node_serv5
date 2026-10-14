'use strict';

const { z } = require('zod');

// --- CV Improver ---
const analyzeCvSchema = z.object({
  job_post_id: z.coerce.number().int().positive().optional(),
  target_role: z.string().min(2).max(150).optional()
});

const listCvImprovementsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(50).default(15)
  })
});

// --- Interview Prep ---
const startInterviewSessionSchema = z.object({
  job_post_id: z.coerce.number().int().positive().optional(),
  target_role: z.string().min(2).max(150).optional(),
  difficulty: z.enum(['entry', 'mid-level', 'senior']).default('mid-level')
});

const interviewSessionParamSchema = z.object({
  params: z.object({
    session: z.coerce.number().int().positive({ message: 'Session ID must be a positive integer.' })
  })
});

const evaluateAnswerSchema = z.object({
  question_id: z.string().min(1).max(50),
  user_answer: z.string().min(5, { message: 'Answer must be at least 5 characters.' })
});

const listInterviewSessionsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(50).default(15),
    status: z.enum(['active', 'completed']).optional(),
    difficulty: z.enum(['entry', 'mid-level', 'senior']).optional()
  })
});

// --- Application Strategy ---
const assessStrategySchema = z.object({
  job_post_id: z.coerce.number().int().positive({ message: 'job_post_id is required.' })
});

const strategyParamSchema = z.object({
  params: z.object({
    strategy: z.coerce.number().int().positive({ message: 'Strategy ID must be a positive integer.' })
  })
});

const listStrategiesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(50).default(15),
    recommendation: z.enum(['apply_now', 'improve_gaps_first', 'alternative_roles']).optional(),
    fit_level: z.enum(['strong_fit', 'moderate_fit', 'stretch']).optional()
  })
});

module.exports = {
  analyzeCvSchema,
  listCvImprovementsQuerySchema,
  startInterviewSessionSchema,
  interviewSessionParamSchema,
  evaluateAnswerSchema,
  listInterviewSessionsQuerySchema,
  assessStrategySchema,
  strategyParamSchema,
  listStrategiesQuerySchema
};
