const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const authService = require('../../src/services/auth.service');

describe('Phase 6 - Applications Lifecycle & Status Tracking Integration Tests', () => {
  let candidateUser;
  let candidateToken;
  let candidateProfile;

  let otherCandidateUser;
  let otherCandidateToken;
  let otherCandidateProfile;

  let adminUser;
  let adminToken;

  let techCompany;
  let activeJob1;
  let activeJob2;
  let expiredJob;
  let cvDoc;

  beforeAll(async () => {
    await db.sequelize.authenticate();

    // Clean test tables
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.ApplicationStatusHistory.destroy({ where: {}, truncate: true });
    await db.Application.destroy({ where: {}, truncate: true });
    await db.SavedJob.destroy({ where: {}, truncate: true });
    await db.JobSkill.destroy({ where: {}, truncate: true });
    await db.JobPost.destroy({ where: {}, truncate: true });
    await db.CompanyAlias.destroy({ where: {}, truncate: true });
    await db.Company.destroy({ where: {}, truncate: true });
    await db.CvExtraction.destroy({ where: {}, truncate: true });
    await db.CvDocument.destroy({ where: {}, truncate: true });
    await db.CandidateProfile.destroy({ where: {}, truncate: true });
    await db.User.destroy({ where: {}, truncate: true });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // 1. Candidate 1
    candidateUser = await db.User.create({
      name: 'Ahmed Candidate',
      email: 'ahmed.applicant@skillmatch.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    candidateToken = authService.generateToken(candidateUser);
    candidateProfile = await db.CandidateProfile.create({
      user_id: candidateUser.id,
      job_title: 'Full Stack Engineer',
      country: 'Egypt',
      city: 'Cairo',
      looking_status: 'actively_looking'
    });

    // CV Document for candidate 1
    cvDoc = await db.CvDocument.create({
      candidate_profile_id: candidateProfile.id,
      original_filename: 'ahmed_cv.pdf',
      storage_path: 'uploads/cv/ahmed_cv.pdf',
      file_size: 102400,
      mime_type: 'application/pdf',
      version: 1,
      is_current: true,
      status: 'completed'
    });

    // 2. Candidate 2
    otherCandidateUser = await db.User.create({
      name: 'Sara Candidate',
      email: 'sara.applicant@skillmatch.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    otherCandidateToken = authService.generateToken(otherCandidateUser);
    otherCandidateProfile = await db.CandidateProfile.create({
      user_id: otherCandidateUser.id,
      job_title: 'Frontend Engineer',
      country: 'Egypt',
      city: 'Giza',
      looking_status: 'actively_looking'
    });

    // 3. Admin User
    adminUser = await db.User.create({
      name: 'HR Admin',
      email: 'hr.admin@skillmatch.com',
      password: 'Password123!',
      role: 'admin',
      is_active: true,
      email_verified_at: new Date()
    });
    adminToken = authService.generateToken(adminUser);

    // 4. Company & Job Posts
    techCompany = await db.Company.create({
      name: 'FinTech Hub',
      normalized_name: 'fintech hub',
      industry: 'Financial Technology',
      country: 'Egypt',
      city: 'Cairo',
      is_verified: true,
      is_active: true
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    activeJob1 = await db.JobPost.create({
      company_id: techCompany.id,
      title: 'Backend Node.js Engineer',
      canonical_role: 'Node.js Developer',
      description: 'Design and build high-volume fintech APIs.',
      job_type: 'job',
      employment_type: 'full-time',
      work_mode: 'remote',
      experience_level: 'mid-level',
      country: 'Egypt',
      city: 'Cairo',
      published_at: new Date(),
      expires_at: futureDate,
      is_active: true
    });

    activeJob2 = await db.JobPost.create({
      company_id: techCompany.id,
      title: 'Frontend React Developer',
      canonical_role: 'React Developer',
      description: 'Build responsive client dashboards.',
      job_type: 'job',
      employment_type: 'full-time',
      work_mode: 'hybrid',
      experience_level: 'mid-level',
      country: 'Egypt',
      city: 'Cairo',
      published_at: new Date(),
      expires_at: futureDate,
      is_active: true
    });

    expiredJob = await db.JobPost.create({
      company_id: techCompany.id,
      title: 'Expired Python Position',
      description: 'Job expired last week.',
      published_at: pastDate,
      expires_at: pastDate,
      is_active: true
    });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('1. Submitting Job Applications (POST /api/applications)', () => {
    it('should return 401 when unauthenticated user attempts to apply', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({
          job_id: activeJob1.id,
          cover_letter: 'I want to apply.'
        });

      expect(res.status).toBe(401);
    });

    it('should return 403 when an admin attempts to submit a candidate application', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          job_id: activeJob1.id
        });

      expect(res.status).toBe(403);
    });

    it('should return 422 if job is expired or inactive', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          job_id: expiredJob.id
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('no longer accepting applications');
    });

    it('should submit an application successfully for an active job', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          job_id: activeJob1.id,
          cover_letter: 'I have 4 years of Node.js experience building microservices.',
          cv_document_id: cvDoc.id
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Job application submitted successfully.');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.status).toBe('submitted');
      expect(res.body.data.cover_letter).toContain('4 years of Node.js');
      expect(res.body.data).toHaveProperty('applied_at');
    });

    it('should prevent duplicate applications for the same job with 422', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          job_id: activeJob1.id,
          cover_letter: 'Applying again.'
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toBe('You have already applied for this position.');
    });

    it('should allow candidate to apply to a different job', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          job_id: activeJob2.id,
          cover_letter: 'Applying to Frontend React position.'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('submitted');
    });
  });

  describe('2. Listing Applications (GET /api/applications)', () => {
    it('should list only own applications for candidate with pagination envelope', async () => {
      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body).toHaveProperty('links');
      expect(res.body.data.length).toBe(2);

      const appJobTitles = res.body.data.map(a => a.job.title);
      expect(appJobTitles).toContain('Backend Node.js Engineer');
      expect(appJobTitles).toContain('Frontend React Developer');
    });

    it('should isolate applications per candidate', async () => {
      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${otherCandidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('should allow admin to view all applications across all candidates', async () => {
      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data[0]).toHaveProperty('candidate');
      expect(res.body.data[0].candidate.name).toBe('Ahmed Candidate');
    });

    it('should filter applications by status query parameter', async () => {
      const res = await request(app)
        .get('/api/applications?status=submitted')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should filter applications by job title search keyword', async () => {
      const res = await request(app)
        .get('/api/applications?search=Node.js')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].job.title).toContain('Node.js');
    });
  });

  describe('3. Viewing Single Application (GET /api/applications/:application)', () => {
    let createdAppId;

    beforeAll(async () => {
      const appRecord = await db.Application.findOne({
        where: { candidate_profile_id: candidateProfile.id, job_post_id: activeJob1.id }
      });
      createdAppId = appRecord.id;
    });

    it('should return full application details including histories for owner candidate', async () => {
      const res = await request(app)
        .get(`/api/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdAppId);
      expect(res.body.data.job.title).toBe('Backend Node.js Engineer');
      expect(res.body.data.job.company.name).toBe('FinTech Hub');
      expect(res.body.data.cv_document.file_name).toBe('ahmed_cv.pdf');
      expect(res.body.data.histories.length).toBe(1);
      expect(res.body.data.histories[0].status).toBe('submitted');
      expect(res.body.data.histories[0].notes).toBe('Application submitted by candidate');
    });

    it('should return 404 when another candidate tries to view the application', async () => {
      const res = await request(app)
        .get(`/api/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${otherCandidateToken}`);

      expect(res.status).toBe(404);
    });

    it('should allow admin to view any candidate application', async () => {
      const res = await request(app)
        .get(`/api/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdAppId);
      expect(res.body.data.candidate.email).toBe('ahmed.applicant@skillmatch.com');
    });
  });

  describe('4. Status Lifecycle Transitions (PATCH /api/applications/:application/status)', () => {
    let targetAppId;

    beforeAll(async () => {
      const appRecord = await db.Application.findOne({
        where: { candidate_profile_id: candidateProfile.id, job_post_id: activeJob1.id }
      });
      targetAppId = appRecord.id;
    });

    it('should return 403 when candidate attempts to update status', async () => {
      const res = await request(app)
        .patch(`/api/applications/${targetAppId}/status`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          status: 'shortlisted'
        });

      expect(res.status).toBe(403);
    });

    it('should allow admin to progress application status with notes', async () => {
      const res = await request(app)
        .patch(`/api/applications/${targetAppId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'under_review',
          notes: 'CV matched high percentage of backend requirements.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('under_review');
    });

    it('should progress to shortlisted and record status audit trail', async () => {
      const res = await request(app)
        .patch(`/api/applications/${targetAppId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'shortlisted',
          notes: 'Passed initial screening, scheduling technical interview.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('shortlisted');

      // Verify audit histories
      const detailRes = await request(app)
        .get(`/api/applications/${targetAppId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detailRes.body.data.histories.length).toBe(3);
      const statuses = detailRes.body.data.histories.map(h => h.status);
      expect(statuses).toEqual(['submitted', 'under_review', 'shortlisted']);
    });

    it('should reject transition to identical status with 422', async () => {
      const res = await request(app)
        .patch(`/api/applications/${targetAppId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'shortlisted'
        });

      expect(res.status).toBe(422);
    });
  });

  describe('5. Candidate Self-Withdrawal & Personal Notes', () => {
    let withdrawAppId;

    beforeAll(async () => {
      const appRecord = await db.Application.findOne({
        where: { candidate_profile_id: candidateProfile.id, job_post_id: activeJob2.id }
      });
      withdrawAppId = appRecord.id;
    });

    it('should allow candidate to update personal tracker notes', async () => {
      const res = await request(app)
        .patch(`/api/applications/${withdrawAppId}/notes`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          notes: 'Followed up via LinkedIn with hiring manager on Oct 10.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.notes).toContain('Followed up via LinkedIn');
    });

    it('should allow candidate to withdraw their application', async () => {
      const res = await request(app)
        .post(`/api/applications/${withdrawAppId}/withdraw`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('withdrawn');

      // Verify history contains withdrawn entry
      const detailRes = await request(app)
        .get(`/api/applications/${withdrawAppId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      const lastHistory = detailRes.body.data.histories[detailRes.body.data.histories.length - 1];
      expect(lastHistory.status).toBe('withdrawn');
    });

    it('should reject withdrawing an already withdrawn application with 422', async () => {
      const res = await request(app)
        .post(`/api/applications/${withdrawAppId}/withdraw`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('already withdrawn');
    });

    it('should reject admin status updates on a withdrawn application with 422', async () => {
      const res = await request(app)
        .patch(`/api/applications/${withdrawAppId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'interview'
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('withdrawn application');
    });
  });
});
