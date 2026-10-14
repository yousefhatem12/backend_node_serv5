'use strict';

const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const { ensureActiveCandidate } = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');

const ApplicationStrategyController = require('../controllers/applicationStrategy.controller');
const {
  assessStrategySchema,
  strategyParamSchema,
  listStrategiesQuerySchema
} = require('../validators');

// Protected for active candidates
router.use(authMiddleware, ensureActiveCandidate);

router.post('/assess', validate(assessStrategySchema), ApplicationStrategyController.assess);
router.get('/', validate(listStrategiesQuerySchema), ApplicationStrategyController.listHistory);
router.get('/:strategy', validate(strategyParamSchema), ApplicationStrategyController.getAssessment);

module.exports = router;
