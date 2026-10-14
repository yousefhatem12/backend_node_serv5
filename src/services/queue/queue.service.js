const db = require('../../models');
const logger = require('../../utils/logger');
const { QUEUE_JOB_STATUSES } = require('../../config/constants');

class QueueService {
  /**
   * Dispatch a new job to the queue table
   * @param {string} name - Registered job handler name (e.g. 'cv.parse', 'ingestion.run')
   * @param {object} payload - Job payload data
   * @param {object} options - Optional queue, delaySeconds, maxAttempts
   */
  async dispatch(name, payload = {}, options = {}) {
    const queue = options.queue || 'default';
    const delaySeconds = options.delaySeconds || 0;
    const maxAttempts = options.maxAttempts || 3;
    const availableAt = new Date(Date.now() + delaySeconds * 1000);

    const job = await db.QueueJob.create({
      queue,
      name,
      payload,
      max_attempts: maxAttempts,
      status: QUEUE_JOB_STATUSES.PENDING,
      available_at: availableAt
    });

    logger.debug(`[Queue] Job dispatched: ${name} (ID: ${job.id})`);
    return job;
  }
}

module.exports = new QueueService();
