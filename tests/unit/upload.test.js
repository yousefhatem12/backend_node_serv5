'use strict';

const express = require('express');
const request = require('supertest');
const { uploadCvMiddleware } = require('../../src/middlewares/upload.middleware');

describe('Upload Middleware Multi-Field Unit Tests', () => {
  let testApp;

  beforeAll(() => {
    testApp = express();
    testApp.post('/test-upload', uploadCvMiddleware, (req, res) => {
      res.status(200).json({
        success: true,
        file: {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          size: req.file.size
        }
      });
    });
  });

  it('accepts file uploaded via "cv" field name', async () => {
    const res = await request(testApp)
      .post('/test-upload')
      .attach('cv', Buffer.from('%PDF-1.4 sample content'), 'sample_cv.pdf');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.file.originalname).toBe('sample_cv.pdf');
  });

  it('accepts file uploaded via "cv_file" field name (Swagger / multi-field)', async () => {
    const res = await request(testApp)
      .post('/test-upload')
      .attach('cv_file', Buffer.from('%PDF-1.4 sample content'), 'sample_swagger.pdf');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.file.originalname).toBe('sample_swagger.pdf');
  });

  it('returns 422 with both cv and cv_file error keys when file is missing', async () => {
    const res = await request(testApp)
      .post('/test-upload');

    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty('cv');
    expect(res.body.errors).toHaveProperty('cv_file');
  });
});
