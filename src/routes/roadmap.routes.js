'use strict';

const express = require('express');
const router = express.Router();

const RoadmapController = require('../controllers/roadmap.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { ensureActiveCandidate } = require('../middlewares/roles.middleware');
const { roadmapLimiter } = require('../middlewares/rateLimiter.middleware');
const {
  validate,
  createRoadmapSchema,
  refreshRoadmapSchema,
  roadmapParamSchema,
  roadmapTaskParamSchema,
  listRoadmapsQuerySchema,
  completeRoadmapTaskSchema,
  addRoadmapXpSchema,
  getRoadmapXpQuerySchema
} = require('../validators');

// Candidate roadmap generation
router.post(
  '/',
  authMiddleware,
  ensureActiveCandidate,
  roadmapLimiter,
  validate(createRoadmapSchema),
  RoadmapController.generate
);

// List user's roadmaps
router.get(
  '/',
  authMiddleware,
  validate(listRoadmapsQuerySchema),
  RoadmapController.list
);

// Global candidate XP & roadmap achievements status
router.get(
  '/xp',
  authMiddleware,
  ensureActiveCandidate,
  validate(getRoadmapXpQuerySchema),
  RoadmapController.getXp
);

// Add XP for user roadmap achievement
router.patch(
  '/xp',
  authMiddleware,
  ensureActiveCandidate,
  validate(addRoadmapXpSchema),
  RoadmapController.addXp
);

// Show roadmap details with full hierarchy
router.get(
  '/:roadmap',
  authMiddleware,
  validate(roadmapParamSchema),
  RoadmapController.getById
);

// Roadmap-specific XP status
router.get(
  '/:roadmap/xp',
  authMiddleware,
  ensureActiveCandidate,
  validate(roadmapParamSchema),
  RoadmapController.getRoadmapXp
);

// Add XP to specific roadmap
router.patch(
  '/:roadmap/xp',
  authMiddleware,
  ensureActiveCandidate,
  validate(roadmapParamSchema),
  validate(addRoadmapXpSchema),
  RoadmapController.addRoadmapXp
);

// Dynamic refresh
router.post(
  '/:roadmap/refresh',
  authMiddleware,
  ensureActiveCandidate,
  roadmapLimiter,
  validate(roadmapParamSchema),
  validate(refreshRoadmapSchema),
  RoadmapController.refresh
);

// Complete task (nested variant)
router.patch(
  '/tasks/:roadmapTask/complete',
  authMiddleware,
  ensureActiveCandidate,
  validate(roadmapTaskParamSchema),
  validate(completeRoadmapTaskSchema),
  RoadmapController.completeTask
);

module.exports = router;

