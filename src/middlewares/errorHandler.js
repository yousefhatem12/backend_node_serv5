const { ZodError } = require('zod');
const logger = require('../utils/logger');
const { validationError, error } = require('../utils/response');

function errorHandler(err, req, res, next) {
  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = {};
    for (const issue of err.issues) {
      let pathArray = issue.path;
      if (pathArray.length > 1 && (pathArray[0] === 'body' || pathArray[0] === 'query' || pathArray[0] === 'params')) {
        pathArray = pathArray.slice(1);
      }
      const field = pathArray.join('.') || 'body';
      if (!formattedErrors[field]) {
        formattedErrors[field] = [];
      }
      formattedErrors[field].push(issue.message);
    }
    const firstErrorMessage = err.issues[0]?.message || (req.t ? req.t('common.validationFailed') : 'The given data was invalid.');
    return validationError(res, firstErrorMessage, formattedErrors, 422);
  }

  // Handle Sequelize Validation Errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const formattedErrors = {};
    for (const item of err.errors) {
      if (!formattedErrors[item.path]) {
        formattedErrors[item.path] = [];
      }
      formattedErrors[item.path].push(item.message);
    }
    const firstErrorMessage = err.errors[0]?.message || 'Validation error.';
    return validationError(res, firstErrorMessage, formattedErrors, 422);
  }

  // Handle Custom Application HTTP Errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {})
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const message = req.t ? req.t('common.unauthenticated') : 'Unauthenticated.';
    return res.status(401).json({ message });
  }

  // Unhandled / Internal Server Error
  logger.error('Unhandled Server Error: %s', err.stack || err.message);
  const serverErrorMessage = req.t ? req.t('common.serverError') : 'Internal server error. Please try again later.';
  return error(res, serverErrorMessage, 500);
}

module.exports = errorHandler;
