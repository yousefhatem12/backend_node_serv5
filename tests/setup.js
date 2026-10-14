process.env.NODE_ENV = 'test';
require('dotenv').config();

// Ensure local deterministic mocks are used for base unit and integration tests
process.env.AI_ROADMAP_SERVICE_ENABLED = 'false';
process.env.AI_INTERVIEW_SERVICE_ENABLED = 'false';
process.env.AI_STRATEGY_SERVICE_ENABLED = 'false';
process.env.AI_MATCH_SERVICE_ENABLED = 'false';
