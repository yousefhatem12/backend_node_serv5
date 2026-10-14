'use strict';

const JobIngestionService = require('../services/jobIngestion.service');
const JobSourceResource = require('../resources/jobSource.resource');
const IngestionRunResource = require('../resources/ingestionRun.resource');
const RawJobResource = require('../resources/rawJob.resource');
const { paginated, buildPaginationMeta } = require('../utils/response');

class AdminJobSourceController {
  /**
   * GET /api/admin/job-sources
   */
  static async listSources(req, res, next) {
    try {
      const result = await JobIngestionService.listSources(req.query);
      const { meta, links } = buildPaginationMeta(
        result.pagination.total,
        result.pagination.page,
        result.pagination.per_page,
        `${req.protocol}://${req.get('host')}/api/admin/job-sources`
      );
      return paginated(res, JobSourceResource.collection(result.sources), meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/job-sources
   */
  static async createSource(req, res, next) {
    try {
      const source = await JobIngestionService.createSource(req.body);
      return res.status(201).json({
        data: JobSourceResource.toArray(source)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/job-sources/:jobSource
   */
  static async showSource(req, res, next) {
    try {
      const identifier = req.params.jobSource || req.params.id || req.params.sourceId;
      const { source, diagnostics } = await JobIngestionService.getSource(identifier);
      return res.status(200).json({
        data: JobSourceResource.toArray(source, diagnostics)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/admin/job-sources/:jobSource
   */
  static async updateSource(req, res, next) {
    try {
      const identifier = req.params.jobSource || req.params.id || req.params.sourceId;
      const source = await JobIngestionService.updateSource(identifier, req.body);
      return res.status(200).json({
        status: 'success',
        message: 'Job source updated successfully.',
        data: JobSourceResource.toArray(source)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/admin/job-sources/:jobSource
   */
  static async deleteSource(req, res, next) {
    try {
      const identifier = req.params.jobSource || req.params.id || req.params.sourceId;
      await JobIngestionService.deleteSource(identifier);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/job-sources/:jobSource/run
   * POST /api/admin/sources/:id/trigger
   */
  static async triggerRun(req, res, next) {
    try {
      const identifier = req.params.jobSource || req.params.id || req.params.sourceId;
      const run = await JobIngestionService.triggerRun(identifier, {
        trigger_type: req.body ? req.body.trigger_type : 'manual',
        items: req.body ? req.body.items : null
      });

      return res.status(200).json({
        status: 'success',
        message: 'Ingestion run completed successfully.',
        data: IngestionRunResource.toArray(run)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/job-sources/:jobSource/runs
   */
  static async listSourceRuns(req, res, next) {
    try {
      const identifier = req.params.jobSource || req.params.id || req.params.sourceId;
      const result = await JobIngestionService.listRuns(req.query, identifier);
      const { meta, links } = buildPaginationMeta(
        result.pagination.total,
        result.pagination.page,
        result.pagination.per_page,
        `${req.protocol}://${req.get('host')}/api/admin/job-sources/${identifier}/runs`
      );
      return paginated(res, IngestionRunResource.collection(result.runs), meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/ingestion-runs
   */
  static async listAllRuns(req, res, next) {
    try {
      const result = await JobIngestionService.listRuns(req.query);
      const { meta, links } = buildPaginationMeta(
        result.pagination.total,
        result.pagination.page,
        result.pagination.per_page,
        `${req.protocol}://${req.get('host')}/api/admin/ingestion-runs`
      );
      return paginated(res, IngestionRunResource.collection(result.runs), meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/job-sources/:jobSource/raw-jobs
   */
  static async listSourceRawJobs(req, res, next) {
    try {
      const identifier = req.params.jobSource;
      const result = await JobIngestionService.listRawJobs(req.query, identifier);
      const { meta, links } = buildPaginationMeta(
        result.pagination.total,
        result.pagination.page,
        result.pagination.per_page,
        `${req.protocol}://${req.get('host')}/api/admin/job-sources/${identifier}/raw-jobs`
      );
      return paginated(res, RawJobResource.collection(result.rawJobs), meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/raw-jobs
   */
  static async listAllRawJobs(req, res, next) {
    try {
      const result = await JobIngestionService.listRawJobs(req.query);
      const { meta, links } = buildPaginationMeta(
        result.pagination.total,
        result.pagination.page,
        result.pagination.per_page,
        `${req.protocol}://${req.get('host')}/api/admin/raw-jobs`
      );
      return paginated(res, RawJobResource.collection(result.rawJobs), meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/job-sources/:jobSource/raw-jobs/:rawJob OR GET /api/admin/raw-jobs/:rawJob
   */
  static async showRawJob(req, res, next) {
    try {
      const rawJobId = req.params.rawJob || req.params.id;
      const sourceIdentifier = req.params.jobSource || null;
      const rawJob = await JobIngestionService.getRawJob(rawJobId, sourceIdentifier);
      return res.status(200).json({
        data: RawJobResource.toArray(rawJob)
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminJobSourceController;
