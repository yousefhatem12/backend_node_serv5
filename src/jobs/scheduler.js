const cron = require('node-cron');
const logger = require('../utils/logger');
const config = require('../config/env');

class Scheduler {
  constructor() {
    this.tasks = [];
  }

  init() {
    if (config.env === 'test') {
      return; // Do not run cron schedules during testing
    }

    logger.info('[Scheduler] Initializing cron schedules...');

    // Hourly health and cleanup heartbeat
    const heartbeatTask = cron.schedule('0 * * * *', () => {
      logger.info('[Scheduler] Running hourly system heartbeat.');
    });
    this.tasks.push(heartbeatTask);
  }

  stop() {
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    logger.info('[Scheduler] All scheduled cron tasks stopped.');
  }
}

module.exports = new Scheduler();
