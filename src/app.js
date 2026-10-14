const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');
const localeMiddleware = require('./middlewares/locale.middleware');
const errorHandler = require('./middlewares/errorHandler');
const apiRoutes = require('./routes');
const { error } = require('./utils/response');

const app = express();

// Security and utility middlewares
// Relax CSP only for /api/docs so Swagger UI CDN assets load; keep strict defaults everywhere else
const defaultHelmet = helmet();
const docsHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net", "https://validator.swagger.io"],
      connectSrc: ["'self'"]
    }
  }
});

// Normalize consecutive slashes in request URLs (e.g. /api//auth/login -> /api/auth/login)
app.use((req, res, next) => {
  if (req.url) {
    req.url = req.url.replace(/\/{2,}/g, '/');
  }
  next();
});

app.use((req, res, next) => {
  const urlPath = req.originalUrl || req.path || req.url || '';
  if (urlPath.startsWith('/api/docs')) {
    return docsHelmet(req, res, next);
  }
  return defaultHelmet(req, res, next);
});
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Localization middleware (Accept-Language parsing)
app.use(localeMiddleware);

// Static storage for uploads (CV files, etc.)
app.use('/storage', express.static(path.resolve(config.storage.path)));

// Convenience redirect: /docs -> /api/docs
app.get('/docs', (req, res) => res.redirect('/api/docs'));


// Mount all API routes under /api
app.use('/api', apiRoutes);

// Catch 404 routes
app.use((req, res, next) => {
  const notFoundMessage = req.t ? req.t('common.notFound') : 'Resource not found.';
  return error(res, notFoundMessage, 404);
});

// Global central error handler
app.use(errorHandler);

module.exports = app;
