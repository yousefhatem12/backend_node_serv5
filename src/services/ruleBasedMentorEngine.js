'use strict';

class RuleBasedMentorEngine {
  /**
   * Generate context-aware grounded response when external AI is offline
   */
  static generateResponse(userMessage, context) {
    const text = (userMessage || '').toLowerCase().trim();
    const candidate = context.candidate || {};
    const name = candidate.name ? candidate.name.split(' ')[0] : 'there';
    const targetRole = context.preferences?.target_title || context.roadmap?.target_role || 'Software Engineer';
    const roadmap = context.roadmap;
    const applications = context.applications || [];
    const savedJobs = context.saved_jobs || [];

    const suggestedActions = [];

    // 1. Roadmap & Learning Tasks Query
    if (text.includes('roadmap') || text.includes('learn') || text.includes('study') || text.includes('next task') || text.includes('what should i do')) {
      if (roadmap && roadmap.next_tasks && roadmap.next_tasks.length > 0) {
        const nextTask = roadmap.next_tasks[0];
        suggestedActions.push({
          type: 'roadmap_task',
          id: nextTask.id,
          label: `Complete Task: ${nextTask.title.substring(0, 35)}...`
        });
        suggestedActions.push({
          type: 'view_roadmap',
          id: roadmap.id,
          label: 'View Full Roadmap'
        });

        const taskListStr = roadmap.next_tasks.map((t, idx) => `${idx + 1}. **${t.title}** (from milestone: *${t.milestone}*)`).join('\n');

        return {
          reply: `Hello ${name}! You are currently working toward **${targetRole}**, with your roadmap "${roadmap.title}" at **${roadmap.progress}%** completion.\n\nHere are your immediate focus areas for this week:\n${taskListStr}\n\nI recommend tackling the first task and attaching code or repository evidence once completed. Let me know if you need practical resources or code examples for any of these!`,
          suggested_actions: suggestedActions
        };
      } else {
        suggestedActions.push({
          type: 'generate_roadmap',
          label: 'Generate Career Roadmap'
        });
        return {
          reply: `Hi ${name}, I noticed you don't have an active learning roadmap yet targeting **${targetRole}**. Generating a roadmap will break down the essential skill gaps into progressive milestones and weekly tasks.\n\nWould you like to generate one now?`,
          suggested_actions: suggestedActions
        };
      }
    }

    // 2. Interview Prep Query
    if (text.includes('interview') || text.includes('mock') || text.includes('questions') || text.includes('prepare')) {
      suggestedActions.push({
        type: 'interview_prep',
        label: `Review ${targetRole} Technical Questions`
      });

      const skillNames = (candidate.skills || []).slice(0, 3).map(s => s.name).join(', ') || 'core principles';

      return {
        reply: `Great question, ${name}! For a **${targetRole}** interview, technical interviewers typically evaluate three key areas:\n\n1. **Core Fundamentals & Architecture**: In-depth understanding of ${skillNames}.\n2. **System Design & Scalability**: How you architect resilient, production-ready systems and handle trade-offs.\n3. **Behavioral & Project Debrief**: Explaining previous challenges from your portfolio using the STAR method (Situation, Task, Action, Result).\n\nFocus on explaining *why* you chose specific technologies rather than just *how* to use them. Which topic would you like to drill down into first?`,
        suggested_actions: suggestedActions
      };
    }

    // 3. Application Status & Job Advice Query
    if (text.includes('apply') || text.includes('application') || text.includes('job') || text.includes('hiring')) {
      if (applications.length > 0) {
        const latestApp = applications[0];
        suggestedActions.push({
          type: 'view_application',
          id: latestApp.id,
          label: `Check Application: ${latestApp.job_title}`
        });

        return {
          reply: `You currently have **${applications.length}** tracked application(s). Your latest application for **${latestApp.job_title}** at **${latestApp.company}** is currently in the **${latestApp.status}** stage.\n\nMake sure to review the vacancy's core requirements against your verified skills. While you wait for feedback, continuing your weekly roadmap tasks is the best way to strengthen your candidacy.`,
          suggested_actions: suggestedActions
        };
      } else if (savedJobs.length > 0) {
        const sj = savedJobs[0];
        suggestedActions.push({
          type: 'view_job',
          id: sj.id,
          label: `Review Saved Job: ${sj.title}`
        });
        return {
          reply: `You have **${savedJobs.length}** saved job(s), including **${sj.title}** at **${sj.company}**. Before applying, I recommend reviewing your match score and ensuring your CV highlights the required technical skills!`,
          suggested_actions: suggestedActions
        };
      } else {
        suggestedActions.push({
          type: 'browse_jobs',
          label: 'Explore Recommended Jobs'
        });
        return {
          reply: `I recommend checking out personalized job recommendations tailored to your profile as a **${targetRole}**. You can filter by match score to find roles where your existing skills are the strongest fit.`,
          suggested_actions: suggestedActions
        };
      }
    }

    // 4. Default / General Career Guidance
    const primarySkill = (candidate.skills && candidate.skills[0]) ? candidate.skills[0].name : 'your stack';
    if (roadmap) {
      suggestedActions.push({
        type: 'view_roadmap',
        id: roadmap.id,
        label: 'Continue Roadmap'
      });
    }
    suggestedActions.push({
      type: 'browse_jobs',
      label: 'Explore Opportunities'
    });

    return {
      reply: `Hi ${name}! As your AI Career Mentor, I'm here to support your journey toward becoming a top **${targetRole}**.\n\nBased on your current experience and skills in **${primarySkill}**, we can focus on:\n- **Weekly Action Planning**: Progressing through your personalized career roadmap.\n- **Job Discovery & Gap Analysis**: Pinpointing exact requirements for openings you're eyeing.\n- **Interview Preparation**: Practice system design and technical questions.\n\nWhat would you like to focus on today?`,
      suggested_actions: suggestedActions
    };
  }
}

module.exports = RuleBasedMentorEngine;
