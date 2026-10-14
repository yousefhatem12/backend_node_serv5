const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../models');
const { UnauthorizedError } = require('../utils/errors');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError(req.t ? req.t('common.unauthenticated') : 'Unauthenticated.');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      throw new UnauthorizedError(req.t ? req.t('common.unauthenticated') : 'Unauthenticated.');
    }

    const user = await db.User.findByPk(decoded.id);
    if (!user) {
      throw new UnauthorizedError(req.t ? req.t('common.unauthenticated') : 'Unauthenticated.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await db.User.findByPk(decoded.id);
        if (user && user.is_active) {
          req.user = user;
        }
      } catch (err) {
        // Ignore invalid token for optional auth
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

async function refreshAuth(req, res, next) {
  try {
    const rawRefreshToken = req.body && req.body.refresh_token;
    const authHeader = req.headers.authorization;
    const token = rawRefreshToken || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

    if (!token) {
      throw new UnauthorizedError(req.t ? req.t('common.unauthenticated') : 'Unauthenticated.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      throw new UnauthorizedError(req.t ? req.t('common.unauthenticated') : 'Unauthenticated.');
    }

    const user = await db.User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      throw new UnauthorizedError(req.t ? req.t('common.unauthenticated') : 'Unauthenticated.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

authMiddleware.optional = optionalAuth;
authMiddleware.refresh = refreshAuth;

module.exports = authMiddleware;
