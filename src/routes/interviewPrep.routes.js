'use strict';

const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const { ensureActiveCandidate } = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');

const InterviewPrepController = require('../controllers/interviewPrep.controller');
const {
  startInterviewSessionSchema,
  interviewSessionParamSchema,
  evaluateAnswerSchema,
  listInterviewSessionsQuerySchema
} = require('../validators');

// Protected for active candidates
router.use(authMiddleware, ensureActiveCandidate);

router.post('/sessions', validate(startInterviewSessionSchema), InterviewPrepController.startSession);
router.get('/sessions', validate(listInterviewSessionsQuerySchema), InterviewPrepController.listSessions);
router.get('/sessions/:session', validate(interviewSessionParamSchema), InterviewPrepController.getSession);
router.post('/sessions/:session/evaluate', validate(interviewSessionParamSchema), validate(evaluateAnswerSchema), InterviewPrepController.evaluateAnswer);

module.exports = router;
