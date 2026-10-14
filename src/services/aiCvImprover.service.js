'use strict';

const RuleBasedCvImproverEngine = require('./ruleBasedCvImproverEngine');
const aiClient = require('./aiClient.service');
const config = require('../config/env');
const logger = require('../utils/logger');

class AiCvImproverService {
  /**
   * Determine whether external AI CV improver service is enabled
   */
  static isExternalAiEnabled() {
    return (config.ai && config.ai.cvImproverServiceEnabled)
      || process.env.AI_CV_IMPROVER_SERVICE_ENABLED === 'true';
  }

  /**
   * Analyze CV and profile improvements via external AI microservice or deterministic fallback
   */
  static async analyze(context) {
    if (this.isExternalAiEnabled()) {
      try {
        const candidateId = context.profile?.user_id || context.profile?.id || 'candidate_1';
        const jobId = context.job?.id ? String(context.job.id) : null;
        const jobDescription = context.job
          ? `${context.job.title}. Requirements: ${Array.isArray(context.job.skills) ? context.job.skills.join(', ') : ''}`
          : context.targetRole || 'Software Engineer';

        logger.info(`[AiCvImproverService] Calling external AI CV improver for Candidate ${candidateId}`);
        const aiResult = await aiClient.analyzeCvImprovement({
          candidateId: String(candidateId),
          jobId,
          jobDescription
        });

        if (aiResult) {
          const targetRole = context.targetRole || context.job?.title || 'Software Engineer';
          const overallScore = aiResult.gap_analysis && aiResult.gap_analysis.overall_match_score !== undefined
            ? Math.round(aiResult.gap_analysis.overall_match_score)
            : (aiResult.gap_analysis && aiResult.gap_analysis.match_score !== undefined
              ? Math.round(aiResult.gap_analysis.match_score <= 1 ? aiResult.gap_analysis.match_score * 100 : aiResult.gap_analysis.match_score)
              : 75);

          const criticalIssues = [];
          if (Array.isArray(aiResult.limitations)) {
            criticalIssues.push(...aiResult.limitations);
          }
          if (Array.isArray(aiResult.missing_required_skills)) {
            for (const s of aiResult.missing_required_skills) {
              const sName = s.skill_name || s.name || s;
              criticalIssues.push(`CV missing critical requirement: ${sName}`);
            }
          }

          const missingKeywords = [];
          if (Array.isArray(aiResult.missing_required_skills)) {
            missingKeywords.push(...aiResult.missing_required_skills.map(s => s.skill_name || s.name || s));
          }
          if (Array.isArray(aiResult.missing_preferred_skills)) {
            missingKeywords.push(...aiResult.missing_preferred_skills.map(s => s.skill_name || s.name || s));
          }

          const bulletImprovements = [];
          if (Array.isArray(aiResult.safe_rewrites)) {
            for (const r of aiResult.safe_rewrites) {
              bulletImprovements.push({
                section: r.target_section || 'Experience',
                original_sample: r.current_text || 'Standard duty description',
                suggested_rewrite: r.suggested_text || '',
                rationale: r.reason || 'Quantified business impact and technical ownership'
              });
            }
          }
          if (Array.isArray(aiResult.improvement_suggestions)) {
            for (const s of aiResult.improvement_suggestions) {
              if (s.suggested_text) {
                bulletImprovements.push({
                  section: s.target_section || 'Experience',
                  original_sample: s.current_text || 'Standard duty description',
                  suggested_rewrite: s.suggested_text,
                  rationale: s.reason || 'Enhanced readability and action orientation'
                });
              }
            }
          }

          const structuralTips = [];
          if (Array.isArray(aiResult.improvement_suggestions)) {
            for (const s of aiResult.improvement_suggestions) {
              if (!s.current_text && s.reason) {
                structuralTips.push(s.reason);
              }
            }
          }
          if (structuralTips.length === 0) {
            structuralTips.push('Structure bullets using the STAR (Situation, Task, Action, Result) model with metric proof points.');
          }

          return {
            target_role: targetRole,
            overall_score: overallScore,
            critical_issues: criticalIssues.length > 0 ? criticalIssues : ['Highlight more quantifiable metrics in your work experience.'],
            missing_keywords: [...new Set(missingKeywords)],
            bullet_improvements: bulletImprovements.length > 0 ? bulletImprovements : RuleBasedCvImproverEngine.analyze(context).bullet_improvements,
            structural_tips: structuralTips
          };
        }
      } catch (err) {
        logger.warn(`[AiCvImproverService] External AI CV Improver failed, falling back to rule engine: ${err.message}`);
      }
    }

    return RuleBasedCvImproverEngine.analyze(context);
  }
}

module.exports = AiCvImproverService;
