'use strict';

class RuleBasedCvImproverEngine {
  /**
   * Deterministically analyze CV and profile against target role and job post
   */
  static analyze({ profile, experiences = [], skills = [], cvText = '', targetRole = '', job = null }) {
    const role = targetRole || (job ? job.title : (profile ? profile.job_title : 'Software Engineer')) || 'Software Engineer';
    const candidateSkillNames = (skills || []).map(s => (s.name || '').toLowerCase());
    const jobSkills = job && Array.isArray(job.skills) ? job.skills.map(s => s.name || s) : [];
    
    // 1. Missing keywords analysis
    const targetKeywords = jobSkills.length > 0
      ? jobSkills
      : ['Node.js', 'TypeScript', 'Docker', 'RESTful APIs', 'SQL', 'Git', 'CI/CD', 'Unit Testing', 'System Design'];

    const missingKeywords = targetKeywords.filter(kw => {
      const lower = kw.toLowerCase();
      const inSkills = candidateSkillNames.some(cs => cs.includes(lower));
      const inCv = cvText.toLowerCase().includes(lower);
      return !inSkills && !inCv;
    });

    // 2. Critical issues detection
    const criticalIssues = [];
    if (!cvText || cvText.length < 150) {
      criticalIssues.push('CV text content is minimal or unparsed; upload a comprehensive PDF/Word CV to maximize recruiter visibility.');
    }

    const hasMetrics = /\b(\d+[\%kKmM]?|\$\d+|\d+\+)\b/.test(cvText);
    if (!hasMetrics) {
      criticalIssues.push('Experience bullet points lack quantified impact metrics (e.g., % performance boost, user counts, latency reduction).');
    }

    if (missingKeywords.length > 3) {
      criticalIssues.push(`CV is missing ${missingKeywords.length} core keywords frequently searched by recruiters for ${role} positions.`);
    }

    if (experiences.length === 0) {
      criticalIssues.push('No professional experiences or internship milestones listed in your candidate profile.');
    }

    // 3. Bullet point improvements (STAR methodology transformations)
    const bulletImprovements = [];
    if (experiences.length > 0) {
      const firstExp = experiences[0];
      bulletImprovements.push({
        section: 'Work Experience',
        role: firstExp.job_title || firstExp.title || role,
        original_sample: 'Responsible for backend development, database queries, and bug fixes.',
        suggested_rewrite: `Architected and optimized scalable backend services using ${(candidateSkillNames[0] || 'Node.js').toUpperCase()}, reducing query response latency by 28% across high-volume production endpoints.`,
        rationale: 'Replaced passive duty-list statement with strong action verbs ("Architected and optimized") and measurable technical impact.'
      });
      bulletImprovements.push({
        section: 'Work Experience',
        role: firstExp.job_title || firstExp.title || role,

        original_sample: 'Worked on team project integrating third-party APIs.',
        suggested_rewrite: 'Engineered fault-tolerant third-party API integration pipelines with automated retry logic, achieving 99.9% uptime for payment and data synchronization.',
        rationale: 'Clarified engineering ownership, architectural resilience, and production reliability metrics.'
      });
    } else {
      bulletImprovements.push({
        section: 'Project / Technical Experience',
        role: role,
        original_sample: 'Built a web application for task management using modern frameworks.',
        suggested_rewrite: `Designed and deployed an end-to-end task management web platform with authenticated REST APIs, automated testing, and CI/CD delivery pipelines.`,
        rationale: 'Highlights end-to-end system ownership, deployment capability, and engineering rigor.'
      });
    }

    // 4. Structural & formatting advice
    const structuralTips = [
      'Maintain a consistent reverse-chronological layout with standardized section headers (Summary, Core Skills, Experience, Education, Projects).',
      'Group technical competencies into clean categories (Languages, Frameworks & Libraries, Databases, Cloud & DevOps) to pass Automated Tracking Systems (ATS).',
      'Keep bullet points concise (1 to 2 lines per bullet) beginning with past-tense action verbs (e.g., Developed, Engineered, Accelerated, Streamlined).',
      'Ensure all contact links (GitHub, LinkedIn, Portfolio) are functional and up-to-date.'
    ];

    // 5. Calculate overall score (0 - 100)
    let score = 85;
    if (criticalIssues.length > 0) score -= (criticalIssues.length * 8);
    if (missingKeywords.length > 0) score -= Math.min(20, missingKeywords.length * 3);
    score = Math.max(40, Math.min(95, score));

    return {
      target_role: role,
      overall_score: score,
      critical_issues: criticalIssues,
      missing_keywords: missingKeywords.slice(0, 8),
      bullet_improvements: bulletImprovements,
      structural_tips: structuralTips
    };
  }
}

module.exports = RuleBasedCvImproverEngine;
