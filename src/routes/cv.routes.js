const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const { ensureActiveCandidate } = require('../middlewares/roles.middleware');
const { uploadCvMiddleware } = require('../middlewares/upload.middleware');
const validate = require('../middlewares/validate.middleware');

const CvController = require('../controllers/cv.controller');

const {
  verifyCvExtractionSchema,
  cvDocumentParamSchema,
  extractionParamSchema
} = require('../validators');

// All CV endpoints require authenticated candidate
router.use(authMiddleware, ensureActiveCandidate);

// POST /api/cv/upload
router.post('/upload', uploadCvMiddleware, CvController.upload);

// GET /api/cv/status/:cvDocument
router.get('/status/:cvDocument', validate(cvDocumentParamSchema), CvController.getStatus);

// GET /api/cv/preview/:cvDocument
router.get('/preview/:cvDocument', validate(cvDocumentParamSchema), CvController.preview);

// GET /api/cv/history
router.get('/history', CvController.getHistory);

// POST /api/cv/retry/:cvDocument
router.post('/retry/:cvDocument', validate(cvDocumentParamSchema), CvController.retry);

// POST /api/cv/extractions/:extraction/verify
router.post('/extractions/:extraction/verify', validate(extractionParamSchema), validate(verifyCvExtractionSchema), CvController.verify);

module.exports = router;
