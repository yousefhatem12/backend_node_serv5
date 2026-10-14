'use strict';

const RoadmapService = require('../services/roadmap.service');
const RoadmapResource = require('../resources/roadmap.resource');
const { paginated, buildPaginationMeta } = require('../utils/response');

class RoadmapController {
  /**
   * POST /api/roadmaps
   * Generate an AI career roadmap
   */
  static async generate(req, res, next) {
    try {
      const roadmap = await RoadmapService.generateRoadmap(req.user.id, req.body);
      return res.status(201).json({
        status: 'success',
        message: 'Career roadmap generated successfully.',
        data: RoadmapResource.toArray(roadmap)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/roadmaps/:roadmap
   * Retrieve full roadmap details with phases, milestones, and tasks
   */
  static async getById(req, res, next) {
    try {
      const roadmapId = req.params.roadmap;
      const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
      const roadmap = await RoadmapService.getRoadmap(roadmapId, req.user.id, { isAdmin });

      return res.status(200).json({
        status: 'success',
        data: RoadmapResource.toArray(roadmap)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/roadmaps
   * List candidate's roadmaps
   */
  static async list(req, res, next) {
    try {
      const result = await RoadmapService.listUserRoadmaps(req.user.id, req.query);
      const baseUrl = req.get ? `${req.protocol}://${req.get('host')}/api/roadmaps` : '/api/roadmaps';
      const { meta, links } = buildPaginationMeta(
        result.total,
        result.page,
        result.limit,
        baseUrl
      );

      return paginated(res, RoadmapResource.collection(result.roadmaps), meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/roadmaps/:roadmap/refresh
   * Dynamic refresh: re-evaluates skills and regenerates versioned roadmap
   */
  static async refresh(req, res, next) {
    try {
      const roadmapId = req.params.roadmap;
      const { roadmap: newRoadmap, reasons } = await RoadmapService.refreshRoadmap(
        roadmapId,
        req.user.id,
        req.body
      );

      return res.status(200).json({
        status: 'success',
        message: 'Roadmap refreshed successfully.',
        data: {
          id: Number(newRoadmap.id),
          previous_roadmap_id: Number(newRoadmap.previous_roadmap_id),
          title: newRoadmap.title,
          status: newRoadmap.status,
          generation_version: Number(newRoadmap.generation_version)
        },
        meta: {
          refreshed: true,
          reasons
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/roadmap-tasks/:roadmapTask/complete
   * Mark a learning task completed and recalculate weighted progress
   */
  static async completeTask(req, res, next) {
    try {
      const taskId = req.params.roadmapTask;
      const { roadmap, task, xp_earned, current_roadmap_xp } = await RoadmapService.completeTask(
        taskId,
        req.user.id,
        req.body
      );

      return res.status(200).json({
        status: 'success',
        message: 'Roadmap task marked as completed.',
        data: {
          id: Number(roadmap.id),
          task_id: Number(task.id),
          status: task.status,
          progress: Number(parseFloat(roadmap.progress || 0).toFixed(2)),
          xp_earned: xp_earned || 0,
          current_roadmap_xp: current_roadmap_xp || 0
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/roadmaps/xp or GET /api/candidate/xp
   * Retrieve candidate roadmap XP, levels, and achievement status
   */
  static async getXp(req, res, next) {
    try {
      if (req.query && req.query.roadmap_id) {
        const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
        const data = await RoadmapService.getRoadmapXp(req.query.roadmap_id, req.user.id, { isAdmin });
        return res.status(200).json({
          status: 'success',
          data
        });
      }

      const data = await RoadmapService.getUserXp(req.user.id);
      return res.status(200).json({
        status: 'success',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/roadmaps/:roadmap/xp
   * Retrieve XP metrics and history for a specific roadmap
   */
  static async getRoadmapXp(req, res, next) {
    try {
      const roadmapId = req.params.roadmap;
      const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
      const data = await RoadmapService.getRoadmapXp(roadmapId, req.user.id, { isAdmin });

      return res.status(200).json({
        status: 'success',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/roadmaps/xp or PATCH /api/candidate/xp
   * Add / award XP for the user to achieve their roadmap
   */
  static async addXp(req, res, next) {
    try {
      const result = await RoadmapService.addXp(req.user.id, req.body);

      return res.status(200).json({
        status: 'success',
        message: 'XP awarded successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/roadmaps/:roadmap/xp
   * Add / award XP for a specific roadmap
   */
  static async addRoadmapXp(req, res, next) {
    try {
      const roadmapId = req.params.roadmap;
      const result = await RoadmapService.addXp(req.user.id, {
        ...req.body,
        roadmap_id: roadmapId
      });

      return res.status(200).json({
        status: 'success',
        message: 'XP awarded successfully for roadmap.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = RoadmapController;

