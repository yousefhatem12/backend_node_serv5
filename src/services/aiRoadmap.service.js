'use strict';

const TemplateRoadmapGenerator = require('./templateRoadmapGenerator');
const aiClient = require('./aiClient.service');
const config = require('../config/env');
const logger = require('../utils/logger');

class AiRoadmapService {
  /**
   * Determine whether external AI roadmap service is enabled
   */
  static isExternalAiEnabled() {
    return (config.ai && config.ai.roadmapServiceEnabled)
      || process.env.AI_ROADMAP_SERVICE_ENABLED === 'true';
  }

  /**
   * Generate career learning roadmap:
   * Uses external AI service if configured and active, otherwise falls back
   * seamlessly to the deterministic local TemplateRoadmapGenerator.
   */
  static async generate(params) {
    if (this.isExternalAiEnabled()) {
      try {
        const targetRole = params.target_role || (params.job ? params.job.title : 'Software Engineer');
        logger.info(`[AiRoadmapService] Invoking external AI roadmap generator for target: ${targetRole}`);

        const gaps = Array.isArray(params.missingSkills) && params.missingSkills.length > 0
          ? params.missingSkills.map(s => s.name || s)
          : (params.candidateSkills && params.candidateSkills.length > 0
            ? ['Advanced System Design', 'Cloud Optimization']
            : ['Core Fundamentals', 'Framework Mastery']);

        const aiRes = await aiClient.generateRoadmap({
          candidateId: params.candidateId ? String(params.candidateId) : 'cand_1',
          targetRole,
          roleFamily: params.role_family || 'Engineering',
          skillGaps: gaps
        });

        if (aiRes && Array.isArray(aiRes.phases) && aiRes.phases.length > 0) {
          return {
            title: `Career Roadmap: ${aiRes.target_role}`,
            description: `Personalized learning progression targeting ${aiRes.target_role} (${aiRes.total_weeks || 4} weeks)`,
            rationale: `Systematically designed progression to bridge skill gaps in ${gaps.join(', ')}`,
            phases: aiRes.phases.map((p, pIdx) => ({
              title: p.title,
              description: p.rationale || p.title,
              order: p.order || pIdx + 1,
              status: 'pending',
              milestones: (p.milestones || []).map((m, mIdx) => ({
                title: m.title,
                description: m.title,
                order: m.target_week || mIdx + 1,
                status: 'pending',
                target_skill_id: null,
                tasks: (m.tasks || []).map((t, tIdx) => ({
                  title: t.title,
                  description: t.description || t.title,
                  order: tIdx + 1,
                  status: 'pending',
                  weight: t.estimated_hours ? Math.round(t.estimated_hours) : 1
                }))
              }))
            }))
          };
        }
      } catch (err) {
        logger.warn(`[AiRoadmapService] External AI roadmap generation failed: ${err.message}. Falling back to TemplateRoadmapGenerator.`);
      }
    }

    // Default & robust fallback: internal deterministic template roadmap generator
    return await TemplateRoadmapGenerator.generate(params);
  }
}

module.exports = AiRoadmapService;
