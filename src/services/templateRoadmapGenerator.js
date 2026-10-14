'use strict';

const db = require('../models');

/**
 * Standard role skills dictionary to enrich role-based roadmaps
 */
const ROLE_SKILL_CATALOG = {
  'cloud solutions architect': ['Cloud Infrastructure', 'Kubernetes', 'Terraform', 'Docker', 'Networking & VPC', 'System Design'],
  'cloud architect': ['Cloud Infrastructure', 'Kubernetes', 'Terraform', 'Docker', 'Networking & VPC', 'System Design'],
  'backend engineer': ['Node.js', 'PostgreSQL', 'Docker', 'REST APIs', 'System Design', 'Caching & Redis'],
  'backend developer': ['Node.js', 'PostgreSQL', 'Docker', 'REST APIs', 'System Design', 'Caching & Redis'],
  'frontend engineer': ['JavaScript', 'TypeScript', 'React', 'CSS & Responsive Design', 'State Management', 'Web Performance'],
  'frontend developer': ['JavaScript', 'TypeScript', 'React', 'CSS & Responsive Design', 'State Management', 'Web Performance'],
  'full stack developer': ['JavaScript', 'TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker'],
  'full stack engineer': ['JavaScript', 'TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker'],
  'devops engineer': ['Docker', 'Kubernetes', 'Terraform', 'CI/CD Pipelines', 'Linux', 'Monitoring & Logging'],
  'data engineer': ['Python', 'SQL', 'Data Warehousing', 'Apache Spark', 'ETL Pipelines', 'Airflow'],
  'ai engineer': ['Python', 'Machine Learning', 'Deep Learning', 'PyTorch', 'Prompt Engineering', 'FastAPI'],
  'mobile developer': ['Flutter', 'Dart', 'State Management', 'REST APIs', 'Mobile UI/UX', 'App Store Deployment']
};

class TemplateRoadmapGenerator {
  /**
   * Deterministic template generator guaranteeing delivery when AI service is unavailable
   */
  static async generate({ target_type, target_role, job, missingSkills = [], candidateSkills = [] }) {
    const targetTitle = target_type === 'job' && job
      ? job.title
      : (target_role || 'Software Engineer');

    // 1. Identify missing skill names and IDs
    let gaps = [];
    if (Array.isArray(missingSkills) && missingSkills.length > 0) {
      gaps = missingSkills;
    } else {
      // Find default skills for role from catalog or skills database
      const normalizedRole = targetTitle.toLowerCase().trim();
      const catalogSkills = ROLE_SKILL_CATALOG[normalizedRole] || [
        'Core Technical Fundamentals',
        'Database & Storage Systems',
        'Architecture & Design Patterns',
        'Production Deployment & CI/CD'
      ];

      // Query database for matching skills
      const existingSkills = await db.Skill.findAll({
        where: {
          name: catalogSkills
        }
      });
      const skillMap = new Map();
      existingSkills.forEach(s => skillMap.set(s.name.toLowerCase(), s));

      // Filter out skills the candidate already possesses
      const candidateSkillNames = new Set(
        candidateSkills.map(cs => (cs.skill ? cs.skill.normalized_name : (cs.name || '')).toLowerCase())
      );

      catalogSkills.forEach(skillName => {
        if (!candidateSkillNames.has(skillName.toLowerCase())) {
          const found = skillMap.get(skillName.toLowerCase());
          gaps.push({
            id: found ? found.id : null,
            name: skillName,
            importance: 4
          });
        }
      });

      if (gaps.length === 0) {
        gaps = catalogSkills.map(s => ({ id: null, name: s, importance: 3 }));
      }
    }

    const gapNames = gaps.map(g => g.name || g.skill_name || 'Key Technology');
    const rationale = gapNames.length > 0
      ? `Identified priority skill gaps: ${gapNames.slice(0, 5).join(', ')}.`
      : `Tailored roadmap aligned with market standards for ${targetTitle}.`;

    const description = `Structured path to achieve proficiency and job-readiness for ${targetTitle}.`;

    // 2. Distribute gaps across 4 standard progressive phases
    // Phase 1: Foundations & Core Prerequisites
    // Phase 2: Implementation & Practical Labs
    // Phase 3: Advanced Architecture & Production Readiness
    // Phase 4: Portfolio Building & Interview Mastery
    const phases = [
      {
        order: 1,
        title: 'Phase 1: Foundations & Core Prerequisites',
        description: `Establish core principles, syntax, and foundational patterns for ${targetTitle}.`,
        status: 'in_progress',
        milestones: []
      },
      {
        order: 2,
        title: 'Phase 2: Implementation & Practical Labs',
        description: 'Build hands-on implementations, configure services, and complete structured lab exercises.',
        status: 'pending',
        milestones: []
      },
      {
        order: 3,
        title: 'Phase 3: Advanced Architecture & Production Readiness',
        description: 'Master scalability, testing, continuous integration, security, and performance tuning.',
        status: 'pending',
        milestones: []
      },
      {
        order: 4,
        title: 'Phase 4: Capstone Project & Interview Mastery',
        description: 'Complete an end-to-end portfolio project and practice technical interview scenarios.',
        status: 'pending',
        milestones: []
      }
    ];

    // Distribute skills into milestones across phases
    const primarySkill = gaps[0] ? (gaps[0].name || gaps[0].skill_name) : 'Foundational Stack';
    const primarySkillId = gaps[0] ? gaps[0].id : null;

    const secondarySkill = gaps[1] ? (gaps[1].name || gaps[1].skill_name) : (gaps[0] ? gaps[0].name : 'System Architecture');
    const secondarySkillId = gaps[1] ? gaps[1].id : primarySkillId;

    const advancedSkill = gaps[2] ? (gaps[2].name || gaps[2].skill_name) : 'Production Infrastructure';
    const advancedSkillId = gaps[2] ? gaps[2].id : null;

    // Milestones for Phase 1
    phases[0].milestones.push({
      order: 1,
      title: `${primarySkill} Fundamentals & Tooling`,
      description: `Understand the core syntax, environment setup, and CLI conventions for ${primarySkill}.`,
      target_skill_id: primarySkillId,
      status: 'in_progress',
      tasks: [
        {
          order: 1,
          title: `Set up local development environment for ${primarySkill}`,
          description: `Install required runtimes, configure IDE plugins, and verify toolchain installation.`,
          weight: 1,
          status: 'pending'
        },
        {
          order: 2,
          title: `Complete comprehensive primer and syntax exercises on ${primarySkill}`,
          description: `Work through foundational syntax, type safety, and error handling conventions.`,
          weight: 2,
          status: 'pending'
        }
      ]
    });

    // Milestones for Phase 2
    phases[1].milestones.push({
      order: 1,
      title: `${secondarySkill} Deep Dive & Applied Labs`,
      description: `Implement real-world modules and integrate ${secondarySkill} into sample workflows.`,
      target_skill_id: secondarySkillId,
      status: 'pending',
      tasks: [
        {
          order: 1,
          title: `Build functional prototype integrating ${secondarySkill}`,
          description: `Develop a modular component incorporating best practices and unit tests.`,
          weight: 2,
          status: 'pending'
        },
        {
          order: 2,
          title: `Automate validation and integration testing`,
          description: `Write automated tests covering happy path and edge cases with at least 80% coverage.`,
          weight: 2,
          status: 'pending'
        }
      ]
    });

    // Milestones for Phase 3
    phases[2].milestones.push({
      order: 1,
      title: `${advancedSkill} Architecture & Resiliency`,
      description: `Apply enterprise architecture patterns, monitoring, and security hardening with ${advancedSkill}.`,
      target_skill_id: advancedSkillId,
      status: 'pending',
      tasks: [
        {
          order: 1,
          title: `Design for high availability and failover`,
          description: `Implement caching, load balancing, and connection pooling for maximum throughput.`,
          weight: 3,
          status: 'pending'
        },
        {
          order: 2,
          title: `Configure CI/CD automated pipeline and telemetry`,
          description: `Set up automated build pipeline with linting, security scans, and health check monitoring.`,
          weight: 2,
          status: 'pending'
        }
      ]
    });

    // Milestones for Phase 4
    phases[3].milestones.push({
      order: 1,
      title: `${targetTitle} Capstone Showcase & Interview Prep`,
      description: `Demonstrate end-to-end expertise with public repository, documentation, and technical talking points.`,
      target_skill_id: primarySkillId,
      status: 'pending',
      tasks: [
        {
          order: 1,
          title: `Publish open-source capstone project to GitHub with README and architecture diagrams`,
          description: `Provide live demo link, setup instructions, and design trade-off explanations.`,
          weight: 3,
          status: 'pending'
        },
        {
          order: 2,
          title: `Conduct mock technical interview sessions for ${targetTitle}`,
          description: `Rehearse system design explanations, behavioral questions, and live coding exercises.`,
          weight: 2,
          status: 'pending'
        }
      ]
    });

    return {
      title: `Roadmap to ${targetTitle}`,
      description,
      rationale,
      phases
    };
  }
}

module.exports = TemplateRoadmapGenerator;
