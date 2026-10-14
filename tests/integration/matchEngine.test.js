'use strict';

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const authService = require('../../src/services/auth.service');
const MatchEngineService = require('../../src/services/matchEngine.service');

describe('Phase 9 - Match Engine, Skill Gaps & Personalized Recommendations', () => {
  let candidateUser;
  let candidateToken;
  let candidateProfile;
  let adminUser;
  let adminToken;

  let skillNode;
  let skillMySQL;
  let skillReact;
  let skillDocker;
  let skillSwift;

  let companyTech;
  let jobNodeSenior;
  let jobSwiftJunior;
  let jobFullstackMid;

  beforeAll(async () => {
    await db.sequelize.authenticate();

    // Clean test tables
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.JobMatch.destroy({ where: {}, truncate: true });
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

    // 1. Create Skills
    skillNode = await db.Skill.create({ name: 'Node.js', normalized_name: 'node.js' });
    skillMySQL = await db.Skill.create({ name: 'MySQL', normalized_name: 'mysql' });
    skillReact = await db.Skill.create({ name: 'React', normalized_name: 'react' });
    skillDocker = await db.Skill.create({ name: 'Docker', normalized_name: 'docker' });
    skillSwift = await db.Skill.create({ name: 'Swift', normalized_name: 'swift' });

    // 2. Create Candidate User & Profile
    candidateUser = await db.User.create({
      name: 'Kareem Backend',
      email: 'kareem.match@skillmatch.com',
      password: 'Password123!',
      role: 'candidate',
      is_active: true,
      email_verified_at: new Date()
    });
    candidateToken = authService.generateToken(candidateUser);

    candidateProfile = await db.CandidateProfile.create({
      user_id: candidateUser.id,
      title: 'Senior Backend Engineer',
      years_of_experience: 5,
      city: 'Cairo',
      country: 'Egypt'
    });

    await db.CareerPreference.create({
      candidate_profile_id: candidateProfile.id,
      target_role: 'Backend Engineer',
      preferred_work_mode: 'remote',
      preferred_country: 'Egypt',
      preferred_city: 'Cairo'
    });

    // Add candidate skills
    await db.CandidateSkill.create({
      candidate_profile_id: candidateProfile.id,
      skill_id: skillNode.id,
      proficiency_level: 'expert',
      years_of_experience: 5
    });

    await db.CandidateSkill.create({
      candidate_profile_id: candidateProfile.id,
      skill_id: skillMySQL.id,
      proficiency_level: 'advanced',
      years_of_experience: 4
    });

    await db.CandidateSkill.create({
      candidate_profile_id: candidateProfile.id,
      skill_id: skillReact.id,
      proficiency_level: 'intermediate',
      years_of_experience: 2
    });

    // 3. Create Admin User
    adminUser = await db.User.create({
      name: 'Match Admin',
      email: 'admin.match@skillmatch.com',
      password: 'Password123!',
      role: 'admin',
      is_active: true,
      email_verified_at: new Date()
    });
    adminToken = authService.generateToken(adminUser);

    // 4. Create Company
    companyTech = await db.Company.create({
      name: 'Apex Systems Egypt',
      normalized_name: 'apex systems egypt',
      country: 'Egypt',
      city: 'Cairo',
      is_verified: true,
      is_active: true
    });

    // 5. Create Job Post 1: High Fit (Senior Node.js Backend Engineer)
    jobNodeSenior = await db.JobPost.create({
      company_id: companyTech.id,
      title: 'Senior Node.js Backend Engineer',
      canonical_role: 'Backend Engineer',
      description: 'Lead backend microservices in Node.js and MySQL.',
      job_type: 'job',
      employment_type: 'full-time',
      work_mode: 'remote',
      experience_level: 'senior',
      country: 'Egypt',
      city: 'Cairo',
      min_years_experience: 4,
      published_at: new Date(),
      is_active: true
    });

    await db.JobSkill.create({
      job_post_id: jobNodeSenior.id,
      skill_id: skillNode.id,
      is_required: true,
      importance: 5,
      required_level: 'senior'
    });

    await db.JobSkill.create({
      job_post_id: jobNodeSenior.id,
      skill_id: skillMySQL.id,
      is_required: true,
      importance: 4,
      required_level: 'senior'
    });

    await db.JobSkill.create({
      job_post_id: jobNodeSenior.id,
      skill_id: skillDocker.id,
      is_required: false,
      importance: 3,
      required_level: 'mid-level'
    });

    // 6. Create Job Post 2: Low Fit (Junior iOS Swift Developer)
    jobSwiftJunior = await db.JobPost.create({
      company_id: companyTech.id,
      title: 'Junior iOS Swift Developer',
      canonical_role: 'Mobile Developer',
      description: 'Build native iOS applications with Swift and SwiftUI.',
      job_type: 'job',
      employment_type: 'full-time',
      work_mode: 'on-site',
      experience_level: 'entry',
      country: 'Egypt',
      city: 'Alexandria',
      min_years_experience: 1,
      published_at: new Date(),
      is_active: true
    });

    await db.JobSkill.create({
      job_post_id: jobSwiftJunior.id,
      skill_id: skillSwift.id,
      is_required: true,
      importance: 5,
      required_level: 'entry'
    });

    // 7. Create Job Post 3: Good Fit (Mid Fullstack Engineer)
    jobFullstackMid = await db.JobPost.create({
      company_id: companyTech.id,
      title: 'Mid Full Stack Engineer (Node & React)',
      canonical_role: 'Full Stack Engineer',
      description: 'Full stack development with Node and React.',
      job_type: 'job',
      employment_type: 'full-time',
      work_mode: 'hybrid',
      experience_level: 'mid-level',
      country: 'Egypt',
      city: 'Cairo',
      min_years_experience: 2,
      published_at: new Date(),
      is_active: true
    });

    await db.JobSkill.create({
      job_post_id: jobFullstackMid.id,
      skill_id: skillNode.id,
      is_required: true,
      importance: 4,
      required_level: 'mid-level'
    });

    await db.JobSkill.create({
      job_post_id: jobFullstackMid.id,
      skill_id: skillReact.id,
      is_required: true,
      importance: 4,
      required_level: 'mid-level'
    });

    await db.JobSkill.create({
      job_post_id: jobFullstackMid.id,
      skill_id: skillDocker.id,
      is_required: false,
      importance: 3,
      required_level: 'mid-level'
    });
  });

  afterAll(async () => {
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.JobMatch.destroy({ where: {}, truncate: true });
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
  });

  // ---------------------------------------------------------------------------
  // 1. Authorization & Role Checks
  // ---------------------------------------------------------------------------
  describe('Match Endpoint Authorization', () => {
    it('rejects unauthenticated request to /match with 401', async () => {
      const res = await request(app).get(`/api/jobs/${jobNodeSenior.id}/match`);
      expect(res.status).toBe(401);
    });

    it('rejects non-candidate (admin) request with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/jobs/${jobNodeSenior.id}/match`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent job post id', async () => {
      const res = await request(app)
        .get('/api/jobs/999999/match')
        .set('Authorization', `Bearer ${candidateToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Explainable Job Match Scoring & Rationale
  // ---------------------------------------------------------------------------
  describe('Explainable Job Match Scoring', () => {
    it('calculates strong match (>= 80%) for Senior Node.js vacancy', async () => {
      const res = await request(app)
        .get(`/api/jobs/${jobNodeSenior.id}/match`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');

      const data = res.body.data;
      expect(data.job_post_id).toBe(Number(jobNodeSenior.id));
      expect(data.match_score).toBeGreaterThanOrEqual(80);
      expect(data.match_level).toBe('strong');
      expect(data.matched_skills_count).toBe(2);
      expect(data.missing_skills_count).toBe(1);

      // Verify matched skills
      expect(Array.isArray(data.matched_skills)).toBe(true);
      const matchedNames = data.matched_skills.map(s => s.name);
      expect(matchedNames).toContain('Node.js');
      expect(matchedNames).toContain('MySQL');

      // Verify missing skills (Docker is preferred, not required)
      expect(Array.isArray(data.missing_skills)).toBe(true);
      expect(data.missing_skills[0].name).toBe('Docker');
      expect(data.missing_skills[0].is_required).toBe(false);

      // Verify gap analysis structure
      expect(data).toHaveProperty('gap_analysis');
      expect(data.gap_analysis.must_have_gaps.length).toBe(0);
      expect(data.gap_analysis.nice_to_have_gaps.length).toBe(1);
      expect(data.gap_analysis.experience_gap.status).toBe('sufficient');

      // Verify explanation string
      expect(typeof data.explanation).toBe('string');
      expect(data.explanation.length).toBeGreaterThan(10);

      // Verify persisted in DB
      const dbMatch = await db.JobMatch.findOne({
        where: { user_id: candidateUser.id, job_post_id: jobNodeSenior.id }
      });
      expect(dbMatch).not.toBeNull();
      expect(Number(dbMatch.match_score)).toBe(data.match_score);
    });

    it('calculates low match (< 45%) for iOS Swift developer role', async () => {
      const res = await request(app)
        .get(`/api/jobs/${jobSwiftJunior.id}/match`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.match_score).toBeLessThan(50);
      expect(data.match_level).toMatch(/low|moderate/);
      expect(data.matched_skills_count).toBe(0);
      expect(data.missing_skills_count).toBe(1);
      expect(data.gap_analysis.must_have_gaps.length).toBe(1);
      expect(data.gap_analysis.must_have_gaps[0].name).toBe('Swift');
    });

    it('POST /api/jobs/:jobPost/match/recalculate forces recalculation and updates match', async () => {
      // Candidate learns Docker!
      await db.CandidateSkill.create({
        candidate_profile_id: candidateProfile.id,
        skill_id: skillDocker.id,
        proficiency_level: 'advanced',
        years_of_experience: 2
      });

      const res = await request(app)
        .post(`/api/jobs/${jobNodeSenior.id}/match/recalculate`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'success');

      const data = res.body.data;
      expect(data.matched_skills_count).toBe(3); // Now Node, MySQL, and Docker are all matched!
      expect(data.missing_skills_count).toBe(0);
      expect(data.match_score).toBeGreaterThanOrEqual(90);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Personalized Job Recommendations Feed
  // ---------------------------------------------------------------------------
  describe('Personalized Recommendations Feed', () => {
    it('GET /api/jobs/recommendations returns vacancies sorted by match score descending', async () => {
      const res = await request(app)
        .get('/api/jobs/recommendations')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Verify that jobs are ordered by match score DESC
      const firstJob = res.body.data[0];
      const secondJob = res.body.data[1];

      expect(firstJob).toHaveProperty('match');
      expect(firstJob.match).toHaveProperty('match_score');
      expect(secondJob).toHaveProperty('match');

      expect(firstJob.match.match_score).toBeGreaterThanOrEqual(secondJob.match.match_score);
      expect(firstJob.id).toBe(Number(jobNodeSenior.id));
    });

    it('supports min_score filter and work_mode filter', async () => {
      const res = await request(app)
        .get('/api/jobs/recommendations?min_score=80&work_mode=remote')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(Number(jobNodeSenior.id));
    });

    it('GET /api/candidate/recommended-jobs provides seamless alias to recommendations', async () => {
      const res = await request(app)
        .get('/api/candidate/recommended-jobs')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Candidate Aggregated Skill Gaps
  // ---------------------------------------------------------------------------
  describe('Candidate Aggregated Skill Gaps', () => {
    it('GET /api/candidate/skill-gaps aggregates missing skills across candidate vacancies', async () => {
      // Bookmark jobSwiftJunior so its gaps are included in the analysis
      await db.SavedJob.create({
        candidate_profile_id: candidateProfile.id,
        job_post_id: jobSwiftJunior.id
      });

      const res = await request(app)
        .get('/api/candidate/skill-gaps')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');

      const data = res.body.data;
      expect(data).toHaveProperty('total_jobs_analyzed');
      expect(data.total_jobs_analyzed).toBeGreaterThanOrEqual(1);
      expect(data).toHaveProperty('top_gaps');
      expect(Array.isArray(data.top_gaps)).toBe(true);

      // Swift should be identified as a prioritized gap
      const gapNames = data.top_gaps.map(g => g.name);
      expect(gapNames).toContain('Swift');

      expect(data).toHaveProperty('recommended_action');
      expect(typeof data.recommended_action).toBe('string');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Admin Job Matches Inspection
  // ---------------------------------------------------------------------------
  describe('Admin Job Matches Inspection', () => {
    it('GET /api/admin/job-matches lists candidate match calculations with pagination', async () => {
      const res = await request(app)
        .get('/api/admin/job-matches')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const firstMatch = res.body.data[0];
      expect(firstMatch).toHaveProperty('match_score');
      expect(firstMatch).toHaveProperty('candidate');
      expect(firstMatch).toHaveProperty('job');
    });

    it('rejects candidate user accessing /api/admin/job-matches with 403', async () => {
      const res = await request(app)
        .get('/api/admin/job-matches')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(403);
    });
  });
});
