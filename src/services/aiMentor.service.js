'use strict';

const RuleBasedMentorEngine = require('./ruleBasedMentorEngine');
const aiClient = require('./aiClient.service');
const config = require('../config/env');
const logger = require('../utils/logger');

class AiMentorService {
  /**
   * Determine whether external AI mentor microservice is enabled
   */
  static isExternalAiEnabled() {
    return (config.ai && config.ai.mentorServiceEnabled)
      || process.env.AI_MENTOR_SERVICE_ENABLED === 'true';
  }

  /**
   * Generate mentor chat reply:
   * Uses external AI service if configured and active, otherwise falls back
   * seamlessly to the local grounded RuleBasedMentorEngine.
   */
  static async reply(userMessage, context, history = []) {
    if (this.isExternalAiEnabled()) {
      try {
        const userId = context.candidate?.id || 'cand_default';
        logger.info(`[AiMentorService] Invoking external AI mentor microservice for User ${userId}`);

        const aiRes = await aiClient.mentorChat({
          message: userMessage,
          conversationId: String(context.conversationId || 'conv_default'),
          userId: String(userId),
          targetRole: context.preferences?.target_title || context.roadmap?.target_role || null,
          careerPreferences: context.preferences || null,
          savedJobs: Array.isArray(context.saved_jobs) ? context.saved_jobs.map(j => j.title || j) : null,
          appliedJobs: Array.isArray(context.applications) ? context.applications.map(a => a.job?.title || a.title || a) : null,
          userNotes: Array.isArray(history) ? history.slice(-5).map(h => `${h.sender}: ${h.message}`) : null
        });

        if (aiRes && aiRes.reply) {
          return {
            reply: aiRes.reply,
            suggested_actions: aiRes.suggested_actions || []
          };
        }
      } catch (err) {
        logger.warn(`[AiMentorService] External AI mentor failed or timed out: ${err.message}. Falling back to RuleBasedMentorEngine.`);
      }
    }

    // Default & robust fallback: internal deterministic rule-based mentor engine
    return RuleBasedMentorEngine.generateResponse(userMessage, context);
  }
}

module.exports = AiMentorService;
