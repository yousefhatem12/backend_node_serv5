'use strict';

const RuleBasedStrategyEngine = require('./ruleBasedStrategyEngine');
const aiClient = require('./aiClient.service');
const config = require('../config/env');
const logger = require('../utils/logger');

class AiApplicationStrategyService {
  /**
   * Determine whether external AI strategy service is enabled
   */
  static isExternalAiEnabled() {
    return (config.ai && config.ai.strategyServiceEnabled)
      || process.env.AI_STRATEGY_SERVICE_ENABLED === 'true';
  }

  /**
   * Assess application readiness via external AI service or deterministic fallback
   */
  static async assess(context) {
    if (this.isExternalAiEnabled()) {
      try {
        const userId = context.profile?.user_id || context.profile?.id || 'candidate_1';
        const jobId = context.job?.id ? String(context.job.id) : 'job_1';
        const targetRole = context.job?.title || 'Software Engineer';
        const userNotes = `Total experience: ${context.profile?.years_of_experience || 0} years. Skills: ${(context.candidateSkills || []).map(s => s.name || s).join(', ')}`;

        logger.info(`[AiApplicationStrategyService] Calling remote AI strategy evaluation for User ${userId} and Job ${jobId}`);
        const aiRes = await aiClient.evaluateStrategy({
          userId: String(userId),
          jobId: String(jobId),
          targetRole,
          userNotes
        });

        if (aiRes && aiRes.decision) {
          // Map decision to local schema
          let recommendation = 'alternative_roles';
          if (aiRes.decision === 'apply_now') {
            recommendation = 'apply_now';
          } else if (aiRes.decision === 'apply_while_improving') {
            recommendation = 'improve_gaps_first';
          } else if (aiRes.decision === 'prioritize_another_role') {
            recommendation = 'alternative_roles';
          } else {
            recommendation = aiRes.decision;
          }

          const rawScore = Number(aiRes.match_score || 0);
          const readinessScore = Math.min(100, Math.max(0, Math.round(rawScore <= 1.0 ? rawScore * 100 : rawScore)));

          let fitLevel = 'stretch';
          if (readinessScore >= 75) fitLevel = 'strong_fit';
          else if (readinessScore >= 50) fitLevel = 'moderate_fit';

          const quickWins = Array.isArray(aiRes.action_plan) && aiRes.action_plan.length > 0
            ? aiRes.action_plan.map(a => `${a.timeframe || 'Immediate'}: ${a.task}`)
            : (Array.isArray(aiRes.strengths) ? aiRes.strengths : ['Highlight proven core competencies on your CV']);

          const blockerGaps = Array.isArray(aiRes.blocker_gaps)
            ? aiRes.blocker_gaps.map(g => typeof g === 'string' ? g : `${g.skill || g.skill_name || 'Requirement'}: ${g.reason || g.rationale || 'Gap identified'}`)
            : [];

          const alternativeRoles = Array.isArray(aiRes.alternative_roles)
            ? aiRes.alternative_roles.map(r => typeof r === 'string' ? r : (r.role_title || r.title || 'Related Role'))
            : [];

          return {
            recommendation,
            readiness_score: readinessScore,
            fit_level: fitLevel,
            quick_wins: quickWins,
            blocker_gaps: blockerGaps,
            alternative_roles: alternativeRoles,
            strategic_advice: aiRes.summary_reasoning || 'Professional readiness advice based on current credentials.'
          };
        }
      } catch (err) {
        logger.warn(`[AiApplicationStrategyService] External AI Application Strategy failed, falling back to rule engine: ${err.message}`);
      }
    }

    return RuleBasedStrategyEngine.assess(context);
  }
}

module.exports = AiApplicationStrategyService;
