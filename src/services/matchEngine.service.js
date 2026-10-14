'use strict';

const db = require('../models');
const { NotFoundError } = require('../utils/errors');

class MatchEngineService {
  /**
   * Proficiency multiplier map
   */
  static getProficiencyMultiplier(level) {
    switch (level ? level.toLowerCase() : '') {
      case 'expert':
        return 1.0;
      case 'advanced':
        return 0.95;
      case 'intermediate':
        return 0.85;
      case 'beginner':
        return 0.65;
      default:
        return 0.85;
    }
  }

  /**
   * Determine match level from total score
   */
  static getMatchLevel(score) {
    if (score >= 80) return 'strong';
    if (score >= 65) return 'good';
    if (score >= 45) return 'moderate';
    return 'low';
  }

  /**
   * Calculate or retrieve cached match score and explainable gap analysis for a candidate and job
   */
  static async calculateMatch(userId, jobPostId, { forceRefresh = false } = {}) {
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

    if (!user) {
      throw new NotFoundError('Candidate not found.');
    }

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

    if (!jobPost) {
      throw new NotFoundError('Job post not found.');
    }

    // 3. Check for existing fresh JobMatch if not forced
    if (!forceRefresh) {
      const existingMatch = await db.JobMatch.findOne({
        where: { user_id: userId, job_post_id: jobPostId }
      });

      if (existingMatch && !existingMatch.is_stale) {
        // Ensure JSON fields are parsed
        if (typeof existingMatch.matched_skills === 'string') {
          try { existingMatch.matched_skills = JSON.parse(existingMatch.matched_skills); } catch (_) {}
        }
        if (typeof existingMatch.missing_skills === 'string') {
          try { existingMatch.missing_skills = JSON.parse(existingMatch.missing_skills); } catch (_) {}
        }
        if (typeof existingMatch.gap_analysis === 'string') {
          try { existingMatch.gap_analysis = JSON.parse(existingMatch.gap_analysis); } catch (_) {}
        }
        existingMatch.jobPost = jobPost;
        existingMatch.user = user;
        return existingMatch;
      }
    }

    // 4. Perform Scoring Calculation
    const candidateProfile = user.candidateProfile || {};
    const primaryPreference = candidateProfile.careerPreference || {};

    const candidateSkillsMap = new Map();
    if (Array.isArray(candidateProfile.candidateSkills)) {
      candidateProfile.candidateSkills.forEach(cs => {
        const skillName = cs.skill ? cs.skill.normalized_name : '';
        const skillId = cs.skill_id;
        const profLevel = cs.proficiency_level || 'intermediate';
        if (skillId) candidateSkillsMap.set(String(skillId), profLevel);
        if (skillName) candidateSkillsMap.set(skillName, profLevel);
      });
    }

    const jobSkills = Array.isArray(jobPost.jobSkills) ? jobPost.jobSkills : [];
    const matchedSkills = [];
    const missingSkills = [];

    let totalPossibleSkillWeight = 0;
    let earnedSkillWeight = 0;

    if (jobSkills.length > 0) {
      jobSkills.forEach(js => {
        const skillName = js.skill ? js.skill.name : 'Unknown';
        const normSkillName = js.skill ? js.skill.normalized_name : skillName.toLowerCase();
        const skillId = js.skill_id;
        const importance = js.importance ? Number(js.importance) : 3;
        const isRequired = Boolean(js.is_required);
        const requiredLevel = js.required_level || 'mid-level';

        const rawWeight = isRequired ? importance * 1.5 : importance * 1.0;
        totalPossibleSkillWeight += rawWeight;

        // Check if candidate possesses skill
        let candidateProf = null;
        if (candidateSkillsMap.has(String(skillId))) {
          candidateProf = candidateSkillsMap.get(String(skillId));
        } else if (candidateSkillsMap.has(normSkillName)) {
          candidateProf = candidateSkillsMap.get(normSkillName);
        }

        if (candidateProf) {
          const multiplier = MatchEngineService.getProficiencyMultiplier(candidateProf);
          const contribution = Number((rawWeight * multiplier).toFixed(2));
          earnedSkillWeight += contribution;

          matchedSkills.push({
            id: skillId ? Number(skillId) : null,
            name: skillName,
            importance,
            is_required: isRequired,
            required_level: requiredLevel,
            proficiency_level: candidateProf,
            score_contribution: contribution
          });
        } else {
          missingSkills.push({
            id: skillId ? Number(skillId) : null,
            name: skillName,
            importance,
            is_required: isRequired,
            required_level: requiredLevel
          });
        }
      });
    }

    // Component 1: Skill Score (max 70 points)
    let skillScore = 0;
    if (totalPossibleSkillWeight > 0) {
      skillScore = (earnedSkillWeight / totalPossibleSkillWeight) * 70;
    } else {
      // Fallback: If job has no specified skills, check keyword matching in description
      const descLower = (jobPost.description || '').toLowerCase();
      let matchesCount = 0;
      candidateSkillsMap.forEach((prof, name) => {
        if (name && descLower.includes(name)) matchesCount++;
      });
      skillScore = matchesCount > 0 ? Math.min(60, 30 + matchesCount * 10) : 40;
    }

    // Component 2: Experience & Seniority Fit (max 15 points)
    let experienceScore = 15;
    const candYears = Number(candidateProfile.years_of_experience || 0);
    const jobMinYears = Number(jobPost.min_years_experience || 0);

    let expStatus = 'sufficient';
    if (jobMinYears > 0) {
      if (candYears >= jobMinYears) {
        experienceScore = 15;
        expStatus = 'sufficient';
      } else if (jobMinYears - candYears <= 1) {
        experienceScore = 10.5;
        expStatus = 'slightly_below';
      } else if (jobMinYears - candYears <= 2) {
        experienceScore = 6.0;
        expStatus = 'below';
      } else {
        experienceScore = 3.0;
        expStatus = 'significantly_below';
      }
    }

    // Component 3: Work Mode, Location & Target Role (max 15 points)
    let preferencesScore = 0;

    // 3a. Work mode (5 pts)
    const candWorkMode = primaryPreference.preferred_work_mode;
    if (jobPost.work_mode === 'remote') {
      preferencesScore += 5;
    } else if (candWorkMode && candWorkMode === jobPost.work_mode) {
      preferencesScore += 5;
    } else if (candWorkMode) {
      preferencesScore += 2.5;
    } else {
      preferencesScore += 4;
    }

    // 3b. Location (5 pts)
    const candCity = primaryPreference.preferred_city;
    const candCountry = primaryPreference.preferred_country;
    if (jobPost.work_mode === 'remote') {
      preferencesScore += 5;
    } else if (candCity && jobPost.city && candCity.toLowerCase() === jobPost.city.toLowerCase()) {
      preferencesScore += 5;
    } else if (candCountry && jobPost.country && candCountry.toLowerCase() === jobPost.country.toLowerCase()) {
      preferencesScore += 4;
    } else if (!candCity && !candCountry) {
      preferencesScore += 3.5;
    } else {
      preferencesScore += 1.5;
    }

    // 3c. Target role (5 pts)
    const candTargetRole = (primaryPreference.target_role || '').toLowerCase();
    const jobTitle = (jobPost.title || '').toLowerCase();
    const jobRole = (jobPost.canonical_role || '').toLowerCase();
    if (candTargetRole && (jobTitle.includes(candTargetRole) || jobRole.includes(candTargetRole))) {
      preferencesScore += 5;
    } else if (candTargetRole) {
      preferencesScore += 2.5;
    } else {
      preferencesScore += 3.5;
    }

    // Total Match Score
    const rawTotal = skillScore + experienceScore + preferencesScore;
    const matchScore = Number(Math.min(100, Math.max(0, rawTotal)).toFixed(1));
    const matchLevel = MatchEngineService.getMatchLevel(matchScore);

    // Structure Gap Analysis
    const mustHaveGaps = missingSkills
      .filter(s => s.is_required)
      .sort((a, b) => b.importance - a.importance);

    const niceToHaveGaps = missingSkills
      .filter(s => !s.is_required)
      .sort((a, b) => b.importance - a.importance);

    let recommendationAction = 'Ready to apply';
    if (matchScore >= 80 && mustHaveGaps.length === 0) {
      recommendationAction = 'Ready to apply! Excellent alignment across core technical competencies.';
    } else if (matchScore >= 65 && mustHaveGaps.length <= 1) {
      recommendationAction = 'Competitive candidate. Recommended to apply while addressing minor skill gaps.';
    } else if (mustHaveGaps.length > 0) {
      recommendationAction = `Focus on acquiring mandatory skills (${mustHaveGaps.map(g => g.name).join(', ')}) before applying.`;
    } else {
      recommendationAction = 'Moderate match. Review missing requirements before applying.';
    }

    const gapAnalysis = {
      must_have_gaps: mustHaveGaps,
      nice_to_have_gaps: niceToHaveGaps,
      experience_gap: {
        candidate_years: candYears,
        required_min_years: jobMinYears,
        status: expStatus
      },
      recommendation_action: recommendationAction
    };

    // Synthesize Explanation
    let explanation = '';
    const matchedNames = matchedSkills.slice(0, 3).map(s => s.name);
    const missingMustHaveNames = mustHaveGaps.map(s => s.name);

    if (matchLevel === 'strong') {
      explanation = `You are a strong fit (${matchScore}%) for ${jobPost.title}. You have demonstrated competence in key requirements including ${matchedNames.join(', ')}.`;
      if (missingSkills.length > 0) {
        explanation += ` Minor missing items: ${missingSkills.slice(0, 2).map(s => s.name).join(', ')}.`;
      }
    } else if (matchLevel === 'good') {
      explanation = `You are a good match (${matchScore}%) for this role. You match key skills like ${matchedNames.join(', ')}.`;
      if (missingMustHaveNames.length > 0) {
        explanation += ` Noticeable must-have gaps: ${missingMustHaveNames.join(', ')}.`;
      }
    } else {
      explanation = `You currently have a ${matchLevel} match (${matchScore}%) for this role. Key missing skills include ${missingSkills.slice(0, 3).map(s => s.name).join(', ')}.`;
    }

    // Persist or Update JobMatch record
    let matchRecord = await db.JobMatch.findOne({
      where: { user_id: userId, job_post_id: jobPostId }
    });

    if (matchRecord) {
      matchRecord.match_score = matchScore;
      matchRecord.match_level = matchLevel;
      matchRecord.matched_skills_count = matchedSkills.length;
      matchRecord.missing_skills_count = missingSkills.length;
      matchRecord.matched_skills = matchedSkills;
      matchRecord.missing_skills = missingSkills;
      matchRecord.gap_analysis = gapAnalysis;
      matchRecord.explanation = explanation;
      matchRecord.calculated_at = new Date();
      matchRecord.is_stale = false;
      await matchRecord.save();
    } else {
      matchRecord = await db.JobMatch.create({
        user_id: userId,
        job_post_id: jobPostId,
        match_score: matchScore,
        match_level: matchLevel,
        matched_skills_count: matchedSkills.length,
        missing_skills_count: missingSkills.length,
        matched_skills: matchedSkills,
        missing_skills: missingSkills,
        gap_analysis: gapAnalysis,
        explanation,
        calculated_at: new Date(),
        is_stale: false
      });
    }

    matchRecord.jobPost = jobPost;
    matchRecord.user = user;

    return matchRecord;
  }
}

module.exports = MatchEngineService;
