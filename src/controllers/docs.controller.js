'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const logger = require('../utils/logger');

// Robust multi-path resolution for cPanel and diverse deployment working directories
const candidateJsonPaths = [
  path.resolve(__dirname, '../../docs/openapi.json'),
  path.resolve(process.cwd(), 'docs/openapi.json'),
  path.resolve(__dirname, '../docs/openapi.json'),
  path.resolve(process.cwd(), 'openapi.json')
];

const candidateYamlPaths = [
  path.resolve(__dirname, '../../docs/openapi.yaml'),
  path.resolve(process.cwd(), 'docs/openapi.yaml'),
  path.resolve(__dirname, '../../docs/openapi.yml'),
  path.resolve(process.cwd(), 'docs/openapi.yml')
];

// Fallback valid OpenAPI 3.0 specification so Swagger UI never crashes with an ambiguous 500
const FALLBACK_SPEC = Object.freeze({
  openapi: '3.0.3',
  info: {
    title: 'SkillMatch API',
    version: '1.0.0',
    description: 'SkillMatch Career Intelligence & Job Matching Platform Backend (Fallback Mode - Full definition temporarily unavailable)'
  },
  servers: [{ url: '/api', description: 'SkillMatch API Base' }],
  paths: {}
});

let cachedSpec = null;

/**
 * Robustly load OpenAPI specification from JSON or YAML files across candidate paths.
 * Automatically synchronizes/generates openapi.json from openapi.yaml if missing.
 */
function loadSpec(forceReload = false) {
  if (cachedSpec && !forceReload) {
    return cachedSpec;
  }

  const attemptedPaths = [];

  // 1. Check for openapi.json in candidate locations
  for (const jsonPath of candidateJsonPaths) {
    attemptedPaths.push(`[JSON] ${jsonPath}`);
    try {
      if (fs.existsSync(jsonPath)) {
        const content = fs.readFileSync(jsonPath, 'utf8');
        cachedSpec = JSON.parse(content);
        return cachedSpec;
      }
    } catch (err) {
      logger.warn(`[DocsController] Error reading or parsing JSON spec at ${jsonPath}: ${err.message}`);
    }
  }

  // 2. Fallback to openapi.yaml, parsing and optionally auto-generating openapi.json
  for (const yamlPath of candidateYamlPaths) {
    attemptedPaths.push(`[YAML] ${yamlPath}`);
    try {
      if (fs.existsSync(yamlPath)) {
        const fileContent = fs.readFileSync(yamlPath, 'utf8');
        cachedSpec = yaml.parse(fileContent);

        // Recreate openapi.json on disk if possible so future loads are fast & direct
        try {
          const targetJsonPath = path.resolve(path.dirname(yamlPath), 'openapi.json');
          if (!fs.existsSync(targetJsonPath)) {
            fs.writeFileSync(targetJsonPath, JSON.stringify(cachedSpec, null, 2), 'utf8');
          }
        } catch (writeErr) {
          // Ignore write permission error on restricted hosting environments
        }

        return cachedSpec;
      }
    } catch (err) {
      logger.error(`[DocsController] Failed to parse YAML specification at ${yamlPath}: ${err.message}`);
    }
  }

  // 3. Fallback when neither file could be located or parsed
  logger.error(
    `[DocsController] Could not locate or load valid OpenAPI specification. Attempted candidate paths:\n` +
    attemptedPaths.map(p => `  - ${p}`).join('\n')
  );

  return FALLBACK_SPEC;
}

// Pre-load at startup with catch block
try {
  loadSpec();
} catch (err) {
  logger.error(`[DocsController] Initial OpenAPI load failed: ${err.message}`, { stack: err.stack });
}

/**
 * DocsController
 * Serves the parsed OpenAPI 3.0 specification and the CDN-backed Swagger UI interface
 */
class DocsController {
  /**
   * GET /api/docs/openapi.json
   * Returns the parsed OpenAPI 3.0 specification as JSON with security/lock icons removed for free testing
   */
  static getSpec(req, res) {
    try {
      const raw = loadSpec();
      const spec = JSON.parse(JSON.stringify(raw));

      delete spec.security;
      if (spec.components && spec.components.securitySchemes) {
        delete spec.components.securitySchemes;
      }
      if (spec.paths) {
        for (const pathKey of Object.keys(spec.paths)) {
          for (const method of Object.keys(spec.paths[pathKey])) {
            delete spec.paths[pathKey][method].security;
          }
        }
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json(spec);
    } catch (err) {
      logger.error(`[DocsController] Error preparing OpenAPI spec response: ${err.message}`, { stack: err.stack });
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json(FALLBACK_SPEC);
    }
  }

  /**
   * GET /api/docs/openapi.yaml
   * Returns the parsed OpenAPI 3.0 specification as YAML text
   */
  static getYamlSpec(req, res) {
    try {
      const raw = loadSpec();
      const yamlContent = yaml.stringify(raw);
      res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
      return res.status(200).send(yamlContent);
    } catch (err) {
      logger.error(`[DocsController] Error serializing YAML spec: ${err.message}`, { stack: err.stack });
      res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
      return res.status(200).send(yaml.stringify(FALLBACK_SPEC));
    }
  }

  /**
   * GET /api/docs
   * Serves an inline HTML page that loads Swagger UI from jsDelivr CDN
   * Uses pinned version 5.18.2 with persistAuthorization enabled
   */
  static getUi(req, res) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SkillMatch API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/favicon-32x32.png" sizes="32x32" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin: 0;
      background: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .swagger-ui .topbar {
      background-color: #1e293b;
      border-bottom: 2px solid #3b82f6;
    }
    .swagger-ui .topbar-wrapper img {
      content: url('https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/favicon-32x32.png');
    }
    /* Hide lock icons and authorize button for free testing */
    .swagger-ui .auth-wrapper,
    .swagger-ui .authorization__btn,
    .swagger-ui button.btn.authorize,
    .swagger-ui .unlocked,
    .swagger-ui .locked,
    .swagger-ui svg.locked {
      display: none !important;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
  <script>
    window.onload = function() {
      // Relative path pointing to openapi.json whether accessed with or without trailing slash
      const specUrl = window.location.pathname.endsWith('/')
        ? './openapi.json'
        : window.location.pathname.endsWith('/docs')
          ? './docs/openapi.json'
          : './openapi.json';

      window.ui = SwaggerUIBundle({
        url: specUrl,
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: 'StandaloneLayout'
      });
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }
}

module.exports = DocsController;
