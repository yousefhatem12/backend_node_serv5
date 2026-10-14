'use strict';

class RoadmapResource {
  /**
   * Format full Roadmap with phases, milestones, and tasks
   */
  static toArray(roadmap) {
    if (!roadmap) return null;

    let target = {
      type: roadmap.target_type || 'role'
    };
    if (roadmap.target_type === 'role') {
      target.role = roadmap.target_role || null;
    } else {
      target.job_id = roadmap.target_job_id ? Number(roadmap.target_job_id) : null;
      if (roadmap.targetJob) {
        target.job_title = roadmap.targetJob.title;
        target.company_name = roadmap.targetJob.company ? roadmap.targetJob.company.name : null;
      }
    }

    const phases = (roadmap.phases || []).map(phase => this.formatPhase(phase));

    return {
      id: Number(roadmap.id),
      title: roadmap.title,
      description: roadmap.description,
      rationale: roadmap.rationale,
      status: roadmap.status,
      progress: Number(parseFloat(roadmap.progress || 0).toFixed(2)),
      target,
      generation_version: Number(roadmap.generation_version || 1),
      previous_roadmap_id: roadmap.previous_roadmap_id ? Number(roadmap.previous_roadmap_id) : null,
      metadata: typeof roadmap.metadata === 'string' ? JSON.parse(roadmap.metadata) : (roadmap.metadata || null),
      phases,
      created_at: roadmap.created_at || roadmap.createdAt,
      updated_at: roadmap.updated_at || roadmap.updatedAt
    };
  }

  /**
   * Format single phase with milestones and tasks
   */
  static formatPhase(phase) {
    if (!phase) return null;
    const milestones = (phase.milestones || []).map(milestone => this.formatMilestone(milestone));

    return {
      id: Number(phase.id),
      title: phase.title,
      description: phase.description,
      order: Number(phase.order),
      status: phase.status,
      milestones
    };
  }

  /**
   * Format milestone with targetSkill and tasks
   */
  static formatMilestone(milestone) {
    if (!milestone) return null;
    const tasks = (milestone.tasks || []).map(task => this.formatTask(task));

    const result = {
      id: Number(milestone.id),
      title: milestone.title,
      description: milestone.description,
      order: Number(milestone.order),
      status: milestone.status,
      tasks
    };

    if (milestone.targetSkill) {
      result.target_skill = {
        id: Number(milestone.targetSkill.id),
        name: milestone.targetSkill.name,
        category: milestone.targetSkill.category || null
      };
    } else if (milestone.target_skill_id) {
      result.target_skill_id = Number(milestone.target_skill_id);
    }

    return result;
  }

  /**
   * Format task
   */
  static formatTask(task) {
    if (!task) return null;
    return {
      id: Number(task.id),
      title: task.title,
      description: task.description,
      order: Number(task.order),
      status: task.status,
      weight: Number(task.weight || 1),
      evidence: task.evidence || null,
      notes: task.notes || null,
      completed_at: task.completed_at ? new Date(task.completed_at).toISOString() : null
    };
  }

  /**
   * Format concise roadmap summary (for lists)
   */
  static toSummary(roadmap) {
    if (!roadmap) return null;

    let target = {
      type: roadmap.target_type || 'role'
    };
    if (roadmap.target_type === 'role') {
      target.role = roadmap.target_role || null;
    } else {
      target.job_id = roadmap.target_job_id ? Number(roadmap.target_job_id) : null;
    }

    return {
      id: Number(roadmap.id),
      title: roadmap.title,
      description: roadmap.description,
      status: roadmap.status,
      progress: Number(parseFloat(roadmap.progress || 0).toFixed(2)),
      target,
      generation_version: Number(roadmap.generation_version || 1),
      previous_roadmap_id: roadmap.previous_roadmap_id ? Number(roadmap.previous_roadmap_id) : null,
      created_at: roadmap.created_at || roadmap.createdAt,
      updated_at: roadmap.updated_at || roadmap.updatedAt
    };
  }

  /**
   * Format collection of roadmaps
   */
  static collection(roadmaps) {
    return roadmaps.map(r => this.toSummary(r));
  }
}

module.exports = RoadmapResource;
