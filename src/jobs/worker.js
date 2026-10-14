const { Op } = require('sequelize');
const db = require('../models');
const logger = require('../utils/logger');
const { QUEUE_JOB_STATUSES } = require('../config/constants');

class JobWorker {
  constructor() {
    this.handlers = new Map();
    this.isRunning = false;
    this.timer = null;
    this.pollingIntervalMs = 2000;
  }

  /**
   * Register a job handler function
   * @param {string} name - Handler key
   * @param {Function} handler - Async function(payload, job)
   */
  register(name, handler) {
    this.handlers.set(name, handler);
  }

  /**
   * Process a single available job
   */
  async processNext() {
    const now = new Date();

    // Find and lock the next pending job atomically
    const transaction = await db.sequelize.transaction();
    let job = null;

    try {
      job = await db.QueueJob.findOne({
        where: {
          status: QUEUE_JOB_STATUSES.PENDING,
          available_at: { [Op.lte]: now }
        },
        order: [['available_at', 'ASC'], ['id', 'ASC']],
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!job) {
        await transaction.commit();
        return false;
      }

      job.status = QUEUE_JOB_STATUSES.PROCESSING;
      job.reserved_at = now;
      job.attempts += 1;
      await job.save({ transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      logger.error('[Worker] Error acquiring job: %s', err.message);
      return false;
    }

    // Execute job outside transaction
    const handler = this.handlers.get(job.name);
    if (!handler) {
      logger.warn(`[Worker] No handler registered for job: ${job.name} (ID: ${job.id})`);
      job.status = QUEUE_JOB_STATUSES.FAILED;
      job.error = `No handler registered for ${job.name}`;
      await job.save();
      return true;
    }

    try {
      logger.info(`[Worker] Running job: ${job.name} (ID: ${job.id}, Attempt: ${job.attempts})`);
      await handler(job.payload, job);
      job.status = QUEUE_JOB_STATUSES.COMPLETED;
      job.error = null;
      await job.save();
      logger.info(`[Worker] Job completed: ${job.name} (ID: ${job.id})`);
    } catch (err) {
      logger.error(`[Worker] Job failed: ${job.name} (ID: ${job.id}): %s`, err.message);
      job.error = err.stack || err.message;

      if (job.attempts >= job.max_attempts) {
        job.status = QUEUE_JOB_STATUSES.FAILED;
      } else {
        // Exponential backoff: 5s, 20s, 45s...
        const backoffSeconds = Math.pow(job.attempts, 2) * 5;
        job.status = QUEUE_JOB_STATUSES.PENDING;
        job.available_at = new Date(Date.now() + backoffSeconds * 1000);
        job.reserved_at = null;
      }
      await job.save();
    }

    return true;
  }

  /**
   * Start the worker polling loop
   */
  start(intervalMs = 2000) {
    if (this.isRunning) return;
    this.pollingIntervalMs = intervalMs;
    this.isRunning = true;
    logger.info('[Worker] Background job worker started.');

    const loop = async () => {
      if (!this.isRunning) return;
      try {
        await this.processNext();
      } catch (err) {
        logger.error('[Worker] Unexpected worker loop error: %s', err.message);
      } finally {
        if (this.isRunning) {
          this.timer = setTimeout(loop, this.pollingIntervalMs);
        }
      }
    };

    this.timer = setTimeout(loop, 500);
  }

  /**
   * Stop the worker loop
   */
  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info('[Worker] Background job worker stopped.');
  }
}

const workerInstance = new JobWorker();

// Register built-in job handlers
const cvParsingHandler = require('./handlers/cvParsing.handler');
workerInstance.register('cv_parsing', cvParsingHandler);

module.exports = workerInstance;
