'use strict';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../../src/app');
const DocsController = require('../../src/controllers/docs.controller');
const generateOpenApiJson = require('../../scripts/generate-openapi-json');
const logger = require('../../src/utils/logger');

describe('DocsController Unit & Integration Tests', () => {
  it('scripts/generate-openapi-json generates a valid openapi.json file', () => {
    generateOpenApiJson();
    const jsonPath = path.resolve(__dirname, '../../docs/openapi.json');
    expect(fs.existsSync(jsonPath)).toBe(true);

    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(parsed.openapi).toMatch(/^3\.0\.\d+$/);
    expect(parsed.info.title).toBe('SkillMatch API');
  });

  it('GET /api/docs/openapi.json returns 200 with OpenAPI 3.0 specification', async () => {
    const res = await request(app)
      .get('/api/docs/openapi.json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('SkillMatch API');
    expect(res.body.paths).toBeDefined();
    expect(res.body.security).toBeUndefined();
  });

  it('GET /docs/openapi.json direct path returns 200 with JSON spec', async () => {
    const res = await request(app)
      .get('/docs/openapi.json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body.openapi).toBe('3.0.3');
  });

  it('GET /openapi.json redirects to /api/docs/openapi.json', async () => {
    const res = await request(app)
      .get('/openapi.json')
      .expect(302);

    expect(res.headers.location).toBe('/api/docs/openapi.json');
  });

  it('GET /api/docs/openapi.yaml returns 200 with YAML text specification', async () => {
    const res = await request(app)
      .get('/api/docs/openapi.yaml')
      .expect('Content-Type', /yaml/)
      .expect(200);

    expect(res.text).toContain('openapi: 3.0.3');
    expect(res.text).toContain('title: SkillMatch API');
  });

  it('GET /api/docs serves HTML page with pinned Swagger UI bundle and style', async () => {
    const res = await request(app)
      .get('/api/docs')
      .expect('Content-Type', /html/)
      .expect(200);

    expect(res.text).toContain('swagger-ui-dist@5.18.2');
    expect(res.text).toContain('openapi.json');
    expect(res.text).toContain('persistAuthorization: true');
  });

  it('Handles missing or corrupted spec gracefully with fallback specification instead of 500 error', () => {
    const loggerSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    // Create a mock response
    const mockRes = {
      statusCode: null,
      headers: {},
      setHeader(name, val) {
        this.headers[name] = val;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      }
    };

    // When an exception occurs inside getSpec
    const errorSpy = jest.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
      throw new Error('Simulated serialization error');
    });

    DocsController.getSpec({}, mockRes);

    expect(mockRes.statusCode).toBe(200);
    expect(mockRes.payload).toBeDefined();
    expect(mockRes.payload.openapi).toBe('3.0.3');
    expect(mockRes.payload.info.title).toBe('SkillMatch API');
    expect(loggerSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
    loggerSpy.mockRestore();
  });
});
