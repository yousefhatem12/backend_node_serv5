'use strict';

const request = require('supertest');
const express = require('express');

// Mock services to isolate unit tests
jest.mock('../../src/services/skill.service');
jest.mock('../../src/services/jobIngestion.service');
jest.mock('../../src/services/aiReview.service');
jest.mock('../../src/services/adminOperations.service');

const skillService = require('../../src/services/skill.service');
const JobIngestionService = require('../../src/services/jobIngestion.service');
const AiReviewService = require('../../src/services/aiReview.service');
const AdminOperationsService = require('../../src/services/adminOperations.service');

const AdminSkillController = require('../../src/controllers/adminSkill.controller');
const AdminJobSourceController = require('../../src/controllers/adminJobSource.controller');
const AdminAiReviewController = require('../../src/controllers/adminAiReview.controller');
const AdminOperationsController = require('../../src/controllers/adminOperations.controller');

const {
  listTaxonomySkillsQuerySchema,
  createTaxonomySkillSchema,
  updateTaxonomySkillSchema,
  taxonomySkillParamSchema,
  sourceParamSchema,
  listJobSourcesQuerySchema,
  createJobSourceSchema,
  updateJobSourceSchema,
  triggerRunSchema,
  listAiReviewItemsQuerySchema,
  approveAiReviewSchema,
  correctAiReviewSchema,
  mergeDuplicatesSchema
} = require('../../src/validators');

const validate = require('../../src/middlewares/validate.middleware');
const errorHandler = require('../../src/middlewares/errorHandler');
const { ensureActiveAdmin } = require('../../src/middlewares/roles.middleware');

describe('CMS & Admin Operations Endpoints Unit Tests', () => {
  let app;
  let currentUser;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    // URL Normalization middleware matching src/app.js
    app.use((req, res, next) => {
      if (req.url) {
        req.url = req.url.replace(/\/{2,}/g, '/');
      }
      const parsedPath = req.path || req.url || '';
      if (
        !parsedPath.startsWith('/api') &&
        !parsedPath.startsWith('/storage') &&
        !parsedPath.startsWith('/docs')
      ) {
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
      }
      next();
    });

    // Mock authentication user
    currentUser = { id: 1, role: 'admin', is_active: true };
    app.use((req, res, next) => {
      req.user = currentUser;
      next();
    });

    const adminRouter = express.Router();
    // RBAC Protection middleware applied to all admin routes
    adminRouter.use(ensureActiveAdmin);

    // 1. Skills & Taxonomy Management
    adminRouter.get('/taxonomy/skills', validate(listTaxonomySkillsQuerySchema), AdminSkillController.listTaxonomySkills);
    adminRouter.post('/taxonomy/skills', validate(createTaxonomySkillSchema), AdminSkillController.createTaxonomySkill);
    adminRouter.patch('/taxonomy/skills/:id', validate(taxonomySkillParamSchema), validate(updateTaxonomySkillSchema), AdminSkillController.updateTaxonomySkill);
    adminRouter.delete('/taxonomy/skills/:id', validate(taxonomySkillParamSchema), AdminSkillController.deleteTaxonomySkill);

    // 2. Job Sources & Aggregation Management
    adminRouter.get('/sources', validate(listJobSourcesQuerySchema), AdminJobSourceController.listSources);
    adminRouter.post('/sources', validate(createJobSourceSchema), AdminJobSourceController.createSource);
    adminRouter.get('/sources/:id', validate(sourceParamSchema), AdminJobSourceController.showSource);
    adminRouter.patch('/sources/:id', validate(sourceParamSchema), validate(updateJobSourceSchema), AdminJobSourceController.updateSource);
    adminRouter.post('/sources/:id/trigger', validate(sourceParamSchema), validate(triggerRunSchema), AdminJobSourceController.triggerRun);

    // 3. AI Data Quality Review Queue
    adminRouter.get('/ai-review/queue', validate(listAiReviewItemsQuerySchema), AdminAiReviewController.getQueue);
    adminRouter.post('/ai-review/:id/approve', validate(sourceParamSchema), validate(approveAiReviewSchema), AdminAiReviewController.approveItem);
    adminRouter.patch('/ai-review/:id/correct', validate(sourceParamSchema), validate(correctAiReviewSchema), AdminAiReviewController.correctItem);
    adminRouter.post('/ai-review/:id/correct', validate(sourceParamSchema), validate(correctAiReviewSchema), AdminAiReviewController.correctItem);

    // 4. Data Moderation & System Statistics
    adminRouter.get('/stats', AdminOperationsController.getStats);
    adminRouter.post('/moderation/merge-duplicates', validate(mergeDuplicatesSchema), AdminOperationsController.mergeDuplicates);

    const apiRouter = express.Router();
    apiRouter.use('/admin', adminRouter);
    app.use('/api', apiRouter);
    app.use('/', apiRouter);

    app.use(errorHandler);
  });

  describe('1. Skills & Taxonomy Management (إدارة التصنيفات والمهارات)', () => {
    it('GET /admin/taxonomy/skills lists canonical skills, categories, and aliases', async () => {
      skillService.listTaxonomySkills.mockResolvedValueOnce({
        skills: [
          {
            id: 1,
            name: 'JavaScript',
            normalized_name: 'javascript',
            category: 'Software Development',
            skillCategory: { id: 2, name: 'Software Development' },
            aliases: [
              { id: 10, alias: 'JS', normalized_alias: 'js' },
              { id: 11, alias: 'ECMAScript', normalized_alias: 'ecmascript' }
            ],
            is_verified: true
          }
        ],
        total: 1,
        page: 1,
        limit: 15,
        totalPages: 1,
        taxonomy_summary: {
          total_canonical_skills: 1,
          total_categories: 1,
          total_aliases: 2
        }
      });

      const res = await request(app).get('/admin/taxonomy/skills');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data[0].name).toBe('JavaScript');
      expect(res.body.data[0].aliases).toHaveLength(2);
      expect(res.body.data[0].aliases[0].alias).toBe('JS');
      expect(res.body.taxonomy_summary.total_canonical_skills).toBe(1);
      expect(skillService.listTaxonomySkills).toHaveBeenCalledTimes(1);
    });

    it('POST /admin/taxonomy/skills creates a new canonical skill with initial aliases', async () => {
      skillService.createTaxonomySkill.mockResolvedValueOnce({
        id: 5,
        name: 'Node.js',
        normalized_name: 'node.js',
        category: 'Backend',
        skillCategory: null,
        aliases: [
          { id: 21, alias: 'NodeJS', normalized_alias: 'nodejs' }
        ],
        is_verified: true
      });

      const res = await request(app)
        .post('/admin/taxonomy/skills')
        .send({
          name: 'Node.js',
          category: 'Backend',
          aliases: ['NodeJS']
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Node.js');
      expect(res.body.data.aliases[0].alias).toBe('NodeJS');
      expect(skillService.createTaxonomySkill).toHaveBeenCalledTimes(1);
    });

    it('POST /admin/taxonomy/skills creates an alias mapped to a canonical skill', async () => {
      skillService.createTaxonomySkill.mockResolvedValueOnce({
        alias: { id: 25, skill_id: 5, alias: 'Node', normalized_alias: 'node' },
        skill: {
          id: 5,
          name: 'Node.js',
          normalized_name: 'node.js',
          category: 'Backend',
          aliases: [{ id: 25, alias: 'Node', normalized_alias: 'node' }]
        }
      });

      const res = await request(app)
        .post('/admin/taxonomy/skills')
        .send({
          type: 'alias',
          alias: 'Node',
          skill_id: 5
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.alias.alias).toBe('Node');
      expect(res.body.data.skill.name).toBe('Node.js');
    });

    it('PATCH /admin/taxonomy/skills/:id updates skill details and maps aliases', async () => {
      skillService.updateTaxonomySkill.mockResolvedValueOnce({
        id: 5,
        name: 'NodeJS Engine',
        normalized_name: 'nodejs engine',
        category: 'Backend Architecture',
        skillCategory: null,
        aliases: [
          { id: 25, alias: 'Node', normalized_alias: 'node' },
          { id: 26, alias: 'Node.js v20', normalized_alias: 'node.js v20' }
        ],
        is_verified: true
      });

      const res = await request(app)
        .patch('/admin/taxonomy/skills/5')
        .send({
          name: 'NodeJS Engine',
          category: 'Backend Architecture',
          aliases: ['Node.js v20']
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('NodeJS Engine');
      expect(res.body.data.aliases).toHaveLength(2);
      expect(skillService.updateTaxonomySkill).toHaveBeenCalledWith(5, expect.anything());
    });

    it('DELETE /admin/taxonomy/skills/:id deactivates or removes an incorrect entry', async () => {
      skillService.deleteTaxonomySkill.mockResolvedValueOnce({
        id: 5,
        name: 'ObsoleteSkill',
        action: 'deactivated',
        is_verified: false
      });

      const res = await request(app).delete('/admin/taxonomy/skills/5');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('deactivated');
      expect(res.body.data.action).toBe('deactivated');
      expect(skillService.deleteTaxonomySkill).toHaveBeenCalledWith(5, undefined);
    });

    it('DELETE /admin/taxonomy/skills/:id?permanent=true removes entry permanently', async () => {
      skillService.deleteTaxonomySkill.mockResolvedValueOnce({
        id: 5,
        name: 'MalformedSkill',
        action: 'deleted',
        permanent: true
      });

      const res = await request(app).delete('/admin/taxonomy/skills/5?permanent=true');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('permanently');
      expect(res.body.data.permanent).toBe(true);
    });
  });

  describe('2. Job Sources & Aggregation Management (إدارة مصادر جلب الوظائف)', () => {
    it('GET /admin/sources lists approved sources and their health status', async () => {
      JobIngestionService.listSources.mockResolvedValueOnce({
        sources: [
          {
            id: 1,
            name: 'Wuzzuf Aggregator',
            slug: 'wuzzuf-aggregator',
            source_type: 'scraper',
            collection_method: 'playwright',
            base_url: 'https://wuzzuf.net',
            is_active: true,
            schedule_enabled: true,
            last_run_at: new Date('2026-10-14T20:00:00Z'),
            last_status: 'completed',
            error_rate: 2.5
          }
        ],
        pagination: { total: 1, page: 1, per_page: 15, total_pages: 1 }
      });

      const res = await request(app).get('/admin/sources');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      const source = res.body.data[0];
      expect(source.name).toBe('Wuzzuf Aggregator');
      expect(source.health_status).toBeDefined();
      expect(source.health_status.status).toBe('completed');
      expect(source.health_status.success_rate).toBe(97.5);
      expect(source.health_status.failure_rate).toBe(2.5);
      expect(source.health_status.last_collection_time).toBe('2026-10-14T20:00:00.000Z');
      expect(JobIngestionService.listSources).toHaveBeenCalledTimes(1);
    });

    it('POST /admin/sources registers a new approved job source', async () => {
      JobIngestionService.createSource.mockResolvedValueOnce({
        id: 2,
        name: 'LinkedIn Jobs Feed',
        slug: 'linkedin-jobs-feed',
        source_type: 'api',
        collection_method: 'rest_api',
        base_url: 'https://api.linkedin.com/v2/jobs',
        is_active: true,
        schedule_enabled: false,
        configuration: { rate_limit_per_minute: 60 }
      });

      const res = await request(app)
        .post('/admin/sources')
        .send({
          name: 'LinkedIn Jobs Feed',
          source_type: 'api',
          collection_method: 'rest_api',
          base_url: 'https://api.linkedin.com/v2/jobs',
          configuration: { rate_limit_per_minute: 60 }
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('LinkedIn Jobs Feed');
      expect(res.body.data.source_type).toBe('api');
      expect(res.body.data.health_status).toBeDefined();
      expect(JobIngestionService.createSource).toHaveBeenCalledTimes(1);
    });

    it('PATCH /admin/sources/:id enables/disables a source or updates metadata', async () => {
      JobIngestionService.updateSource.mockResolvedValueOnce({
        id: 2,
        name: 'LinkedIn Jobs Feed Updated',
        slug: 'linkedin-jobs-feed',
        source_type: 'api',
        collection_method: 'rest_api',
        base_url: 'https://api.linkedin.com/v2/jobs',
        is_active: false,
        notes: 'Temporarily paused for maintenance'
      });

      const res = await request(app)
        .patch('/admin/sources/2')
        .send({
          is_active: false,
          notes: 'Temporarily paused for maintenance'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.is_active).toBe(false);
      expect(JobIngestionService.updateSource).toHaveBeenCalledWith('2', expect.anything());
    });

    it('POST /admin/sources/:id/trigger manually triggers a scraping run', async () => {
      JobIngestionService.triggerRun.mockResolvedValueOnce({
        id: 101,
        job_source_id: 2,
        trigger_type: 'manual',
        status: 'completed',
        items_extracted: 45,
        items_ingested: 40,
        duplicates_count: 5,
        error_count: 0
      });

      const res = await request(app)
        .post('/admin/sources/2/trigger')
        .send({ trigger_type: 'manual' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('completed successfully');
      expect(res.body.data.id).toBe(101);
      expect(JobIngestionService.triggerRun).toHaveBeenCalledWith('2', expect.objectContaining({
        trigger_type: 'manual'
      }));
    });
  });

  describe('3. AI Data Quality Review Queue (مراجعة جودة البيانات واستخراج الذكاء الاصطناعي)', () => {
    it('GET /admin/ai-review/queue retrieves low-confidence items flagged for review', async () => {
      AiReviewService.listQueue.mockResolvedValueOnce({
        items: [
          {
            id: 12,
            entity_type: 'skill',
            entity_id: 105,
            source: 'cv_extraction',
            status: 'pending',
            trigger_reason: 'ambiguous_skill_mapping',
            confidence: 0.42,
            raw_input: 'Node/Express/NestJS',
            proposed_payload: { name: 'Node.js', category: 'Backend' },
            created_at: new Date()
          }
        ],
        total: 1,
        page: 1,
        limit: 15,
        totalPages: 1,
        queue_summary: {
          total_in_queue: 1,
          total_pending: 1
        }
      });

      const res = await request(app).get('/admin/ai-review/queue');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].confidence).toBe(0.42);
      expect(res.body.queue_summary.total_pending).toBe(1);
      expect(AiReviewService.listQueue).toHaveBeenCalledTimes(1);
    });

    it('POST /admin/ai-review/:id/approve approves the AI-extracted item into canonical DB', async () => {
      AiReviewService.approveItem.mockResolvedValueOnce({
        id: 12,
        entity_type: 'skill',
        entity_id: 105,
        status: 'approved',
        decision_reason: 'Approved by admin',
        confidence: 0.95
      });

      const res = await request(app)
        .post('/admin/ai-review/12/approve')
        .send({ decision_reason: 'Approved by admin' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('approved successfully');
      expect(res.body.data.status).toBe('approved');
      expect(AiReviewService.approveItem).toHaveBeenCalledWith('12', 1, { decision_reason: 'Approved by admin' }, expect.anything());
    });

    it('PATCH /admin/ai-review/:id/correct corrects malformed tags with audit logs', async () => {
      AiReviewService.correctItem.mockResolvedValueOnce({
        id: 12,
        entity_type: 'skill',
        entity_id: 105,
        status: 'corrected',
        corrected_payload: { name: 'Nest.js Framework' },
        decision_reason: 'Fixed framework spelling'
      });

      const res = await request(app)
        .patch('/admin/ai-review/12/correct')
        .send({
          corrected_value: { name: 'Nest.js Framework' },
          decision_reason: 'Fixed framework spelling'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('corrected successfully');
      expect(res.body.data.status).toBe('corrected');
      expect(AiReviewService.correctItem).toHaveBeenCalledWith('12', 1, expect.anything(), expect.anything());
    });

    it('POST /admin/ai-review/:id/correct also accepts correction via POST', async () => {
      AiReviewService.correctItem.mockResolvedValueOnce({
        id: 13,
        entity_type: 'job_post',
        entity_id: 201,
        status: 'corrected',
        corrected_payload: { title: 'Senior Backend Engineer' }
      });

      const res = await request(app)
        .post('/admin/ai-review/13/correct')
        .send({
          corrected_value: { title: 'Senior Backend Engineer' }
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('corrected');
    });
  });

  describe('4. Data Moderation & System Statistics (مراقبة الجودة والإحصائيات التشغيلية)', () => {
    it('GET /admin/stats provides usage and operations metrics including freshness', async () => {
      AdminOperationsService.getStatistics.mockResolvedValueOnce({
        active_users_count: 1450,
        active_jobs_volume: 320,
        application_counts: {
          total: 890,
          by_status: { submitted: 400, shortlisted: 120 }
        },
        source_freshness: {
          latest_collection_time: '2026-10-15T01:00:00.000Z',
          sources_active_last_24h: 5,
          total_active_sources: 6,
          is_fresh: true
        },
        users: { total: 1500, active: 1450 },
        jobs: { total: 350, active: 320 }
      });

      const res = await request(app).get('/admin/stats');

      expect(res.status).toBe(200);
      expect(res.body.data.active_users_count).toBe(1450);
      expect(res.body.data.active_jobs_volume).toBe(320);
      expect(res.body.data.application_counts.total).toBe(890);
      expect(res.body.data.source_freshness.is_fresh).toBe(true);
      expect(AdminOperationsService.getStatistics).toHaveBeenCalledTimes(1);
    });

    it('POST /admin/moderation/merge-duplicates merges duplicate job listings and records audit trail', async () => {
      AdminOperationsService.mergeDuplicates.mockResolvedValueOnce({
        entity_type: 'job',
        canonical_record: { id: 10, title: 'Senior Node.js Developer' },
        merged_source_id: 15,
        reassigned_relations: { applications: 3, saved_jobs: 2, skills: 4, raw_jobs: 1 },
        reason: 'Duplicate job post scraped from external portal'
      });

      const res = await request(app)
        .post('/admin/moderation/merge-duplicates')
        .send({
          entity_type: 'job',
          source_id: 15,
          target_id: 10,
          reason: 'Duplicate job post scraped from external portal'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.entity_type).toBe('job');
      expect(res.body.data.merged_source_id).toBe(15);
      expect(res.body.data.reassigned_relations.applications).toBe(3);
      expect(AdminOperationsService.mergeDuplicates).toHaveBeenCalledWith(
        expect.objectContaining({ entity_type: 'job', source_id: 15, target_id: 10 }),
        1,
        expect.anything()
      );
    });

    it('POST /admin/moderation/merge-duplicates merges duplicate company listings', async () => {
      AdminOperationsService.mergeDuplicates.mockResolvedValueOnce({
        entity_type: 'company',
        canonical_record: { id: 2, name: 'Google LLC' },
        merged_source_id: 9,
        reassigned_relations: { jobs: 5 },
        reason: 'Duplicate company scraped from job board'
      });

      const res = await request(app)
        .post('/admin/moderation/merge-duplicates')
        .send({
          entity_type: 'company',
          source_id: 9,
          target_id: 2
        });

      expect(res.status).toBe(200);
      expect(res.body.data.entity_type).toBe('company');
      expect(res.body.data.merged_source_id).toBe(9);
      expect(res.body.data.reassigned_relations.jobs).toBe(5);
    });

    it('POST /admin/moderation/merge-duplicates rejects invalid payload without source or target', async () => {
      const res = await request(app)
        .post('/admin/moderation/merge-duplicates')
        .send({
          entity_type: 'job',
          source_id: 10
        });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('5. Strict RBAC Protection', () => {
    it('blocks candidate users with 403 Forbidden', async () => {
      currentUser = { id: 99, role: 'candidate', is_active: true };

      const resStats = await request(app).get('/admin/stats');
      expect(resStats.status).toBe(403);

      const resSources = await request(app).get('/admin/sources');
      expect(resSources.status).toBe(403);

      const resTaxonomy = await request(app).get('/admin/taxonomy/skills');
      expect(resTaxonomy.status).toBe(403);

      const resAiQueue = await request(app).get('/admin/ai-review/queue');
      expect(resAiQueue.status).toBe(403);
    });

    it('blocks inactive admin users with 403 Forbidden', async () => {
      currentUser = { id: 1, role: 'admin', is_active: false };

      const res = await request(app).get('/admin/stats');
      expect(res.status).toBe(403);
    });

    it('allows super_admin users to access all modules', async () => {
      currentUser = { id: 2, role: 'super_admin', is_active: true };

      AdminOperationsService.getStatistics.mockResolvedValueOnce({
        active_users_count: 50
      });

      const res = await request(app).get('/admin/stats');
      expect(res.status).toBe(200);
    });
  });
});
