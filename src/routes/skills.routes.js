const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const SkillController = require('../controllers/skill.controller');
const { searchSkillsQuerySchema } = require('../validators');

// Must be authenticated
router.use(authMiddleware);

// GET /api/skills/search?q=...
router.get('/search', validate(searchSkillsQuerySchema), SkillController.search);

module.exports = router;
