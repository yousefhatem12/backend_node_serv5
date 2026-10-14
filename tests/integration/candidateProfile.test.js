const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const authService = require('../../src/services/auth.service');

describe('Phase 2 - Candidate Profile & Portfolio Integration Tests', () => {
  let candidateUser;
  let candidateToken;
  let otherCandidateUser;
  let otherCandidateToken;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    await db.sequelize.authenticate();
    // Clean test tables
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.Education.destroy({ where: {}, truncate: true });
    await db.Experience.destroy({ where: {}, truncate: true });
    await db.Project.destroy({ where: {}, truncate: true });
    await db.Certificate.destroy({ where: {}, truncate: true });
    await db.Language.destroy({ where: {}, truncate: true });
    await db.CareerPreference.destroy({ where: {}, truncate: true });
    await db.CandidateProfile.destroy({ where: {}, truncate: true });
    await db.User.destroy({ where: {}, truncate: true });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // 1. Create candidate user
    candidateUser = await db.User.create({
      name: 'Ahmed Wael',
      email: 'ahmed.profile@example.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    candidateToken = authService.generateToken(candidateUser);

    // 2. Create another candidate user (for ownership tests)
    otherCandidateUser = await db.User.create({
      name: 'Other Candidate',
      email: 'other.candidate@example.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    otherCandidateToken = authService.generateToken(otherCandidateUser);

    // 3. Create admin user
    adminUser = await db.User.create({
      name: 'Admin User',
      email: 'admin.profile@example.com',
      password: 'Password123!',
      role: 'admin',
      is_active: true,
      email_verified_at: new Date()
    });
    adminToken = authService.generateToken(adminUser);
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  // 1. GET & PATCH PROFILE
  describe('Candidate Profile Endpoints', () => {
    test('GET /api/candidate/profile requires candidate role (403 for admin)', async () => {
      const res = await request(app)
        .get('/api/candidate/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(403);
    });

    test('GET /api/candidate/profile returns candidate profile (200 OK)', async () => {
      const res = await request(app)
        .get('/api/candidate/profile')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.profile_exists).toBe(true);
      expect(res.body.data.full_name).toBe(candidateUser.name);
      expect(res.body.data.profile.full_name).toBe(candidateUser.name);
      expect(res.body.data.user.id).toBe(candidateUser.id);
      expect(res.body.data.profile).toBeDefined();
    });

    test('PATCH /api/candidate/profile updates fields and sets profile_completed_at', async () => {
      const updateData = {
        full_name: 'Ahmed Wael Senior',
        job_title: 'Full Stack Software Engineer',
        country: 'Egypt',
        state: 'Cairo',
        city: 'Nasr City',
        professional_summary: 'Passionate engineer with microservices expertise.',
        github_url: 'https://github.com/ahmedwael',
        linkedin_url: 'https://linkedin.com/in/ahmedwael'
      };

      const res = await request(app)
        .patch('/api/candidate/profile')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send(updateData)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.data.full_name).toBe('Ahmed Wael Senior');
      expect(res.body.data.profile.full_name).toBe('Ahmed Wael Senior');
      expect(res.body.data.profile.job_title).toBe('Full Stack Software Engineer');
      expect(res.body.data.profile.country).toBe('Egypt');
      expect(res.body.data.profile.city).toBe('Nasr City');
      expect(res.body.data.profile.profile_completed_at).not.toBeNull();
    });
  });

  // 2. CAREER PREFERENCES
  describe('Career Preferences Endpoints', () => {
    test('GET /api/candidate/career-preferences returns preferences (200 OK)', async () => {
      const res = await request(app)
        .get('/api/candidate/career-preferences')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.job_type).toBe('full-time');
    });

    test('PATCH /api/candidate/career-preferences updates target roles and industries', async () => {
      const prefData = {
        target_roles: ['Backend Engineer', 'Cloud Architect'],
        preferred_industries: ['Fintech', 'E-commerce'],
        work_mode: 'remote',
        open_to_relocation: true
      };

      const res = await request(app)
        .patch('/api/candidate/career-preferences')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send(prefData)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.data.target_roles).toEqual(['Backend Engineer', 'Cloud Architect']);
      expect(res.body.data.target_role).toBe('Backend Engineer');
      expect(res.body.data.preferred_industries).toEqual(['Fintech', 'E-commerce']);
      expect(res.body.data.open_to_relocation).toBe(true);
    });
  });

  // 3. EDUCATIONS CRUD
  describe('Educations CRUD', () => {
    let createdEducationId;

    test('POST /api/candidate/educations creates new education (201 Created)', async () => {
      const eduData = {
        institution: 'Cairo University',
        degree: "Bachelor's Degree",
        field_of_study: 'Computer Science',
        education_level: 'bachelor',
        start_date: '2016-09-01',
        end_date: '2020-06-30',
        is_current: false,
        grade: 'Excellent with Honors',
        description: 'Graduation project: Distributed Cloud Storage System.',
        source: 'manual'
      };

      const res = await request(app)
        .post('/api/candidate/educations')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send(eduData)
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body.data.institution).toBe('Cairo University');
      expect(res.body.data.degree).toBe("Bachelor's Degree");
      expect(res.body.data.source).toBe('manual');

      createdEducationId = res.body.data.id;
    });

    test('POST /api/candidate/educations fails with 422 if end_date is before start_date', async () => {
      const invalidEdu = {
        institution: 'Cairo University',
        degree: "Bachelor's Degree",
        field_of_study: 'Computer Science',
        start_date: '2020-09-01',
        end_date: '2016-06-30',
        is_current: false
      };

      const res = await request(app)
        .post('/api/candidate/educations')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send(invalidEdu)
        .set('Accept', 'application/json');

      expect(res.status).toBe(422);
      expect(res.body.errors).toHaveProperty('end_date');
    });

    test('GET /api/candidate/educations lists candidate educations', async () => {
      const res = await request(app)
        .get('/api/candidate/educations')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].id).toBe(createdEducationId);
    });

    test('PATCH /api/candidate/educations/:id updates education', async () => {
      const res = await request(app)
        .patch(`/api/candidate/educations/${createdEducationId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ grade: 'First Class Honors' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.data.grade).toBe('First Class Honors');
    });

    test('other candidate cannot access or delete education (404 Not Found)', async () => {
      const res = await request(app)
        .delete(`/api/candidate/educations/${createdEducationId}`)
        .set('Authorization', `Bearer ${otherCandidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
    });

    test('DELETE /api/candidate/educations/:id removes education (204 No Content)', async () => {
      const res = await request(app)
        .delete(`/api/candidate/educations/${createdEducationId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(204);
    });
  });

  // 4. WORK EXPERIENCES CRUD
  describe('Work Experiences CRUD', () => {
    let createdExperienceId;

    test('POST /api/candidate/experiences creates experience (201 Created)', async () => {
      const expData = {
        job_title: 'Backend Software Engineer',
        company_name: 'Tech Innovations Inc.',
        employment_type: 'full-time',
        country: 'Egypt',
        city: 'Cairo',
        start_date: '2021-01-01',
        end_date: null,
        is_current: true,
        description: 'Architected RESTful microservices in Node and MySQL.',
        technologies: ['Node.js', 'Express', 'MySQL', 'Docker'],
        source: 'manual'
      };

      const res = await request(app)
        .post('/api/candidate/experiences')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send(expData)
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body.data.job_title).toBe('Backend Software Engineer');
      expect(res.body.data.is_current).toBe(true);
      expect(res.body.data.technologies).toContain('Node.js');

      createdExperienceId = res.body.data.id;
    });

    test('GET /api/candidate/experiences returns list', async () => {
      const res = await request(app)
        .get('/api/candidate/experiences')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].id).toBe(createdExperienceId);
    });

    test('DELETE /api/candidate/experiences/:id removes experience (204 No Content)', async () => {
      const res = await request(app)
        .delete(`/api/candidate/experiences/${createdExperienceId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(204);
    });
  });

  // 5. PROJECTS CRUD
  describe('Projects CRUD', () => {
    let createdProjectId;

    test('POST /api/candidate/projects creates project (201 Created)', async () => {
      const projData = {
        name: 'E-Commerce Platform',
        description: 'Microservices based distributed platform.',
        technologies: ['Node.js', 'Express', 'MySQL'],
        project_url: 'https://store.example.com',
        github_url: 'https://github.com/ahmedwael/ecommerce',
        start_date: '2023-01-01',
        end_date: '2023-06-01',
        source: 'manual'
      };

      const res = await request(app)
        .post('/api/candidate/projects')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send(projData)
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('E-Commerce Platform');

      createdProjectId = res.body.data.id;
    });

    test('GET /api/candidate/projects returns list', async () => {
      const res = await request(app)
        .get('/api/candidate/projects')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('DELETE /api/candidate/projects/:id removes project (204 No Content)', async () => {
      const res = await request(app)
        .delete(`/api/candidate/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(204);
    });
  });
});
