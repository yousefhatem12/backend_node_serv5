const { z } = require('zod');
const request = require('supertest');
const express = require('express');
const validate = require('../../src/middlewares/validate.middleware');
const errorHandler = require('../../src/middlewares/errorHandler');
const localeMiddleware = require('../../src/middlewares/locale.middleware');

describe('Validators & Validate Middleware Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(localeMiddleware);

    const testSchema = z.object({
      email: z.string({ required_error: 'The email field is required.' }).email('Invalid email address format.'),
      password: z.string().min(8, 'The password must be at least 8 characters.')
    });

    app.post('/test-validate', validate(testSchema), (req, res) => {
      res.status(200).json({ success: true, data: req.body });
    });

    const containerSchema = z.object({
      body: z.object({
        name: z.string({ message: 'The name field is required.' })
      }),
      query: z.object({
        role: z.string().optional()
      })
    });

    app.post('/test-container', validate(containerSchema), (req, res) => {
      res.status(200).json({ success: true, body: req.body, query: req.query });
    });

    app.use(errorHandler);
  });

  test('passes validation when request body is valid', async () => {
    const res = await request(app)
      .post('/test-validate')
      .send({
        email: 'developer@example.com',
        password: 'Password123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('developer@example.com');
  });

  test('returns 422 with Laravel error shape when validation fails', async () => {
    const res = await request(app)
      .post('/test-validate')
      .send({
        email: 'invalid-email',
        password: 'short'
      });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('errors');
    expect(res.body.errors).toHaveProperty('email');
    expect(res.body.errors.email).toContain('Invalid email address format.');
    expect(res.body.errors).toHaveProperty('password');
    expect(res.body.errors.password).toContain('The password must be at least 8 characters.');
  });

  test('strips body prefix from container schema error keys', async () => {
    const res = await request(app)
      .post('/test-container')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty('name');
    expect(res.body.errors.name).toContain('The name field is required.');
    // Ensure it is not nested under "body.name"
    expect(res.body.errors).not.toHaveProperty('body.name');
  });
});
