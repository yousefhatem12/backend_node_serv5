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
  completeRoadmapTaskSchema
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

// Show roadmap details with full hierarchy
router.get(
  '/:roadmap',
  authMiddleware,
  validate(roadmapParamSchema),
  RoadmapController.getById
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
