const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const authService = require('../../src/services/auth.service');

describe('Phase 5 - Companies, Jobs Feed, Filtering & Expiry Integration Tests', () => {
  let candidateUser;
  let candidateToken;
  let otherCandidateUser;
  let otherCandidateToken;
  let adminUser;
  let adminToken;

  let techCorp;
  let oldStartup;
  let targetCompany;
  let nodeSkill;
  let reactSkill;
  let dockerSkill;

  let activeJob1;
  let activeJob2;
  let expiredJob;
  let inactiveJob;

  beforeAll(async () => {
    await db.sequelize.authenticate();

    // Clean test tables
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.SavedJob.destroy({ where: {}, truncate: true });
    await db.JobSkill.destroy({ where: {}, truncate: true });
    await db.JobPost.destroy({ where: {}, truncate: true });
    await db.CompanyAlias.destroy({ where: {}, truncate: true });
    await db.Company.destroy({ where: {}, truncate: true });
    await db.CandidateProfile.destroy({ where: {}, truncate: true });
    await db.Skill.destroy({ where: {}, truncate: true });
    await db.User.destroy({ where: {}, truncate: true });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // 1. Users
    candidateUser = await db.User.create({
      name: 'Job Seeker',
      email: 'seeker@skillmatch.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    candidateToken = authService.generateToken(candidateUser);

    otherCandidateUser = await db.User.create({
      name: 'Other Seeker',
      email: 'otherseeker@skillmatch.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    otherCandidateToken = authService.generateToken(otherCandidateUser);

    adminUser = await db.User.create({
      name: 'Platform Admin',
      email: 'admin.jobs@skillmatch.com',
      password: 'Password123!',
      role: 'admin',
      is_active: true,
      email_verified_at: new Date()
    });
    adminToken = authService.generateToken(adminUser);

    // 2. Skills
    nodeSkill = await db.Skill.create({ name: 'Node.js', normalized_name: 'node.js', is_verified: true });
    reactSkill = await db.Skill.create({ name: 'React', normalized_name: 'react', is_verified: true });
    dockerSkill = await db.Skill.create({ name: 'Docker', normalized_name: 'docker', is_verified: true });

    // 3. Companies
    techCorp = await db.Company.create({
      name: 'TechCorp International',
      normalized_name: 'techcorp international',
      industry: 'Software',
      country: 'Egypt',
      city: 'Cairo',
      is_verified: true,
      is_active: true
    });

    oldStartup = await db.Company.create({
      name: 'Legacy Startup',
      normalized_name: 'legacy startup',
      industry: 'Fintech',
      country: 'Egypt',
      city: 'Alexandria',
      is_verified: false,
      is_active: true
    });

    targetCompany = await db.Company.create({
      name: 'Mega Enterprise',
      normalized_name: 'mega enterprise',
      industry: 'Fintech',
      country: 'Egypt',
      city: 'Cairo',
      is_verified: true,
      is_active: true
    });

    // 4. Job Posts
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    activeJob1 = await db.JobPost.create({
      company_id: techCorp.id,
      title: 'Senior Node.js Backend Developer',
      canonical_role: 'Backend Developer',
      description: 'Exciting role building cloud APIs using Node.js and Docker.',
      job_type: 'job',
      employment_type: 'full-time',
      work_mode: 'remote',
      experience_level: 'senior',
      country: 'Egypt',
      city: 'Cairo',
      min_years_experience: 4,
      published_at: new Date(),
      expires_at: futureDate,
      is_active: true
    });

    await db.JobSkill.create({
      job_post_id: activeJob1.id,
      skill_id: nodeSkill.id,
      is_required: true,
      importance: 5,
      required_level: 'senior'
    });
    await db.JobSkill.create({
      job_post_id: activeJob1.id,
      skill_id: dockerSkill.id,
      is_required: false,
      importance: 3,
      required_level: 'mid-level'
    });

    activeJob2 = await db.JobPost.create({
      company_id: techCorp.id,
      title: 'Frontend React Intern',
      canonical_role: 'Frontend Developer',
      description: 'Internship opportunity for building UI dashboards with React.',
      job_type: 'internship',
      employment_type: 'contract',
      work_mode: 'on-site',
      experience_level: 'entry',
      country: 'Egypt',
      city: 'Cairo',
      min_years_experience: 0,
      published_at: new Date(),
      expires_at: futureDate,
      is_active: true
    });

    await db.JobSkill.create({
      job_post_id: activeJob2.id,
      skill_id: reactSkill.id,
      is_required: true,
      importance: 4,
      required_level: 'entry'
    });

    expiredJob = await db.JobPost.create({
      company_id: techCorp.id,
      title: 'Expired Python Position',
      description: 'This job expired 10 days ago.',
      job_type: 'job',
      employment_type: 'full-time',
      work_mode: 'hybrid',
      experience_level: 'mid-level',
      published_at: pastDate,
      expires_at: pastDate,
      is_active: true
    });

    inactiveJob = await db.JobPost.create({
      company_id: techCorp.id,
      title: 'Draft Unposted Job',
      description: 'This job is inactive.',
      job_type: 'job',
      employment_type: 'full-time',
      work_mode: 'remote',
      experience_level: 'mid-level',
      published_at: new Date(),
      expires_at: futureDate,
      is_active: false
    });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('1. Public Jobs Feed & Filters (GET /api/jobs)', () => {
    it('should list only active and unexpired jobs with pagination envelope', async () => {
      const res = await request(app).get('/api/jobs');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body).toHaveProperty('links');
      expect(Array.isArray(res.body.data)).toBe(true);

      const jobIds = res.body.data.map(j => j.id);
      expect(jobIds).toContain(activeJob1.id);
      expect(jobIds).toContain(activeJob2.id);
      expect(jobIds).not.toContain(expiredJob.id);
      expect(jobIds).not.toContain(inactiveJob.id);
    });

    it('should filter jobs by search query keyword', async () => {
      const res = await request(app).get('/api/jobs?search=React');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(activeJob2.id);
      expect(res.body.data[0].title).toContain('React');
    });

    it('should filter jobs by work_mode and job_type', async () => {
      const res = await request(app).get('/api/jobs?work_mode=remote&job_type=job');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(activeJob1.id);
      expect(res.body.data[0].work_mode).toBe('remote');
    });

    it('should filter jobs by required_skill_ids', async () => {
      const res = await request(app).get(`/api/jobs?required_skill_ids=${nodeSkill.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(activeJob1.id);
    });

    it('should return is_saved false for anonymous requests', async () => {
      const res = await request(app).get(`/api/jobs/${activeJob1.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(activeJob1.id);
      expect(res.body.data.is_saved).toBe(false);
      expect(res.body.data.required_skills.length).toBe(1);
      expect(res.body.data.preferred_skills.length).toBe(1);
    });

    it('should return 404 for non-existent job post ID', async () => {
      const res = await request(app).get('/api/jobs/999999');
      expect(res.status).toBe(404);
    });
  });

  describe('2. Candidate Saved Jobs / Bookmarks', () => {
    it('should return 401 when unauthenticated user attempts to save a job', async () => {
      const res = await request(app)
        .post(`/api/jobs/${activeJob1.id}/save`)
        .send({});

      expect(res.status).toBe(401);
    });

    it('should allow candidate to bookmark a job', async () => {
      const res = await request(app)
        .post(`/api/jobs/${activeJob1.id}/save`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.is_saved).toBe(true);
      expect(res.body.data.job_id).toBe(activeJob1.id);
    });

    it('should show is_saved true when authenticated candidate views feed and details', async () => {
      const feedRes = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(feedRes.status).toBe(200);
      const savedInFeed = feedRes.body.data.find(j => j.id === activeJob1.id);
      const unsavedInFeed = feedRes.body.data.find(j => j.id === activeJob2.id);
      expect(savedInFeed.is_saved).toBe(true);
      expect(unsavedInFeed.is_saved).toBe(false);

      const detailRes = await request(app)
        .get(`/api/jobs/${activeJob1.id}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.is_saved).toBe(true);
    });

    it('should list bookmarked jobs via GET /api/saved-jobs', async () => {
      const res = await request(app)
        .get('/api/saved-jobs')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(activeJob1.id);
      expect(res.body.data[0].is_saved).toBe(true);
    });

    it('should isolate saved jobs per candidate', async () => {
      const res = await request(app)
        .get('/api/saved-jobs')
        .set('Authorization', `Bearer ${otherCandidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('should allow candidate to unbookmark a job via DELETE /api/jobs/:id/save', async () => {
      const res = await request(app)
        .delete(`/api/jobs/${activeJob1.id}/save`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.is_saved).toBe(false);

      // Verify list is now empty
      const listRes = await request(app)
        .get('/api/saved-jobs')
        .set('Authorization', `Bearer ${candidateToken}`);
      expect(listRes.body.data.length).toBe(0);
    });
  });

  describe('3. Admin Companies Management & Merging', () => {
    let createdCompanyId;

    it('should return 403 when non-admin accesses admin company routes', async () => {
      const res = await request(app)
        .get('/api/admin/companies')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(403);
    });

    it('should list companies with pagination for admin', async () => {
      const res = await request(app)
        .get('/api/admin/companies')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should create a new company successfully', async () => {
      const res = await request(app)
        .post('/api/admin/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Acme Cloud Solutions',
          industry: 'Cloud Computing',
          country: 'Egypt',
          city: 'Cairo',
          website_url: 'https://acmecloud.io',
          is_verified: true,
          is_active: true
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Acme Cloud Solutions');
      expect(res.body.data.is_verified).toBe(true);
      createdCompanyId = res.body.data.id;
    });

    it('should reject duplicate company creation with 422', async () => {
      const res = await request(app)
        .post('/api/admin/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Acme Cloud Solutions'
        });

      expect(res.status).toBe(422);
    });

    it('should view single company details', async () => {
      const res = await request(app)
        .get(`/api/admin/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdCompanyId);
      expect(res.body.data.industry).toBe('Cloud Computing');
    });

    it('should update company attributes', async () => {
      const res = await request(app)
        .patch(`/api/admin/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          city: 'Giza'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.city).toBe('Giza');
    });

    it('should merge source company into target company and reassign jobs and aliases', async () => {
      // 1. Create job under oldStartup
      const startupJob = await db.JobPost.create({
        company_id: oldStartup.id,
        title: 'Legacy Python Dev',
        description: 'Startup developer role.',
        is_active: true
      });

      // 2. Perform merge
      const res = await request(app)
        .post(`/api/admin/companies/${oldStartup.id}/merge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          target_company_id: targetCompany.id
        });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(targetCompany.id);
      expect(res.body.meta.reassigned_jobs_count).toBe(1);

      // 3. Verify oldStartup is deleted
      const deletedCheck = await db.Company.findByPk(oldStartup.id);
      expect(deletedCheck).toBeNull();

      // 4. Verify job was reassigned to targetCompany
      await startupJob.reload();
      expect(startupJob.company_id).toBe(targetCompany.id);

      // 5. Verify alias was created for oldStartup under targetCompany
      const alias = await db.CompanyAlias.findOne({
        where: { company_id: targetCompany.id, normalized_alias: oldStartup.normalized_name }
      });
      expect(alias).not.toBeNull();
      expect(alias.alias).toBe('Legacy Startup');
    });
  });

  describe('4. Admin Job Post Creation & Updates', () => {
    let createdJobId;

    it('should create job post with required and preferred skills', async () => {
      const res = await request(app)
        .post('/api/admin/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          company_id: techCorp.id,
          title: 'Full Stack Engineer',
          canonical_role: 'Full Stack Developer',
          description: 'Looking for full stack developer with Node and React proficiency.',
          job_type: 'job',
          employment_type: 'full-time',
          work_mode: 'hybrid',
          experience_level: 'mid-level',
          country: 'Egypt',
          city: 'Cairo',
          min_years_experience: 3,
          salary_min: 30000,
          salary_max: 45000,
          salary_currency: 'EGP',
          application_method: 'internal',
          required_skills: [
            { skill_id: nodeSkill.id, importance: 5, required_level: 'mid-level' }
          ],
          preferred_skills: [
            { skill_id: reactSkill.id, importance: 4, required_level: 'mid-level' }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Full Stack Engineer');
      expect(res.body.data.required_skills.length).toBe(1);
      expect(res.body.data.preferred_skills.length).toBe(1);
      createdJobId = res.body.data.id;
    });

    it('should view created job in admin route', async () => {
      const res = await request(app)
        .get(`/api/admin/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdJobId);
      expect(res.body.data.title).toBe('Full Stack Engineer');
    });

    it('should update job post details and skills', async () => {
      const res = await request(app)
        .patch(`/api/admin/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Senior Full Stack Engineer',
          work_mode: 'remote',
          required_skills: [
            { skill_id: nodeSkill.id, importance: 5, required_level: 'senior' },
            { skill_id: reactSkill.id, importance: 5, required_level: 'senior' }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Senior Full Stack Engineer');
      expect(res.body.data.work_mode).toBe('remote');
      expect(res.body.data.required_skills.length).toBe(2);
    });
  });
});
