'use strict';

class RuleBasedStrategyEngine {
  /**
   * Deterministically evaluate application strategy and readiness
   */
  static assess({ profile, candidateSkills = [], experiences = [], job }) {
    const candidateSkillNames = candidateSkills.map(s => (s.name || s || '').toLowerCase());
    const candidateExpYears = profile ? Number(profile.years_of_experience || 0) : 0;
    const jobMinYears = Number(job.min_years_experience || 0);

    const jobSkills = Array.isArray(job.jobSkills) ? job.jobSkills : [];
    const requiredSkills = [];
    const preferredSkills = [];

    for (const js of jobSkills) {
      const name = js.skill ? js.skill.name : (js.name || '');
      if (js.is_required !== false) {
        requiredSkills.push(name);
      } else {
        preferredSkills.push(name);
      }
    }

    const matchedRequired = requiredSkills.filter(s => candidateSkillNames.some(cs => cs.includes(s.toLowerCase())));
    const missingRequired = requiredSkills.filter(s => !candidateSkillNames.some(cs => cs.includes(s.toLowerCase())));
    const matchedPreferred = preferredSkills.filter(s => candidateSkillNames.some(cs => cs.includes(s.toLowerCase())));

    // Calculate readiness score
    let score = 0;
    const reqTotal = Math.max(1, requiredSkills.length);
    score += (matchedRequired.length / reqTotal) * 60;

    if (jobMinYears <= 0 || candidateExpYears >= jobMinYears) {
      score += 25;
    } else {
      score += Math.max(5, (candidateExpYears / jobMinYears) * 20);
    }

    const prefTotal = Math.max(1, preferredSkills.length);
    score += (matchedPreferred.length / prefTotal) * 15;

    const readinessScore = Math.min(95, Math.max(15, Math.round(score)));

    // Determine fit_level
    let fitLevel = 'stretch';
    if (readinessScore >= 75) fitLevel = 'strong_fit';
    else if (readinessScore >= 50) fitLevel = 'moderate_fit';

    // Determine recommendation
    let recommendation = 'alternative_roles';
    if (readinessScore >= 70) recommendation = 'apply_now';
    else if (readinessScore >= 45) recommendation = 'improve_gaps_first';

    // Quick wins (< 48 hours)
    const quickWins = [];
    if (matchedRequired.length > 0) {
      quickWins.push(`Highlight your verified competencies in ${matchedRequired.slice(0, 2).join(' and ')} prominently in your CV summary.`);
    }
    quickWins.push('Ensure your portfolio code repository links are public, well-documented, and linked directly on your profile.');
    if (preferredSkills.length > 0) {
      quickWins.push(`Review the role description to align your application notes with their interest in ${preferredSkills[0]}.`);
    }

    // Blocker gaps
    const blockerGaps = [];
    if (missingRequired.length > 0) {
      blockerGaps.push(`Missing mandatory requirements: ${missingRequired.slice(0, 3).join(', ')}.`);
    }
    if (candidateExpYears < jobMinYears) {
      blockerGaps.push(`Experience mismatch: Posting targets ${jobMinYears}+ years, current profile lists ${candidateExpYears} years.`);
    }

    // Alternative roles
    const alternativeRoles = [];
    if (fitLevel !== 'strong_fit') {
      if (job.title.toLowerCase().includes('senior')) {
        alternativeRoles.push(job.title.replace(/senior/i, 'Mid-Level').trim());
      } else if (!job.title.toLowerCase().includes('junior') && !job.title.toLowerCase().includes('entry')) {
        alternativeRoles.push(`Junior ${job.title}`);
        alternativeRoles.push(`Associate ${job.title}`);
      } else {
        alternativeRoles.push(`Software Engineer Intern`);
      }
    }

    // Strategic advice
    let strategicAdvice = '';
    if (recommendation === 'apply_now') {
      strategicAdvice = `You exhibit strong alignment with this role (${readinessScore}% readiness). Your skills directly match the primary requirements. We advise applying now while fine-tuning your CV bullet points with quantified outcomes.`;
    } else if (recommendation === 'improve_gaps_first') {
      strategicAdvice = `You possess foundational qualifications, but key requirements (${missingRequired.slice(0, 2).join(', ') || 'seniority'}) pose a screening risk. Spend 1-2 weeks completing a concrete project or roadmap milestone to close these gaps before applying.`;
    } else {
      strategicAdvice = `This posting presents a significant stretch (${readinessScore}% readiness). Rather than risking early screening rejection, prioritize targeted alternative roles while building necessary prerequisite skills on your career roadmap.`;
    }

    return {
      recommendation,
      readiness_score: readinessScore,
      fit_level: fitLevel,
      quick_wins: quickWins,
      blocker_gaps: blockerGaps,
      alternative_roles: alternativeRoles,
      strategic_advice: strategicAdvice
    };
  }
}

module.exports = RuleBasedStrategyEngine;
