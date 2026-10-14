const db = require('../models');
const { success, error } = require('../utils/response');

class HealthController {
  static async check(req, res, next) {
    try {
      await db.sequelize.authenticate();
      const statusMessage = req.t ? req.t('health.message') : 'SkillMatch API is healthy and operational.';

      return success(res, {
        status: 'healthy',
        message: statusMessage,
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }, 200);
    } catch (err) {
      return error(res, `Health check failed: ${err.message}`, 503);
    }
  }
}

module.exports = HealthController;
