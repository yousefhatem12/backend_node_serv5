'use strict';

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const authService = require('../../src/services/auth.service');

describe('Phase 10 - Dynamic Career Roadmaps, Milestones & Progress Tracking', () => {
  let candidateUser;
  let candidateToken;
  let otherCandidate;
  let otherToken;
  let adminUser;
  let adminToken;

  let skillNode;
  let skillDocker;
  let skillKubernetes;
  let skillTerraform;

  let companyCloud;
  let targetJob;

  beforeAll(async () => {
    await db.sequelize.authenticate();

    // Clean tables
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.RoadmapTask.destroy({ where: {}, truncate: true });
    await db.RoadmapMilestone.destroy({ where: {}, truncate: true });
    await db.RoadmapPhase.destroy({ where: {}, truncate: true });
    await db.Roadmap.destroy({ where: {}, truncate: true });
    await db.JobMatch.destroy({ where: {}, truncate: true });
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
    skillKubernetes = await db.Skill.create({ name: 'Kubernetes', normalized_name: 'kubernetes', category: 'DevOps' });
    skillTerraform = await db.Skill.create({ name: 'Terraform', normalized_name: 'terraform', category: 'DevOps' });

    // 2. Main Candidate
    candidateUser = await db.User.create({
      name: 'Ahmed Roadmap',
      email: 'ahmed.roadmap@skillmatch.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    candidateToken = authService.generateToken(candidateUser);

    const profile = await db.CandidateProfile.create({
      user_id: candidateUser.id,
      title: 'Junior Backend Engineer',
      years_of_experience: 1,
      profile_completed_at: new Date()
    });

    await db.CareerPreference.create({
      candidate_profile_id: profile.id,
      target_title: 'Cloud Solutions Architect',
      preferred_work_modes: ['remote', 'hybrid']
    });

    // Candidate already knows Node.js
    await db.CandidateSkill.create({
      candidate_profile_id: profile.id,
      skill_id: skillNode.id,
      proficiency_level: 'intermediate',
      source: 'manual',
      is_verified: true
    });

    // 3. Other Candidate
    otherCandidate = await db.User.create({
      name: 'Other Candidate',
      email: 'other.roadmap@skillmatch.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    otherToken = authService.generateToken(otherCandidate);

    await db.CandidateProfile.create({
      user_id: otherCandidate.id,
      title: 'QA Engineer',
      years_of_experience: 2,
      profile_completed_at: new Date()
    });

    // 4. Admin
    adminUser = await db.User.create({
      name: 'Admin Roadmaps',
      email: 'admin.roadmaps@skillmatch.com',
      password: 'Password123!',
      role: 'admin',
      is_active: true,
      email_verified_at: new Date()
    });
    adminToken = authService.generateToken(adminUser);

    // 5. Company & Job Post
    companyCloud = await db.Company.create({
      name: 'CloudOps Egypt',
      slug: 'cloudops-egypt',
      is_verified: true
    });

    targetJob = await db.JobPost.create({
      company_id: companyCloud.id,
      title: 'Cloud Solutions Architect',
      description: 'Design and deploy distributed cloud systems using Kubernetes and Terraform.',
      job_type: 'full-time',
      work_mode: 'remote',
      employment_type: 'direct_hire',
      experience_level: 'senior',
      status: 'active',
      is_active: true
    });

    await db.JobSkill.create({
      job_post_id: targetJob.id,
      skill_id: skillKubernetes.id,
      importance: 5,
      is_required: true,
      required_level: 'senior'
    });

    await db.JobSkill.create({
      job_post_id: targetJob.id,
      skill_id: skillTerraform.id,
      importance: 4,
      is_required: true,
      required_level: 'mid-level'
    });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('POST /api/roadmaps - Generation', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/roadmaps')
        .send({ target_type: 'role', target_role: 'Cloud Solutions Architect' });

      expect(res.status).toBe(401);
    });

    it('should reject invalid payload when target_role is missing for role type', async () => {
      const res = await request(app)
        .post('/api/roadmaps')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ target_type: 'role' });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
    });

    it('should generate a role-based career roadmap with 4 phases and milestones', async () => {
      const res = await request(app)
        .post('/api/roadmaps')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          target_type: 'role',
          target_role: 'Cloud Solutions Architect',
          notes: 'Focus on container orchestration'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Career roadmap generated successfully.');
      expect(res.body.data).toBeDefined();

      const roadmap = res.body.data;
      expect(roadmap.id).toBeDefined();
      expect(roadmap.title).toContain('Cloud Solutions Architect');
      expect(roadmap.target.type).toBe('role');
      expect(roadmap.target.role).toBe('Cloud Solutions Architect');
      expect(roadmap.generation_version).toBe(1);
      expect(roadmap.progress).toBe(0);
      expect(roadmap.status).toBe('in_progress');

      // Verify hierarchical phases
      expect(Array.isArray(roadmap.phases)).toBe(true);
      expect(roadmap.phases.length).toBe(4);
      expect(roadmap.phases[0].milestones.length).toBeGreaterThan(0);
      expect(roadmap.phases[0].milestones[0].tasks.length).toBeGreaterThan(0);

      const task = roadmap.phases[0].milestones[0].tasks[0];
      expect(task.id).toBeDefined();
      expect(task.title).toBeDefined();
      expect(task.status).toBe('pending');
      expect(task.weight).toBeGreaterThanOrEqual(1);
    });

    it('should generate a job-based career roadmap targeting vacancy and computing skill gaps', async () => {
      const res = await request(app)
        .post('/api/roadmaps')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          target_type: 'job',
          target_job_id: targetJob.id
        });

      expect(res.status).toBe(201);
      const roadmap = res.body.data;
      expect(roadmap.target.type).toBe('job');
      expect(roadmap.target.job_id).toBe(Number(targetJob.id));
      expect(roadmap.target.job_title).toBe('Cloud Solutions Architect');
      expect(roadmap.target.company_name).toBe('CloudOps Egypt');
      expect(roadmap.rationale).toBeDefined();
      expect(roadmap.phases.length).toBe(4);
    });
  });

  describe('GET /api/roadmaps/:roadmap - Show Details', () => {
    let createdRoadmapId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/roadmaps')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ target_type: 'role', target_role: 'DevOps Engineer' });

      createdRoadmapId = res.body.data.id;
    });

    it('should return 404 for non-existent roadmap ID', async () => {
      const res = await request(app)
        .get('/api/roadmaps/999999')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 when another candidate tries to view the roadmap', async () => {
      const res = await request(app)
        .get(`/api/roadmaps/${createdRoadmapId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow roadmap owner to view full hierarchy', async () => {
      const res = await request(app)
        .get(`/api/roadmaps/${createdRoadmapId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(createdRoadmapId);
      expect(res.body.data.phases.length).toBe(4);
    });

    it('should allow admin to view any roadmap', async () => {
      const res = await request(app)
        .get(`/api/roadmaps/${createdRoadmapId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdRoadmapId);
    });
  });

  describe('GET /api/roadmaps - List User Roadmaps', () => {
    it('should return paginated list of candidate roadmaps', async () => {
      const res = await request(app)
        .get('/api/roadmaps?page=1&limit=10')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.current_page).toBe(1);
    });
  });

  describe('PATCH /api/roadmap-tasks/:roadmapTask/complete - Weighted Progress', () => {
    let testRoadmapId;
    let taskId1;
    let taskId2;
    let allTaskIds = [];

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/roadmaps')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ target_type: 'role', target_role: 'Frontend Developer' });

      testRoadmapId = res.body.data.id;
      const phases = res.body.data.phases;

      allTaskIds = [];
      phases.forEach(p => {
        p.milestones.forEach(m => {
          m.tasks.forEach(t => allTaskIds.push(t.id));
        });
      });

      taskId1 = allTaskIds[0];
      taskId2 = allTaskIds[1];
    });

    it('should return 404 for invalid roadmap task ID', async () => {
      const res = await request(app)
        .patch('/api/roadmap-tasks/999999/complete')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ notes: 'Completed' });

      expect(res.status).toBe(404);
    });

    it('should return 403 when another candidate tries to complete task', async () => {
      const res = await request(app)
        .patch(`/api/roadmap-tasks/${taskId1}/complete`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ notes: 'Intrusion' });

      expect(res.status).toBe(403);
    });

    it('should complete task, store evidence and recalculate weighted progress', async () => {
      const res = await request(app)
        .patch(`/api/roadmap-tasks/${taskId1}/complete`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          evidence: 'https://github.com/ahmed/frontend-basics',
          notes: 'Finished core HTML5 & modern CSS lab exercises'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Roadmap task marked as completed.');
      expect(res.body.data.id).toBe(testRoadmapId);
      expect(res.body.data.task_id).toBe(taskId1);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.progress).toBeGreaterThan(0);

      // Verify persisted task and roadmap progress
      const verifyRoadmap = await request(app)
        .get(`/api/roadmaps/${testRoadmapId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(verifyRoadmap.body.data.progress).toBe(res.body.data.progress);
      const firstTask = verifyRoadmap.body.data.phases[0].milestones[0].tasks[0];
      expect(firstTask.status).toBe('completed');
      expect(firstTask.evidence).toBe('https://github.com/ahmed/frontend-basics');
      expect(firstTask.completed_at).toBeDefined();
    });

    it('should also work with the nested route /api/roadmaps/tasks/:roadmapTask/complete', async () => {
      const res = await request(app)
        .patch(`/api/roadmaps/tasks/${taskId2}/complete`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ notes: 'Completed via nested endpoint' });

      expect(res.status).toBe(200);
      expect(res.body.data.task_id).toBe(taskId2);
      expect(res.body.data.progress).toBeGreaterThan(0);
    });

    it('should mark roadmap completed with 100% progress when all tasks are finished', async () => {
      for (const tId of allTaskIds) {
        await request(app)
          .patch(`/api/roadmap-tasks/${tId}/complete`)
          .set('Authorization', `Bearer ${candidateToken}`)
          .send({ notes: 'Completed all' });
      }

      const res = await request(app)
        .get(`/api/roadmaps/${testRoadmapId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.body.data.progress).toBe(100);
      expect(res.body.data.status).toBe('completed');
    });
  });

  describe('POST /api/roadmaps/:roadmap/refresh - Dynamic Roadmap Refresh', () => {
    let baseRoadmapId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/roadmaps')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ target_type: 'role', target_role: 'Data Engineer' });

      baseRoadmapId = res.body.data.id;
    });

    it('should return 404 for non-existent roadmap refresh', async () => {
      const res = await request(app)
        .post('/api/roadmaps/999999/refresh')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({});

      expect(res.status).toBe(404);
    });

    it('should return 403 when another candidate attempts to refresh', async () => {
      const res = await request(app)
        .post(`/api/roadmaps/${baseRoadmapId}/refresh`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('should refresh roadmap, archive previous version, increment generation_version and report reasons', async () => {
      // Simulate candidate acquiring a new skill
      const candidateProfile = await db.CandidateProfile.findOne({ where: { user_id: candidateUser.id } });
      await db.CandidateSkill.create({
        candidate_profile_id: candidateProfile.id,
        skill_id: skillDocker.id,
        proficiency_level: 'advanced',
        source: 'manual',
        is_verified: true
      });

      const res = await request(app)
        .post(`/api/roadmaps/${baseRoadmapId}/refresh`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          target_type: 'role',
          target_role: 'Data Engineer'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Roadmap refreshed successfully.');
      expect(res.body.data.previous_roadmap_id).toBe(baseRoadmapId);
      expect(res.body.data.generation_version).toBe(2);
      expect(res.body.data.status).toBe('in_progress');
      expect(res.body.meta.refreshed).toBe(true);
      expect(Array.isArray(res.body.meta.reasons)).toBe(true);
      expect(res.body.meta.reasons.length).toBeGreaterThan(0);

      // Verify that old roadmap was archived
      const oldRoadmap = await db.Roadmap.findByPk(baseRoadmapId);
      expect(oldRoadmap.status).toBe('archived');

      // Verify that new roadmap exists with full phases
      const newRoadmapId = res.body.data.id;
      const getNewRes = await request(app)
        .get(`/api/roadmaps/${newRoadmapId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(getNewRes.status).toBe(200);
      expect(getNewRes.body.data.phases.length).toBe(4);
      expect(getNewRes.body.data.previous_roadmap_id).toBe(baseRoadmapId);
    });
  });
});
