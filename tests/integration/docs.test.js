'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const request = require('supertest');
const app = require('../../src/app');

describe('API Documentation & OpenAPI 3.0 Integration Tests', () => {
  const specPath = path.resolve(__dirname, '../../docs/openapi.yaml');
  let openApiSpec = null;

  beforeAll(() => {
    expect(fs.existsSync(specPath)).toBe(true);
    const fileContent = fs.readFileSync(specPath, 'utf8');
    openApiSpec = yaml.parse(fileContent);
  });

  describe('1. OpenAPI Specification Validity', () => {
    it('is a valid OpenAPI 3.0 specification document', () => {
      expect(openApiSpec).toBeDefined();
      expect(typeof openApiSpec).toBe('object');
      expect(openApiSpec.openapi).toMatch(/^3\.0\.\d+$/);

      // Info metadata
      expect(openApiSpec.info).toBeDefined();
      expect(openApiSpec.info.title).toBe('SkillMatch API');
      expect(openApiSpec.info.version).toBe('1.0.0');

      // Servers
      expect(Array.isArray(openApiSpec.servers)).toBe(true);
      expect(openApiSpec.servers.some(s => s.url === '/api')).toBe(true);

      // Security schemes
      expect(openApiSpec.components).toBeDefined();
      expect(openApiSpec.components.securitySchemes).toBeDefined();
      expect(openApiSpec.components.securitySchemes.BearerAuth).toBeDefined();
      expect(openApiSpec.components.securitySchemes.BearerAuth.type).toBe('http');
      expect(openApiSpec.components.securitySchemes.BearerAuth.scheme).toBe('bearer');

      // Standard Envelopes & Error schemas
      expect(openApiSpec.components.schemas).toBeDefined();
      expect(openApiSpec.components.schemas.DataEnvelope).toBeDefined();
      expect(openApiSpec.components.schemas.ActionSuccessEnvelope).toBeDefined();
      expect(openApiSpec.components.schemas.PaginatedEnvelope).toBeDefined();
      expect(openApiSpec.components.schemas.ErrorResponse).toBeDefined();
      expect(openApiSpec.components.schemas.ValidationErrorResponse).toBeDefined();

      // Standard Responses
      expect(openApiSpec.components.responses).toBeDefined();
      expect(openApiSpec.components.responses.UnauthorizedError).toBeDefined();
      expect(openApiSpec.components.responses.ForbiddenError).toBeDefined();
      expect(openApiSpec.components.responses.NotFoundError).toBeDefined();
      expect(openApiSpec.components.responses.ValidationError).toBeDefined();
      expect(openApiSpec.components.responses.RateLimitError).toBeDefined();

      // Paths
      expect(openApiSpec.paths).toBeDefined();
      expect(Object.keys(openApiSpec.paths).length).toBeGreaterThan(0);
    });

    it('defines tags for all primary functional modules', () => {
      expect(Array.isArray(openApiSpec.tags)).toBe(true);
      const tagNames = openApiSpec.tags.map(t => t.name);

      expect(tagNames).toContain('Auth');
      expect(tagNames).toContain('Candidate Profile');
      expect(tagNames).toContain('Skills');
      expect(tagNames).toContain('CV');
      expect(tagNames).toContain('Jobs');
      expect(tagNames).toContain('Applications');
      expect(tagNames).toContain('Notifications');
      expect(tagNames).toContain('Admin');
    });
  });

  describe('2. Express Routes Documentation Coverage', () => {
    /**
     * Helper to recursively extract all registered Express routes from the application
     */
    function extractRegisteredRoutes() {
      const routes = [];
      const apiRouterLayer = app.router.stack.find(l => l.name === 'router');
      if (!apiRouterLayer || !apiRouterLayer.handle || !apiRouterLayer.handle.stack) {
        return routes;
      }

      for (const layer of apiRouterLayer.handle.stack) {
        if (layer.name === 'router' && layer.handle && layer.handle.stack) {
          const mount = layer.handle._mountPath || '';
          for (const subLayer of layer.handle.stack) {
            if (subLayer.route) {
              const methods = Object.keys(subLayer.route.methods).filter(m => m !== '_all');
              routes.push({
                rawPath: mount + subLayer.route.path,
                methods
              });
            }
          }
        } else if (layer.route) {
          const methods = Object.keys(layer.route.methods).filter(m => m !== '_all');
          routes.push({
            rawPath: layer.route.path,
            methods
          });
        }
      }

      return routes;
    }

    it('documents every registered Express route and HTTP method in openapi.yaml', () => {
      const registeredRoutes = extractRegisteredRoutes();
      expect(registeredRoutes.length).toBeGreaterThan(0);

      const missingEndpoints = [];

      for (const route of registeredRoutes) {
        // Skip docs endpoints
        if (route.rawPath.startsWith('/docs')) {
          continue;
        }

        // Normalize path: normalize trailing slash (e.g. /jobs/ -> /jobs)
        let normalizedPath = route.rawPath.length > 1 && route.rawPath.endsWith('/')
          ? route.rawPath.slice(0, -1)
          : route.rawPath;

        // Convert Express parameter syntax :paramName to OpenAPI {paramName}
        const openApiPath = normalizedPath.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

        const pathItem = openApiSpec.paths[openApiPath];
        if (!pathItem) {
          missingEndpoints.push({
            expressPath: route.rawPath,
            expectedOpenApiPath: openApiPath,
            reason: `Path '${openApiPath}' is not documented in openapi.yaml`
          });
          continue;
        }

        for (const method of route.methods) {
          const lowerMethod = method.toLowerCase();
          if (!pathItem[lowerMethod]) {
            missingEndpoints.push({
              expressPath: route.rawPath,
              expectedOpenApiPath: openApiPath,
              method: method.toUpperCase(),
              reason: `Method '${method.toUpperCase()} ${openApiPath}' is missing in openapi.yaml`
            });
          }
        }
      }

      if (missingEndpoints.length > 0) {
        const failureDetails = missingEndpoints
          .map(m => `- ${m.reason} (Registered Express: ${m.expressPath})`)
          .join('\n');
        throw new Error(
          `Found ${missingEndpoints.length} undocumented Express route(s):\n${failureDetails}`
        );
      }

      expect(missingEndpoints).toEqual([]);
    });
  });

  describe('3. Serving Endpoints (GET /api/docs and GET /api/docs/openapi.json)', () => {
    it('GET /api/docs/openapi.json returns 200 with parsed JSON OpenAPI spec', async () => {
      const res = await request(app)
        .get('/api/docs/openapi.json')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.info.title).toBe('SkillMatch API');
      expect(res.body.paths).toBeDefined();
      expect(Object.keys(res.body.paths).length).toBeGreaterThan(50);
    });

    it('GET /api/docs returns 200 HTML with pinned CDN Swagger UI assets', async () => {
      const res = await request(app)
        .get('/api/docs')
        .expect('Content-Type', /html/)
        .expect(200);

      const html = res.text;
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('SkillMatch API Documentation');
      // Pinned exact version (5.18.2) loaded from jsDelivr CDN
      expect(html).toContain('https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui.css');
      expect(html).toContain('https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-bundle.js');
      expect(html).toContain('https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js');
      // Relative path pointing to openapi.json
      expect(html).toContain('openapi.json');
      // persistAuthorization enabled so testers paste JWT once
      expect(html).toContain('persistAuthorization: true');
    });

    it('GET /docs redirects to /api/docs for developer convenience', async () => {
      const res = await request(app)
        .get('/docs')
        .expect(302);

      expect(res.headers.location).toBe('/api/docs');
    });

    it('relaxes Content-Security-Policy for /api/docs to allow CDN assets while maintaining security', async () => {
      const docsRes = await request(app).get('/api/docs');
      const docsCsp = docsRes.headers['content-security-policy'] || '';

      // Must allow CDN script and style sources on /api/docs
      expect(docsCsp).toContain('https://cdn.jsdelivr.net');

      // Regular endpoints retain strict default CSP
      const healthRes = await request(app).get('/api/health');
      const healthCsp = healthRes.headers['content-security-policy'] || '';
      expect(healthCsp).not.toContain('https://cdn.jsdelivr.net');
    });
  });
});
