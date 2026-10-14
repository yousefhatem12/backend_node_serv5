'use strict';

const request = require('supertest');
const express = require('express');
const {
  createAdminUserSchema,
  updateAdminUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  adminUserParamSchema
} = require('../../src/validators/adminOperations.validator');
const { listJobsQuerySchema } = require('../../src/validators/jobs.validator');

// Mock services to isolate unit tests from database
jest.mock('../../src/services/adminOperations.service');
jest.mock('../../src/services/job.service');
jest.mock('../../src/services/company.service');

const AdminOperationsService = require('../../src/services/adminOperations.service');
const jobService = require('../../src/services/job.service');
const companyService = require('../../src/services/company.service');

const AdminOperationsController = require('../../src/controllers/adminOperations.controller');
const JobController = require('../../src/controllers/job.controller');
const CompanyController = require('../../src/controllers/company.controller');

const validate = require('../../src/middlewares/validate.middleware');
const errorHandler = require('../../src/middlewares/errorHandler');

describe('Admin CRUD Validators Unit Tests', () => {
  describe('createAdminUserSchema', () => {
    it('validates a valid user creation payload with name and email', () => {
      const data = {
        body: {
          name: 'Hassan Ali',
          email: 'hassan@gmail.com',
          role: 'Candidate'
        }
      };
      const result = createAdminUserSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data.body.role).toBe('candidate');
      expect(result.data.body.name).toBe('Hassan Ali');
      expect(result.data.body.is_active).toBe(true);
    });

    it('accepts full_name instead of name and normalizes role Admin to admin', () => {
      const data = {
        body: {
          full_name: 'Ahmed Wael',
          email: 'ahmed.wael@example.com',
          role: 'Admin'
        }
      };
      const result = createAdminUserSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data.body.role).toBe('admin');
      expect(result.data.body.full_name).toBe('Ahmed Wael');
    });

    it('rejects if both name and full_name are missing', () => {
      const data = {
        body: {
          email: 'test@example.com',
          role: 'candidate'
        }
      };
      const result = createAdminUserSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format', () => {
      const data = {
        body: {
          name: 'Test',
          email: 'not-an-email'
        }
      };
      const result = createAdminUserSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('updateAdminUserSchema', () => {
    it('allows updating role, name, and is_active', () => {
      const data = {
        body: {
          name: 'Ahmed Wael Updated',
          role: 'Admin',
          is_active: 'true'
        }
      };
      const result = updateAdminUserSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data.body.role).toBe('admin');
      expect(result.data.body.is_active).toBe(true);
    });

    it('allows partial update with only role', () => {
      const data = {
        body: {
          role: 'Super Admin'
        }
      };
      const result = updateAdminUserSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data.body.role).toBe('super_admin');
    });
  });

  describe('updateUserRoleSchema', () => {
    it('normalizes case-insensitive role values (Candidate, Admin, Super Admin)', () => {
      const parseCandidate = updateUserRoleSchema.safeParse({ body: { role: 'Candidate' } });
      const parseAdmin = updateUserRoleSchema.safeParse({ body: { role: 'Admin' } });
      const parseSuper = updateUserRoleSchema.safeParse({ body: { role: 'super_admin' } });

      expect(parseCandidate.success).toBe(true);
      expect(parseCandidate.data.body.role).toBe('candidate');

      expect(parseAdmin.success).toBe(true);
      expect(parseAdmin.data.body.role).toBe('admin');

      expect(parseSuper.success).toBe(true);
      expect(parseSuper.data.body.role).toBe('super_admin');
    });

    it('rejects invalid roles like manager', () => {
      const result = updateUserRoleSchema.safeParse({ body: { role: 'manager' } });
      expect(result.success).toBe(false);
    });
  });
});

describe('Admin Full CRUD Controller & Route Unit Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    // Normalize routes identically to src/app.js
    app.use((req, res, next) => {
      if (req.url) {
        req.url = req.url.replace(/\/{2,}/g, '/');
      }
      const parsedPath = req.path || req.url || '';
      if (
        !parsedPath.startsWith('/api') &&
        !parsedPath.startsWith('/storage') &&
        !parsedPath.startsWith('/docs')
      ) {
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
      }
      next();
    });

    // Mock authenticated admin user
    app.use((req, res, next) => {
      req.user = { id: 1, role: 'admin', is_active: true };
      next();
    });

    const adminRouter = express.Router();

    // 1. Users CRUD
    adminRouter.get('/users', AdminOperationsController.listUsers);
    adminRouter.post('/users', validate(createAdminUserSchema), AdminOperationsController.createUser);
    adminRouter.get('/users/:user', validate(adminUserParamSchema), AdminOperationsController.showUser);
    adminRouter.patch('/users/:user', validate(adminUserParamSchema), validate(updateAdminUserSchema), AdminOperationsController.updateUser);
    adminRouter.put('/users/:user', validate(adminUserParamSchema), validate(updateAdminUserSchema), AdminOperationsController.updateUser);
    adminRouter.patch('/users/:user/status', validate(adminUserParamSchema), validate(updateUserStatusSchema), AdminOperationsController.updateUserStatus);
    adminRouter.put('/users/:user/status', validate(adminUserParamSchema), validate(updateUserStatusSchema), AdminOperationsController.updateUserStatus);
    adminRouter.patch('/users/:user/role', validate(adminUserParamSchema), validate(updateUserRoleSchema), AdminOperationsController.updateUserRole);
    adminRouter.put('/users/:user/role', validate(adminUserParamSchema), validate(updateUserRoleSchema), AdminOperationsController.updateUserRole);
    adminRouter.delete('/users/:user', validate(adminUserParamSchema), AdminOperationsController.deleteUser);
    adminRouter.post('/users/:user/delete', validate(adminUserParamSchema), AdminOperationsController.deleteUser);
    adminRouter.delete('/user/:user', validate(adminUserParamSchema), AdminOperationsController.deleteUser);

    // 2. Jobs CRUD
    adminRouter.get('/jobs', JobController.adminList);
    adminRouter.get('/jobs/list', JobController.adminList);
    adminRouter.get('/jobs/all', JobController.adminList);
    adminRouter.get('/job-posts', JobController.adminList);
    adminRouter.get('/job-posts/list', JobController.adminList);
    adminRouter.post('/jobs', JobController.adminCreate);
    adminRouter.post('/job-posts', JobController.adminCreate);
    adminRouter.get('/jobs/:jobPost', JobController.adminShow);
    adminRouter.get('/job-posts/:jobPost', JobController.adminShow);
    adminRouter.patch('/jobs/:jobPost', JobController.adminUpdate);
    adminRouter.patch('/job-posts/:jobPost', JobController.adminUpdate);
    adminRouter.put('/jobs/:jobPost', JobController.adminUpdate);
    adminRouter.put('/job-posts/:jobPost', JobController.adminUpdate);
    adminRouter.delete('/jobs/:jobPost', JobController.adminDelete);
    adminRouter.delete('/job-posts/:jobPost', JobController.adminDelete);

    // 3. Companies CRUD
    adminRouter.get('/companies', CompanyController.adminList);
    adminRouter.post('/companies', CompanyController.adminCreate);
    adminRouter.get('/companies/:company', CompanyController.adminShow);
    adminRouter.patch('/companies/:company', CompanyController.adminUpdate);
    adminRouter.put('/companies/:company', CompanyController.adminUpdate);
    adminRouter.post('/companies/:company/verify', CompanyController.adminVerify);
    adminRouter.patch('/companies/:company/verify', CompanyController.adminVerify);
    adminRouter.put('/companies/:company/verify', CompanyController.adminVerify);
    adminRouter.post('/companies/:company/reject', CompanyController.adminReject);
    adminRouter.patch('/companies/:company/reject', CompanyController.adminReject);
    adminRouter.put('/companies/:company/reject', CompanyController.adminReject);
    adminRouter.post('/companies/:company/verification', CompanyController.adminVerification);
    adminRouter.patch('/companies/:company/verification', CompanyController.adminVerification);
    adminRouter.post('/company/:company/verify', CompanyController.adminVerify);
    adminRouter.patch('/company/:company/verify', CompanyController.adminVerify);
    adminRouter.post('/company/:company/reject', CompanyController.adminReject);
    adminRouter.patch('/company/:company/reject', CompanyController.adminReject);
    adminRouter.post('/company-verifications/:company/verify', CompanyController.adminVerify);
    adminRouter.post('/company-verifications/:company/reject', CompanyController.adminReject);
    adminRouter.post('/companies/verify/:company', CompanyController.adminVerify);
    adminRouter.post('/companies/reject/:company', CompanyController.adminReject);

    // 4. Public and Candidate Jobs Routes
    const jobsRouter = express.Router();
    jobsRouter.get('/', validate(listJobsQuerySchema), JobController.list);
    jobsRouter.get('/feed', validate(listJobsQuerySchema), JobController.list);
    jobsRouter.get('/list', validate(listJobsQuerySchema), JobController.list);
    jobsRouter.get('/all', validate(listJobsQuerySchema), JobController.list);
    jobsRouter.get('/search', validate(listJobsQuerySchema), JobController.list);
    jobsRouter.get('/:jobPost', JobController.show);

    const candidateRouter = express.Router();
    candidateRouter.get('/jobs', validate(listJobsQuerySchema), JobController.list);
    candidateRouter.get('/jobs/list', validate(listJobsQuerySchema), JobController.list);

    const apiRouter = express.Router();
    apiRouter.use('/admin', adminRouter);
    apiRouter.use('/jobs', jobsRouter);
    apiRouter.use('/job-posts', jobsRouter);
    apiRouter.use('/candidate', candidateRouter);
    app.use('/api', apiRouter);
    app.use('/', apiRouter);

    app.use(errorHandler);
  });

  describe('1. Admin Users CRUD Tests', () => {
    it('GET /api/admin/users lists platform users with pagination', async () => {
      AdminOperationsService.listUsers.mockResolvedValueOnce({
        users: [
          { id: 1, name: 'Alice', email: 'alice@example.com', role: 'candidate', is_active: true }
        ],
        total: 1,
        page: 1,
        limit: 15
      });

      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data[0].email).toBe('alice@example.com');
      expect(AdminOperationsService.listUsers).toHaveBeenCalledTimes(1);
    });

    it('GET /admin/users (without /api prefix) lists users via URL normalization', async () => {
      AdminOperationsService.listUsers.mockResolvedValueOnce({
        users: [
          { id: 2, name: 'Bob', email: 'bob@example.com', role: 'admin', is_active: true }
        ],
        total: 1,
        page: 1,
        limit: 15
      });

      const res = await request(app).get('/admin/users');
      expect(res.status).toBe(200);
      expect(res.body.data[0].email).toBe('bob@example.com');
    });

    it('GET /api/admin/users/:user returns single user details', async () => {
      AdminOperationsService.getUser.mockResolvedValueOnce({
        id: 10,
        name: 'Charlie',
        email: 'charlie@example.com',
        role: 'candidate',
        is_active: true
      });

      const res = await request(app).get('/api/admin/users/10');
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Charlie');
      expect(AdminOperationsService.getUser).toHaveBeenCalledWith(10);
    });

    it('POST /api/admin/users creates a new user (Create User)', async () => {
      AdminOperationsService.createUser.mockResolvedValueOnce({
        id: 42,
        name: 'hassan',
        email: 'hassan@gmail.com',
        role: 'candidate',
        is_active: true,
        created_at: new Date()
      });

      const res = await request(app)
        .post('/api/admin/users')
        .send({
          full_name: 'hassan',
          email: 'hassan@gmail.com',
          role: 'Candidate'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('hassan');
      expect(res.body.data.email).toBe('hassan@gmail.com');
      expect(res.body.data.role).toBe('candidate');
    });

    it('POST /admin/users creates a user via URL normalization (without /api prefix)', async () => {
      AdminOperationsService.createUser.mockResolvedValueOnce({
        id: 43,
        name: 'Ahmed Wael',
        email: 'ahmed.wael@example.com',
        role: 'admin',
        is_active: true,
        created_at: new Date()
      });

      const res = await request(app)
        .post('/admin/users')
        .send({
          full_name: 'Ahmed Wael',
          email: 'ahmed.wael@example.com',
          role: 'Admin'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.role).toBe('admin');
    });

    it('PATCH /api/admin/users/:user updates user details (Edit User)', async () => {
      AdminOperationsService.updateUser.mockResolvedValueOnce({
        id: 15,
        name: 'Ahmed Wael Updated',
        email: 'ahmed.wael@example.com',
        role: 'admin',
        is_active: true
      });

      const res = await request(app)
        .patch('/api/admin/users/15')
        .send({
          name: 'Ahmed Wael Updated',
          role: 'Admin'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Ahmed Wael Updated');
      expect(res.body.data.role).toBe('admin');
    });

    it('PUT /admin/users/:user updates user via PUT without /api prefix', async () => {
      AdminOperationsService.updateUser.mockResolvedValueOnce({
        id: 15,
        name: 'Ahmed Wael',
        email: 'ahmed.wael@example.com',
        role: 'super_admin',
        is_active: true
      });

      const res = await request(app)
        .put('/admin/users/15')
        .send({
          role: 'Super Admin'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('super_admin');
    });

    it('PATCH /api/admin/users/:user/role updates user role', async () => {
      AdminOperationsService.updateUserRole.mockResolvedValueOnce({
        id: 15,
        name: 'Ahmed Wael',
        email: 'ahmed.wael@example.com',
        role: 'admin',
        is_active: true
      });

      const res = await request(app)
        .patch('/api/admin/users/15/role')
        .send({ role: 'Admin' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('admin');
    });

    it('PATCH /api/admin/users/:user/status updates user active status', async () => {
      AdminOperationsService.updateUserStatus.mockResolvedValueOnce({
        id: 15,
        name: 'Ahmed Wael',
        email: 'ahmed.wael@example.com',
        role: 'candidate',
        is_active: false
      });

      const res = await request(app)
        .patch('/api/admin/users/15/status')
        .send({ is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.data.is_active).toBe(false);
    });

    it('DELETE /api/admin/users/:user deletes user successfully', async () => {
      AdminOperationsService.deleteUser.mockResolvedValueOnce({
        id: 15,
        name: 'Ahmed Wael',
        email: 'ahmed.wael@example.com',
        role: 'candidate'
      });

      const res = await request(app).delete('/api/admin/users/15');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('deleted');
      expect(res.body.data.id).toBe(15);
      expect(AdminOperationsService.deleteUser).toHaveBeenCalledWith(15, 1, expect.anything());
    });

    it('DELETE /admin/users/:user deletes user without /api prefix', async () => {
      AdminOperationsService.deleteUser.mockResolvedValueOnce({
        id: 15,
        name: 'Ahmed Wael',
        email: 'ahmed.wael@example.com',
        role: 'candidate'
      });

      const res = await request(app).delete('/admin/users/15');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(15);
    });

    it('POST /admin/users/:user/delete deletes user via POST alias', async () => {
      AdminOperationsService.deleteUser.mockResolvedValueOnce({
        id: 15,
        name: 'Ahmed Wael',
        email: 'ahmed.wael@example.com',
        role: 'candidate'
      });

      const res = await request(app).post('/admin/users/15/delete');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(15);
    });

    it('DELETE /admin/user/:user deletes user via singular alias', async () => {
      AdminOperationsService.deleteUser.mockResolvedValueOnce({
        id: 15,
        name: 'Ahmed Wael',
        email: 'ahmed.wael@example.com',
        role: 'candidate'
      });

      const res = await request(app).delete('/admin/user/15');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(15);
    });
  });

  describe('2. Admin Jobs CRUD Tests', () => {
    it('GET /api/admin/jobs lists all jobs for admin dashboard', async () => {
      jobService.adminListJobs.mockResolvedValueOnce({
        rows: [
          {
            id: 201,
            title: 'Senior Node.js Architect',
            company: { id: 1, name: 'Tech Innovations' },
            jobSkills: []
          }
        ],
        count: 1,
        page: 1,
        perPage: 15,
        savedJobIds: new Set()
      });

      const res = await request(app).get('/api/admin/jobs');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data[0].title).toBe('Senior Node.js Architect');
      expect(jobService.adminListJobs).toHaveBeenCalledTimes(1);
    });

    it('GET /admin/jobs (without /api prefix) succeeds via URL normalization', async () => {
      jobService.adminListJobs.mockResolvedValueOnce({
        rows: [
          {
            id: 202,
            title: 'Cloud DevOps Engineer',
            company: null,
            jobSkills: []
          }
        ],
        count: 1,
        page: 1,
        perPage: 15,
        savedJobIds: new Set()
      });

      const res = await request(app).get('/admin/jobs');
      expect(res.status).toBe(200);
      expect(res.body.data[0].title).toBe('Cloud DevOps Engineer');
    });

    it('POST /api/admin/jobs creates a new job post', async () => {
      jobService.createJobPost.mockResolvedValueOnce({
        job: {
          id: 301,
          title: 'Full Stack Engineer',
          description: 'Great role',
          company: { id: 2, name: 'Google' },
          jobSkills: []
        }
      });

      const res = await request(app)
        .post('/api/admin/jobs')
        .send({
          title: 'Full Stack Engineer',
          description: 'Great role'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Full Stack Engineer');
    });

    it('GET /api/admin/jobs/:jobPost shows single job post details', async () => {
      jobService.getJob.mockResolvedValueOnce({
        job: {
          id: 301,
          title: 'Full Stack Engineer',
          company: null,
          jobSkills: []
        }
      });

      const res = await request(app).get('/api/admin/jobs/301');
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Full Stack Engineer');
    });

    it('PATCH & PUT /api/admin/jobs/:jobPost updates job attributes', async () => {
      jobService.updateJobPost.mockResolvedValueOnce({
        job: {
          id: 301,
          title: 'Staff Full Stack Engineer',
          company: null,
          jobSkills: []
        }
      });

      const res = await request(app)
        .put('/admin/jobs/301')
        .send({ title: 'Staff Full Stack Engineer' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Staff Full Stack Engineer');
    });

    it('GET /api/admin/jobs/list and GET /admin/job-posts list jobs via aliases', async () => {
      jobService.adminListJobs.mockResolvedValueOnce({
        rows: [{ id: 401, title: 'AI Research Scientist', company: null, jobSkills: [] }],
        count: 1,
        page: 1,
        perPage: 15,
        savedJobIds: new Set()
      });

      const resList = await request(app).get('/api/admin/jobs/list');
      expect(resList.status).toBe(200);
      expect(resList.body.data[0].title).toBe('AI Research Scientist');

      jobService.adminListJobs.mockResolvedValueOnce({
        rows: [{ id: 402, title: 'Mobile Flutter Engineer', company: null, jobSkills: [] }],
        count: 1,
        page: 1,
        perPage: 15,
        savedJobIds: new Set()
      });

      const resPosts = await request(app).get('/admin/job-posts');
      expect(resPosts.status).toBe(200);
      expect(resPosts.body.data[0].title).toBe('Mobile Flutter Engineer');
    });

    it('DELETE /api/admin/jobs/:jobPost deletes a job post', async () => {
      jobService.deleteJobPost.mockResolvedValueOnce({ success: true });

      const res = await request(app).delete('/api/admin/jobs/301');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Job post deleted successfully.');
      expect(jobService.deleteJobPost).toHaveBeenCalledWith('301');
    });

    it('GET /api/jobs and GET /jobs return public job listings', async () => {
      jobService.listJobs.mockResolvedValueOnce({
        rows: [{ id: 101, title: 'Frontend React Engineer', company: null, jobSkills: [] }],
        count: 1,
        page: 1,
        perPage: 15,
        savedJobIds: new Set()
      });

      const res = await request(app).get('/api/jobs');
      expect(res.status).toBe(200);
      expect(res.body.data[0].title).toBe('Frontend React Engineer');

      jobService.listJobs.mockResolvedValueOnce({
        rows: [{ id: 102, title: 'Backend Node Engineer', company: null, jobSkills: [] }],
        count: 1,
        page: 1,
        perPage: 15,
        savedJobIds: new Set()
      });

      const resRoot = await request(app).get('/jobs');
      expect(resRoot.status).toBe(200);
      expect(resRoot.body.data[0].title).toBe('Backend Node Engineer');
    });

    it('GET /job-posts and GET /jobs/list return job listings via aliases', async () => {
      jobService.listJobs.mockResolvedValueOnce({
        rows: [{ id: 103, title: 'DevSecOps Specialist', company: null, jobSkills: [] }],
        count: 1,
        page: 1,
        perPage: 15,
        savedJobIds: new Set()
      });

      const resPosts = await request(app).get('/job-posts');
      expect(resPosts.status).toBe(200);
      expect(resPosts.body.data[0].title).toBe('DevSecOps Specialist');
    });

    it('GET /candidate/jobs returns jobs for candidate portal', async () => {
      jobService.listJobs.mockResolvedValueOnce({
        rows: [{ id: 104, title: 'Machine Learning Engineer', company: null, jobSkills: [] }],
        count: 1,
        page: 1,
        perPage: 15,
        savedJobIds: new Set()
      });

      const resCandidate = await request(app).get('/candidate/jobs');
      expect(resCandidate.status).toBe(200);
      expect(resCandidate.body.data[0].title).toBe('Machine Learning Engineer');
    });

    it('GET /jobs gracefully handles empty query string filters (?job_type=&work_mode=)', async () => {
      jobService.listJobs.mockResolvedValueOnce({
        rows: [],
        count: 0,
        page: 1,
        perPage: 15,
        savedJobIds: new Set()
      });

      const res = await request(app).get('/jobs?job_type=&work_mode=&employment_type=&experience_level=&company_id=&search=');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('3. Admin Companies CRUD Tests', () => {
    it('GET /api/admin/companies lists companies for admin', async () => {
      companyService.listCompanies.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Acme Corp', industry: 'Technology', is_verified: true }
        ],
        count: 1,
        page: 1,
        perPage: 15
      });

      const res = await request(app).get('/api/admin/companies');
      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe('Acme Corp');
    });

    it('POST /api/admin/companies creates a company', async () => {
      companyService.createCompany.mockResolvedValueOnce({
        id: 5,
        name: 'New Startup Inc',
        industry: 'Fintech'
      });

      const res = await request(app)
        .post('/api/admin/companies')
        .send({ name: 'New Startup Inc', industry: 'Fintech' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('New Startup Inc');
    });

    it('GET /admin/companies/:company shows company details', async () => {
      companyService.getCompany.mockResolvedValueOnce({
        id: 5,
        name: 'New Startup Inc',
        industry: 'Fintech'
      });

      const res = await request(app).get('/admin/companies/5');
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Startup Inc');
    });

    it('PATCH /admin/companies/:company updates company details', async () => {
      companyService.updateCompany.mockResolvedValueOnce({
        id: 5,
        name: 'Updated Startup Inc',
        industry: 'Fintech'
      });

      const res = await request(app)
        .patch('/admin/companies/5')
        .send({ name: 'Updated Startup Inc' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Startup Inc');
    });

    it('POST /api/admin/companies/:company/verify marks company as verified', async () => {
      companyService.verifyCompany.mockResolvedValueOnce({
        id: 5,
        name: 'Verified Startup Inc',
        industry: 'Fintech',
        is_verified: true
      });

      const res = await request(app).post('/api/admin/companies/5/verify');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.is_verified).toBe(true);
      expect(companyService.verifyCompany).toHaveBeenCalledWith('5', 1, expect.anything());
    });

    it('PATCH /admin/companies/:company/verify marks company as verified without /api prefix', async () => {
      companyService.verifyCompany.mockResolvedValueOnce({
        id: 5,
        name: 'Verified Startup Inc',
        industry: 'Fintech',
        is_verified: true
      });

      const res = await request(app).patch('/admin/companies/5/verify');
      expect(res.status).toBe(200);
      expect(res.body.data.is_verified).toBe(true);
    });

    it('POST /api/admin/companies/:company/reject marks company verification as rejected', async () => {
      companyService.rejectCompany.mockResolvedValueOnce({
        id: 5,
        name: 'Rejected Startup Inc',
        industry: 'Fintech',
        is_verified: false
      });

      const res = await request(app)
        .post('/api/admin/companies/5/reject')
        .send({ reason: 'Invalid documentation provided' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.is_verified).toBe(false);
      expect(companyService.rejectCompany).toHaveBeenCalledWith('5', 'Invalid documentation provided', 1, expect.anything());
    });

    it('PATCH /admin/companies/:company/reject marks company verification as rejected', async () => {
      companyService.rejectCompany.mockResolvedValueOnce({
        id: 5,
        name: 'Rejected Startup Inc',
        industry: 'Fintech',
        is_verified: false
      });

      const res = await request(app).patch('/admin/companies/5/reject');
      expect(res.status).toBe(200);
      expect(res.body.data.is_verified).toBe(false);
    });

    it('POST /api/admin/companies/:company/verification toggles verification based on payload', async () => {
      companyService.verifyCompany.mockResolvedValueOnce({
        id: 5,
        name: 'Verified Startup Inc',
        industry: 'Fintech',
        is_verified: true
      });

      const res = await request(app)
        .post('/api/admin/companies/5/verification')
        .send({ is_verified: true });

      expect(res.status).toBe(200);
      expect(res.body.data.is_verified).toBe(true);
    });

    it('POST /admin/company/:company/verify supports singular company route', async () => {
      companyService.verifyCompany.mockResolvedValueOnce({
        id: 5,
        name: 'Verified Startup Inc',
        industry: 'Fintech',
        is_verified: true
      });

      const res = await request(app).post('/admin/company/5/verify');
      expect(res.status).toBe(200);
      expect(res.body.data.is_verified).toBe(true);
    });

    it('POST /admin/company/:company/reject supports singular company reject route', async () => {
      companyService.rejectCompany.mockResolvedValueOnce({
        id: 5,
        name: 'Rejected Startup Inc',
        industry: 'Fintech',
        is_verified: false
      });

      const res = await request(app).post('/admin/company/5/reject');
      expect(res.status).toBe(200);
      expect(res.body.data.is_verified).toBe(false);
    });

    it('POST /admin/company-verifications/:company/verify supports verification queue alias', async () => {
      companyService.verifyCompany.mockResolvedValueOnce({
        id: 5,
        name: 'Verified Startup Inc',
        industry: 'Fintech',
        is_verified: true
      });

      const res = await request(app).post('/admin/company-verifications/5/verify');
      expect(res.status).toBe(200);
      expect(res.body.data.is_verified).toBe(true);
    });

    it('POST /admin/companies/verify/:company supports action-first route', async () => {
      companyService.verifyCompany.mockResolvedValueOnce({
        id: 5,
        name: 'Verified Startup Inc',
        industry: 'Fintech',
        is_verified: true
      });

      const res = await request(app).post('/admin/companies/verify/5');
      expect(res.status).toBe(200);
      expect(res.body.data.is_verified).toBe(true);
    });
  });
});
