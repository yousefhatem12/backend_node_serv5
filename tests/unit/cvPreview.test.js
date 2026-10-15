'use strict';

const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const db = require('../../src/models');
const cvService = require('../../src/services/cv.service');
const cvRoutes = require('../../src/routes/cv.routes');
const localeMiddleware = require('../../src/middlewares/locale.middleware');
const errorHandler = require('../../src/middlewares/errorHandler');
const config = require('../../src/config/env');
const queueService = require('../../src/services/queue/queue.service');
const { NotFoundError, ForbiddenError, UnsupportedMediaTypeError } = require('../../src/utils/errors');

describe('CV File Preview Endpoint Unit & Integration Tests', () => {
  const tempDir = path.join(__dirname, '..', 'tmp_preview_test');
  const samplePdfPath = path.join(tempDir, 'sample_resume.pdf');
  const sampleDocxPath = path.join(tempDir, 'sample_resume.docx');

  let app;
  let candidateToken;
  let candidate2Token;
  let adminToken;

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    fs.writeFileSync(samplePdfPath, '%PDF-1.4 Mock PDF binary content for testing stream');
    fs.writeFileSync(sampleDocxPath, 'Mock DOCX binary content for testing unsupported media type');

    // Create test JWTs
    const secret = config.jwt.secret || 'test-jwt-secret';
    candidateToken = jwt.sign({ id: 10, role: 'candidate' }, secret, { expiresIn: '1h' });
    candidate2Token = jwt.sign({ id: 20, role: 'candidate' }, secret, { expiresIn: '1h' });
    adminToken = jwt.sign({ id: 1, role: 'admin' }, secret, { expiresIn: '1h' });

    // Setup express app with full pipeline
    app = express();
    app.use(express.json());
    app.use(localeMiddleware);
    app.use('/api/cv', cvRoutes);
    app.use(errorHandler);
  });

  afterAll(() => {
    if (fs.existsSync(samplePdfPath)) fs.unlinkSync(samplePdfPath);
    if (fs.existsSync(sampleDocxPath)) fs.unlinkSync(sampleDocxPath);
    if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Service Unit Tests: cvService.getPreviewDocument', () => {
    it('successfully validates and returns PDF file path when owned by candidate', async () => {
      jest.spyOn(db.CvDocument, 'findByPk').mockResolvedValueOnce({
        id: 1,
        candidate_profile_id: 100,
        original_filename: 'ahmed_wael_cv.pdf',
        storage_path: samplePdfPath,
        mime_type: 'application/pdf',
        candidateProfile: {
          id: 100,
          user_id: 10
        }
      });

      const result = await cvService.getPreviewDocument(10, 1, 'en');
      expect(result.filePath).toBe(samplePdfPath);
      expect(result.filename).toBe('ahmed_wael_cv.pdf');
    });

    it('successfully retrieves candidate latest active CV when cvDocumentId is omitted or latest', async () => {
      jest.spyOn(db.CandidateProfile, 'findOne').mockResolvedValueOnce({
        id: 100,
        user_id: 10
      });

      jest.spyOn(db.CvDocument, 'findOne').mockResolvedValueOnce({
        id: 7,
        candidate_profile_id: 100,
        original_filename: 'latest_cv.pdf',
        storage_path: samplePdfPath,
        mime_type: 'application/pdf',
        is_current: true,
        candidateProfile: {
          id: 100,
          user_id: 10
        }
      });

      const result = await cvService.getPreviewDocument(10, null, 'en');
      expect(result.filePath).toBe(samplePdfPath);
      expect(result.filename).toBe('latest_cv.pdf');
    });

    it('throws 404 NotFoundError when CV document does not exist in database', async () => {
      jest.spyOn(db.CvDocument, 'findByPk').mockResolvedValue(null);

      await expect(cvService.getPreviewDocument(10, 999, 'en')).rejects.toThrow(NotFoundError);
      await expect(cvService.getPreviewDocument(10, 999, 'en')).rejects.toMatchObject({
        statusCode: 404,
        message: 'CV document not found.'
      });
    });

    it('throws 403 ForbiddenError when candidate does not strictly own the document', async () => {
      jest.spyOn(db.CvDocument, 'findByPk').mockResolvedValue({
        id: 1,
        candidate_profile_id: 200,
        original_filename: 'sara_cv.pdf',
        storage_path: samplePdfPath,
        mime_type: 'application/pdf',
        candidateProfile: {
          id: 200,
          user_id: 20 // Different candidate
        }
      });

      await expect(cvService.getPreviewDocument(10, 1, 'en')).rejects.toThrow(ForbiddenError);
      await expect(cvService.getPreviewDocument(10, 1, 'en')).rejects.toMatchObject({
        statusCode: 403,
        message: 'You do not have permission to access this CV document.'
      });
    });

    it('throws 404 NotFoundError when physical file does not exist on disk', async () => {
      jest.spyOn(db.CvDocument, 'findByPk').mockResolvedValue({
        id: 1,
        candidate_profile_id: 100,
        original_filename: 'missing.pdf',
        storage_path: path.join(tempDir, 'non_existent_file.pdf'),
        mime_type: 'application/pdf',
        candidateProfile: {
          id: 100,
          user_id: 10
        }
      });

      await expect(cvService.getPreviewDocument(10, 1, 'en')).rejects.toThrow(NotFoundError);
      await expect(cvService.getPreviewDocument(10, 1, 'en')).rejects.toMatchObject({
        statusCode: 404,
        message: 'The requested CV file does not exist in storage.'
      });
    });

    it('successfully validates and returns DOCX file path and mimeType for inline streaming', async () => {
      jest.spyOn(db.CvDocument, 'findByPk').mockResolvedValue({
        id: 2,
        candidate_profile_id: 100,
        original_filename: 'ahmed_cv.docx',
        storage_path: sampleDocxPath,
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        candidateProfile: {
          id: 100,
          user_id: 10
        }
      });

      const result = await cvService.getPreviewDocument(10, 2, 'en');
      expect(result.filePath).toBe(sampleDocxPath);
      expect(result.filename).toBe('ahmed_cv.docx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('returns Arabic localized error message when locale is ar and CV not found', async () => {
      jest.spyOn(db.CvDocument, 'findByPk').mockResolvedValueOnce(null);

      await expect(cvService.getPreviewDocument(10, 999, 'ar')).rejects.toMatchObject({
        statusCode: 404,
        message: 'ملف السيرة الذاتية غير موجود.'
      });
    });
  });

  describe('2. HTTP Endpoints & Route Security Tests: GET /api/cv/preview/:cvDocument', () => {
    it('returns 401 Unauthorized when Authorization header is missing', async () => {
      const res = await request(app)
        .get('/api/cv/preview/1')
        .expect(401);

      expect(res.body.message).toMatch(/Unauthenticated/i);
    });

    it('returns 401 Unauthorized when token is invalid', async () => {
      const res = await request(app)
        .get('/api/cv/preview/1')
        .set('Authorization', 'Bearer invalid-token-payload')
        .expect(401);

      expect(res.body.message).toMatch(/Unauthenticated/i);
    });

    it('returns 403 Forbidden when user is an admin instead of active candidate', async () => {
      // Mock db.User.findByPk for auth middleware
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 1,
        role: 'admin',
        is_active: true
      });

      const res = await request(app)
        .get('/api/cv/preview/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(res.body.message).toMatch(/permission/i);
    });

    it('returns 403 Forbidden when candidate tries to preview another candidate CV document', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 10,
        role: 'candidate',
        is_active: true
      });

      jest.spyOn(db.CvDocument, 'findByPk').mockResolvedValueOnce({
        id: 5,
        candidate_profile_id: 200,
        original_filename: 'other_candidate.pdf',
        storage_path: samplePdfPath,
        mime_type: 'application/pdf',
        candidateProfile: {
          id: 200,
          user_id: 20 // Owned by user 20
        }
      });

      const res = await request(app)
        .get('/api/cv/preview/5')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(403);

      expect(res.body.message).toMatch(/permission/i);
    });

    it('returns 404 Not Found when CV document does not exist', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 10,
        role: 'candidate',
        is_active: true
      });

      jest.spyOn(db.CvDocument, 'findByPk').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/cv/preview/999')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(404);

      expect(res.body.message).toMatch(/not found/i);
    });

    it('returns 404 Not Found when physical file is missing from storage', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 10,
        role: 'candidate',
        is_active: true
      });

      jest.spyOn(db.CvDocument, 'findByPk').mockResolvedValueOnce({
        id: 1,
        candidate_profile_id: 100,
        original_filename: 'my_cv.pdf',
        storage_path: path.join(tempDir, 'ghost_file.pdf'),
        mime_type: 'application/pdf',
        candidateProfile: {
          id: 100,
          user_id: 10
        }
      });

      const res = await request(app)
        .get('/api/cv/preview/1')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(404);

      expect(res.body.message).toMatch(/exist in storage|not found/i);
    });

    it('streams DOCX binary content with matching document mime type and inline disposition', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 10,
        role: 'candidate',
        is_active: true
      });

      jest.spyOn(db.CvDocument, 'findByPk').mockResolvedValueOnce({
        id: 2,
        candidate_profile_id: 100,
        original_filename: 'ahmed_profile.docx',
        storage_path: sampleDocxPath,
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        candidateProfile: {
          id: 100,
          user_id: 10
        }
      });

      const res = await request(app)
        .get('/api/cv/preview/2')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('wordprocessingml.document');
      expect(res.headers['content-disposition']).toBe('inline; filename="ahmed_profile.docx"');
    });

    it('streams PDF binary content with Content-Type and Content-Disposition headers', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 10,
        role: 'candidate',
        is_active: true
      });

      jest.spyOn(db.CvDocument, 'findByPk').mockResolvedValueOnce({
        id: 1,
        candidate_profile_id: 100,
        original_filename: 'ahmed_wael_resume.pdf',
        storage_path: samplePdfPath,
        mime_type: 'application/pdf',
        candidateProfile: {
          id: 100,
          user_id: 10
        }
      });

      const res = await request(app)
        .get('/api/cv/preview/1')
        .set('Authorization', `Bearer ${candidateToken}`)
        .buffer()
        .parse((response, callback) => {
          response.setEncoding('binary');
          let data = '';
          response.on('data', chunk => { data += chunk; });
          response.on('end', () => { callback(null, Buffer.from(data, 'binary')); });
        })
        .expect(200);

      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.headers['content-disposition']).toBe('inline; filename="ahmed_wael_resume.pdf"');
      expect(res.body.toString('utf8')).toContain('%PDF-1.4 Mock PDF binary content');
    });

    it('supports Accept-Language: ar header for localized 404 response', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 10,
        role: 'candidate',
        is_active: true
      });

      jest.spyOn(db.CvDocument, 'findByPk').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/cv/preview/999')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept-Language', 'ar')
        .expect(404);

      expect(res.body.message).toMatch(/ملف السيرة الذاتية غير موجود/);
    });

    it('GET /api/cv/preview streams latest CV without requiring an ID parameter', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 10,
        role: 'candidate',
        is_active: true
      });

      jest.spyOn(db.CandidateProfile, 'findOne').mockResolvedValueOnce({
        id: 100,
        user_id: 10
      });

      jest.spyOn(db.CvDocument, 'findOne').mockResolvedValueOnce({
        id: 7,
        candidate_profile_id: 100,
        original_filename: 'latest_resume.pdf',
        storage_path: samplePdfPath,
        mime_type: 'application/pdf',
        is_current: true,
        candidateProfile: {
          id: 100,
          user_id: 10
        }
      });

      const res = await request(app)
        .get('/api/cv/preview')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.headers['content-disposition']).toBe('inline; filename="latest_resume.pdf"');
    });

    it('GET /api/cv/preview/latest streams latest CV', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 10,
        role: 'candidate',
        is_active: true
      });

      jest.spyOn(db.CandidateProfile, 'findOne').mockResolvedValueOnce({
        id: 100,
        user_id: 10
      });

      jest.spyOn(db.CvDocument, 'findOne').mockResolvedValueOnce({
        id: 7,
        candidate_profile_id: 100,
        original_filename: 'latest_resume.pdf',
        storage_path: samplePdfPath,
        mime_type: 'application/pdf',
        is_current: true,
        candidateProfile: {
          id: 100,
          user_id: 10
        }
      });

      const res = await request(app)
        .get('/api/cv/preview/latest')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.headers['content-disposition']).toBe('inline; filename="latest_resume.pdf"');
    });

    it('GET /api/cv streams latest CV file directly at root /cv', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 10,
        role: 'candidate',
        is_active: true
      });

      jest.spyOn(db.CandidateProfile, 'findOne').mockResolvedValueOnce({
        id: 100,
        user_id: 10
      });

      jest.spyOn(db.CvDocument, 'findOne').mockResolvedValueOnce({
        id: 7,
        candidate_profile_id: 100,
        original_filename: 'latest_resume.pdf',
        storage_path: samplePdfPath,
        mime_type: 'application/pdf',
        is_current: true,
        candidateProfile: {
          id: 100,
          user_id: 10
        }
      });

      const res = await request(app)
        .get('/api/cv')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.headers['content-disposition']).toBe('inline; filename="latest_resume.pdf"');
      expect(res.headers['accept-ranges']).toBe('bytes');
    });

    it('GET /api/cv/file/:cvDocument returns CV file including DOCX without 415 error', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 10,
        role: 'candidate',
        is_active: true
      });

      jest.spyOn(db.CvDocument, 'findByPk').mockResolvedValueOnce({
        id: 2,
        candidate_profile_id: 100,
        original_filename: 'ahmed_profile.docx',
        storage_path: sampleDocxPath,
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        candidateProfile: {
          id: 100,
          user_id: 10
        }
      });

      const res = await request(app)
        .get('/api/cv/file/2')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('wordprocessingml.document');
      expect(res.headers['content-disposition']).toBe('inline; filename="ahmed_profile.docx"');
    });

    it('GET /api/cv/download returns CV file with attachment disposition', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 10,
        role: 'candidate',
        is_active: true
      });

      jest.spyOn(db.CandidateProfile, 'findOne').mockResolvedValueOnce({
        id: 100,
        user_id: 10
      });

      jest.spyOn(db.CvDocument, 'findOne').mockResolvedValueOnce({
        id: 7,
        candidate_profile_id: 100,
        original_filename: 'latest_resume.pdf',
        storage_path: samplePdfPath,
        mime_type: 'application/pdf',
        is_current: true,
        candidateProfile: {
          id: 100,
          user_id: 10
        }
      });

      const res = await request(app)
        .get('/api/cv/download')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(res.headers['content-disposition']).toBe('attachment; filename="latest_resume.pdf"');
    });
  });

  describe('3. cvService.getCvFile direct service tests', () => {
    it('returns DOCX file successfully without throwing UnsupportedMediaTypeError', async () => {
      jest.spyOn(db.CvDocument, 'findByPk').mockResolvedValueOnce({
        id: 2,
        candidate_profile_id: 100,
        original_filename: 'ahmed_profile.docx',
        storage_path: sampleDocxPath,
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        candidateProfile: {
          id: 100,
          user_id: 10
        }
      });

      const result = await cvService.getCvFile(10, 2, 'en');
      expect(result.filePath).toBe(sampleDocxPath);
      expect(result.filename).toBe('ahmed_profile.docx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
  });

  describe('4. POST /api/cv/file (Upload Raw CV File without AI extraction)', () => {
    it('directly creates CvDocument record without creating CvExtraction or queue job', async () => {
      jest.spyOn(db.CandidateProfile, 'findOne').mockResolvedValueOnce({
        id: 100,
        user_id: 10
      });
      jest.spyOn(db.CvDocument, 'max').mockResolvedValueOnce(2);
      jest.spyOn(db.CvDocument, 'update').mockResolvedValueOnce([1]);
      jest.spyOn(db.CvDocument, 'create').mockResolvedValueOnce({
        id: 3,
        candidate_profile_id: 100,
        original_filename: 'direct_upload.pdf',
        storage_path: samplePdfPath,
        mime_type: 'application/pdf',
        file_size: 1024,
        version: 3,
        is_current: true,
        status: 'completed',
        processed_at: new Date()
      });

      const extractionSpy = jest.spyOn(db.CvExtraction, 'create');
      const queueSpy = jest.spyOn(queueService, 'dispatch');

      const mockFile = {
        originalname: 'direct_upload.pdf',
        path: samplePdfPath,
        mimetype: 'application/pdf',
        size: 1024
      };

      const result = await cvService.uploadRawCv(10, mockFile);

      expect(result.id).toBe(3);
      expect(result.version).toBe(3);
      expect(result.status).toBe('completed');
      expect(extractionSpy).not.toHaveBeenCalled();
      expect(queueSpy).not.toHaveBeenCalled();
    });

    it('returns 401 Unauthorized when uploading raw CV without token', async () => {
      const res = await request(app)
        .post('/api/cv/file')
        .expect(401);

      expect(res.body.message).toMatch(/Unauthenticated/i);
    });

    it('returns 403 Forbidden when user is an admin instead of active candidate', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 1,
        role: 'admin',
        is_active: true
      });

      const res = await request(app)
        .post('/api/cv/file')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(res.body.message).toMatch(/permission/i);
    });

    it('returns 422 Unprocessable Entity when no file is uploaded', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 10,
        role: 'candidate',
        is_active: true
      });

      const res = await request(app)
        .post('/api/cv/file')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(422);

      expect(res.body.message).toMatch(/required/i);
    });

    it('successfully uploads raw CV using field name "cv" and returns stored file details', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 10,
        role: 'candidate',
        is_active: true
      });
      jest.spyOn(db.CandidateProfile, 'findOne').mockResolvedValueOnce({
        id: 100,
        user_id: 10
      });
      jest.spyOn(db.CvDocument, 'max').mockResolvedValueOnce(0);
      jest.spyOn(db.CvDocument, 'update').mockResolvedValueOnce([0]);
      jest.spyOn(db.CvDocument, 'create').mockImplementationOnce((data) => Promise.resolve({
        id: 15,
        ...data,
        created_at: new Date(),
        updated_at: new Date()
      }));

      const queueSpy = jest.spyOn(queueService, 'dispatch');

      const res = await request(app)
        .post('/api/cv/file')
        .set('Authorization', `Bearer ${candidateToken}`)
        .attach('cv', samplePdfPath)
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toMatchObject({
        id: 15,
        candidate_profile_id: 100,
        original_filename: 'sample_resume.pdf',
        mime_type: 'application/pdf',
        version: 1,
        is_current: true,
        status: 'completed',
        preview_url: '/api/cv/preview/15',
        download_url: '/api/cv/download/15'
      });
      expect(queueSpy).not.toHaveBeenCalled();
    });

    it('successfully uploads raw CV using alternate field name "cv_file"', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValueOnce({
        id: 10,
        role: 'candidate',
        is_active: true
      });
      jest.spyOn(db.CandidateProfile, 'findOne').mockResolvedValueOnce({
        id: 100,
        user_id: 10
      });
      jest.spyOn(db.CvDocument, 'max').mockResolvedValueOnce(1);
      jest.spyOn(db.CvDocument, 'update').mockResolvedValueOnce([1]);
      jest.spyOn(db.CvDocument, 'create').mockImplementationOnce((data) => Promise.resolve({
        id: 16,
        ...data,
        created_at: new Date(),
        updated_at: new Date()
      }));

      const queueSpy = jest.spyOn(queueService, 'dispatch');

      const res = await request(app)
        .post('/api/cv/file')
        .set('Authorization', `Bearer ${candidateToken}`)
        .attach('cv_file', samplePdfPath)
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(16);
      expect(res.body.data.version).toBe(2);
      expect(res.body.data.original_filename).toBe('sample_resume.pdf');
      expect(queueSpy).not.toHaveBeenCalled();
    });
  });
});
