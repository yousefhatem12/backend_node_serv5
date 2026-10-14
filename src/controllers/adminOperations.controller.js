'use strict';

const AdminOperationsService = require('../services/adminOperations.service');
const AuditLogService = require('../services/auditLog.service');
const AdminUserResource = require('../resources/adminUser.resource');
const AuditLogResource = require('../resources/auditLog.resource');
const { success, actionSuccess, paginated, buildPaginationMeta } = require('../utils/response');

class AdminOperationsController {
  /**
   * GET /api/admin/users
   */
  static async listUsers(req, res, next) {
    try {
      const result = await AdminOperationsService.listUsers(req.query);
      const baseUrl = `${req.protocol}://${req.get('host')}/api/admin/users`;
      const { meta, links } = buildPaginationMeta(result.total, result.page, result.limit, baseUrl);
      return paginated(res, AdminUserResource.collection(result.users), meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/users/:user
   */
  static async showUser(req, res, next) {
    try {
      const user = await AdminOperationsService.getUser(req.params.user);
      return success(res, AdminUserResource.toArray(user));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/users
   */
  static async createUser(req, res, next) {
    try {
      const user = await AdminOperationsService.createUser(req.body, req.user.id, req);
      return actionSuccess(res, 'User created successfully.', AdminUserResource.toArray(user), 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH / PUT /api/admin/users/:user
   */
  static async updateUser(req, res, next) {
    try {
      const user = await AdminOperationsService.updateUser(
        req.params.user,
        req.user.id,
        req.body,
        req
      );
      return actionSuccess(res, 'User updated successfully.', AdminUserResource.toArray(user), 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/admin/users/:user/status
   */
  static async updateUserStatus(req, res, next) {
    try {
      const user = await AdminOperationsService.updateUserStatus(
        req.params.user,
        req.user.id,
        req.body,
        req
      );
      return actionSuccess(res, 'User status updated successfully.', AdminUserResource.toArray(user));
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/admin/users/:user/role
   */
  static async updateUserRole(req, res, next) {
    try {
      const user = await AdminOperationsService.updateUserRole(
        req.params.user,
        req.user.id,
        req.body,
        req
      );
      return actionSuccess(res, 'User role updated successfully.', AdminUserResource.toArray(user));
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/admin/users/:user
   * Accessible by admin and super_admin
   */
  static async deleteUser(req, res, next) {
    try {
      const userId = req.params.user || req.params.id || req.params.userId;
      const result = await AdminOperationsService.deleteUser(
        userId,
        req.user?.id,
        req
      );
      return actionSuccess(res, 'User deleted successfully.', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/audit-logs
   */
  static async listAuditLogs(req, res, next) {
    try {
      const result = await AuditLogService.listLogs(req.query);
      const baseUrl = `${req.protocol}://${req.get('host')}/api/admin/audit-logs`;
      const { meta, links } = buildPaginationMeta(result.total, result.page, result.limit, baseUrl);
      return paginated(res, AuditLogResource.collection(result.logs), meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/statistics
   * GET /api/admin/stats
   * GET /api/admin/dashboard
   */
  static async getStatistics(req, res, next) {
    try {
      const stats = await AdminOperationsService.getStatistics();
      return success(res, stats);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/stats
   */
  static async getStats(req, res, next) {
    try {
      const stats = await AdminOperationsService.getStatistics();
      return success(res, stats);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/moderation/merge-duplicates
   */
  static async mergeDuplicates(req, res, next) {
    try {
      const result = await AdminOperationsService.mergeDuplicates(
        req.body,
        req.user?.id,
        req
      );
      return actionSuccess(res, 'Duplicate listing merged successfully.', result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminOperationsController;
