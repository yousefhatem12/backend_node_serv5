'use strict';

const request = require('supertest');
const express = require('express');
const RoadmapService = require('../../src/services/roadmap.service');
const RoadmapController = require('../../src/controllers/roadmap.controller');
const db = require('../../src/models');
const { validate, addRoadmapXpSchema, getRoadmapXpQuerySchema, roadmapParamSchema } = require('../../src/validators');
const errorHandler = require('../../src/middlewares/errorHandler');

describe('Roadmap XP & Gamification Unit Tests', () => {
  describe('1. RoadmapService.calculateLevel logic', () => {
    it('calculates Level 1 for 0 XP with 0% progress to Level 2', () => {
      const result = RoadmapService.calculateLevel(0);
      expect(result.level).toBe(1);
      expect(result.title).toBe('Beginner Explorer');
      expect(result.total_xp).toBe(0);
      expect(result.next_level_xp).toBe(100);
      expect(result.xp_to_next_level).toBe(100);
      expect(result.progress_percentage).toBe(0);
    });

    it('calculates Level 1 for 50 XP with 50% progress', () => {
      const result = RoadmapService.calculateLevel(50);
      expect(result.level).toBe(1);
      expect(result.total_xp).toBe(50);
      expect(result.next_level_xp).toBe(100);
      expect(result.xp_to_next_level).toBe(50);
      expect(result.progress_percentage).toBe(50);
    });

    it('levels up to Level 2 at 100 XP', () => {
      const result = RoadmapService.calculateLevel(100);
      expect(result.level).toBe(2);
      expect(result.title).toBe('Skill Builder');
      expect(result.total_xp).toBe(100);
      expect(result.next_level_xp).toBe(250);
      expect(result.progress_percentage).toBe(0);
    });

    it('levels up to Level 3 at 250 XP', () => {
      const result = RoadmapService.calculateLevel(250);
      expect(result.level).toBe(3);
      expect(result.title).toBe('Knowledge Seeker');
      expect(result.next_level_xp).toBe(450);
    });
  });

  describe('2. RoadmapService XP Management', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('getUserXp aggregates cumulative roadmap XP and returns user leveling', async () => {
      const mockRoadmap = {
        id: 1,
        title: 'Backend Roadmap',
        status: 'in_progress',
        progress: 40.0,
        metadata: {
          earned_xp: 120,
          xp_history: [
            { amount: 120, reason: 'Completed milestone', awarded_at: new Date().toISOString() }
          ]
        },
        phases: [
          {
            milestones: [
              {
                tasks: [
                  { weight: 2, status: 'completed' },
                  { weight: 1, status: 'pending' }
                ]
              }
            ]
          }
        ]
      };

      jest.spyOn(db.Roadmap, 'findAll').mockResolvedValueOnce([mockRoadmap]);
      jest.spyOn(db.CandidateProfile, 'findOne').mockResolvedValueOnce({ xp: 120 });

      const res = await RoadmapService.getUserXp(10);
      expect(res.user_id).toBe(10);
      expect(res.total_xp).toBe(120);
      expect(res.level).toBe(2);
      expect(res.level_title).toBe('Skill Builder');
      expect(res.roadmaps).toHaveLength(1);
      expect(res.roadmaps[0].earned_xp).toBe(120);
      expect(res.recent_achievements).toHaveLength(1);
    });

    it('getRoadmapXp returns roadmap-specific metrics and history', async () => {
      const mockRoadmap = {
        id: 5,
        user_id: 10,
        title: 'Frontend Roadmap',
        status: 'in_progress',
        progress: 50.0,
        metadata: {
          earned_xp: 80,
          xp_history: [{ amount: 80, reason: 'Task completion' }]
        },
        phases: []
      };

      jest.spyOn(db.Roadmap, 'findByPk').mockResolvedValueOnce(mockRoadmap);
      jest.spyOn(RoadmapService, 'getUserXp').mockResolvedValueOnce({
        level_info: RoadmapService.calculateLevel(80)
      });

      const res = await RoadmapService.getRoadmapXp(5, 10);
      expect(res.roadmap_id).toBe(5);
      expect(res.earned_xp).toBe(80);
      expect(res.history).toHaveLength(1);
      expect(res.user_level.level).toBe(1);
    });

    it('getRoadmapXp forbids non-owner access', async () => {
      const mockRoadmap = {
        id: 5,
        user_id: 999, // different user
        title: 'Other Roadmap'
      };

      jest.spyOn(db.Roadmap, 'findByPk').mockResolvedValueOnce(mockRoadmap);

      await expect(RoadmapService.getRoadmapXp(5, 10)).rejects.toThrow(
        'You do not have access to this roadmap.'
      );
    });

    it('addXp awards XP, updates metadata, and detects level up', async () => {
      const mockRoadmap = {
        id: 2,
        user_id: 10,
        title: 'DevOps Roadmap',
        metadata: { earned_xp: 80, xp_history: [] },
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(db.Roadmap, 'findByPk').mockResolvedValueOnce(mockRoadmap);

      // First getUserXp: before addition (80 XP -> Level 1)
      // Second getUserXp: after addition (130 XP -> Level 2)
      jest.spyOn(RoadmapService, 'getUserXp')
        .mockResolvedValueOnce({ level_info: RoadmapService.calculateLevel(80) })
        .mockResolvedValueOnce({ level_info: RoadmapService.calculateLevel(130) });

      jest.spyOn(db.CandidateProfile, 'findOne').mockResolvedValueOnce({
        xp: 80,
        save: jest.fn().mockResolvedValue(true)
      });

      const result = await RoadmapService.addXp(10, {
        roadmap_id: 2,
        xp: 50,
        reason: 'Docker Compose milestone achieved'
      });

      expect(result.xp_added).toBe(50);
      expect(result.earned_xp).toBe(130);
      expect(result.leveled_up).toBe(true);
      expect(result.previous_level).toBe(1);
      expect(result.new_level).toBe(2);
      expect(mockRoadmap.save).toHaveBeenCalled();
    });

    it('addXp throws ValidationError on non-positive XP', async () => {
      await expect(RoadmapService.addXp(10, { xp: 0 })).rejects.toThrow(
        'XP amount must be a positive integer.'
      );
    });
  });

  describe('3. HTTP Endpoints & Route Controllers', () => {
    let app;

    beforeAll(() => {
      app = express();
      app.use(express.json());

      // Mock candidate auth middleware
      const mockAuthCandidate = (req, res, next) => {
        req.user = { id: 10, role: 'candidate', is_active: true };
        next();
      };

      // Roadmap XP routes
      app.get('/api/roadmaps/xp', mockAuthCandidate, validate(getRoadmapXpQuerySchema), RoadmapController.getXp);
      app.patch('/api/roadmaps/xp', mockAuthCandidate, validate(addRoadmapXpSchema), RoadmapController.addXp);
      app.get('/api/roadmaps/:roadmap/xp', mockAuthCandidate, validate(roadmapParamSchema), RoadmapController.getRoadmapXp);
      app.patch('/api/roadmaps/:roadmap/xp', mockAuthCandidate, validate(roadmapParamSchema), validate(addRoadmapXpSchema), RoadmapController.addRoadmapXp);

      // Candidate XP route alias
      app.get('/api/candidate/xp', mockAuthCandidate, validate(getRoadmapXpQuerySchema), RoadmapController.getXp);
      app.patch('/api/candidate/xp', mockAuthCandidate, validate(addRoadmapXpSchema), RoadmapController.addXp);

      app.use(errorHandler);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('GET /api/roadmaps/xp returns 200 with user XP summary', async () => {
      jest.spyOn(RoadmapService, 'getUserXp').mockResolvedValueOnce({
        user_id: 10,
        total_xp: 150,
        level: 2,
        level_title: 'Skill Builder',
        level_info: RoadmapService.calculateLevel(150),
        active_roadmap: { id: 1, title: 'Active Roadmap' },
        roadmaps: [],
        recent_achievements: []
      });

      const res = await request(app)
        .get('/api/roadmaps/xp')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.total_xp).toBe(150);
      expect(res.body.data.level).toBe(2);
      expect(res.body.data.level_title).toBe('Skill Builder');
    });

    it('PATCH /api/roadmaps/xp adds XP and returns 200', async () => {
      jest.spyOn(RoadmapService, 'addXp').mockResolvedValueOnce({
        xp_added: 60,
        earned_xp: 210,
        roadmap_id: 1,
        roadmap_title: 'Fullstack Roadmap',
        reason: 'React Testing Library completed',
        level_info: RoadmapService.calculateLevel(210),
        leveled_up: false,
        previous_level: 2,
        new_level: 2
      });

      const res = await request(app)
        .patch('/api/roadmaps/xp')
        .send({ xp: 60, reason: 'React Testing Library completed' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('XP awarded successfully.');
      expect(res.body.data.xp_added).toBe(60);
      expect(res.body.data.earned_xp).toBe(210);
    });

    it('PATCH /api/roadmaps/xp also accepts "points" alias', async () => {
      jest.spyOn(RoadmapService, 'addXp').mockResolvedValueOnce({
        xp_added: 40,
        earned_xp: 250,
        roadmap_id: 1,
        roadmap_title: 'Fullstack Roadmap',
        reason: 'Bonus Quiz Points',
        level_info: RoadmapService.calculateLevel(250),
        leveled_up: true,
        previous_level: 2,
        new_level: 3
      });

      const res = await request(app)
        .patch('/api/roadmaps/xp')
        .send({ points: 40, reason: 'Bonus Quiz Points' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.xp_added).toBe(40);
    });

    it('GET /api/roadmaps/:roadmap/xp returns specific roadmap XP status', async () => {
      jest.spyOn(RoadmapService, 'getRoadmapXp').mockResolvedValueOnce({
        roadmap_id: 3,
        roadmap_title: 'Data Science Path',
        status: 'in_progress',
        progress: 35.0,
        earned_xp: 90,
        target_xp: 300,
        tasks_completed: 4,
        total_tasks: 12,
        history: [],
        user_level: RoadmapService.calculateLevel(90)
      });

      const res = await request(app)
        .get('/api/roadmaps/3/xp')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.roadmap_id).toBe(3);
      expect(res.body.data.earned_xp).toBe(90);
    });

    it('PATCH /api/roadmaps/:roadmap/xp adds XP to specific roadmap', async () => {
      jest.spyOn(RoadmapService, 'addXp').mockResolvedValueOnce({
        xp_added: 75,
        earned_xp: 165,
        roadmap_id: 3,
        roadmap_title: 'Data Science Path',
        reason: 'Pandas Data Cleaning Mastered',
        level_info: RoadmapService.calculateLevel(165),
        leveled_up: false,
        previous_level: 2,
        new_level: 2
      });

      const res = await request(app)
        .patch('/api/roadmaps/3/xp')
        .send({ xp: 75, reason: 'Pandas Data Cleaning Mastered' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('XP awarded successfully for roadmap.');
      expect(res.body.data.earned_xp).toBe(165);
    });

    it('GET & PATCH /api/candidate/xp work via candidate route alias', async () => {
      jest.spyOn(RoadmapService, 'getUserXp').mockResolvedValueOnce({
        user_id: 10,
        total_xp: 300,
        level: 3,
        level_title: 'Knowledge Seeker',
        level_info: RoadmapService.calculateLevel(300),
        active_roadmap: null,
        roadmaps: [],
        recent_achievements: []
      });

      const getRes = await request(app)
        .get('/api/candidate/xp')
        .expect(200);

      expect(getRes.body.data.total_xp).toBe(300);

      jest.spyOn(RoadmapService, 'addXp').mockResolvedValueOnce({
        xp_added: 25,
        earned_xp: 325,
        roadmap_id: 1,
        roadmap_title: 'Main Roadmap',
        reason: 'Candidate daily check-in',
        level_info: RoadmapService.calculateLevel(325),
        leveled_up: false,
        previous_level: 3,
        new_level: 3
      });

      const patchRes = await request(app)
        .patch('/api/candidate/xp')
        .send({ xp: 25, reason: 'Candidate daily check-in' })
        .expect(200);

      expect(patchRes.body.data.xp_added).toBe(25);
    });

    it('rejects invalid XP payloads with 422 validation error', async () => {
      const res = await request(app)
        .patch('/api/roadmaps/xp')
        .send({ xp: -10 })
        .expect(422);

      expect(res.body.message).toBeDefined();
      expect(res.body.errors).toBeDefined();
    });
  });
});
