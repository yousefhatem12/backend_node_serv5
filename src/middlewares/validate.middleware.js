const { ZodError, ZodObject } = require('zod');

/**
 * Request validation middleware
 * Validates request payload against a Zod schema before hitting the controller.
 * 
 * Usage in routes:
 *   router.post('/register', validate(registerSchema), AuthController.register);
 *
 * @param {import('zod').ZodSchema} schema - Zod schema (can validate body directly, or container with { body, query, params })
 */
function validate(schema) {
  return async (req, res, next) => {
    try {
      const shape = schema.shape;
      const isContainer = shape && (
        shape.query !== undefined ||
        shape.params !== undefined ||
        shape.body instanceof ZodObject
      );

      if (isContainer) {
        const parsed = await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params
        });
        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.query !== undefined) {
          Object.defineProperty(req, 'query', { value: parsed.query, writable: true, configurable: true, enumerable: true });
        }
        if (parsed.params !== undefined) {
          Object.defineProperty(req, 'params', { value: parsed.params, writable: true, configurable: true, enumerable: true });
        }
      } else {
        // Validate req.body directly
        req.body = await schema.parseAsync(req.body);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = validate;
