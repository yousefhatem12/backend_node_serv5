const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const authService = require('../../src/services/auth.service');

describe('Phase 7 - In-App Notifications Integration Tests', () => {
  let candidate1;
  let candidate1Token;
  let candidate2;
  let candidate2Token;
  let adminUser;
  let adminToken;

  let notif1;
  let notif2;
  let notif3Read;

  beforeAll(async () => {
    await db.sequelize.authenticate();

    // Clean test tables
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.Notification.destroy({ where: {}, truncate: true });
    await db.User.destroy({ where: {}, truncate: true });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // 1. Candidate 1
    candidate1 = await db.User.create({
      name: 'Ahmed Candidate',
      email: 'ahmed.notif@skillmatch.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    candidate1Token = authService.generateToken(candidate1);

    // 2. Candidate 2
    candidate2 = await db.User.create({
      name: 'Sara Candidate',
      email: 'sara.notif@skillmatch.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    candidate2Token = authService.generateToken(candidate2);

    // 3. Admin User
    adminUser = await db.User.create({
      name: 'Platform Admin',
      email: 'admin.notif@skillmatch.com',
      password: 'Password123!',
      role: 'admin',
      is_active: true,
      email_verified_at: new Date()
    });
    adminToken = authService.generateToken(adminUser);

    // 4. Initial Seed Notifications for Candidate 1
    notif1 = await db.Notification.create({
      user_id: candidate1.id,
      title: 'CV Parsing Completed',
      body: 'Your CV has been parsed successfully.',
      type: 'cv_parsed',
      data: { document_id: 1, extraction_id: 1 },
      read_at: null
    });

    notif2 = await db.Notification.create({
      user_id: candidate1.id,
      title: 'Application Shortlisted',
      body: 'Congratulations! You have been shortlisted for Backend Engineer.',
      type: 'application_status',
      data: { application_id: 10, status: 'shortlisted' },
      read_at: null
    });

    notif3Read = await db.Notification.create({
      user_id: candidate1.id,
      title: 'Welcome to SkillMatch',
      body: 'Welcome aboard to the platform.',
      type: 'system',
      data: null,
      read_at: new Date()
    });

    // 5. Notification for Candidate 2 (isolation check)
    await db.Notification.create({
      user_id: candidate2.id,
      title: 'Candidate 2 Alert',
      body: 'This belongs to Sara.',
      type: 'system',
      read_at: null
    });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('1. Unread Counter Badge (GET /api/notifications/unread-count)', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/notifications/unread-count');
      expect(res.status).toBe(401);
    });

    it('should return correct unread count for candidate', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${candidate1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.count).toBe(2);
    });

    it('should return isolated count for other candidate', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${candidate2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(1);
    });
  });

  describe('2. Listing Notifications (GET /api/notifications)', () => {
    it('should list all notifications for user with pagination envelope', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${candidate1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body).toHaveProperty('links');
      expect(res.body.data.length).toBe(3);

      const notifIds = res.body.data.map(n => n.id);
      expect(notifIds).toContain(notif1.id);
      expect(notifIds).toContain(notif2.id);
      expect(notifIds).toContain(notif3Read.id);

      // Verify metadata payload
      const cvNotif = res.body.data.find(n => n.id === notif1.id);
      expect(cvNotif.type).toBe('cv_parsed');
      expect(cvNotif.data).toEqual({ document_id: 1, extraction_id: 1 });
      expect(cvNotif.read_at).toBeNull();
    });

    it('should filter only unread notifications when unread_only=true', async () => {
      const res = await request(app)
        .get('/api/notifications?unread_only=true')
        .set('Authorization', `Bearer ${candidate1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      res.body.data.forEach(n => {
        expect(n.read_at).toBeNull();
      });
    });

    it('should isolate notifications per user', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${candidate2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Candidate 2 Alert');
    });
  });

  describe('3. Marking Single Notification as Read (PATCH /api/notifications/:notification/read)', () => {
    it('should return 404 when candidate tries to read another user notification', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${notif1.id}/read`)
        .set('Authorization', `Bearer ${candidate2Token}`);

      expect(res.status).toBe(404);
    });

    it('should mark single notification as read', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${notif1.id}/read`)
        .set('Authorization', `Bearer ${candidate1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(notif1.id);
      expect(res.body.data.read_at).not.toBeNull();

      // Verify unread count decreased to 1
      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${candidate1Token}`);
      expect(countRes.body.data.count).toBe(1);
    });

    it('should be idempotent when marking already read notification', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${notif1.id}/read`)
        .set('Authorization', `Bearer ${candidate1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.read_at).not.toBeNull();
    });
  });

  describe('4. Marking All Notifications as Read (PATCH /api/notifications/read-all)', () => {
    it('should mark all remaining unread notifications as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${candidate1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.updated_count).toBe(1);

      // Verify unread count is now 0
      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${candidate1Token}`);
      expect(countRes.body.data.count).toBe(0);
    });

    it('should return 0 updated count if all are already read', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${candidate1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.updated_count).toBe(0);
    });
  });

  describe('5. Admin Notification Composer (POST /api/admin/notifications/compose)', () => {
    it('should return 403 when non-admin accesses composer', async () => {
      const res = await request(app)
        .post('/api/admin/notifications/compose')
        .set('Authorization', `Bearer ${candidate1Token}`)
        .send({
          title: 'System Maintenance',
          body: 'Scheduled downtime tonight.'
        });

      expect(res.status).toBe(403);
    });

    it('should reject invalid payload with 422', async () => {
      const res = await request(app)
        .post('/api/admin/notifications/compose')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: ''
        });

      expect(res.status).toBe(422);
    });

    it('should broadcast notification to all candidates', async () => {
      const res = await request(app)
        .post('/api/admin/notifications/compose')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          target_type: 'candidates',
          title: 'New Jobs Matching Your Profile',
          body: 'Check out 5 new opportunities matching your skills.',
          type: 'job_recommendation',
          data: { recommendation_count: 5 }
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.target_type).toBe('candidates');
      expect(res.body.data.recipients_count).toBe(2);

      // Candidate 1 and Candidate 2 should have received this notification
      const checkC1 = await request(app)
        .get('/api/notifications?unread_only=true')
        .set('Authorization', `Bearer ${candidate1Token}`);
      expect(checkC1.body.data.length).toBe(1);
      expect(checkC1.body.data[0].title).toBe('New Jobs Matching Your Profile');
    });

    it('should send targeted notification to specific user IDs', async () => {
      const res = await request(app)
        .post('/api/admin/notifications/compose')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          target_type: 'user_ids',
          user_ids: [candidate2.id],
          title: 'Direct Interview Request',
          body: 'A recruiter requested an interview with you.',
          type: 'interview_request'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.recipients_count).toBe(1);

      // Candidate 2 received it, Candidate 1 did not receive another
      const checkC2 = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${candidate2Token}`);

      const titles = checkC2.body.data.map(n => n.title);
      expect(titles).toContain('Direct Interview Request');
    });
  });
});
