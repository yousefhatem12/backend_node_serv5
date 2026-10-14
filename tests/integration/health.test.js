const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');

describe('Health Check Integration Tests', () => {
  beforeAll(async () => {
    await db.sequelize.authenticate();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  test('GET /api/health returns 200 and healthy status (English)', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Accept-Language', 'en')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.database).toBe('connected');
    expect(res.body.data.message).toBe('SkillMatch API is healthy and operational.');
    expect(res.body.data).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('uptime');
  });

  test('GET /api/health returns 200 with Arabic localized message', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Accept-Language', 'ar')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.database).toBe('connected');
    expect(res.body.data.message).toBe('واجهة برمجة تطبيقات SkillMatch تعمل بنجاح.');
  });

  test('GET /api/non-existent-endpoint returns 404 with standard envelope', async () => {
    const res = await request(app)
      .get('/api/does-not-exist')
      .set('Accept', 'application/json');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      message: 'Resource not found.'
    });
  });
});
