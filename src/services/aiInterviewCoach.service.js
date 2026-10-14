'use strict';

const RuleBasedInterviewCoachEngine = require('./ruleBasedInterviewCoachEngine');
const aiClient = require('./aiClient.service');
const config = require('../config/env');
const logger = require('../utils/logger');

class AiInterviewCoachService {
  /**
   * Determine whether external AI interview coach is enabled
   */
  static isExternalAiEnabled() {
    return (config.ai && config.ai.interviewCoachEnabled)
      || process.env.AI_INTERVIEW_COACH_ENABLED === 'true';
  }

  /**
   * Generate questions via external AI service or deterministic fallback
   */
  static async generateQuestions(params) {
    if (this.isExternalAiEnabled()) {
      try {
        logger.info(`[AiInterviewCoachService] Generating interview questions via remote AI for role: ${params.targetRole || 'Software Engineer'}`);
        const response = await aiClient.generateInterviewQuestions({
          jobId: params.job?.id ? String(params.job.id) : 'job_generic',
          targetRole: params.targetRole || 'Software Engineer',
          candidateId: params.candidateId ? String(params.candidateId) : 'cand_1',
          focusSkills: params.skills || [],
          jobSummary: params.job?.title ? `Role: ${params.job.title}` : null,
          includeEssay: true
        });

        if (response && Array.isArray(response.questions) && response.questions.length > 0) {
          return response.questions.map((q, idx) => ({
            id: q.question_id || `q${idx + 1}`,
            question: q.question || q.question_text,
            topic: q.skill_id || `${params.targetRole || 'Software'} Topic`,
            type: q.question_type || q.type || 'technical',
            difficulty: q.difficulty || params.difficulty || 'mid-level',
            model_answer_guidance: q.rubric?.ideal_answer_outline || (Array.isArray(q.key_points_to_cover) ? q.key_points_to_cover.join('; ') : q.model_answer_guidance) || 'Provide concise, structured technical rationale with code/system architecture examples.'
          }));
        }
      } catch (err) {
        logger.warn(`[AiInterviewCoachService] External AI Interview Coach failed, falling back to rule engine: ${err.message}`);
      }
    }

    return RuleBasedInterviewCoachEngine.generateQuestions(params);
  }

  /**
   * Evaluate candidate answer via external AI service or deterministic fallback
   */
  static async evaluateAnswer(params) {
    if (this.isExternalAiEnabled()) {
      try {
        logger.info(`[AiInterviewCoachService] Evaluating candidate answer via remote AI for question: ${params.question?.id}`);
        const evalRes = await aiClient.evaluateInterviewAnswer({
          questionId: String(params.question.id || 'q1'),
          questionText: params.question.question || params.question.question_text || 'Technical Question',
          questionType: params.question.type || 'technical',
          skillId: params.question.topic || null,
          userAnswer: params.userAnswer
        });

        if (evalRes && evalRes.score !== undefined) {
          return {
            score: Number(evalRes.score || 7),
            strengths: evalRes.strengths || [],
            improvements: evalRes.improvements || [],
            model_answer: evalRes.ideal_answer_outline || '',
            recommended_action: evalRes.recommended_action || null
          };
        }
      } catch (err) {
        logger.warn(`[AiInterviewCoachService] External AI Interview Coach evaluation failed, falling back to rule engine: ${err.message}`);
      }
    }

    return RuleBasedInterviewCoachEngine.evaluateAnswer(params);
  }
}

module.exports = AiInterviewCoachService;
