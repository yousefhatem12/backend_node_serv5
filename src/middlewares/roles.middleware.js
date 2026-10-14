const { ForbiddenError } = require('../utils/errors');
const { ROLES } = require('../config/constants');

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError(req.t ? req.t('common.forbidden') : 'You do not have permission to perform this action.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(req.t ? req.t('common.forbidden') : 'You do not have permission to perform this action.'));
    }

    next();
  };
}

function ensureActiveUser(req, res, next) {
  if (!req.user || !req.user.is_active) {
    return next(new ForbiddenError(req.t ? req.t('auth.accountDeactivated') : 'Your account has been deactivated. Please contact support.'));
  }
  next();
}

function ensureActiveCandidate(req, res, next) {
  if (!req.user || !req.user.is_active || req.user.role !== ROLES.CANDIDATE) {
    return next(new ForbiddenError(req.t ? req.t('common.forbidden') : 'You do not have permission to perform this action.'));
  }
  next();
}

function ensureActiveAdmin(req, res, next) {
  if (!req.user || !req.user.is_active || ![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role)) {
    return next(new ForbiddenError(req.t ? req.t('common.forbidden') : 'You do not have permission to perform this action.'));
  }
  next();
}

module.exports = {
  requireRole,
  ensureActiveUser,
  ensureActiveCandidate,
  ensureActiveAdmin
};
