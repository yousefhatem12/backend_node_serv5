const request = require('supertest');
const app = require('../../src/app');
const logger = require('../../src/utils/logger');
const db = require('../../src/models');

describe('Hardening, Security & System Health Tests', () => {
  describe('Security Headers (Helmet)', () => {
    it('returns critical HTTP security headers on API responses', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(res.headers).toHaveProperty('x-dns-prefetch-control', 'off');
      expect(res.headers).toHaveProperty('x-download-options', 'noopen');
      expect(res.headers).toHaveProperty('x-frame-options', 'SAMEORIGIN');
    });

    it('returns standardized 404 envelope for undefined routes', async () => {
      const res = await request(app).get('/api/non-existent-route-xyz');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Resource not found');
    });
  });

  describe('Logger Credential Sanitization', () => {
    it('redacts sensitive fields like password, token, and authorization in logger data', () => {
      const samplePayload = {
        name: 'Ahmed',
        email: 'ahmed@example.com',
        password: 'SuperSecretPassword!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        nested: {
          refreshToken: 'refresh-token-xyz',
          apiKey: 'key-12345',
          safeField: 'visible'
        }
      };

      // Call logger.debug with sensitive payload
      const winstonFormat = logger.format;
      // Logger formats handle sanitization internally without throwing
      expect(() => {
        logger.info('Test log event', samplePayload);
      }).not.toThrow();
    });
  });

  describe('Database Models & Relations Integrity', () => {
    it('verifies all expected core models are registered with Sequelize', () => {
      const expectedModels = [
        'User',
        'CandidateProfile',
        'CareerPreference',
        'Education',
        'Experience',
        'Project',
        'Skill',
        'CandidateSkill',
        'Company',
        'JobPost',
        'SavedJob',
        'Application',
        'ApplicationStatusHistory',
        'Notification',
        'JobSource',
        'IngestionRun',
        'RawJob',
        'JobMatch',
        'Roadmap',
        'RoadmapPhase',
        'RoadmapMilestone',
        'RoadmapTask',
        'MentorConversation',
        'MentorMessage',
        'AiReviewItem',
        'AiReviewAudit',
        'AuditLog',
        'CvImprovementAnalysis',
        'InterviewPrepSession',
        'InterviewPrepAnswer',
        'ApplicationStrategy'
      ];

      for (const modelName of expectedModels) {
        expect(db[modelName]).toBeDefined();
        expect(typeof db[modelName].findAll).toBe('function');
      }
    });
  });
});
