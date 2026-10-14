'use strict';

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const authService = require('../../src/services/auth.service');
const JobFingerprintService = require('../../src/services/jobFingerprint.service');

describe('Phase 8 - Job Aggregation Pipeline & Ingestion Tests', () => {
  let adminUser;
  let adminToken;
  let candidateUser;
  let candidateToken;

  let testSource;

  beforeAll(async () => {
    await db.sequelize.authenticate();

    // Clean test tables
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.RawJob.destroy({ where: {}, truncate: true });
    await db.IngestionRun.destroy({ where: {}, truncate: true });
    await db.JobSource.destroy({ where: {}, truncate: true });
    await db.JobSkill.destroy({ where: {}, truncate: true });
    await db.JobPost.destroy({ where: {}, truncate: true });
    await db.CompanyAlias.destroy({ where: {}, truncate: true });
    await db.Company.destroy({ where: {}, truncate: true });
    await db.Skill.destroy({ where: {}, truncate: true });
    await db.User.destroy({ where: {}, truncate: true });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // Admin user
    adminUser = await db.User.create({
      name: 'System Admin',
      email: 'admin.pipeline@skillmatch.com',
      password: 'Password123!',
      role: 'admin',
      is_active: true,
      email_verified_at: new Date()
    });
    adminToken = authService.generateToken(adminUser);

    // Candidate user
    candidateUser = await db.User.create({
      name: 'Candidate Test',
      email: 'candidate.pipeline@skillmatch.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    candidateToken = authService.generateToken(candidateUser);

    // Create an initial job source
    testSource = await db.JobSource.create({
      name: 'LinkedIn Scraper - Egypt Tech',
      slug: 'linkedin-egypt-tech',
      source_type: 'scraper',
      collection_method: 'playwright',
      base_url: 'https://www.linkedin.com/jobs',
      is_active: true,
      schedule_enabled: true,
      schedule_expression: '0 */4 * * *',
      configuration: { timeout: 30000 },
      notes: 'Automated playwright scraper for engineering roles'
    });
  });

  afterAll(async () => {
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.RawJob.destroy({ where: {}, truncate: true });
    await db.IngestionRun.destroy({ where: {}, truncate: true });
    await db.JobSource.destroy({ where: {}, truncate: true });
    await db.JobSkill.destroy({ where: {}, truncate: true });
    await db.JobPost.destroy({ where: {}, truncate: true });
    await db.CompanyAlias.destroy({ where: {}, truncate: true });
    await db.Company.destroy({ where: {}, truncate: true });
    await db.Skill.destroy({ where: {}, truncate: true });
    await db.User.destroy({ where: {}, truncate: true });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  // ---------------------------------------------------------------------------
  // 1. Authorization & Role Checks
  // ---------------------------------------------------------------------------
  describe('RBAC & Auth checks', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/admin/job-sources');
      expect(res.status).toBe(401);
    });

    it('rejects candidate requests with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/job-sources')
        .set('Authorization', `Bearer ${candidateToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Job Fingerprint Service Unit Tests
  // ---------------------------------------------------------------------------
  describe('JobFingerprintService', () => {
    it('produces identical SHA-256 hashes for equivalent vacancies despite case or spacing', () => {
      const hash1 = JobFingerprintService.generate({
        companyIdentifier: 'Vodafone Egypt',
        title: 'Senior Node.js Developer',
        city: 'Cairo',
        country: 'Egypt',
        workMode: 'hybrid',
        employmentType: 'full-time',
        publicationDate: '2026-10-10'
      });

      const hash2 = JobFingerprintService.generate({
        companyIdentifier: '  vodafone egypt  ',
        title: 'Senior Node.js Developer!!!',
        location: 'Cairo Egypt',
        workMode: 'hybrid',
        employmentType: 'full-time',
        publicationDate: '2026-10-10T11:00:00Z'
      });

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces different hashes for distinct job titles or locations', () => {
      const hash1 = JobFingerprintService.generate({
        companyIdentifier: 'Vodafone',
        title: 'Frontend Engineer',
        city: 'Cairo'
      });
      const hash2 = JobFingerprintService.generate({
        companyIdentifier: 'Vodafone',
        title: 'Backend Engineer',
        city: 'Cairo'
      });
      expect(hash1).not.toBe(hash2);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Job Sources CRUD
  // ---------------------------------------------------------------------------
  describe('Job Sources CRUD', () => {
    it('GET /api/admin/job-sources returns paginated job sources list', async () => {
      const res = await request(app)
        .get('/api/admin/job-sources')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data[0]).toHaveProperty('slug', 'linkedin-egypt-tech');
    });

    it('POST /api/admin/job-sources creates a new source with auto-generated slug', async () => {
      const res = await request(app)
        .post('/api/admin/job-sources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Wuzzuf Software Engineering API',
          source_type: 'api',
          collection_method: 'rest_json',
          base_url: 'https://wuzzuf.net/api/v1/jobs',
          is_active: true,
          schedule_enabled: true,
          schedule_expression: '0 2 * * *',
          notes: 'Daily 2 AM sync.'
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('Wuzzuf Software Engineering API');
      expect(res.body.data.slug).toBe('wuzzuf-software-engineering-api');
      expect(res.body.data.source_type).toBe('api');
      expect(res.body.data.schedule_expression).toBe('0 2 * * *');
    });

    it('POST /api/admin/job-sources rejects duplicate slug with 422', async () => {
      const res = await request(app)
        .post('/api/admin/job-sources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'LinkedIn Duplicate',
          slug: 'linkedin-egypt-tech'
        });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('errors');
    });

    it('GET /api/admin/job-sources/:jobSource resolves by slug and returns diagnostics', async () => {
      const res = await request(app)
        .get('/api/admin/job-sources/linkedin-egypt-tech')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe('linkedin-egypt-tech');
      expect(res.body.data).toHaveProperty('diagnostics');
      expect(res.body.data.diagnostics).toHaveProperty('last_run_status');
      expect(res.body.data.diagnostics).toHaveProperty('error_rate_24h');
      expect(res.body.data.diagnostics).toHaveProperty('jobs_collected_last_7d');
      expect(res.body.data.diagnostics).toHaveProperty('total_runs_count');
    });

    it('GET /api/admin/job-sources/:jobSource resolves by numeric ID', async () => {
      const res = await request(app)
        .get(`/api/admin/job-sources/${testSource.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(Number(testSource.id));
    });

    it('GET /api/admin/job-sources/:jobSource returns 404 for unknown source', async () => {
      const res = await request(app)
        .get('/api/admin/job-sources/non-existent-source')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('PATCH /api/admin/job-sources/:jobSource updates configuration', async () => {
      const res = await request(app)
        .patch('/api/admin/job-sources/linkedin-egypt-tech')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schedule_expression: '0 */6 * * *',
          is_active: true
        });

      expect(res.status).toBe(200);
      expect(res.body.data.schedule_expression).toBe('0 */6 * * *');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Ingestion Run Execution, Deduplication & Staging
  // ---------------------------------------------------------------------------
  describe('Ingestion Run & Deduplication Engine', () => {
    const rawJobsBatch1 = [
      {
        external_id: 'gh-101',
        title: 'Senior Backend Engineer (Node.js)',
        company: 'Fawry Fintech',
        description: 'Build robust payment APIs and microservices.',
        employment_type: 'full-time',
        work_mode: 'hybrid',
        country: 'Egypt',
        city: 'Cairo',
        salary_min: 45000,
        salary_max: 65000,
        skills: ['Node.js', 'Express', 'MySQL', 'Redis'],
        published_at: '2026-10-08T09:00:00Z',
        url: 'https://careers.fawry.com/jobs/101'
      },
      {
        external_id: 'gh-102',
        title: 'Full Stack React Engineer',
        company: 'Instabug',
        description: 'Scale our web portal and developer dashboards.',
        employment_type: 'full-time',
        work_mode: 'remote',
        country: 'Egypt',
        city: 'Giza',
        skills: ['React', 'TypeScript', 'Node.js'],
        published_at: '2026-10-08T10:00:00Z',
        url: 'https://instabug.com/jobs/102'
      }
    ];

    it('POST /api/admin/job-sources/:jobSource/run ingests initial unique jobs', async () => {
      const res = await request(app)
        .post('/api/admin/job-sources/linkedin-egypt-tech/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          trigger_type: 'manual',
          items: rawJobsBatch1
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.jobs_found).toBe(2);
      expect(res.body.data.jobs_imported).toBe(2);
      expect(res.body.data.duplicates_count).toBe(0);

      // Verify companies created
      const company = await db.Company.findOne({ where: { normalized_name: 'fawry fintech' } });
      expect(company).not.toBeNull();
      expect(company.name).toBe('Fawry Fintech');

      // Verify JobPosts created
      const jobPost = await db.JobPost.findOne({
        where: { company_id: company.id, title: 'Senior Backend Engineer (Node.js)' },
        include: [{ model: db.Skill, as: 'skills' }]
      });
      expect(jobPost).not.toBeNull();
      expect(jobPost.employment_type).toBe('full-time');
      expect(jobPost.work_mode).toBe('hybrid');
      expect(jobPost.source).toBe('scraped');
      expect(jobPost.skills.length).toBeGreaterThanOrEqual(1);

      // Verify RawJob records created
      const rawJobs = await db.RawJob.findAll({ where: { job_source_id: testSource.id } });
      expect(rawJobs.length).toBe(2);
      expect(rawJobs[0].deduplication_status).toBe('unique');
      expect(rawJobs[0].extraction_status).toBe('processed');
      expect(rawJobs[0].content_fingerprint).toBeDefined();
    });

    it('POST /api/admin/job-sources/:jobSource/run suppresses duplicate vacancy in second run', async () => {
      // Send batch with 1 existing duplicate and 1 brand new job
      const batch2 = [
        {
          external_id: 'gh-101', // Exact same external_id and same company/title/etc.
          title: 'Senior Backend Engineer (Node.js)',
          company: 'Fawry Fintech',
          description: 'Updated copy of same job.',
          employment_type: 'full-time',
          work_mode: 'hybrid',
          country: 'Egypt',
          city: 'Cairo',
          published_at: '2026-10-08T09:00:00Z'
        },
        {
          external_id: 'gh-103', // New job
          title: 'DevOps / Site Reliability Engineer',
          company: 'Swvl',
          description: 'Manage Kubernetes clusters and CI/CD pipelines.',
          employment_type: 'full-time',
          work_mode: 'remote',
          country: 'Egypt',
          city: 'Cairo',
          skills: ['Docker', 'Kubernetes', 'AWS'],
          published_at: '2026-10-09T08:00:00Z'
        }
      ];

      const res = await request(app)
        .post('/api/admin/job-sources/linkedin-egypt-tech/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          trigger_type: 'manual',
          items: batch2
        });

      expect(res.status).toBe(200);
      expect(res.body.data.jobs_found).toBe(2);
      expect(res.body.data.jobs_imported).toBe(1); // Only 1 new job imported!
      expect(res.body.data.duplicates_count).toBe(1); // 1 duplicate suppressed!

      // Total JobPosts for Fawry should still be exactly 1
      const company = await db.Company.findOne({ where: { normalized_name: 'fawry fintech' } });
      const fawryJobsCount = await db.JobPost.count({ where: { company_id: company.id } });
      expect(fawryJobsCount).toBe(1);

      // Raw jobs total should be 4 (2 from first run, 2 from second run)
      const rawCount = await db.RawJob.count({ where: { job_source_id: testSource.id } });
      expect(rawCount).toBe(4);

      // Verify that 1 duplicate raw job exists
      const duplicateRaw = await db.RawJob.findOne({
        where: { external_id: 'gh-101', deduplication_status: 'duplicate' }
      });
      expect(duplicateRaw).not.toBeNull();
      expect(duplicateRaw.deduplication_status).toBe('duplicate');
    });

    it('GET /api/admin/job-sources/:jobSource/runs lists source execution runs', async () => {
      const res = await request(app)
        .get('/api/admin/job-sources/linkedin-egypt-tech/runs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0]).toHaveProperty('jobs_found');
      expect(res.body.data[0]).toHaveProperty('jobs_imported');
      expect(res.body.data[0]).toHaveProperty('duplicates_count');
    });

    it('GET /api/admin/ingestion-runs lists global runs across all sources', async () => {
      const res = await request(app)
        .get('/api/admin/ingestion-runs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /api/admin/job-sources/:jobSource/raw-jobs lists raw jobs for source', async () => {
      const res = await request(app)
        .get('/api/admin/job-sources/linkedin-egypt-tech/raw-jobs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBe(4);
    });

    it('GET /api/admin/raw-jobs filters by deduplication_status = duplicate', async () => {
      const res = await request(app)
        .get('/api/admin/raw-jobs?deduplication_status=duplicate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].deduplication_status).toBe('duplicate');
      expect(res.body.data[0].external_id).toBe('gh-101');
    });

    it('GET /api/admin/raw-jobs/:rawJob returns raw job details with raw_payload', async () => {
      const existing = await db.RawJob.findOne();

      const res = await request(app)
        .get(`/api/admin/raw-jobs/${existing.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(Number(existing.id));
      expect(res.body.data).toHaveProperty('raw_payload');
      expect(res.body.data).toHaveProperty('content_fingerprint');
    });

    it('DELETE /api/admin/job-sources/:jobSource removes source', async () => {
      const toDelete = await db.JobSource.create({
        name: 'Disposable Source',
        slug: 'disposable-source',
        source_type: 'rss'
      });

      const res = await request(app)
        .delete(`/api/admin/job-sources/${toDelete.slug}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      const check = await db.JobSource.findByPk(toDelete.id);
      expect(check).toBeNull();
    });
  });
});
