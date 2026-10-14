'use strict';

const MatchEngineService = require('../services/matchEngine.service');
const RecommendationService = require('../services/recommendation.service');
const AiMatchService = require('../services/aiMatch.service');
const JobMatchResource = require('../resources/jobMatch.resource');
const JobPostResource = require('../resources/jobPost.resource');
const { paginated, buildPaginationMeta } = require('../utils/response');

class MatchController {
  /**
   * GET /api/jobs/:jobPost/match
   * Get explainable match report for a job post
   */
  static async getJobMatch(req, res, next) {
    try {
      const jobPostId = req.params.jobPost;
      const match = await AiMatchService.evaluateFit(req.user.id, jobPostId);
      return res.status(200).json({
        data: JobMatchResource.toArray(match)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/jobs/:jobPost/match/recalculate
   * Force refresh/recalculate match score
   */
  static async recalculateMatch(req, res, next) {
    try {
      const jobPostId = req.params.jobPost;
      const match = await MatchEngineService.calculateMatch(req.user.id, jobPostId, { forceRefresh: true });
      return res.status(200).json({
        status: 'success',
        message: 'Match score recalculated successfully.',
        data: JobMatchResource.toArray(match)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/jobs/recommendations & GET /api/candidate/recommended-jobs
   * Personalized job recommendations feed
   */
  static async getRecommendations(req, res, next) {
    try {
      const result = await RecommendationService.getPersonalizedRecommendations(req.user.id, req.query);

      const transformedData = result.items.map(item => {
        return JobPostResource.toArray(item.job, {
          isSaved: result.savedJobIds.has(Number(item.job.id)),
          match: item.match
        });
      });

      const { meta, links } = buildPaginationMeta(
        result.pagination.total,
        result.pagination.page,
        result.pagination.per_page,
        `${req.protocol}://${req.get('host')}/api/jobs/recommendations`
      );

      return paginated(res, transformedData, meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/candidate/skill-gaps
   * Aggregated skill gaps across saved and target vacancies
   */
  static async getSkillGaps(req, res, next) {
    try {
      const gaps = await RecommendationService.getCandidateSkillGaps(req.user.id);
      return res.status(200).json({
        data: gaps
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/job-matches
   * Admin inspection of calculated candidate matches
   */
  static async adminListMatches(req, res, next) {
    try {
      const result = await RecommendationService.adminListMatches(req.query);
      const { meta, links } = buildPaginationMeta(
        result.pagination.total,
        result.pagination.page,
        result.pagination.per_page,
        `${req.protocol}://${req.get('host')}/api/admin/job-matches`
      );
      return paginated(res, JobMatchResource.collection(result.matches), meta, links);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = MatchController;
