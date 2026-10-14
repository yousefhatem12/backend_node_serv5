const { z } = require('zod');

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(15)
});

const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive({ message: 'The id must be a positive integer.' })
  })
});

module.exports = {
  paginationQuerySchema,
  idParamSchema
};
