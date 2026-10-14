const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const { ensureActiveCandidate } = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');
const JobController = require('../controllers/job.controller');
const MatchController = require('../controllers/match.controller');

const {
  listJobsQuerySchema,
  jobPostParamSchema,
  jobMatchParamSchema,
  recommendationsQuerySchema
} = require('../validators');

// Public jobs feed (optional candidate auth populates is_saved)
router.get('/', validate(listJobsQuerySchema), authMiddleware.optional, JobController.list);
router.get('/feed', validate(listJobsQuerySchema), authMiddleware.optional, JobController.list);
router.get('/list', validate(listJobsQuerySchema), authMiddleware.optional, JobController.list);
router.get('/all', validate(listJobsQuerySchema), authMiddleware.optional, JobController.list);
router.get('/search', validate(listJobsQuerySchema), authMiddleware.optional, JobController.list);

// Candidate personalized recommendations (placed before /:jobPost)
router.get('/recommendations', authMiddleware, ensureActiveCandidate, validate(recommendationsQuerySchema), MatchController.getRecommendations);

// Candidate saved jobs (can be accessed via /api/jobs/saved or /api/saved-jobs)
router.get('/saved', authMiddleware, ensureActiveCandidate, JobController.savedJobs);

// Candidate explainable match endpoints for specific job
router.get('/:jobPost/match', authMiddleware, ensureActiveCandidate, validate(jobMatchParamSchema), MatchController.getJobMatch);
router.post('/:jobPost/match/recalculate', authMiddleware, ensureActiveCandidate, validate(jobMatchParamSchema), MatchController.recalculateMatch);

// Single job post details
router.get('/:jobPost', validate(jobPostParamSchema), authMiddleware.optional, JobController.show);

// Candidate bookmark / save actions
router.post('/:jobPost/save', authMiddleware, ensureActiveCandidate, validate(jobPostParamSchema), JobController.save);
router.delete('/:jobPost/save', authMiddleware, ensureActiveCandidate, validate(jobPostParamSchema), JobController.unsave);

module.exports = router;
