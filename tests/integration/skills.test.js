const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const authService = require('../../src/services/auth.service');

describe('Phase 3 - Skills & Taxonomy Integration Tests', () => {
  let candidateUser;
  let candidateToken;
  let otherCandidateUser;
  let otherCandidateToken;
  let adminUser;
  let adminToken;

  let phpSkill;
  let laravelSkill;
  let k8sSkill;
  let k8sAlias;

  beforeAll(async () => {
    await db.sequelize.authenticate();

    // Clean test tables
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.CandidateSkill.destroy({ where: {}, truncate: true });
    await db.SkillAlias.destroy({ where: {}, truncate: true });
    await db.Skill.destroy({ where: {}, truncate: true });
    await db.SkillCategory.destroy({ where: {}, truncate: true });
    await db.CandidateProfile.destroy({ where: {}, truncate: true });
    await db.User.destroy({ where: {}, truncate: true });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // 1. Create candidate user
    candidateUser = await db.User.create({
      name: 'Ahmed Candidate',
      email: 'ahmed.candidate@example.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    candidateToken = authService.generateToken(candidateUser);

    // 2. Create other candidate user
    otherCandidateUser = await db.User.create({
      name: 'Other Candidate',
      email: 'other.skills@example.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    otherCandidateToken = authService.generateToken(otherCandidateUser);

    // 3. Create admin user
    adminUser = await db.User.create({
      name: 'Admin User',
      email: 'admin.skills@example.com',
      password: 'Password123!',
      role: 'admin',
      is_active: true,
      email_verified_at: new Date()
    });
    adminToken = authService.generateToken(adminUser);

    // 4. Seed baseline category, skills, and aliases
    const category = await db.SkillCategory.create({
      name: 'Web Frameworks',
      description: 'Web development frameworks'
    });

    phpSkill = await db.Skill.create({
      name: 'PHP',
      normalized_name: 'php',
      category: 'Programming Languages',
      is_verified: true
    });

    laravelSkill = await db.Skill.create({
      name: 'Laravel',
      normalized_name: 'laravel',
      skill_category_id: category.id,
      category: 'Web Frameworks',
      is_verified: true
    });

    k8sSkill = await db.Skill.create({
      name: 'Kubernetes',
      normalized_name: 'kubernetes',
      category: 'Cloud & DevOps',
      is_verified: true
    });

    k8sAlias = await db.SkillAlias.create({
      skill_id: k8sSkill.id,
      alias: 'k8s',
      normalized_alias: 'k8s'
    });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('Taxonomy Search (GET /api/skills/search)', () => {
    test('requires authentication (401 Unauthorized)', async () => {
      const res = await request(app)
        .get('/api/skills/search?q=laravel')
        .set('Accept', 'application/json');

      expect(res.status).toBe(401);
    });

    test('fails with 422 if q parameter is missing', async () => {
      const res = await request(app)
        .get('/api/skills/search')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('errors');
    });

    test('returns direct canonical skill matches (200 OK)', async () => {
      const res = await request(app)
        .get('/api/skills/search?q=larav')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const found = res.body.data.find(s => s.name === 'Laravel');
      expect(found).toBeDefined();
      expect(found.normalized_name).toBe('laravel');
      expect(found.category).toBe('Web Frameworks');
    });

    test('resolves alias query to canonical skill (k8s -> Kubernetes)', async () => {
      const res = await request(app)
        .get('/api/skills/search?q=k8s')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const found = res.body.data.find(s => s.name === 'Kubernetes');
      expect(found).toBeDefined();
      expect(found.normalized_name).toBe('kubernetes');
    });
  });

  describe('Candidate Skills Management (/api/candidate/skills)', () => {
    let createdCandidateSkillId;

    test('GET /api/candidate/skills requires candidate role (403 for admin)', async () => {
      const res = await request(app)
        .get('/api/candidate/skills')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(403);
    });

    test('POST /api/candidate/skills attaches existing canonical skill (201 Created)', async () => {
      const res = await request(app)
        .post('/api/candidate/skills')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json')
        .send({
          name: 'Laravel',
          proficiency_level: 'expert'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.proficiency_level).toBe('expert');
      expect(res.body.data.source).toBe('manual');
      expect(res.body.data.skill.name).toBe('Laravel');

      createdCandidateSkillId = res.body.data.id;
    });

    test('POST /api/candidate/skills with alias name links canonical skill (k8s -> Kubernetes)', async () => {
      const res = await request(app)
        .post('/api/candidate/skills')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json')
        .send({
          name: 'k8s',
          proficiency_level: 'intermediate'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.skill.name).toBe('Kubernetes');
      expect(res.body.data.skill_id).toBe(Number(k8sSkill.id));
    });

    test('POST /api/candidate/skills auto-creates brand new taxonomy skill if non-existent', async () => {
      const res = await request(app)
        .post('/api/candidate/skills')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json')
        .send({
          name: 'Tailwind CSS',
          proficiency_level: 'advanced'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.skill.name).toBe('Tailwind CSS');
      expect(res.body.data.skill.normalized_name).toBe('tailwind css');

      // Verify skill was persisted in global taxonomy
      const skillInDb = await db.Skill.findOne({ where: { normalized_name: 'tailwind css' } });
      expect(skillInDb).not.toBeNull();
    });

    test('GET /api/candidate/skills lists all attached candidate skills (200 OK)', async () => {
      const res = await request(app)
        .get('/api/candidate/skills')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3); // Laravel, Kubernetes, Tailwind CSS
    });

    test('other candidate cannot delete candidate skill (404 Not Found)', async () => {
      const res = await request(app)
        .delete(`/api/candidate/skills/${createdCandidateSkillId}`)
        .set('Authorization', `Bearer ${otherCandidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
    });

    test('DELETE /api/candidate/skills/:id removes candidate skill (204 No Content)', async () => {
      const res = await request(app)
        .delete(`/api/candidate/skills/${createdCandidateSkillId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(204);

      // Verify deletion in DB
      const exists = await db.CandidateSkill.findByPk(createdCandidateSkillId);
      expect(exists).toBeNull();
    });
  });

  describe('Admin Skills Management (/api/admin/skills)', () => {
    let newAdminSkillId;

    test('candidate cannot access admin skills endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json')
        .send({ name: 'GraphQL' });

      expect(res.status).toBe(403);
    });

    test('POST /api/admin/skills creates new canonical skill (201 Created)', async () => {
      const res = await request(app)
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'application/json')
        .send({
          name: 'GraphQL',
          category: 'API & Web Services'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('GraphQL');
      expect(res.body.data.normalized_name).toBe('graphql');
      expect(res.body.data.category).toBe('API & Web Services');

      newAdminSkillId = res.body.data.id;
    });

    test('POST /api/admin/skills rejects duplicate skill name (422)', async () => {
      const res = await request(app)
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'application/json')
        .send({
          name: 'graphql'
        });

      expect(res.status).toBe(422);
    });

    test('PATCH /api/admin/skills/:id updates skill details (200 OK)', async () => {
      const res = await request(app)
        .patch(`/api/admin/skills/${newAdminSkillId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'application/json')
        .send({
          name: 'GraphQL API',
          category: 'APIs'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('GraphQL API');
      expect(res.body.data.normalized_name).toBe('graphql api');
      expect(res.body.data.category).toBe('APIs');
    });
  });

  describe('Admin Skill Aliases Management (/api/admin/skills/:id/aliases)', () => {
    let createdAliasId;

    test('POST /api/admin/skills/:id/aliases adds alias (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/admin/skills/${phpSkill.id}/aliases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'application/json')
        .send({ alias: 'php8' });

      expect(res.status).toBe(201);
      expect(res.body.data.alias).toBe('php8');
      expect(res.body.data.normalized_alias).toBe('php8');
      expect(res.body.data.skill_id).toBe(Number(phpSkill.id));

      createdAliasId = res.body.data.id;
    });

    test('GET /api/admin/skills/:id/aliases lists all aliases for a skill (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/admin/skills/${phpSkill.id}/aliases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    test('PATCH /api/admin/skills/:id/aliases/:aliasId updates alias (200 OK)', async () => {
      const res = await request(app)
        .patch(`/api/admin/skills/${phpSkill.id}/aliases/${createdAliasId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'application/json')
        .send({ alias: 'php-8' });

      expect(res.status).toBe(200);
      expect(res.body.data.alias).toBe('php-8');
      expect(res.body.data.normalized_alias).toBe('php-8');
    });

    test('DELETE /api/admin/skills/:id/aliases/:aliasId deletes alias (204 No Content)', async () => {
      const res = await request(app)
        .delete(`/api/admin/skills/${phpSkill.id}/aliases/${createdAliasId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(204);

      const exists = await db.SkillAlias.findByPk(createdAliasId);
      expect(exists).toBeNull();
    });
  });

  describe('Skill Merging Engine (POST /api/admin/skills/:sourceSkillId/merge)', () => {
    let sourceSkill;
    let targetSkill;

    beforeAll(async () => {
      // Create duplicate source skill: "Postgres"
      sourceSkill = await db.Skill.create({
        name: 'Postgres DB',
        normalized_name: 'postgres db',
        category: 'Databases',
        is_verified: true
      });

      // Target skill: "PostgreSQL"
      targetSkill = await db.Skill.create({
        name: 'PostgreSQL',
        normalized_name: 'postgresql',
        category: 'Databases',
        is_verified: true
      });

      // Attach sourceSkill to candidateUser
      const candidateProfile = await db.CandidateProfile.findOne({
        where: { user_id: candidateUser.id }
      });

      await db.CandidateSkill.create({
        candidate_profile_id: candidateProfile.id,
        skill_id: sourceSkill.id,
        source: 'manual',
        proficiency_level: 'intermediate'
      });
    });

    test('fails with 422 when attempting to merge a skill into itself', async () => {
      const res = await request(app)
        .post(`/api/admin/skills/${sourceSkill.id}/merge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'application/json')
        .send({ target_skill_id: sourceSkill.id });

      expect(res.status).toBe(422);
    });

    test('merges source skill into target skill, reassigns candidate skills and creates alias (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/admin/skills/${sourceSkill.id}/merge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'application/json')
        .send({ target_skill_id: targetSkill.id });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(Number(targetSkill.id));
      expect(res.body.data.name).toBe('PostgreSQL');
      expect(res.body.meta.reassigned_candidate_skills).toBe(1);

      // Verify source skill was deleted
      const sourceInDb = await db.Skill.findByPk(sourceSkill.id);
      expect(sourceInDb).toBeNull();

      // Verify alias was created for sourceSkill's name pointing to targetSkill
      const alias = await db.SkillAlias.findOne({
        where: { normalized_alias: sourceSkill.normalized_name }
      });
      expect(alias).not.toBeNull();
      expect(alias.skill_id).toBe(Number(targetSkill.id));

      // Verify candidate now has targetSkill
      const candidateProfile = await db.CandidateProfile.findOne({
        where: { user_id: candidateUser.id }
      });
      const candidateTargetSkill = await db.CandidateSkill.findOne({
        where: {
          candidate_profile_id: candidateProfile.id,
          skill_id: targetSkill.id
        }
      });
      expect(candidateTargetSkill).not.toBeNull();
    });
  });
});
