const jobService = require('../services/job.service');
const JobPostResource = require('../resources/jobPost.resource');
const { success, actionSuccess, paginated, buildPaginationMeta } = require('../utils/response');

class JobController {
  /**
   * GET /api/jobs (Public with optional candidate auth)
   */
  static async list(req, res, next) {
    try {
      const candidateUserId = req.user ? req.user.id : null;
      const result = await jobService.listJobs(req.query, candidateUserId);
      const { meta, links } = buildPaginationMeta(
        result.count,
        result.page,
        result.perPage,
        `${req.protocol}://${req.get('host')}/api/jobs`
      );
      return paginated(
        res,
        JobPostResource.collection(result.rows, { savedJobIds: result.savedJobIds }),
        meta,
        links
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/jobs/:jobPost (Public with optional candidate auth)
   */
  static async show(req, res, next) {
    try {
      const candidateUserId = req.user ? req.user.id : null;
      const { job, isSaved } = await jobService.getJob(req.params.jobPost, candidateUserId);
      return success(res, JobPostResource.toArray(job, { isSaved }));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/jobs/:jobPost/save (Candidate only)
   */
  static async save(req, res, next) {
    try {
      const result = await jobService.saveJob(req.user.id, req.params.jobPost);
      return actionSuccess(res, 'Job saved successfully.', result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/jobs/:jobPost/save (Candidate only)
   */
  static async unsave(req, res, next) {
    try {
      const result = await jobService.unsaveJob(req.user.id, req.params.jobPost);
      return actionSuccess(res, 'Job removed from saved jobs.', result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/saved-jobs (Candidate only)
   */
  static async savedJobs(req, res, next) {
    try {
      const result = await jobService.listSavedJobs(req.user.id, req.query);
      const { meta, links } = buildPaginationMeta(
        result.count,
        result.page,
        result.perPage,
        `${req.protocol}://${req.get('host')}/api/saved-jobs`
      );
      return paginated(
        res,
        JobPostResource.collection(result.rows, { savedJobIds: result.savedJobIds }),
        meta,
        links
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/jobs (Admin only)
   */
  static async adminList(req, res, next) {
    try {
      const result = await jobService.adminListJobs(req.query);
      const baseUrl = `${req.protocol}://${req.get('host')}/api/admin/jobs`;
      const { meta, links } = buildPaginationMeta(
        result.count,
        result.page,
        result.perPage,
        baseUrl
      );
      return paginated(
        res,
        JobPostResource.collection(result.rows, { savedJobIds: result.savedJobIds }),
        meta,
        links
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/jobs (Admin only)
   */
  static async adminCreate(req, res, next) {
    try {
      const { job } = await jobService.createJobPost(req.body);
      return res.status(201).json({
        data: JobPostResource.toArray(job, { isSaved: false })
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/jobs/:jobPost (Admin only)
   */
  static async adminShow(req, res, next) {
    try {
      const { job } = await jobService.getJob(req.params.jobPost);
      return success(res, JobPostResource.toArray(job, { isSaved: false }));
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/admin/jobs/:jobPost (Admin only)
   */
  static async adminUpdate(req, res, next) {
    try {
      const { job } = await jobService.updateJobPost(req.params.jobPost, req.body);
      return success(res, JobPostResource.toArray(job, { isSaved: false }));
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/admin/jobs/:jobPost (Admin only)
   */
  static async adminDelete(req, res, next) {
    try {
      await jobService.deleteJobPost(req.params.jobPost);
      return res.status(200).json({
        message: 'Job post deleted successfully.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = JobController;
