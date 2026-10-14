'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

// Parse the YAML spec once at startup
const specPath = path.resolve(__dirname, '../../docs/openapi.yaml');
let cachedSpec = null;

function loadSpec() {
  if (!cachedSpec) {
    const fileContent = fs.readFileSync(specPath, 'utf8');
    cachedSpec = yaml.parse(fileContent);
  }
  return cachedSpec;
}

// Pre-load at startup
try {
  loadSpec();
} catch (err) {
  // If file does not exist yet during initial boot, will load on first request
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
    return res.status(200).json(spec);
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
        : './docs/openapi.json';

      window.ui = SwaggerUIBundle({
        url: specUrl,
        dom_id: '#swagger-ui',
        deepLinking: true,
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
