'use strict';

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const authService = require('../../src/services/auth.service');

describe('Phase 13 - Phase-2 AI: CV Improver, Interview Prep & Application Strategy Tests', () => {
  let candidateUser;
  let candidateToken;
  let otherCandidateUser;
  let otherCandidateToken;
  let adminUser;
  let adminToken;

  let candidateProfile;
  let cvDocument;
  let testCompany;
  let testJobSenior;
  let testJobJunior;

  beforeAll(async () => {
    await db.sequelize.authenticate();

    // Clean test tables
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.ApplicationStrategy.destroy({ where: {}, truncate: true });
    await db.InterviewPrepAnswer.destroy({ where: {}, truncate: true });
    await db.InterviewPrepSession.destroy({ where: {}, truncate: true });
    await db.CvImprovementAnalysis.destroy({ where: {}, truncate: true });
    await db.JobSkill.destroy({ where: {}, truncate: true });
    await db.JobPost.destroy({ where: {}, truncate: true });
    await db.Company.destroy({ where: {}, truncate: true });
    await db.Skill.destroy({ where: {}, truncate: true });
    await db.SkillCategory.destroy({ where: {}, truncate: true });
    await db.Experience.destroy({ where: {}, truncate: true });
    await db.CandidateSkill.destroy({ where: {}, truncate: true });
    await db.CvExtraction.destroy({ where: {}, truncate: true });
    await db.CvDocument.destroy({ where: {}, truncate: true });
    await db.CandidateProfile.destroy({ where: {}, truncate: true });
    await db.User.destroy({ where: {}, truncate: true });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // 1. Create candidate user
    candidateUser = await db.User.create({
      name: 'Nour Candidate',
      email: 'nour.ai@example.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    candidateToken = authService.generateToken(candidateUser);

    candidateProfile = await db.CandidateProfile.create({
      user_id: candidateUser.id,
      job_title: 'Junior Node.js Developer',
      years_of_experience: 2,
      country: 'Egypt',
      city: 'Cairo',
      profile_completed_at: new Date()
    });

    // 2. Create other candidate user
    otherCandidateUser = await db.User.create({
      name: 'Other Candidate',
      email: 'other.ai@example.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    otherCandidateToken = authService.generateToken(otherCandidateUser);

    // 3. Create admin user
    adminUser = await db.User.create({
      name: 'Admin Tester',
      email: 'admin.ai@example.com',
      password: 'Password123!',
      role: 'admin',
      is_active: true,
      email_verified_at: new Date()
    });
    adminToken = authService.generateToken(adminUser);

    // 4. Create Skills & Category
    const category = await db.SkillCategory.create({ name: 'Backend', slug: 'backend' });
    const skillNode = await db.Skill.create({ name: 'Node.js', slug: 'nodejs', category_id: category.id });
    const skillExpress = await db.Skill.create({ name: 'Express', slug: 'express', category_id: category.id });
    const skillDocker = await db.Skill.create({ name: 'Docker', slug: 'docker', category_id: category.id });
    const skillK8s = await db.Skill.create({ name: 'Kubernetes', slug: 'kubernetes', category_id: category.id });

    // Link skills to candidate
    await db.CandidateSkill.create({ candidate_profile_id: candidateProfile.id, skill_id: skillNode.id });
    await db.CandidateSkill.create({ candidate_profile_id: candidateProfile.id, skill_id: skillExpress.id });

    // Candidate experience
    await db.Experience.create({
      candidate_profile_id: candidateProfile.id,
      job_title: 'Junior Backend Engineer',
      company_name: 'Cairo Tech Lab',
      start_date: new Date('2024-01-01'),
      is_current: true,
      description: 'Worked on backend APIs using Node.js and Express.'
    });

    // CV Document & Extraction
    cvDocument = await db.CvDocument.create({
      candidate_profile_id: candidateProfile.id,
      storage_path: 'cvs/nour_cv_v1.pdf',
      original_filename: 'nour_cv_v1.pdf',
      file_size: 10240,
      mime_type: 'application/pdf',
      version: 1,
      status: 'completed'
    });


    await db.CvExtraction.create({
      cv_document_id: cvDocument.id,
      raw_text: 'Nour El-Din - Junior Backend Developer with 2 years experience in Node.js and Express building web services.',
      confidence_score: 0.90
    });

    // 5. Create Company & Job Posts
    testCompany = await db.Company.create({
      name: 'FinTech Cloud Inc',
      normalized_name: 'fintech cloud inc',
      is_verified: true,
      is_active: true
    });

    // Senior Job (Stretch for candidate: 5 years exp, Docker & K8s required)
    testJobSenior = await db.JobPost.create({
      company_id: testCompany.id,
      title: 'Senior Cloud Systems Architect',
      description: 'High concurrency systems architecture and Kubernetes orchestration',
      job_type: 'job',
      employment_type: 'full-time',
      work_mode: 'remote',
      experience_level: 'senior',
      min_years_experience: 5,
      is_active: true
    });
    await db.JobSkill.create({ job_post_id: testJobSenior.id, skill_id: skillDocker.id, is_required: true });
    await db.JobSkill.create({ job_post_id: testJobSenior.id, skill_id: skillK8s.id, is_required: true });

    // Junior Job (Strong fit: 1-2 years exp, Node.js & Express required)
    testJobJunior = await db.JobPost.create({
      company_id: testCompany.id,
      title: 'Backend Node.js Developer',
      description: 'Junior to mid-level backend developer building scalable microservices',
      job_type: 'job',
      employment_type: 'full-time',
      work_mode: 'hybrid',
      experience_level: 'entry',
      min_years_experience: 1,
      is_active: true
    });
    await db.JobSkill.create({ job_post_id: testJobJunior.id, skill_id: skillNode.id, is_required: true });
    await db.JobSkill.create({ job_post_id: testJobJunior.id, skill_id: skillExpress.id, is_required: true });
    await db.JobSkill.create({ job_post_id: testJobJunior.id, skill_id: skillDocker.id, is_required: false });
  });

  describe('1. Access Control & Candidate Role Guards', () => {
    it('rejects unauthenticated request to cv-improvements with 401', async () => {
      const res = await request(app).post('/api/candidate/cv-improvements/analyze');
      expect(res.status).toBe(401);
    });

    it('rejects admin token with 403 on candidate-specific AI routes', async () => {
      const res = await request(app)
        .post('/api/candidate/cv-improvements/analyze')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated interview-prep request with 401', async () => {
      const res = await request(app).post('/api/interview-prep/sessions');
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated application-strategy request with 401', async () => {
      const res = await request(app).post('/api/application-strategy/assess');
      expect(res.status).toBe(401);
    });
  });

  describe('2. CV Improvement Assistant', () => {
    let latestAnalysisId;

    it('POST /api/candidate/cv-improvements/analyze generates comprehensive CV analysis', async () => {
      const res = await request(app)
        .post('/api/candidate/cv-improvements/analyze')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ target_role: 'Full Stack Node.js Engineer' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');

      const data = res.body.data;
      latestAnalysisId = data.id;

      expect(data).toHaveProperty('overall_score');
      expect(data.overall_score).toBeGreaterThanOrEqual(40);
      expect(data.overall_score).toBeLessThanOrEqual(100);

      expect(Array.isArray(data.critical_issues)).toBe(true);
      expect(Array.isArray(data.missing_keywords)).toBe(true);
      expect(Array.isArray(data.bullet_improvements)).toBe(true);
      expect(data.bullet_improvements.length).toBeGreaterThanOrEqual(1);

      const firstBullet = data.bullet_improvements[0];
      expect(firstBullet).toHaveProperty('original_sample');
      expect(firstBullet).toHaveProperty('suggested_rewrite');
      expect(firstBullet).toHaveProperty('rationale');

      expect(Array.isArray(data.structural_tips)).toBe(true);
      expect(data.structural_tips.length).toBeGreaterThanOrEqual(2);
    });

    it('POST /api/candidate/cv-improvements/analyze against specific job post', async () => {
      const res = await request(app)
        .post('/api/candidate/cv-improvements/analyze')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ job_post_id: testJobJunior.id });

      expect(res.status).toBe(201);
      expect(res.body.data.job_post_id).toBe(Number(testJobJunior.id));
      expect(res.body.data.target_role).toBe(testJobJunior.title);
    });

    it('POST /api/candidate/cv-improvements/analyze returns 404 for invalid job_post_id', async () => {
      const res = await request(app)
        .post('/api/candidate/cv-improvements/analyze')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ job_post_id: 999999 });

      expect(res.status).toBe(404);
    });

    it('GET /api/candidate/cv-improvements/latest returns most recent analysis', async () => {
      const res = await request(app)
        .get('/api/candidate/cv-improvements/latest')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('overall_score');
      expect(res.body.data).toHaveProperty('bullet_improvements');
    });

    it('GET /api/candidate/cv-improvements returns paginated analysis history', async () => {
      const res = await request(app)
        .get('/api/candidate/cv-improvements')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body).toHaveProperty('links');
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('3. Interview Preparation Coach', () => {
    let sessionId;
    let firstQuestionId;

    it('POST /api/interview-prep/sessions initializes interview prep session with 5 questions', async () => {
      const res = await request(app)
        .post('/api/interview-prep/sessions')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          job_post_id: testJobJunior.id,
          difficulty: 'mid-level'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');

      const data = res.body.data;
      sessionId = data.id;

      expect(data.status).toBe('active');
      expect(data.total_questions).toBe(5);
      expect(data.answered_questions).toBe(0);
      expect(data.average_score).toBeNull();
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions.length).toBe(5);

      const q = data.questions[0];
      firstQuestionId = q.id;
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('question');
      expect(q).toHaveProperty('topic');
      expect(q).toHaveProperty('type');
      expect(q).toHaveProperty('model_answer_guidance');
    });

    it('GET /api/interview-prep/sessions lists candidate sessions with pagination', async () => {
      const res = await request(app)
        .get('/api/interview-prep/sessions')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/interview-prep/sessions/:session returns session details', async () => {
      const res = await request(app)
        .get(`/api/interview-prep/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(Number(sessionId));
      expect(res.body.data.questions.length).toBe(5);
    });

    it('GET /api/interview-prep/sessions/:session prevents unauthorized candidate access', async () => {
      const res = await request(app)
        .get(`/api/interview-prep/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${otherCandidateToken}`);

      expect(res.status).toBe(404);
    });

    it('POST /api/interview-prep/sessions/:session/evaluate evaluates candidate answer', async () => {
      const res = await request(app)
        .post(`/api/interview-prep/sessions/${sessionId}/evaluate`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          question_id: firstQuestionId,
          user_answer: 'In Node.js, I utilize asynchronous non-blocking I/O and worker threads for CPU-heavy tasks to prevent event loop starvation. I also configure Redis caching layers and profile database query latencies with EXPLAIN in production.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('answer');
      expect(res.body.data).toHaveProperty('session');

      const ans = res.body.data.answer;
      expect(ans.question_id).toBe(firstQuestionId);
      expect(ans.score).toBeGreaterThanOrEqual(70);
      expect(Array.isArray(ans.strengths)).toBe(true);
      expect(ans.strengths.length).toBeGreaterThanOrEqual(1);
      expect(ans.model_answer).toBeTruthy();

      const sess = res.body.data.session;
      expect(sess.answered_questions).toBe(1);
      expect(sess.average_score).not.toBeNull();
    });

    it('POST /api/interview-prep/sessions/:session/evaluate rejects empty answer with 422', async () => {
      const res = await request(app)
        .post(`/api/interview-prep/sessions/${sessionId}/evaluate`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          question_id: firstQuestionId,
          user_answer: 'hi'
        });

      expect(res.status).toBe(422);
    });
  });

  describe('4. Application Strategy Guidance', () => {
    let strongStrategyId;

    it('POST /api/application-strategy/assess evaluates strong fit role as apply_now', async () => {
      const res = await request(app)
        .post('/api/application-strategy/assess')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ job_post_id: testJobJunior.id });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');

      const data = res.body.data;
      strongStrategyId = data.id;

      expect(data.job_post_id).toBe(Number(testJobJunior.id));
      expect(data.recommendation).toBe('apply_now');
      expect(data.readiness_score).toBeGreaterThanOrEqual(70);
      expect(data.fit_level).toBe('strong_fit');

      expect(Array.isArray(data.quick_wins)).toBe(true);
      expect(data.quick_wins.length).toBeGreaterThanOrEqual(1);

      expect(data.strategic_advice).toBeTruthy();
      expect(data.job).toBeTruthy();
      expect(data.job.title).toBe(testJobJunior.title);
    });

    it('POST /api/application-strategy/assess evaluates stretch senior role as alternative_roles or improve_gaps_first', async () => {
      const res = await request(app)
        .post('/api/application-strategy/assess')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ job_post_id: testJobSenior.id });

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(['improve_gaps_first', 'alternative_roles']).toContain(data.recommendation);
      expect(data.fit_level).not.toBe('strong_fit');
      expect(Array.isArray(data.blocker_gaps)).toBe(true);
      expect(data.blocker_gaps.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(data.alternative_roles)).toBe(true);
    });

    it('POST /api/application-strategy/assess fails with 404 for invalid job_post_id', async () => {
      const res = await request(app)
        .post('/api/application-strategy/assess')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ job_post_id: 999999 });

      expect(res.status).toBe(404);
    });

    it('GET /api/application-strategy/:strategy retrieves strategic assessment', async () => {
      const res = await request(app)
        .get(`/api/application-strategy/${strongStrategyId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(Number(strongStrategyId));
      expect(res.body.data.recommendation).toBe('apply_now');
    });

    it('GET /api/application-strategy lists candidate strategy history', async () => {
      const res = await request(app)
        .get('/api/application-strategy')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body).toHaveProperty('links');
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });
});
