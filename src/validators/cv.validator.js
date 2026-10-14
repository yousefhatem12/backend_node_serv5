const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateString = z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format.');

const verifySkillItemSchema = z.object({
  name: z.string({ required_error: 'The skill name is required.' }).trim().min(1),
  category: z.string().trim().optional().nullable(),
  proficiency_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('intermediate').optional(),
  confidence_score: z.coerce.number().min(0).max(1).optional().nullable()
});

const verifyExperienceItemSchema = z.object({
  company_name: z.string({ required_error: 'The company name is required.' }).trim().min(1),
  title: z.string({ required_error: 'The title/job_title is required.' }).trim().min(1),
  start_date: dateString,
  end_date: dateString.optional().nullable(),
  description: z.string().trim().optional().nullable()
});

const verifyCvExtractionSchema = z.object({
  skills: z.array(verifySkillItemSchema).optional().default([]),
  experiences: z.array(verifyExperienceItemSchema).optional().default([])
});

const cvDocumentParamSchema = z.object({
  params: z.object({
    cvDocument: z.coerce.number().int().positive({ message: 'The cvDocument must be a positive integer.' })
  })
});

const extractionParamSchema = z.object({
  params: z.object({
    extraction: z.coerce.number().int().positive({ message: 'The extraction must be a positive integer.' })
  })
});

module.exports = {
  verifyCvExtractionSchema,
  cvDocumentParamSchema,
  extractionParamSchema
};
