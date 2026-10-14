'use strict';

const db = require('../models');

class MentorContextBuilder {
  /**
   * Build comprehensive grounded context for candidate
   */
  static async buildContext(userId, { context_mode = 'general', context_metadata = {} } = {}) {
    // 1. Candidate user & profile
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
            },
            { model: db.Experience, as: 'experiences' },
            { model: db.Education, as: 'educations' },
            { model: db.Project, as: 'projects' }
          ]
        }
      ]
    });

    const profile = user?.candidateProfile;

    // 2. Verified CV Extractions
    const latestCv = profile ? await db.CvDocument.findOne({
      where: { candidate_profile_id: profile.id, is_current: true },
      include: [{ model: db.CvExtraction, as: 'extractions' }],
      order: [['created_at', 'DESC']]
    }) : null;

    // 3. Applications
    const applications = profile ? await db.Application.findAll({
      where: { candidate_profile_id: profile.id },
      include: [
        {
          model: db.JobPost,
          as: 'job',
          include: [{ model: db.Company, as: 'company' }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 5
    }) : [];

    // 4. Saved Jobs
    const savedJobs = await db.SavedJob.findAll({
      where: { candidate_profile_id: profile ? profile.id : 0 },
      include: [
        {
          model: db.JobPost,
          as: 'jobPost',
          include: [{ model: db.Company, as: 'company' }]
        }
      ],
      limit: 5
    });

    // 5. Active Roadmap
    const activeRoadmap = await db.Roadmap.findOne({
      where: { user_id: userId, status: 'in_progress' },
      include: [
        {
          model: db.RoadmapPhase,
          as: 'phases',
          include: [
            {
              model: db.RoadmapMilestone,
              as: 'milestones',
              include: [
                { model: db.Skill, as: 'targetSkill' },
                { model: db.RoadmapTask, as: 'tasks' }
              ]
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // 6. Specific mode resolution
    let specificFocus = null;
    if (context_mode === 'job' && context_metadata?.job_id) {
      const job = await db.JobPost.findByPk(context_metadata.job_id, {
        include: [
          { model: db.Company, as: 'company' },
          { model: db.JobSkill, as: 'jobSkills', include: [{ model: db.Skill, as: 'skill' }] }
        ]
      });
      if (job) {
        specificFocus = {
          type: 'job',
          id: job.id,
          title: job.title,
          company: job.company?.name,
          required_skills: (job.jobSkills || []).map(js => js.skill?.name).filter(Boolean)
        };
      }
    } else if (context_mode === 'roadmap' && context_metadata?.roadmap_id) {
      const roadmap = await db.Roadmap.findByPk(context_metadata.roadmap_id, {
        include: [
          {
            model: db.RoadmapPhase,
            as: 'phases',
            include: [{ model: db.RoadmapMilestone, as: 'milestones', include: [{ model: db.RoadmapTask, as: 'tasks' }] }]
          }
        ]
      });
      if (roadmap) {
        specificFocus = {
          type: 'roadmap',
          id: roadmap.id,
          title: roadmap.title,
          progress: Number(roadmap.progress || 0)
        };
      }
    }

    // Structure Candidate Data
    const candidateSkillsList = (profile?.candidateSkills || []).map(cs => ({
      name: cs.skill?.name || 'Unknown',
      level: cs.proficiency_level || 'intermediate',
      is_verified: Boolean(cs.is_verified)
    }));

    const preferences = profile?.careerPreference ? {
      target_title: profile.careerPreference.target_role || profile.careerPreference.target_title,
      target_roles: profile.careerPreference.target_roles || [],
      work_modes: profile.careerPreference.preferred_work_modes || (profile.careerPreference.work_mode ? [profile.careerPreference.work_mode] : [])
    } : null;

    const applicationsSummary = applications.map(app => ({
      id: Number(app.id),
      job_title: app.job?.title,
      company: app.job?.company?.name,
      status: app.status,
      applied_at: app.created_at
    }));

    const savedJobsSummary = savedJobs.map(sj => ({
      id: Number(sj.jobPost?.id),
      title: sj.jobPost?.title,
      company: sj.jobPost?.company?.name
    }));

    // Find next actionable tasks from roadmap
    let nextTasks = [];
    if (activeRoadmap?.phases) {
      for (const phase of activeRoadmap.phases) {
        for (const milestone of (phase.milestones || [])) {
          for (const task of (milestone.tasks || [])) {
            if (task.status === 'pending' || task.status === 'in_progress') {
              nextTasks.push({
                id: Number(task.id),
                title: task.title,
                milestone: milestone.title,
                phase: phase.title
              });
              if (nextTasks.length >= 3) break;
            }
          }
          if (nextTasks.length >= 3) break;
        }
        if (nextTasks.length >= 3) break;
      }
    }

    return {
      candidate: {
        id: Number(userId),
        name: user?.name,
        title: profile?.job_title || profile?.title || 'Aspiring Software Engineer',
        years_of_experience: Number(profile?.years_of_experience || 0),
        skills: candidateSkillsList
      },
      preferences,
      applications: applicationsSummary,
      saved_jobs: savedJobsSummary,
      roadmap: activeRoadmap ? {
        id: Number(activeRoadmap.id),
        title: activeRoadmap.title,
        progress: Number(activeRoadmap.progress || 0),
        target_role: activeRoadmap.target_role,
        next_tasks: nextTasks
      } : null,
      context_mode,
      specific_focus: specificFocus
    };
  }

  /**
   * Format the context snapshot into a system prompt for LLM or AI mentor
   */
  static formatSystemPrompt(context) {
    const candidate = context.candidate;
    const skills = (candidate.skills || []).map(s => `${s.name} (${s.level})`).join(', ') || 'None listed';
    const targetRole = context.preferences?.target_title || context.roadmap?.target_role || 'Software Engineer';
    const roadmapSummary = context.roadmap
      ? `Active Roadmap "${context.roadmap.title}" (${context.roadmap.progress}% completed). Next tasks: ${context.roadmap.next_tasks.map(t => t.title).join('; ') || 'None'}`
      : 'No active roadmap.';

    return `You are the SkillMatch AI Career Mentor, a knowledgeable, encouraging, and honest tech career advisor.
Candidate Profile:
- Name: ${candidate.name}
- Current Title: ${candidate.title} (${candidate.years_of_experience} years exp)
- Target Role: ${targetRole}
- Skills: ${skills}
- Roadmap: ${roadmapSummary}
- Active Applications: ${context.applications.length} (${context.applications.map(a => `${a.job_title} at ${a.company}: ${a.status}`).join(', ') || 'None'})

Operational Rules:
1. Ground advice strictly in the candidate's actual skills, missing gaps, and roadmap.
2. Turn broad queries into concrete, weekly actionable steps.
3. Provide truthful expectations; never invent qualifications or guarantee hiring outcomes.
4. Suggest relevant next actions (view job, complete roadmap task, prepare interview topic).`;
  }
}

module.exports = MentorContextBuilder;
