'use strict';

const InterviewPrepService = require('../services/interviewPrep.service');
const InterviewPrepResource = require('../resources/interviewPrep.resource');
const { success, actionSuccess, paginated, buildPaginationMeta } = require('../utils/response');

class InterviewPrepController {
  /**
   * POST /api/interview-prep/sessions
   */
  static async startSession(req, res, next) {
    try {
      const session = await InterviewPrepService.startSession({
        userId: req.user.id,
        jobPostId: req.body.job_post_id,
        targetRole: req.body.target_role,
        difficulty: req.body.difficulty
      });
      return actionSuccess(res, 'Interview preparation session initialized.', InterviewPrepResource.toArray(session), 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/interview-prep/sessions/:session
   */
  static async getSession(req, res, next) {
    try {
      const session = await InterviewPrepService.getSession(req.params.session, req.user.id);
      return success(res, InterviewPrepResource.toArray(session));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/interview-prep/sessions
   */
  static async listSessions(req, res, next) {
    try {
      const result = await InterviewPrepService.listSessions(req.user.id, req.query);
      const baseUrl = `${req.protocol}://${req.get('host')}/api/interview-prep/sessions`;
      const { meta, links } = buildPaginationMeta(result.total, result.page, result.limit, baseUrl);
      return paginated(res, InterviewPrepResource.collection(result.items), meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/interview-prep/sessions/:session/evaluate
   */
  static async evaluateAnswer(req, res, next) {
    try {
      const result = await InterviewPrepService.evaluateAnswer({
        sessionId: req.params.session,
        userId: req.user.id,
        questionId: req.body.question_id,
        userAnswer: req.body.user_answer
      });
      return actionSuccess(res, 'Answer evaluated successfully.', {
        answer: InterviewPrepResource.answerToArray(result.answer),
        session: InterviewPrepResource.toArray(result.session)
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InterviewPrepController;
