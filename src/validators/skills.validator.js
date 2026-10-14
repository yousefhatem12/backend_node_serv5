const { z } = require('zod');

const searchSkillsQuerySchema = z.object({
  query: z.object({
    q: z.string({ required_error: 'The search query parameter q is required.' })
      .trim()
      .min(1, 'The search query parameter q cannot be empty.')
  })
});

const addCandidateSkillSchema = z.object({
  name: z.string({ required_error: 'The skill name is required.' })
    .trim()
    .min(1, 'The skill name cannot be empty.')
    .max(150),
  proficiency_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('intermediate').optional()
});

const createSkillSchema = z.object({
  name: z.string({ required_error: 'The skill name is required.' })
    .trim()
    .min(1, 'The skill name cannot be empty.')
    .max(150),
  skill_category_id: z.coerce.number().int().positive().optional().nullable(),
  category: z.string().trim().max(100).optional().nullable()
});

const updateSkillSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  skill_category_id: z.coerce.number().int().positive().optional().nullable(),
  category: z.string().trim().max(100).optional().nullable()
});

const mergeSkillSchema = z.object({
  target_skill_id: z.coerce.number({ required_error: 'The target_skill_id is required.' })
    .int()
    .positive({ message: 'The target_skill_id must be a positive integer.' })
});

const createAliasSchema = z.object({
  alias: z.string({ required_error: 'The alias is required.' })
    .trim()
    .min(1, 'The alias cannot be empty.')
    .max(150)
});

const updateAliasSchema = z.object({
  alias: z.string({ required_error: 'The alias is required.' })
    .trim()
    .min(1, 'The alias cannot be empty.')
    .max(150)
});

module.exports = {
  searchSkillsQuerySchema,
  addCandidateSkillSchema,
  createSkillSchema,
  updateSkillSchema,
  mergeSkillSchema,
  createAliasSchema,
  updateAliasSchema
};
