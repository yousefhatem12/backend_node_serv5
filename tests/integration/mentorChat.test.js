'use strict';

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const authService = require('../../src/services/auth.service');

describe('Phase 11 - AI Mentor Chat: Context Builder, Conversation Sessions & History', () => {
  let candidateUser;
  let candidateToken;
  let otherCandidate;
  let otherToken;
  let adminUser;
  let adminToken;

  let skillNode;
  let skillDocker;

  let companyTech;
  let jobPost;
  let candidateRoadmap;

  beforeAll(async () => {
    await db.sequelize.authenticate();

    // Clean tables
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.MentorMessage.destroy({ where: {}, truncate: true });
    await db.MentorConversation.destroy({ where: {}, truncate: true });
    await db.RoadmapTask.destroy({ where: {}, truncate: true });
    await db.RoadmapMilestone.destroy({ where: {}, truncate: true });
    await db.RoadmapPhase.destroy({ where: {}, truncate: true });
    await db.Roadmap.destroy({ where: {}, truncate: true });
    await db.Application.destroy({ where: {}, truncate: true });
    await db.SavedJob.destroy({ where: {}, truncate: true });
    await db.JobSkill.destroy({ where: {}, truncate: true });
    await db.JobPost.destroy({ where: {}, truncate: true });
    await db.CandidateSkill.destroy({ where: {}, truncate: true });
    await db.CareerPreference.destroy({ where: {}, truncate: true });
    await db.CandidateProfile.destroy({ where: {}, truncate: true });
    await db.Skill.destroy({ where: {}, truncate: true });
    await db.Company.destroy({ where: {}, truncate: true });
    await db.User.destroy({ where: {}, truncate: true });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // 1. Skills
    skillNode = await db.Skill.create({ name: 'Node.js', normalized_name: 'node.js', category: 'Backend' });
    skillDocker = await db.Skill.create({ name: 'Docker', normalized_name: 'docker', category: 'DevOps' });

    // 2. Candidate
    candidateUser = await db.User.create({
      name: 'Youssef Mentor',
      email: 'youssef.mentor@skillmatch.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    candidateToken = authService.generateToken(candidateUser);

    const profile = await db.CandidateProfile.create({
      user_id: candidateUser.id,
      job_title: 'Backend Engineer',
      years_of_experience: 2,
      profile_completed_at: new Date()
    });

    await db.CareerPreference.create({
      candidate_profile_id: profile.id,
      target_role: 'Senior Backend Engineer',
      work_mode: 'remote'
    });

    await db.CandidateSkill.create({
      candidate_profile_id: profile.id,
      skill_id: skillNode.id,
      proficiency_level: 'intermediate',
      source: 'manual',
      is_verified: true
    });

    // 3. Other Candidate
    otherCandidate = await db.User.create({
      name: 'Other Student',
      email: 'other.student@skillmatch.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    otherToken = authService.generateToken(otherCandidate);

    await db.CandidateProfile.create({
      user_id: otherCandidate.id,
      title: 'Junior Web Dev',
      years_of_experience: 1,
      profile_completed_at: new Date()
    });

    // 4. Admin
    adminUser = await db.User.create({
      name: 'Admin Mentor',
      email: 'admin.mentor@skillmatch.com',
      password: 'Password123!',
      role: 'admin',
      is_active: true,
      email_verified_at: new Date()
    });
    adminToken = authService.generateToken(adminUser);

    // 5. Company & Job
    companyTech = await db.Company.create({
      name: 'FinTech Cairo',
      slug: 'fintech-cairo',
      is_verified: true
    });

    jobPost = await db.JobPost.create({
      company_id: companyTech.id,
      title: 'Senior Node.js Architect',
      description: 'Senior Node.js architect opening designing distributed systems.',
      job_type: 'full-time',
      work_mode: 'remote',
      employment_type: 'direct_hire',
      experience_level: 'senior',
      status: 'active',
      is_active: true
    });

    // 6. Application
    await db.Application.create({
      candidate_profile_id: profile.id,
      job_post_id: jobPost.id,
      status: 'under_review'
    });

    // 7. Active Roadmap for Candidate
    candidateRoadmap = await db.Roadmap.create({
      user_id: candidateUser.id,
      target_type: 'role',
      target_role: 'Senior Backend Engineer',
      title: 'Roadmap to Senior Backend Engineer',
      status: 'in_progress',
      progress: 25.0,
      generation_version: 1
    });

    const phase1 = await db.RoadmapPhase.create({
      roadmap_id: candidateRoadmap.id,
      title: 'Phase 1: Advanced Concurrency',
      order: 1,
      status: 'in_progress'
    });

    const milestone1 = await db.RoadmapMilestone.create({
      roadmap_phase_id: phase1.id,
      title: 'Event Loop & Stream Processing',
      order: 1,
      status: 'in_progress'
    });

    await db.RoadmapTask.create({
      roadmap_milestone_id: milestone1.id,
      title: 'Build high-throughput streaming backpressure pipeline',
      order: 1,
      status: 'pending',
      weight: 2
    });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('GET /api/mentor/context-preview - Grounded Context Builder', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/mentor/context-preview');
      expect(res.status).toBe(401);
    });

    it('should build comprehensive context for candidate', async () => {
      const res = await request(app)
        .get('/api/mentor/context-preview')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();

      const context = res.body.data;
      expect(context.candidate.name).toBe('Youssef Mentor');
      expect(context.candidate.title).toBe('Backend Engineer');
      expect(context.candidate.skills.length).toBeGreaterThan(0);
      expect(context.preferences.target_title).toBe('Senior Backend Engineer');
      expect(context.roadmap).toBeDefined();
      expect(context.roadmap.title).toContain('Senior Backend Engineer');
      expect(context.roadmap.next_tasks.length).toBeGreaterThan(0);
      expect(context.applications.length).toBe(1);
      expect(context.applications[0].job_title).toBe('Senior Node.js Architect');
      expect(context.applications[0].status).toBe('under_review');
    });
  });

  describe('POST /api/mentor/conversations - Start Conversation', () => {
    it('should start a new conversation with initial message and generate AI reply', async () => {
      const res = await request(app)
        .post('/api/mentor/conversations')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          title: 'Career transition discussion',
          context_mode: 'general',
          message: 'What should I learn next for my roadmap?'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Conversation started successfully.');

      const conv = res.body.data;
      expect(conv.id).toBeDefined();
      expect(conv.title).toBe('Career transition discussion');
      expect(conv.context_mode).toBe('general');
      expect(Array.isArray(conv.messages)).toBe(true);
      expect(conv.messages.length).toBe(2);

      const userMsg = conv.messages[0];
      expect(userMsg.sender).toBe('user');
      expect(userMsg.message).toBe('What should I learn next for my roadmap?');

      const mentorMsg = conv.messages[1];
      expect(mentorMsg.sender).toBe('mentor');
      expect(mentorMsg.message).toContain('Youssef');
      expect(mentorMsg.message).toContain('Senior Backend Engineer');
      expect(Array.isArray(mentorMsg.suggested_actions)).toBe(true);
      expect(mentorMsg.suggested_actions.length).toBeGreaterThan(0);
    });

    it('should start a conversation without an initial message', async () => {
      const res = await request(app)
        .post('/api/mentor/conversations')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          context_mode: 'interview_prep'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.context_mode).toBe('interview_prep');
      expect(res.body.data.messages.length).toBe(0);
    });
  });

  describe('GET /api/mentor/conversations - List Sessions', () => {
    it('should list conversations with pagination', async () => {
      const res = await request(app)
        .get('/api/mentor/conversations?page=1&limit=10')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.current_page).toBe(1);
    });
  });

  describe('POST /api/mentor/conversations/:conversation/messages - Message Exchange & Contextual Replies', () => {
    let conversationId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/mentor/conversations')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ title: 'Interview prep session', context_mode: 'general' });

      conversationId = res.body.data.id;
    });

    it('should return 404 for non-existent conversation', async () => {
      const res = await request(app)
        .post('/api/mentor/conversations/999999/messages')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ message: 'Hello' });

      expect(res.status).toBe(404);
    });

    it('should return 403 when another candidate tries to post message', async () => {
      const res = await request(app)
        .post(`/api/mentor/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ message: 'Intrusion attempt' });

      expect(res.status).toBe(403);
    });

    it('should return 422 if message is empty', async () => {
      const res = await request(app)
        .post(`/api/mentor/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ message: '' });

      expect(res.status).toBe(422);
    });

    it('should respond with grounded interview prep guidance and suggested actions', async () => {
      const res = await request(app)
        .post(`/api/mentor/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ message: 'How should I prepare for a technical interview?' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user_message.sender).toBe('user');
      expect(res.body.data.mentor_reply.sender).toBe('mentor');
      expect(res.body.data.mentor_reply.message).toContain('Senior Backend Engineer');
      expect(res.body.data.mentor_reply.suggested_actions).toBeDefined();
    });

    it('should respond with grounded application status feedback', async () => {
      const res = await request(app)
        .post(`/api/mentor/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ message: 'What is the status of my job applications?' });

      expect(res.status).toBe(200);
      expect(res.body.data.mentor_reply.message).toContain('FinTech Cairo');
      expect(res.body.data.mentor_reply.message).toContain('under_review');
    });
  });

  describe('GET /api/mentor/conversations/:conversation - History', () => {
    let convId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/mentor/conversations')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ title: 'History Test Session', message: 'First message' });

      convId = res.body.data.id;
    });

    it('should return full chronological message history for owner', async () => {
      const res = await request(app)
        .get(`/api/mentor/conversations/${convId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(convId);
      expect(res.body.data.messages.length).toBe(2);
    });

    it('should allow admin to view conversation history', async () => {
      const res = await request(app)
        .get(`/api/mentor/conversations/${convId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(convId);
    });
  });

  describe('PATCH & DELETE /api/mentor/conversations/:conversation', () => {
    let convId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/mentor/conversations')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ title: 'Mutable Session' });

      convId = res.body.data.id;
    });

    it('should update conversation title and archive status', async () => {
      const res = await request(app)
        .patch(`/api/mentor/conversations/${convId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ title: 'Renamed Session', is_archived: true });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.title).toBe('Renamed Session');
      expect(res.body.data.is_archived).toBe(true);

      // Verify that sending message to archived conversation fails
      const postMsg = await request(app)
        .post(`/api/mentor/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ message: 'Should fail' });

      expect(postMsg.status).toBe(422);
    });

    it('should delete conversation session and its messages', async () => {
      const res = await request(app)
        .delete(`/api/mentor/conversations/${convId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      const check = await request(app)
        .get(`/api/mentor/conversations/${convId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(check.status).toBe(404);
    });
  });
});
