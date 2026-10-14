const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const authService = require('../../src/services/auth.service');
const worker = require('../../src/jobs/worker');

describe('Phase 4 - CV Lifecycle Integration Tests', () => {
  let candidateUser;
  let candidateToken;
  let otherCandidateUser;
  let otherCandidateToken;
  let firstCvId;
  let secondCvId;
  let firstExtractionId;

  beforeAll(async () => {
    await db.sequelize.authenticate();

    // Clean test tables
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.CvExtraction.destroy({ where: {}, truncate: true });
    await db.CvDocument.destroy({ where: {}, truncate: true });
    await db.CandidateSkill.destroy({ where: {}, truncate: true });
    await db.Experience.destroy({ where: {}, truncate: true });
    await db.Skill.destroy({ where: {}, truncate: true });
    await db.CandidateProfile.destroy({ where: {}, truncate: true });
    await db.QueueJob.destroy({ where: {}, truncate: true });
    await db.User.destroy({ where: {}, truncate: true });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // 1. Create candidate user
    candidateUser = await db.User.create({
      name: 'Ahmed Candidate',
      email: 'ahmed.cv@example.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    candidateToken = authService.generateToken(candidateUser);

    // 2. Create other candidate user
    otherCandidateUser = await db.User.create({
      name: 'Other Candidate',
      email: 'other.cv@example.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    otherCandidateToken = authService.generateToken(otherCandidateUser);
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('POST /api/cv/upload', () => {
    test('requires authentication (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/cv/upload')
        .set('Accept', 'application/json');

      expect(res.status).toBe(401);
    });

    test('fails with 422 if cv file is missing', async () => {
      const res = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toHaveProperty('cv');
    });

    test('fails with 422 if file format is unsupported (.txt)', async () => {
      const res = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json')
        .attach('cv', Buffer.from('Plain text CV'), {
          filename: 'resume.txt',
          contentType: 'text/plain'
        });

      expect(res.status).toBe(422);
      expect(res.body.errors.cv[0]).toContain('pdf, docx');
    });

    test('fails with 422 if file size exceeds 5MB limit', async () => {
      const largeBuffer = Buffer.alloc(5.5 * 1024 * 1024); // 5.5MB

      const res = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json')
        .attach('cv', largeBuffer, {
          filename: 'large_resume.pdf',
          contentType: 'application/pdf'
        });

      expect(res.status).toBe(422);
      expect(res.body.errors.cv[0]).toContain('5120 kilobytes');
    });

    test('successfully uploads valid PDF (version 1, 201 Created)', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 Mock CV Content with PHP and Laravel');

      const res = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json')
        .attach('cv', pdfBuffer, {
          filename: 'Ahmed_Wael_Resume.pdf',
          contentType: 'application/pdf'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.original_filename).toBe('Ahmed_Wael_Resume.pdf');
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.is_current).toBe(true);
      expect(res.body.data.status).toBe('processing');
      expect(Array.isArray(res.body.data.extractions)).toBe(true);
      expect(res.body.data.extractions.length).toBe(1);

      firstCvId = res.body.data.id;
      firstExtractionId = res.body.data.extractions[0].id;
    });

    test('uploading second CV increments version to 2 and marks previous as non-current', async () => {
      const docxBuffer = Buffer.from('Mock DOCX Content');

      const res = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json')
        .attach('cv', docxBuffer, {
          filename: 'Ahmed_Wael_Resume_v2.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.version).toBe(2);
      expect(res.body.data.is_current).toBe(true);

      secondCvId = res.body.data.id;

      // Verify first CV is now is_current = false
      const prevDoc = await db.CvDocument.findByPk(firstCvId);
      expect(Boolean(prevDoc.is_current)).toBe(false);
    });
  });

  describe('Queue Worker Processing & GET /api/cv/status/:cvDocument', () => {
    test('worker processes cv_parsing job and completes extraction', async () => {
      // Process pending queue jobs
      let processed = await worker.processNext();
      expect(processed).toBe(true);

      // Verify extraction status in DB
      const extraction = await db.CvExtraction.findByPk(firstExtractionId);
      expect(extraction.status).toBe('completed');
      expect(Number(extraction.confidence_score)).toBe(0.94);
      expect(extraction.extracted_data).toHaveProperty('skills');
      expect(extraction.completed_at).not.toBeNull();

      // Verify CV document status in DB
      const doc = await db.CvDocument.findByPk(firstCvId);
      expect(doc.status).toBe('completed');
      expect(doc.processed_at).not.toBeNull();
    });

    test('other candidate cannot access CV status (404 Not Found)', async () => {
      const res = await request(app)
        .get(`/api/cv/status/${firstCvId}`)
        .set('Authorization', `Bearer ${otherCandidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
    });

    test('GET /api/cv/status/:cvDocument returns completed status and extractions (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/cv/status/${firstCvId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.id).toBe(firstCvId);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.extractions[0].status).toBe('completed');
      expect(res.body.data.extractions[0].confidence_score).toBe(0.94);
    });
  });

  describe('GET /api/cv/history', () => {
    test('lists all candidate CV versions ordered by version DESC (200 OK)', async () => {
      const res = await request(app)
        .get('/api/cv/history')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].version).toBe(2);
      expect(res.body.data[1].version).toBe(1);
    });
  });

  describe('POST /api/cv/retry/:cvDocument', () => {
    test('other candidate cannot retry CV (404 Not Found)', async () => {
      const res = await request(app)
        .post(`/api/cv/retry/${firstCvId}`)
        .set('Authorization', `Bearer ${otherCandidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
    });

    test('triggers retry and sets status back to processing (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/cv/retry/${firstCvId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(firstCvId);
      expect(res.body.data.status).toBe('processing');

      // Verify a new extraction attempt was created
      const attemptsCount = await db.CvExtraction.count({
        where: { cv_document_id: firstCvId }
      });
      expect(attemptsCount).toBe(2);
    });
  });

  describe('POST /api/cv/extractions/:extraction/verify', () => {
    test('other candidate cannot verify extraction (404 Not Found)', async () => {
      const res = await request(app)
        .post(`/api/cv/extractions/${firstExtractionId}/verify`)
        .set('Authorization', `Bearer ${otherCandidateToken}`)
        .set('Accept', 'application/json')
        .send({
          skills: [{ name: 'PHP' }]
        });

      expect(res.status).toBe(404);
    });

    test('fails with 422 if invalid experience dates provided', async () => {
      const res = await request(app)
        .post(`/api/cv/extractions/${firstExtractionId}/verify`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json')
        .send({
          experiences: [
            {
              company_name: 'Acme',
              title: 'Engineer',
              start_date: 'invalid-date'
            }
          ]
        });

      expect(res.status).toBe(422);
    });

    test('verifies extraction and syncs confirmed skills and experiences (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/cv/extractions/${firstExtractionId}/verify`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json')
        .send({
          skills: [
            {
              name: 'PHP',
              category: 'Backend',
              proficiency_level: 'expert',
              confidence_score: 0.95
            },
            {
              name: 'Laravel',
              category: 'Framework',
              proficiency_level: 'expert',
              confidence_score: 0.98
            }
          ],
          experiences: [
            {
              company_name: 'Acme Corp',
              title: 'Backend Software Engineer',
              start_date: '2021-01-01',
              end_date: '2023-01-01',
              description: 'Developed backend APIs.'
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      // 1. Verify candidate skills were created with source = 'cv' and is_verified = true
      const candidateProfile = await db.CandidateProfile.findOne({
        where: { user_id: candidateUser.id }
      });

      const syncedSkills = await db.CandidateSkill.findAll({
        where: { candidate_profile_id: candidateProfile.id },
        include: [{ model: db.Skill, as: 'skill' }]
      });

      expect(syncedSkills.length).toBe(2);
      expect(syncedSkills[0].source).toBe('cv');
      expect(Boolean(syncedSkills[0].is_verified)).toBe(true);

      // 2. Verify experience was created with source = 'cv'
      const syncedExperiences = await db.Experience.findAll({
        where: { candidate_profile_id: candidateProfile.id }
      });

      expect(syncedExperiences.length).toBe(1);
      expect(syncedExperiences[0].company_name).toBe('Acme Corp');
      expect(syncedExperiences[0].source).toBe('cv');

      // 3. Verify extraction verified_at was updated
      const extraction = await db.CvExtraction.findByPk(firstExtractionId);
      expect(extraction.verified_at).not.toBeNull();
    });
  });
});
