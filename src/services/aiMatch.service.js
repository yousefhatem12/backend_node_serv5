'use strict';

const db = require('../models');
const MatchEngineService = require('./matchEngine.service');
const aiClient = require('./aiClient.service');
const config = require('../config/env');
const logger = require('../utils/logger');

class AiMatchService {
  /**
   * Determine whether external AI microservice is enabled
   */
  static isExternalAiEnabled() {
    return (config.ai && config.ai.matchServiceEnabled)
      || process.env.AI_MATCH_SERVICE_ENABLED === 'true';
  }

  /**
   * Match candidate with job vacancy:
   * Uses external AI service if configured and active, otherwise falls back
   * seamlessly to the deterministic local MatchEngineService.
   */
  static async evaluateFit(userId, jobPostId, options = {}) {
    if (this.isExternalAiEnabled()) {
      try {
        logger.info(`[AiMatchService] Invoking external AI matching service for User ${userId} and Job ${jobPostId}`);

        // 1. Fetch user & candidate profile with skills and preferences
        const user = await db.User.findByPk(userId, {
          include: [
            {
              model: db.CandidateProfile,
              as: 'candidateProfile',
              include: [
                { model: db.CareerPreference, as: 'careerPreference' },
                {
                  model: db.CandidateSkill,
                  as: 'candidateSkills',
                  include: [{ model: db.Skill, as: 'skill' }]
                }
              ]
            }
          ]
        });

        // 2. Fetch JobPost with company and required/preferred skills
        const jobPost = await db.JobPost.findByPk(jobPostId, {
          include: [
            { model: db.Company, as: 'company' },
            {
              model: db.JobSkill,
              as: 'jobSkills',
              include: [{ model: db.Skill, as: 'skill' }]
            }
          ]
        });

        if (user && jobPost) {
          const candidateProfile = user.candidateProfile;
          const candidateSkills = (candidateProfile?.candidateSkills || []).map(cs => ({
            skill_name: cs.skill ? cs.skill.name : 'Skill',
            proficiency: cs.proficiency_level || 'Intermediate',
            years_of_experience: cs.years_of_experience ? Number(cs.years_of_experience) : 0
          }));

          const jobRequirements = (jobPost.jobSkills || []).map(js => ({
            skill_name: js.skill ? js.skill.name : 'Required Skill',
            proficiency: js.min_proficiency || 'Intermediate',
            is_critical: Boolean(js.is_required)
          }));

          const preferredSkills = (jobPost.jobSkills || [])
            .filter(js => !js.is_required)
            .map(js => ({
              skill_name: js.skill ? js.skill.name : 'Preferred Skill',
              proficiency: js.min_proficiency || 'Intermediate'
            }));

          const aiRes = await aiClient.analyzeMatch({
            jobId: String(jobPostId),
            candidateId: String(userId),
            jobRequirements,
            candidateProfile: {
              candidate_id: String(userId),
              name: user.name,
              skills: candidateSkills,
              total_years_experience: candidateProfile?.years_of_experience ? Number(candidateProfile.years_of_experience) : 0,
              target_roles: candidateProfile?.careerPreference?.target_role ? [candidateProfile.careerPreference.target_role] : []
            },
            preferredSkills,
            jobTitle: jobPost.title,
            workMode: jobPost.work_mode,
            location: jobPost.location,
            employmentType: jobPost.employment_type
          });

          if (aiRes && aiRes.overall_match_score !== undefined) {
            const overallScore = parseFloat(Number(aiRes.overall_match_score || 0).toFixed(2));
            const matchLevel = MatchEngineService.getMatchLevel(overallScore);

            const matchedSkills = (aiRes.skill_breakdown || [])
              .filter(s => s.is_matched)
              .map(s => ({
                name: s.skill_name,
                required_proficiency: s.required_proficiency,
                candidate_proficiency: s.candidate_proficiency,
                match_score: s.match_score,
                feedback: s.skill_feedback,
                evidence: s.evidence_found
              }));

            const missingSkills = (aiRes.skill_breakdown || [])
              .filter(s => !s.is_matched)
              .map(s => ({
                name: s.skill_name,
                required_proficiency: s.required_proficiency,
                candidate_proficiency: s.candidate_proficiency,
                match_score: s.match_score,
                feedback: s.skill_feedback,
                resources: s.resources
              }));

            const gapAnalysis = {
              must_have_gaps: aiRes.missing_critical_skills || [],
              nice_to_have_gaps: aiRes.nice_to_have_gaps || [],
              blockers: aiRes.blockers || [],
              qualification_status: aiRes.qualification_status,
              recommended_upskilling: aiRes.recommended_upskilling_path || [],
              explanation: aiRes.full_candidate_summary
            };

            let jobMatch = await db.JobMatch.findOne({
              where: { user_id: userId, job_post_id: jobPostId }
            });

            if (jobMatch) {
              jobMatch.match_score = overallScore;
              jobMatch.match_level = matchLevel;
              jobMatch.matched_skills_count = matchedSkills.length;
              jobMatch.missing_skills_count = missingSkills.length;
              jobMatch.matched_skills = matchedSkills;
              jobMatch.missing_skills = missingSkills;
              jobMatch.gap_analysis = gapAnalysis;
              jobMatch.explanation = aiRes.full_candidate_summary || aiRes.rationale || '';
              jobMatch.calculated_at = new Date();
              jobMatch.is_stale = false;
              await jobMatch.save();
            } else {
              jobMatch = await db.JobMatch.create({
                user_id: userId,
                job_post_id: jobPostId,
                match_score: overallScore,
                match_level: matchLevel,
                matched_skills_count: matchedSkills.length,
                missing_skills_count: missingSkills.length,
                matched_skills: matchedSkills,
                missing_skills: missingSkills,
                gap_analysis: gapAnalysis,
                explanation: aiRes.full_candidate_summary || aiRes.rationale || '',
                calculated_at: new Date(),
                is_stale: false
              });
            }

            jobMatch.jobPost = jobPost;
            jobMatch.user = user;
            return jobMatch;
          }
        }
      } catch (err) {
        logger.warn(`[AiMatchService] External AI matching failed or timed out: ${err.message}. Falling back to internal match engine.`);
      }
    }

    // Default & robust fallback: internal deterministic explainable match engine
    return await MatchEngineService.calculateMatch(userId, jobPostId, options);
  }
}

module.exports = AiMatchService;
