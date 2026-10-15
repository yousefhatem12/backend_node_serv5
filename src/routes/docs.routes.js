'use strict';

const express = require('express');
const router = express.Router();
const DocsController = require('../controllers/docs.controller');

// GET /api/docs/openapi.json -> the parsed spec
router.get('/openapi.json', DocsController.getSpec);

// GET /api/docs/openapi.yaml -> raw YAML spec
router.get('/openapi.yaml', DocsController.getYamlSpec);

// GET /api/docs -> the inline Swagger UI HTML page
router.get('/', DocsController.getUi);

module.exports = router;
