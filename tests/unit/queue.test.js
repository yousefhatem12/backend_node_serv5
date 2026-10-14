const db = require('../../src/models');
const queueService = require('../../src/services/queue/queue.service');
const worker = require('../../src/jobs/worker');
const { QUEUE_JOB_STATUSES } = require('../../src/config/constants');

const mockJobsStore = new Map();
let mockNextId = 1;

jest.mock('../../src/models', () => {
  const { QUEUE_JOB_STATUSES } = require('../../src/config/constants');
  return {
    sequelize: {
      authenticate: jest.fn().mockResolvedValue(true),
      close: jest.fn().mockResolvedValue(true),
      transaction: jest.fn().mockResolvedValue({
        LOCK: { UPDATE: 'UPDATE' },
        commit: jest.fn().mockResolvedValue(true),
        rollback: jest.fn().mockResolvedValue(true)
      })
    },
    QueueJob: {
      destroy: jest.fn().mockImplementation(async () => {
        mockJobsStore.clear();
      }),
      create: jest.fn().mockImplementation(async (data) => {
        const job = {
          id: mockNextId++,
          attempts: 0,
          error: null,
          status: QUEUE_JOB_STATUSES.PENDING,
          ...data,
          save: jest.fn().mockImplementation(async function () {
            mockJobsStore.set(this.id, this);
            return this;
          })
        };
        mockJobsStore.set(job.id, job);
        return job;
      }),
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        for (const job of mockJobsStore.values()) {
          if (where.name && job.name === where.name) return job;
          if (where.status && job.status === where.status) return job;
        }
        return null;
      }),
      findByPk: jest.fn().mockImplementation(async (id) => mockJobsStore.get(Number(id)) || null)
    }
  };
});

describe('Database-backed Queue & Worker Unit Tests', () => {
  beforeAll(async () => {
    await db.sequelize.authenticate();
    await db.QueueJob.destroy({ where: {}, truncate: true });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  test('queueService.dispatch() stores job record in database', async () => {
    const job = await queueService.dispatch('test.job', { foo: 'bar' });
    expect(job).toBeDefined();
    expect(job.id).toBeDefined();
    expect(job.name).toBe('test.job');
    expect(job.payload).toEqual({ foo: 'bar' });
    expect(job.status).toBe(QUEUE_JOB_STATUSES.PENDING);
    expect(job.attempts).toBe(0);
  });

  test('worker processes job successfully when handler is registered', async () => {
    let executedPayload = null;

    worker.register('test.job', async (payload) => {
      executedPayload = payload;
    });

    const processed = await worker.processNext();
    expect(processed).toBe(true);
    expect(executedPayload).toEqual({ foo: 'bar' });

    const updatedJob = await db.QueueJob.findOne({ where: { name: 'test.job' } });
    expect(updatedJob.status).toBe(QUEUE_JOB_STATUSES.COMPLETED);
    expect(updatedJob.attempts).toBe(1);
    expect(updatedJob.error).toBeNull();
  });

  test('worker retries and marks failed when handler errors out', async () => {
    const job = await queueService.dispatch('failing.job', { retry: true }, { maxAttempts: 1 });

    worker.register('failing.job', async () => {
      throw new Error('Simulated processing failure');
    });

    const processed = await worker.processNext();
    expect(processed).toBe(true);

    const reloaded = await db.QueueJob.findByPk(job.id);
    expect(reloaded.status).toBe(QUEUE_JOB_STATUSES.FAILED);
    expect(reloaded.attempts).toBe(1);
    expect(reloaded.error).toContain('Simulated processing failure');
  });
});
