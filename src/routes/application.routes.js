const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const { ensureActiveCandidate, ensureActiveAdmin } = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');
const ApplicationController = require('../controllers/application.controller');

const {
  listApplicationsQuerySchema,
  applicationParamSchema,
  createApplicationSchema,
  updateApplicationStatusSchema,
  updateApplicationNotesSchema
} = require('../validators');

// All application routes require authentication
router.use(authMiddleware);

// List applications (Candidate sees their own, Admin sees all)
router.get('/', validate(listApplicationsQuerySchema), ApplicationController.list);

// Submit new application (Candidate only)
router.post('/', ensureActiveCandidate, validate(createApplicationSchema), ApplicationController.apply);

// View single application details
router.get('/:application', validate(applicationParamSchema), ApplicationController.show);

// Admin updates status (Multi-stage lifecycle)
router.patch(
  '/:application/status',
  ensureActiveAdmin,
  validate(applicationParamSchema),
  validate(updateApplicationStatusSchema),
  ApplicationController.updateStatus
);

// Candidate self-withdraws application
router.post(
  '/:application/withdraw',
  ensureActiveCandidate,
  validate(applicationParamSchema),
  ApplicationController.withdraw
);

// Candidate updates personal tracking notes
router.patch(
  '/:application/notes',
  ensureActiveCandidate,
  validate(applicationParamSchema),
  validate(updateApplicationNotesSchema),
  ApplicationController.updateNotes
);

module.exports = router;
