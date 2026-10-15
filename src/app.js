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

// Normalize consecutive slashes and route prefixes so endpoints work with or without /api prefix
app.use((req, res, next) => {
  if (req.url) {
    req.url = req.url.replace(/\/{2,}/g, '/');
  }
  const parsedPath = req.path || req.url || '';
  if (
    !parsedPath.startsWith('/api') &&
    !parsedPath.startsWith('/storage') &&
    !parsedPath.startsWith('/uploads') &&
    !parsedPath.startsWith('/docs') &&
    !parsedPath.startsWith('/openapi.json')
  ) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
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

// Static storage for uploads (CV files, avatars, etc.)
app.use('/storage', express.static(path.resolve(config.storage.path)));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Convenience redirect: /docs -> /api/docs and /openapi.json -> /api/docs/openapi.json
app.get('/docs', (req, res) => res.redirect('/api/docs'));
app.get('/openapi.json', (req, res) => res.redirect('/api/docs/openapi.json'));
app.get('/api/openapi.json', (req, res) => res.redirect('/api/docs/openapi.json'));

// Mount all API routes under /api and root /
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Catch 404 routes
app.use((req, res, next) => {
  const notFoundMessage = req.t ? req.t('common.notFound') : 'Resource not found.';
  return error(res, notFoundMessage, 404);
});

// Global central error handler
app.use(errorHandler);

module.exports = app;
