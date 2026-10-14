'use strict';

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const authService = require('../../src/services/auth.service');

describe('Phase 12 - Admin Operations, Moderation & AI Review Queue Tests', () => {
  let adminUser;
  let adminToken;
  let superAdminUser;
  let superAdminToken;
  let candidateUser;
  let candidateToken;
  let inactiveAdminUser;
  let inactiveAdminToken;
  let targetCandidate;

  let pendingReviewItem1;
  let pendingReviewItem2;
  let pendingReviewItem3;

  beforeAll(async () => {
    await db.sequelize.authenticate();

    // Clean test tables
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.AiReviewAudit.destroy({ where: {}, truncate: true });
    await db.AiReviewItem.destroy({ where: {}, truncate: true });
    await db.AuditLog.destroy({ where: {}, truncate: true });
    await db.ApplicationStatusHistory.destroy({ where: {}, truncate: true });
    await db.Application.destroy({ where: {}, truncate: true });
    await db.JobSkill.destroy({ where: {}, truncate: true });
    await db.JobPost.destroy({ where: {}, truncate: true });
    await db.Company.destroy({ where: {}, truncate: true });
    await db.Skill.destroy({ where: {}, truncate: true });
    await db.SkillCategory.destroy({ where: {}, truncate: true });
    await db.CandidateProfile.destroy({ where: {}, truncate: true });
    await db.User.destroy({ where: {}, truncate: true });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // 1. Create Admin
    adminUser = await db.User.create({
      name: 'Operations Admin',
      email: 'admin.ops@skillmatch.com',
      password: 'Password123!',
      role: 'admin',
      is_active: true,
      email_verified_at: new Date()
    });
    adminToken = authService.generateToken(adminUser);

    // 2. Create Super Admin
    superAdminUser = await db.User.create({
      name: 'Super Admin',
      email: 'super.admin@skillmatch.com',
      password: 'Password123!',
      role: 'super_admin',
      is_active: true,
      email_verified_at: new Date()
    });
    superAdminToken = authService.generateToken(superAdminUser);

    // 3. Create Candidate
    candidateUser = await db.User.create({
      name: 'Regular Candidate',
      email: 'candidate.user@skillmatch.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    candidateToken = authService.generateToken(candidateUser);

    // 4. Create Inactive Admin
    inactiveAdminUser = await db.User.create({
      name: 'Suspended Admin',
      email: 'suspended.admin@skillmatch.com',
      password: 'Password123!',
      role: 'admin',
      is_active: false,
      email_verified_at: new Date()
    });
    inactiveAdminToken = authService.generateToken(inactiveAdminUser);

    // 5. Create Target Candidate for moderation
    targetCandidate = await db.User.create({
      name: 'Ziad Moderation Target',
      email: 'ziad.target@skillmatch.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    await db.CandidateProfile.create({
      user_id: targetCandidate.id,
      job_title: 'Full Stack Engineer',
      country: 'Egypt',
      city: 'Cairo',
      years_of_experience: 4,
      profile_completed_at: new Date()
    });

    // 6. Seed AI Review items
    pendingReviewItem1 = await db.AiReviewItem.create({
      entity_type: 'cv_extraction',
      entity_id: 101,
      source: 'cv_parser',
      status: 'pending',
      trigger_reason: 'Low confidence in skill extraction',
      confidence: 0.62,
      raw_input: 'Experience with Kubernetes, Node.js and AWS cloud infrastructure',
      proposed_payload: {
        skills: ['Kubernetes', 'Node.js', 'AWS'],
        experience_years: 3
      }
    });

    pendingReviewItem2 = await db.AiReviewItem.create({
      entity_type: 'scraped_job',
      entity_id: 202,
      source: 'playwright_scraper',
      status: 'pending',
      trigger_reason: 'Salary format anomaly detected',
      confidence: 0.45,
      raw_input: 'Salary 45k - 60k per year in EUR',
      proposed_payload: {
        title: 'Backend Developer',
        salary_min: 45000,
        salary_max: 60000,
        currency: 'EUR'
      }
    });

    pendingReviewItem3 = await db.AiReviewItem.create({
      entity_type: 'job_match',
      entity_id: 303,
      source: 'ai_matcher',
      status: 'pending',
      trigger_reason: 'Borderline score threshold',
      confidence: 0.50,
      raw_input: 'Candidate skills vs Job post requirement diff',
      proposed_payload: {
        score: 65,
        reasons: ['Missing React']
      }
    });

    // 7. Seed sample category, skill and job post for statistics
    const cat = await db.SkillCategory.create({ name: 'Backend Dev', slug: 'backend-dev' });
    const skillNode = await db.Skill.create({ name: 'Node.js', slug: 'nodejs', category_id: cat.id });
    const skillSql = await db.Skill.create({ name: 'MySQL', slug: 'mysql', category_id: cat.id });

    const company = await db.Company.create({
      name: 'Tech Solutions Inc',
      normalized_name: 'tech solutions inc',
      is_verified: true,
      is_active: true
    });

    const job = await db.JobPost.create({
      company_id: company.id,
      title: 'Senior Node Developer',
      description: 'Exciting backend role',
      job_type: 'job',
      employment_type: 'full-time',
      work_mode: 'remote',
      experience_level: 'senior',
      is_active: true,
      published_at: new Date()
    });

    await db.JobSkill.create({
      job_post_id: job.id,
      skill_id: skillNode.id,
      is_required: true,
      importance: 5
    });

    await db.JobSkill.create({
      job_post_id: job.id,
      skill_id: skillSql.id,
      is_required: true,
      importance: 4
    });
  });

  describe('1. Access Control & Role Guards', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(401);
    });

    it('rejects candidate token with 403', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${candidateToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects inactive admin token with 403', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${inactiveAdminToken}`);
      expect(res.status).toBe(403);
    });

    it('allows active admin and super_admin tokens', async () => {
      const res1 = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res1.status).toBe(200);

      const res2 = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res2.status).toBe(200);
    });
  });

  describe('2. AI Review Queue (Human-in-the-Loop)', () => {
    it('GET /api/admin/ai-review-items returns paginated review items', async () => {
      const res = await request(app)
        .get('/api/admin/ai-review-items')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body).toHaveProperty('links');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);

      const first = res.body.data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('entity_type');
      expect(first).toHaveProperty('status');
      expect(first).toHaveProperty('confidence');
      expect(first).toHaveProperty('proposed_payload');
    });

    it('GET /api/admin/ai-review-items supports filtering by status and confidence', async () => {
      const res = await request(app)
        .get('/api/admin/ai-review-items?status=pending&confidence_min=0.60')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      res.body.data.forEach(item => {
        expect(item.status).toBe('pending');
        expect(item.confidence).toBeGreaterThanOrEqual(0.60);
      });
    });

    it('GET /api/admin/ai-review-items/:aiReviewItem returns single item with 3-way payload and audits', async () => {
      const res = await request(app)
        .get(`/api/admin/ai-review-items/${pendingReviewItem1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(Number(pendingReviewItem1.id));
      expect(res.body.data.raw_input).toBeTruthy();
      expect(res.body.data.proposed_payload).toEqual({
        skills: ['Kubernetes', 'Node.js', 'AWS'],
        experience_years: 3
      });
      expect(res.body.data.corrected_payload).toBeNull();
      expect(Array.isArray(res.body.data.audits)).toBe(true);
    });

    it('GET /api/admin/ai-review-items/:aiReviewItem returns 404 for nonexistent item', async () => {
      const res = await request(app)
        .get('/api/admin/ai-review-items/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('POST /api/admin/ai-review-items/:aiReviewItem/approve approves pending item and writes audits', async () => {
      const res = await request(app)
        .post(`/api/admin/ai-review-items/${pendingReviewItem1.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision_reason: 'Verified skills correctly match candidate CV text.',
          reviewer_notes: 'Looks accurate.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('approved');
      expect(res.body.data.reviewer).toBeTruthy();
      expect(res.body.data.reviewer.id).toBe(Number(adminUser.id));
      expect(res.body.data.decision_reason).toBe('Verified skills correctly match candidate CV text.');

      // Check item in DB
      const updatedItem = await db.AiReviewItem.findByPk(pendingReviewItem1.id);
      expect(updatedItem.status).toBe('approved');
      expect(updatedItem.reviewer_id).toBe(adminUser.id);

      // Check review audit record
      const audit = await db.AiReviewAudit.findOne({
        where: { ai_review_item_id: pendingReviewItem1.id, action: 'approved' }
      });
      expect(audit).not.toBeNull();
      expect(audit.actor_id).toBe(adminUser.id);

      // Check global audit log
      const globalAudit = await db.AuditLog.findOne({
        where: { entity_type: 'AiReviewItem', entity_id: pendingReviewItem1.id, action: 'ai_review.approve' }
      });
      expect(globalAudit).not.toBeNull();
      expect(globalAudit.actor_id).toBe(adminUser.id);
    });

    it('POST /api/admin/ai-review-items/:aiReviewItem/approve rejects re-approving non-pending item', async () => {
      const res = await request(app)
        .post(`/api/admin/ai-review-items/${pendingReviewItem1.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision_reason: 'Attempt double approve' });

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/Cannot approve an item with status/i);
    });

    it('POST /api/admin/ai-review-items/:aiReviewItem/correct requires corrected_value and applies human correction', async () => {
      // 1. Missing corrected_value -> 422
      const failRes = await request(app)
        .post(`/api/admin/ai-review-items/${pendingReviewItem2.id}/correct`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision_reason: 'Fixed salary currency' });

      expect(failRes.status).toBe(422);

      // 2. Valid correction
      const correctRes = await request(app)
        .post(`/api/admin/ai-review-items/${pendingReviewItem2.id}/correct`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          corrected_value: {
            title: 'Backend Developer',
            salary_min: 45000,
            salary_max: 60000,
            currency: 'EUR',
            notes: 'Verified against original job posting'
          },
          decision_reason: 'Fixed currency and validated bounds.',
          reviewer_notes: 'All checks passed.'
        });

      expect(correctRes.status).toBe(200);
      expect(correctRes.body.status).toBe('success');
      expect(correctRes.body.data.status).toBe('corrected');
      expect(correctRes.body.data.corrected_payload).toHaveProperty('notes');

      // Verify DB record
      const item = await db.AiReviewItem.findByPk(pendingReviewItem2.id);
      expect(item.status).toBe('corrected');
      expect(item.corrected_payload).toHaveProperty('notes');

      // Check global audit log
      const globalAudit = await db.AuditLog.findOne({
        where: { entity_type: 'AiReviewItem', entity_id: pendingReviewItem2.id, action: 'ai_review.correct' }
      });
      expect(globalAudit).not.toBeNull();
    });

    it('POST /api/admin/ai-review-items/:aiReviewItem/reject rejects item with reason', async () => {
      const res = await request(app)
        .post(`/api/admin/ai-review-items/${pendingReviewItem3.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision_reason: 'Match suggestion hallucinated missing requirements.',
          reviewer_notes: 'Disregarded recommendation.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('rejected');
      expect(res.body.data.decision_reason).toBe('Match suggestion hallucinated missing requirements.');

      // Verify DB record
      const item = await db.AiReviewItem.findByPk(pendingReviewItem3.id);
      expect(item.status).toBe('rejected');

      // Check global audit log
      const globalAudit = await db.AuditLog.findOne({
        where: { entity_type: 'AiReviewItem', entity_id: pendingReviewItem3.id, action: 'ai_review.reject' }
      });
      expect(globalAudit).not.toBeNull();
    });
  });

  describe('3. Audit Logs Inspection', () => {
    it('GET /api/admin/audit-logs lists audit events with pagination and filters', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body).toHaveProperty('links');
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);

      const first = res.body.data[0];
      expect(first).toHaveProperty('action');
      expect(first).toHaveProperty('entity_type');
      expect(first).toHaveProperty('actor');
      expect(first.actor.id).toBe(Number(adminUser.id));
    });

    it('GET /api/admin/audit-logs filters by action and entity_type', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs?action=ai_review.approve&entity_type=AiReviewItem')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      res.body.data.forEach(log => {
        expect(log.action).toBe('ai_review.approve');
        expect(log.entity_type).toBe('AiReviewItem');
      });
    });
  });

  describe('4. User Management & Moderation', () => {
    it('GET /api/admin/users lists users with pagination, profile and filters', async () => {
      const res = await request(app)
        .get('/api/admin/users?role=candidate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body).toHaveProperty('links');
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const found = res.body.data.find(u => u.email === targetCandidate.email);
      expect(found).toBeTruthy();
      expect(found.candidate_profile).toBeTruthy();
      expect(found.candidate_profile.job_title).toBe('Full Stack Engineer');
    });

    it('GET /api/admin/users supports search query by name or email', async () => {
      const res = await request(app)
        .get('/api/admin/users?search=Ziad')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].email).toBe(targetCandidate.email);
    });

    it('GET /api/admin/users/:user returns single user detail', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${targetCandidate.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(Number(targetCandidate.id));
      expect(res.body.data.name).toBe('Ziad Moderation Target');
      expect(res.body.data.candidate_profile).toBeTruthy();
    });

    it('GET /api/admin/users/:user returns 404 for invalid user ID', async () => {
      const res = await request(app)
        .get('/api/admin/users/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('PATCH /api/admin/users/:user/status updates status and writes audit log', async () => {
      // Suspend target candidate
      const res = await request(app)
        .patch(`/api/admin/users/${targetCandidate.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.is_active).toBe(false);

      const check = await db.User.findByPk(targetCandidate.id);
      expect(check.is_active).toBe(false);

      // Verify audit log
      const audit = await db.AuditLog.findOne({
        where: { entity_type: 'User', entity_id: targetCandidate.id, action: 'user.suspended' }
      });
      expect(audit).not.toBeNull();
      expect(audit.actor_id).toBe(adminUser.id);
    });

    it('PATCH /api/admin/users/:user/status prevents self-deactivation', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false });

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/Cannot change your own active status/i);
    });

    it('PATCH /api/admin/users/:user/role updates user role and writes audit log', async () => {
      // Promote candidate to admin
      const res = await request(app)
        .patch(`/api/admin/users/${targetCandidate.id}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.role).toBe('admin');

      const check = await db.User.findByPk(targetCandidate.id);
      expect(check.role).toBe('admin');

      // Verify audit log
      const audit = await db.AuditLog.findOne({
        where: { entity_type: 'User', entity_id: targetCandidate.id, action: 'user.role_updated' }
      });
      expect(audit).not.toBeNull();
      expect(audit.actor_id).toBe(superAdminUser.id);
    });

    it('PATCH /api/admin/users/:user/role prevents changing self role', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'super_admin' });

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/Cannot change your own role/i);
    });

    it('PATCH /api/admin/users/:user/role rejects invalid roles', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${targetCandidate.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'invalid_role_name' });

      expect(res.status).toBe(422);
    });

    it('POST /api/admin/users creates a new user (Add User)', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Hassan New User',
          email: 'hassan.new@example.com',
          role: 'Candidate'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Hassan New User');
      expect(res.body.data.email).toBe('hassan.new@example.com');
      expect(res.body.data.role).toBe('candidate');

      const check = await db.User.findOne({ where: { email: 'hassan.new@example.com' } });
      expect(check).not.toBeNull();
    });

    it('POST /admin/users creates a new user via direct /admin route (without /api prefix)', async () => {
      const res = await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Ahmed Route Test',
          email: 'ahmed.route@example.com',
          role: 'Admin'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.role).toBe('admin');
    });

    it('PATCH /api/admin/users/:user updates user details (Edit User)', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${targetCandidate.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Ahmed Wael Edited',
          role: 'Admin'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Ahmed Wael Edited');
      expect(res.body.data.role).toBe('admin');

      const check = await db.User.findByPk(targetCandidate.id);
      expect(check.name).toBe('Ahmed Wael Edited');
      expect(check.role).toBe('admin');
    });

    it('PUT /admin/users/:user updates user details via PUT without /api prefix', async () => {
      const res = await request(app)
        .put(`/admin/users/${targetCandidate.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          role: 'candidate'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.role).toBe('candidate');
    });

    it('GET /api/admin/jobs and GET /admin/jobs lists jobs for admin dashboard', async () => {
      const resWithApi = await request(app)
        .get('/api/admin/jobs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resWithApi.status).toBe(200);
      expect(resWithApi.body).toHaveProperty('data');
      expect(Array.isArray(resWithApi.body.data)).toBe(true);

      const resWithoutApi = await request(app)
        .get('/admin/jobs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resWithoutApi.status).toBe(200);
      expect(resWithoutApi.body).toHaveProperty('data');
      expect(Array.isArray(resWithoutApi.body.data)).toBe(true);
    });
  });

  describe('5. Operational Statistics & Dashboard', () => {
    it('GET /api/admin/statistics returns consolidated platform statistics', async () => {
      const res = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      const stats = res.body.data;

      // Users
      expect(stats).toHaveProperty('users');
      expect(stats.users.total).toBeGreaterThanOrEqual(4);
      expect(stats.users.by_role).toHaveProperty('candidate');
      expect(stats.users.by_role).toHaveProperty('admin');

      // Candidates
      expect(stats).toHaveProperty('candidates');
      expect(stats.candidates.total_profiles).toBeGreaterThanOrEqual(1);

      // Companies & Jobs
      expect(stats).toHaveProperty('companies');
      expect(stats.companies.total).toBeGreaterThanOrEqual(1);
      expect(stats).toHaveProperty('jobs');
      expect(stats.jobs.total).toBeGreaterThanOrEqual(1);

      // Applications
      expect(stats).toHaveProperty('applications');
      expect(stats.applications).toHaveProperty('by_status');

      // AI Review Queue
      expect(stats).toHaveProperty('ai_review_queue');
      expect(stats.ai_review_queue.total).toBeGreaterThanOrEqual(3);
      expect(stats.ai_review_queue.approved).toBeGreaterThanOrEqual(1);
      expect(stats.ai_review_queue.corrected).toBeGreaterThanOrEqual(1);
      expect(stats.ai_review_queue.rejected).toBeGreaterThanOrEqual(1);
      expect(stats.ai_review_queue).toHaveProperty('average_confidence');

      // Top Requested Skills
      expect(stats).toHaveProperty('top_requested_skills');
      expect(Array.isArray(stats.top_requested_skills)).toBe(true);

      // Sources Health
      expect(stats).toHaveProperty('sources_health');
      expect(stats.sources_health).toHaveProperty('total_sources');
    });

    it('GET /api/admin/dashboard serves as an alias for statistics', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('users');
      expect(res.body.data).toHaveProperty('ai_review_queue');
    });
  });
});
