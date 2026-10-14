'use strict';

const db = require('../models');
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');
const MatchEngineService = require('./matchEngine.service');
const AiRoadmapService = require('./aiRoadmap.service');
const RoadmapResource = require('../resources/roadmap.resource');

class RoadmapService {
  /**
   * Helper to include full roadmap hierarchy
   */
  static getFullIncludes() {
    return [
      {
        model: db.JobPost,
        as: 'targetJob',
        include: [{ model: db.Company, as: 'company' }]
      },
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
    ];
  }

  /**
   * Order clause for full hierarchy
   */
  static getFullOrder() {
    return [
      [{ model: db.RoadmapPhase, as: 'phases' }, 'order', 'ASC'],
      [{ model: db.RoadmapPhase, as: 'phases' }, { model: db.RoadmapMilestone, as: 'milestones' }, 'order', 'ASC'],
      [{ model: db.RoadmapPhase, as: 'phases' }, { model: db.RoadmapMilestone, as: 'milestones' }, { model: db.RoadmapTask, as: 'tasks' }, 'order', 'ASC']
    ];
  }

  /**
   * Generate a new AI career learning roadmap
   */
  static async generateRoadmap(userId, payload) {
    const target_job_id = payload.target_job_id || payload.job_post_id;
    const target_role = payload.target_role ? String(payload.target_role).trim() : null;
    let target_type = payload.target_type;
    if (!target_type) {
      if (target_role) {
        target_type = 'role';
      } else if (target_job_id) {
        target_type = 'job';
      } else {
        target_type = 'role';
      }
    }
    const notes = payload.notes;

    // 1. Validate candidate profile exists
    const candidateProfile = await db.CandidateProfile.findOne({
      where: { user_id: userId },
      include: [
        { model: db.CareerPreference, as: 'careerPreference' },
        {
          model: db.CandidateSkill,
          as: 'candidateSkills',
          include: [{ model: db.Skill, as: 'skill' }]
        }
      ]
    });

    if (!candidateProfile) {
      throw new ValidationError('Candidate profile required before creating a career roadmap.');
    }

    let job = null;
    let missingSkills = [];

    if (target_type === 'job') {
      if (!target_job_id) {
        throw new ValidationError('target_job_id is required when target_type is job.');
      }
      job = await db.JobPost.findByPk(target_job_id, {
        include: [
          { model: db.Company, as: 'company' },
          {
            model: db.JobSkill,
            as: 'jobSkills',
            include: [{ model: db.Skill, as: 'skill' }]
          }
        ]
      });

      if (!job) {
        throw new NotFoundError('Target job post not found.');
      }

      // Calculate skill gap report from MatchEngine
      const matchReport = await MatchEngineService.calculateMatch(userId, target_job_id);
      missingSkills = Array.isArray(matchReport.missing_skills) ? matchReport.missing_skills : [];
    } else {
      if (!target_role || !target_role.trim()) {
        throw new ValidationError('target_role is required when target_type is role.');
      }
    }

    // 2. Generate roadmap structure via AI adapter / deterministic fallback
    const generated = await AiRoadmapService.generate({
      target_type,
      target_role: target_role ? target_role.trim() : null,
      job,
      missingSkills,
      candidateSkills: candidateProfile.candidateSkills || []
    });

    // 3. Persist Roadmap and hierarchy within a transaction
    const transaction = await db.sequelize.transaction();

    try {
      const roadmap = await db.Roadmap.create({
        user_id: userId,
        target_type,
        target_role: target_type === 'role' ? target_role.trim() : null,
        target_job_id: target_type === 'job' ? target_job_id : null,
        title: generated.title,
        description: generated.description,
        rationale: generated.rationale,
        status: 'in_progress',
        progress: 0.00,
        generation_version: 1,
        metadata: {
          notes: notes || null,
          generated_at: new Date().toISOString()
        }
      }, { transaction });

      // Create phases, milestones, and tasks
      for (const phaseData of (generated.phases || [])) {
        const phase = await db.RoadmapPhase.create({
          roadmap_id: roadmap.id,
          title: phaseData.title,
          description: phaseData.description,
          order: phaseData.order,
          status: phaseData.status || 'pending'
        }, { transaction });

        for (const milestoneData of (phaseData.milestones || [])) {
          const milestone = await db.RoadmapMilestone.create({
            roadmap_phase_id: phase.id,
            title: milestoneData.title,
            description: milestoneData.description,
            order: milestoneData.order,
            status: milestoneData.status || 'pending',
            target_skill_id: milestoneData.target_skill_id || null
          }, { transaction });

          for (const taskData of (milestoneData.tasks || [])) {
            await db.RoadmapTask.create({
              roadmap_milestone_id: milestone.id,
              title: taskData.title,
              description: taskData.description,
              order: taskData.order,
              status: taskData.status || 'pending',
              weight: taskData.weight || 1
            }, { transaction });
          }
        }
      }

      await transaction.commit();

      // Fetch and return the fully populated roadmap
      return await this.getRoadmap(roadmap.id, userId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Get single roadmap by ID with full hierarchy and ownership verification
   */
  static async getRoadmap(roadmapId, userId, { isAdmin = false } = {}) {
    const roadmap = await db.Roadmap.findByPk(roadmapId, {
      include: this.getFullIncludes(),
      order: this.getFullOrder()
    });

    if (!roadmap) {
      throw new NotFoundError('Career roadmap not found.');
    }

    if (!isAdmin && Number(roadmap.user_id) !== Number(userId)) {
      throw new ForbiddenError('You do not have permission to access this roadmap.');
    }

    return roadmap;
  }

  /**
   * List candidate's roadmaps
   */
  static async listUserRoadmaps(userId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 15));
    const offset = (page - 1) * limit;

    const where = { user_id: userId };
    if (query.status) {
      where.status = query.status;
    }

    const { count, rows } = await db.Roadmap.findAndCountAll({
      where,
      include: [
        {
          model: db.JobPost,
          as: 'targetJob',
          include: [{ model: db.Company, as: 'company' }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      roadmaps: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Mark a roadmap task as completed and recalculate weighted progress
   */
  static async completeTask(taskId, userId, payload = {}) {
    const task = await db.RoadmapTask.findByPk(taskId, {
      include: [
        {
          model: db.RoadmapMilestone,
          as: 'milestone',
          include: [
            {
              model: db.RoadmapPhase,
              as: 'phase',
              include: [
                {
                  model: db.Roadmap,
                  as: 'roadmap'
                }
              ]
            }
          ]
        }
      ]
    });

    if (!task) {
      throw new NotFoundError('Roadmap task not found.');
    }

    const roadmap = task.milestone?.phase?.roadmap;
    if (!roadmap) {
      throw new NotFoundError('Associated roadmap not found.');
    }

    if (Number(roadmap.user_id) !== Number(userId)) {
      throw new ForbiddenError('You do not have permission to modify this roadmap task.');
    }

    // Update task
    task.status = 'completed';
    if (payload.evidence !== undefined) task.evidence = payload.evidence;
    if (payload.notes !== undefined) task.notes = payload.notes;
    task.completed_at = new Date();
    await task.save();

    // Award task XP into roadmap achievement metadata
    const taskWeight = Number(task.weight || 1);
    const xpToAward = payload.xp ? Number(payload.xp) : (taskWeight * 25);

    let metadata = {};
    try {
      metadata = typeof roadmap.metadata === 'string' ? JSON.parse(roadmap.metadata) : (roadmap.metadata || {});
    } catch {
      metadata = {};
    }
    const currentRoadmapXp = Number(metadata.earned_xp !== undefined ? metadata.earned_xp : (metadata.xp !== undefined ? metadata.xp : 0));
    const newRoadmapXp = currentRoadmapXp + xpToAward;
    metadata.earned_xp = newRoadmapXp;
    metadata.xp = newRoadmapXp;

    const history = Array.isArray(metadata.xp_history) ? [...metadata.xp_history] : [];
    history.push({
      amount: xpToAward,
      reason: `Completed task: ${task.title || 'Roadmap task'}`,
      task_id: Number(task.id),
      awarded_at: new Date().toISOString()
    });
    metadata.xp_history = history;
    roadmap.metadata = metadata;
    await roadmap.save();

    // Recalculate roadmap progress and hierarchy statuses
    const updatedRoadmap = await this.recalculateRoadmapProgress(roadmap.id);

    return {
      roadmap: updatedRoadmap,
      task,
      xp_earned: xpToAward,
      current_roadmap_xp: newRoadmapXp
    };
  }


  /**
   * Recalculate progress for a roadmap
   */
  static async recalculateRoadmapProgress(roadmapId) {
    const roadmap = await db.Roadmap.findByPk(roadmapId, {
      include: [
        {
          model: db.RoadmapPhase,
          as: 'phases',
          include: [
            {
              model: db.RoadmapMilestone,
              as: 'milestones',
              include: [
                { model: db.RoadmapTask, as: 'tasks' }
              ]
            }
          ]
        }
      ]
    });

    if (!roadmap) return null;

    let totalWeight = 0;
    let completedWeight = 0;

    for (const phase of (roadmap.phases || [])) {
      let phaseAllMilestonesCompleted = true;
      let phaseAnyMilestoneActive = false;

      for (const milestone of (phase.milestones || [])) {
        let milestoneAllTasksCompleted = true;
        let milestoneAnyTaskActive = false;

        for (const task of (milestone.tasks || [])) {
          const w = Number(task.weight || 1);
          totalWeight += w;
          if (task.status === 'completed') {
            completedWeight += w;
            milestoneAnyTaskActive = true;
          } else if (task.status === 'in_progress') {
            milestoneAllTasksCompleted = false;
            milestoneAnyTaskActive = true;
          } else {
            milestoneAllTasksCompleted = false;
          }
        }

        // Update milestone status if tasks exist
        if (milestone.tasks && milestone.tasks.length > 0) {
          if (milestoneAllTasksCompleted) {
            milestone.status = 'completed';
          } else if (milestoneAnyTaskActive) {
            milestone.status = 'in_progress';
          }
          await milestone.save();
        }

        if (milestone.status === 'completed') {
          phaseAnyMilestoneActive = true;
        } else if (milestone.status === 'in_progress') {
          phaseAllMilestonesCompleted = false;
          phaseAnyMilestoneActive = true;
        } else {
          phaseAllMilestonesCompleted = false;
        }
      }

      // Update phase status if milestones exist
      if (phase.milestones && phase.milestones.length > 0) {
        if (phaseAllMilestonesCompleted) {
          phase.status = 'completed';
        } else if (phaseAnyMilestoneActive) {
          phase.status = 'in_progress';
        }
        await phase.save();
      }
    }

    const calculatedProgress = totalWeight > 0
      ? Number(Math.min(100, (completedWeight / totalWeight) * 100).toFixed(2))
      : 0.00;

    roadmap.progress = calculatedProgress;
    if (calculatedProgress >= 100) {
      roadmap.status = 'completed';
    } else if (calculatedProgress > 0 && roadmap.status === 'pending') {
      roadmap.status = 'in_progress';
    }

    await roadmap.save();
    return roadmap;
  }

  /**
   * Dynamic refresh: re-evaluates candidate skills against roadmap goal
   * and creates a versioned updated roadmap preserving completed history
   */
  static async refreshRoadmap(roadmapId, userId, payload = {}) {
    const currentRoadmap = await this.getRoadmap(roadmapId, userId);

    const target_type = payload.target_type || currentRoadmap.target_type;
    const target_role = payload.target_role || currentRoadmap.target_role;
    const target_job_id = payload.target_job_id || currentRoadmap.target_job_id;

    // Fetch candidate skills
    const candidateProfile = await db.CandidateProfile.findOne({
      where: { user_id: userId },
      include: [
        {
          model: db.CandidateSkill,
          as: 'candidateSkills',
          include: [{ model: db.Skill, as: 'skill' }]
        }
      ]
    });

    const candidateSkills = candidateProfile ? (candidateProfile.candidateSkills || []) : [];

    // Analyze reasons
    const reasons = [];
    const newSkillNames = candidateSkills.map(cs => cs.skill ? cs.skill.name : '').filter(Boolean);
    if (newSkillNames.length > 0) {
      reasons.push(`Detected current candidate skills: ${newSkillNames.slice(0, 3).join(', ')}`);
    }
    reasons.push('Re-aligned milestone priorities based on updated candidate profile');

    let job = null;
    let missingSkills = [];

    if (target_type === 'job' && target_job_id) {
      job = await db.JobPost.findByPk(target_job_id, {
        include: [{ model: db.Company, as: 'company' }]
      });
      const matchReport = await MatchEngineService.calculateMatch(userId, target_job_id, { forceRefresh: true });
      missingSkills = Array.isArray(matchReport.missing_skills) ? matchReport.missing_skills : [];
    }

    // Generate refreshed roadmap
    const generated = await AiRoadmapService.generate({
      target_type,
      target_role: target_role ? target_role.trim() : null,
      job,
      missingSkills,
      candidateSkills
    });

    const newVersion = Number(currentRoadmap.generation_version || 1) + 1;

    const transaction = await db.sequelize.transaction();
    try {
      // 1. Archive current roadmap
      currentRoadmap.status = 'archived';
      await currentRoadmap.save({ transaction });

      // 2. Create refreshed version
      const newRoadmap = await db.Roadmap.create({
        user_id: userId,
        target_type,
        target_role: target_type === 'role' ? target_role : null,
        target_job_id: target_type === 'job' ? target_job_id : null,
        title: generated.title,
        description: generated.description,
        rationale: generated.rationale,
        status: 'in_progress',
        progress: 0.00,
        generation_version: newVersion,
        previous_roadmap_id: currentRoadmap.id,
        metadata: {
          refreshed_from: currentRoadmap.id,
          refreshed_at: new Date().toISOString(),
          reasons
        }
      }, { transaction });

      // 3. Populate phases, milestones, tasks
      for (const phaseData of (generated.phases || [])) {
        const phase = await db.RoadmapPhase.create({
          roadmap_id: newRoadmap.id,
          title: phaseData.title,
          description: phaseData.description,
          order: phaseData.order,
          status: phaseData.status || 'pending'
        }, { transaction });

        for (const milestoneData of (phaseData.milestones || [])) {
          const milestone = await db.RoadmapMilestone.create({
            roadmap_phase_id: phase.id,
            title: milestoneData.title,
            description: milestoneData.description,
            order: milestoneData.order,
            status: milestoneData.status || 'pending',
            target_skill_id: milestoneData.target_skill_id || null
          }, { transaction });

          for (const taskData of (milestoneData.tasks || [])) {
            await db.RoadmapTask.create({
              roadmap_milestone_id: milestone.id,
              title: taskData.title,
              description: taskData.description,
              order: taskData.order,
              status: taskData.status || 'pending',
              weight: taskData.weight || 1
            }, { transaction });
          }
        }
      }

      await transaction.commit();

      const freshNewRoadmap = await this.getRoadmap(newRoadmap.id, userId);

      return {
        roadmap: freshNewRoadmap,
        reasons
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Calculate leveling metrics, thresholds, and titles for gamified roadmaps
   */
  static calculateLevel(totalXp = 0) {
    const xp = Math.max(0, Number(totalXp) || 0);
    let level = 1;
    let threshold = 100;
    let step = 150;

    while (xp >= threshold) {
      level++;
      threshold += step;
      step += 50;
    }

    const prevThreshold = threshold - step + 50;
    const xpInLevel = Math.max(0, xp - prevThreshold);
    const xpForNext = threshold - prevThreshold;
    const toNext = Math.max(0, threshold - xp);
    const progressPct = Math.min(100, Number(((xpInLevel / xpForNext) * 100).toFixed(1)));

    const titles = [
      'Beginner Explorer',
      'Skill Builder',
      'Knowledge Seeker',
      'Career Climber',
      'Roadmap Achiever',
      'Advanced Practitioner',
      'Domain Specialist',
      'Master Strategist'
    ];
    const title = titles[Math.min(level - 1, titles.length - 1)];

    return {
      level,
      title,
      total_xp: xp,
      current_level_xp: xpInLevel,
      next_level_xp: threshold,
      xp_to_next_level: toNext,
      progress_percentage: progressPct
    };
  }

  /**
   * Retrieve total XP, level metrics, and roadmap achievement breakdown for a user
   */
  static async getUserXp(userId, options = {}) {
    // 1. Fetch user roadmaps
    const roadmaps = await db.Roadmap.findAll({
      where: { user_id: userId },
      include: [
        {
          model: db.RoadmapPhase,
          as: 'phases',
          include: [
            {
              model: db.RoadmapMilestone,
              as: 'milestones',
              include: [{ model: db.RoadmapTask, as: 'tasks' }]
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    let cumulativeRoadmapXp = 0;
    const roadmapSummaries = [];
    let recentHistory = [];

    for (const r of roadmaps) {
      let metadata = {};
      try {
        metadata = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {});
      } catch {
        metadata = {};
      }

      // Calculate tasks and weights
      let completedTasksCount = 0;
      let totalTasksCount = 0;
      let calculatedTaskXp = 0;
      let totalPossibleXp = 0;

      for (const phase of (r.phases || [])) {
        for (const milestone of (phase.milestones || [])) {
          for (const task of (milestone.tasks || [])) {
            totalTasksCount++;
            const w = Number(task.weight || 1);
            const taskXpVal = w * 25;
            totalPossibleXp += taskXpVal;
            if (task.status === 'completed') {
              completedTasksCount++;
              calculatedTaskXp += taskXpVal;
            }
          }
        }
      }

      totalPossibleXp += 100;
      if (r.status === 'completed') {
        calculatedTaskXp += 100;
      }

      const explicitXp = Number(metadata.earned_xp !== undefined ? metadata.earned_xp : (metadata.xp !== undefined ? metadata.xp : null));
      const earnedXp = explicitXp !== null ? explicitXp : calculatedTaskXp;
      cumulativeRoadmapXp += earnedXp;

      const history = Array.isArray(metadata.xp_history) ? metadata.xp_history : [];
      if (history.length > 0) {
        recentHistory = recentHistory.concat(
          history.map(h => ({
            ...h,
            roadmap_id: Number(r.id),
            roadmap_title: r.title
          }))
        );
      }

      roadmapSummaries.push({
        id: Number(r.id),
        title: r.title,
        status: r.status,
        progress: Number(parseFloat(r.progress || 0).toFixed(2)),
        earned_xp: earnedXp,
        target_xp: Math.max(earnedXp, totalPossibleXp),
        tasks_completed: completedTasksCount,
        total_tasks: totalTasksCount
      });
    }

    recentHistory.sort((a, b) => new Date(b.awarded_at || 0) - new Date(a.awarded_at || 0));

    // Also check CandidateProfile if xp is stored directly
    let profileXp = 0;
    try {
      const candidateProfile = await db.CandidateProfile.findOne({
        where: { user_id: userId }
      });
      if (candidateProfile && candidateProfile.xp !== undefined) {
        profileXp = Number(candidateProfile.xp) || 0;
      }
    } catch {
      profileXp = 0;
    }

    const finalTotalXp = Math.max(cumulativeRoadmapXp, profileXp);
    const levelInfo = this.calculateLevel(finalTotalXp);
    const activeRoadmap = roadmapSummaries.find(r => r.status === 'in_progress') || roadmapSummaries[0] || null;

    return {
      user_id: Number(userId),
      total_xp: finalTotalXp,
      level: levelInfo.level,
      level_title: levelInfo.title,
      level_info: levelInfo,
      active_roadmap: activeRoadmap,
      roadmaps: roadmapSummaries,
      recent_achievements: recentHistory.slice(0, 10)
    };
  }

  /**
   * Retrieve XP metrics for a specific roadmap
   */
  static async getRoadmapXp(roadmapId, userId, options = {}) {
    const roadmap = await db.Roadmap.findByPk(roadmapId, {
      include: [
        {
          model: db.RoadmapPhase,
          as: 'phases',
          include: [
            {
              model: db.RoadmapMilestone,
              as: 'milestones',
              include: [{ model: db.RoadmapTask, as: 'tasks' }]
            }
          ]
        }
      ]
    });

    if (!roadmap) {
      throw new NotFoundError('Roadmap not found.');
    }

    const isAdmin = options.isAdmin || false;
    if (!isAdmin && Number(roadmap.user_id) !== Number(userId)) {
      throw new ForbiddenError('You do not have access to this roadmap.');
    }

    let metadata = {};
    try {
      metadata = typeof roadmap.metadata === 'string' ? JSON.parse(roadmap.metadata) : (roadmap.metadata || {});
    } catch {
      metadata = {};
    }

    let completedTasksCount = 0;
    let totalTasksCount = 0;
    let calculatedTaskXp = 0;
    let totalPossibleXp = 0;

    for (const phase of (roadmap.phases || [])) {
      for (const milestone of (phase.milestones || [])) {
        for (const task of (milestone.tasks || [])) {
          totalTasksCount++;
          const w = Number(task.weight || 1);
          const taskXpVal = w * 25;
          totalPossibleXp += taskXpVal;
          if (task.status === 'completed') {
            completedTasksCount++;
            calculatedTaskXp += taskXpVal;
          }
        }
      }
    }

    totalPossibleXp += 100;
    if (roadmap.status === 'completed') {
      calculatedTaskXp += 100;
    }

    const explicitXp = Number(metadata.earned_xp !== undefined ? metadata.earned_xp : (metadata.xp !== undefined ? metadata.xp : null));
    const earnedXp = explicitXp !== null ? explicitXp : calculatedTaskXp;
    const history = Array.isArray(metadata.xp_history) ? metadata.xp_history : [];

    const userXpSummary = await this.getUserXp(roadmap.user_id);

    return {
      roadmap_id: Number(roadmap.id),
      roadmap_title: roadmap.title,
      status: roadmap.status,
      progress: Number(parseFloat(roadmap.progress || 0).toFixed(2)),
      earned_xp: earnedXp,
      target_xp: Math.max(earnedXp, totalPossibleXp),
      tasks_completed: completedTasksCount,
      total_tasks: totalTasksCount,
      history,
      user_level: userXpSummary.level_info
    };
  }

  /**
   * Add / award XP for a user to achieve their roadmap
   */
  static async addXp(userId, payload) {
    const xpToAdd = Number(payload.xp);
    if (!xpToAdd || xpToAdd <= 0) {
      throw new ValidationError('XP amount must be a positive integer.');
    }

    let roadmapId = payload.roadmap_id;
    let roadmap = null;

    if (roadmapId) {
      roadmap = await db.Roadmap.findByPk(roadmapId);
      if (!roadmap) {
        throw new NotFoundError('Specified roadmap not found.');
      }
      if (Number(roadmap.user_id) !== Number(userId)) {
        throw new ForbiddenError('You do not have permission to add XP to this roadmap.');
      }
    } else {
      // Find active or latest roadmap for this user
      roadmap = await db.Roadmap.findOne({
        where: { user_id: userId, status: 'in_progress' },
        order: [['updated_at', 'DESC']]
      });
      if (!roadmap) {
        roadmap = await db.Roadmap.findOne({
          where: { user_id: userId },
          order: [['updated_at', 'DESC']]
        });
      }
      if (!roadmap) {
        throw new NotFoundError('No roadmap found for candidate. Please generate a roadmap first.');
      }
    }

    // Get current total XP before adding
    const prevUserXp = await this.getUserXp(userId);
    const prevLevelInfo = prevUserXp.level_info;

    // Update roadmap metadata
    let metadata = {};
    try {
      metadata = typeof roadmap.metadata === 'string' ? JSON.parse(roadmap.metadata) : (roadmap.metadata || {});
    } catch {
      metadata = {};
    }

    const currentRoadmapXp = Number(metadata.earned_xp !== undefined ? metadata.earned_xp : (metadata.xp !== undefined ? metadata.xp : 0));
    const newRoadmapXp = currentRoadmapXp + xpToAdd;

    metadata.earned_xp = newRoadmapXp;
    metadata.xp = newRoadmapXp;

    const history = Array.isArray(metadata.xp_history) ? [...metadata.xp_history] : [];
    const awardRecord = {
      amount: xpToAdd,
      reason: payload.reason ? String(payload.reason).trim() : 'Roadmap achievement',
      task_id: payload.task_id ? Number(payload.task_id) : null,
      milestone_id: payload.milestone_id ? Number(payload.milestone_id) : null,
      awarded_at: new Date().toISOString()
    };
    history.push(awardRecord);
    metadata.xp_history = history;

    roadmap.metadata = metadata;
    await roadmap.save();

    // Also update CandidateProfile if present and has xp field
    try {
      const candidateProfile = await db.CandidateProfile.findOne({
        where: { user_id: userId }
      });
      if (candidateProfile && candidateProfile.xp !== undefined) {
        candidateProfile.xp = (Number(candidateProfile.xp) || 0) + xpToAdd;
        await candidateProfile.save();
      }
    } catch {
      // ignore if column not present
    }

    // Calculate new leveling
    const newUserXp = await this.getUserXp(userId);
    const newLevelInfo = newUserXp.level_info;
    const leveledUp = newLevelInfo.level > prevLevelInfo.level;

    return {
      xp_added: xpToAdd,
      earned_xp: newRoadmapXp,
      roadmap_id: Number(roadmap.id),
      roadmap_title: roadmap.title,
      reason: awardRecord.reason,
      level_info: newLevelInfo,
      leveled_up: leveledUp,
      previous_level: prevLevelInfo.level,
      new_level: newLevelInfo.level
    };
  }
}

module.exports = RoadmapService;

