'use strict';

const db = require('../models');
const { NotFoundError, ValidationError } = require('../utils/errors');
const AiInterviewCoachService = require('./aiInterviewCoach.service');

class InterviewPrepService {
  /**
   * Start a new interview preparation session
   */
  static async startSession({ userId, jobPostId = null, targetRole = null, difficulty = 'mid-level' }) {
    const candidateProfile = await db.CandidateProfile.findOne({
      where: { user_id: userId },
      include: [
        {
          model: db.CandidateSkill,
          as: 'candidateSkills',
          include: [{ model: db.Skill, as: 'skill' }]
        },
        { model: db.CareerPreference, as: 'careerPreference' }
      ]
    });

    let job = null;
    if (jobPostId) {
      job = await db.JobPost.findByPk(jobPostId, {
        include: [
          {
            model: db.JobSkill,
            as: 'jobSkills',
            include: [{ model: db.Skill, as: 'skill' }]
          }
        ]
      });
      if (!job) {
        throw new NotFoundError('Target job post not found.');
      }
    }

    const skills = (candidateProfile && candidateProfile.candidateSkills)
      ? candidateProfile.candidateSkills.map(cs => cs.skill ? cs.skill.name : null).filter(Boolean)
      : [];

    const resolvedRole = targetRole
      || (job ? job.title : null)
      || (candidateProfile && candidateProfile.careerPreference ? candidateProfile.careerPreference.target_role : null)
      || (candidateProfile ? candidateProfile.job_title : null)
      || 'Software Engineer';

    const questions = await AiInterviewCoachService.generateQuestions({
      targetRole: resolvedRole,
      difficulty,
      skills,
      job: job ? { id: job.id, title: job.title } : null
    });

    const session = await db.InterviewPrepSession.create({
      user_id: userId,
      job_post_id: job ? job.id : null,
      target_role: resolvedRole,
      difficulty,
      status: 'active',
      questions_payload: questions,
      total_questions: questions.length,
      answered_questions: 0,
      average_score: null
    });

    return session;
  }

  /**
   * Get session with answers
   */
  static async getSession(sessionId, userId) {
    const session = await db.InterviewPrepSession.findOne({
      where: { id: sessionId, user_id: userId },
      include: [
        { model: db.InterviewPrepAnswer, as: 'answers' },
        { model: db.JobPost, as: 'jobPost', attributes: ['id', 'title'] }
      ]
    });

    if (!session) {
      throw new NotFoundError('Interview preparation session not found.');
    }

    return session;
  }

  /**
   * List candidate's interview prep sessions
   */
  static async listSessions(userId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.per_page || query.limit, 10) || 15));
    const offset = (page - 1) * limit;

    const where = { user_id: userId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }

    const { count, rows } = await db.InterviewPrepSession.findAndCountAll({
      where,
      include: [
        { model: db.JobPost, as: 'jobPost', attributes: ['id', 'title'] }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      items: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Submit practice answer and get evaluated feedback
   */
  static async evaluateAnswer({ sessionId, userId, questionId, userAnswer }) {
    if (!userAnswer || !userAnswer.trim()) {
      throw new ValidationError('user_answer cannot be empty.');
    }

    const session = await db.InterviewPrepSession.findOne({
      where: { id: sessionId, user_id: userId }
    });

    if (!session) {
      throw new NotFoundError('Interview preparation session not found.');
    }

    const questions = session.questions_payload || [];
    const targetQuestion = questions.find(q => q.id === questionId);
    if (!targetQuestion) {
      throw new NotFoundError(`Question "${questionId}" not found in this session.`);
    }

    const evaluation = await AiInterviewCoachService.evaluateAnswer({
      question: targetQuestion,
      userAnswer,
      difficulty: session.difficulty
    });

    // Upsert answer
    let answer = await db.InterviewPrepAnswer.findOne({
      where: { session_id: session.id, question_id: questionId }
    });

    if (answer) {
      answer.user_answer = userAnswer;
      answer.score = evaluation.score;
      answer.strengths = evaluation.strengths;
      answer.improvements = evaluation.improvements;
      answer.model_answer = evaluation.model_answer;
      answer.evaluated_at = new Date();
      await answer.save();
    } else {
      answer = await db.InterviewPrepAnswer.create({
        session_id: session.id,
        question_id: questionId,
        question_text: targetQuestion.question,
        user_answer: userAnswer,
        score: evaluation.score,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        model_answer: evaluation.model_answer,
        evaluated_at: new Date()
      });
    }

    // Recalculate session progress
    const allAnswers = await db.InterviewPrepAnswer.findAll({
      where: { session_id: session.id }
    });

    const answeredCount = allAnswers.length;
    const totalScore = allAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
    const avgScore = answeredCount > 0 ? (totalScore / answeredCount).toFixed(2) : null;

    session.answered_questions = answeredCount;
    session.average_score = avgScore;
    if (answeredCount >= session.total_questions) {
      session.status = 'completed';
    }
    await session.save();

    return {
      answer,
      session
    };
  }
}

module.exports = InterviewPrepService;
