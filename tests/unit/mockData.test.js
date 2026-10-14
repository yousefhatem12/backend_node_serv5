'use strict';

const mockSeeder = require('../../src/seeders/20261015000005-seed-mock-jobs-and-matching-notifications');
const NotificationResource = require('../../src/resources/notification.resource');
const JobPostResource = require('../../src/resources/jobPost.resource');

describe('Mock Data - Jobs & Matching Notifications Unit Tests', () => {
  let mockQueryInterface;
  let insertedTables;

  beforeEach(() => {
    insertedTables = {};
    mockQueryInterface = {
      bulkInsert: jest.fn(async (table, rows) => {
        insertedTables[table] = rows;
        return rows;
      }),
      bulkDelete: jest.fn(async (table, where) => {
        delete insertedTables[table];
        return true;
      })
    };
  });

  describe('1. Seeder Structure & Lifecycle', () => {
    it('should export up and down functions', () => {
      expect(typeof mockSeeder.up).toBe('function');
      expect(typeof mockSeeder.down).toBe('function');
    });

    it('should execute up and seed all required entities', async () => {
      await mockSeeder.up(mockQueryInterface);

      expect(mockQueryInterface.bulkInsert).toHaveBeenCalledWith('companies', expect.any(Array), { ignoreDuplicates: true });
      expect(mockQueryInterface.bulkInsert).toHaveBeenCalledWith('company_aliases', expect.any(Array), { ignoreDuplicates: true });
      expect(mockQueryInterface.bulkInsert).toHaveBeenCalledWith('job_posts', expect.any(Array), { ignoreDuplicates: true });
      expect(mockQueryInterface.bulkInsert).toHaveBeenCalledWith('job_skills', expect.any(Array), { ignoreDuplicates: true });
      expect(mockQueryInterface.bulkInsert).toHaveBeenCalledWith('job_matches', expect.any(Array), { ignoreDuplicates: true });
      expect(mockQueryInterface.bulkInsert).toHaveBeenCalledWith('notifications', expect.any(Array), { ignoreDuplicates: true });
    });

    it('should execute down and clean up seeded entities', async () => {
      await mockSeeder.down(mockQueryInterface);

      expect(mockQueryInterface.bulkDelete).toHaveBeenCalledWith('notifications', expect.any(Object), {});
      expect(mockQueryInterface.bulkDelete).toHaveBeenCalledWith('job_matches', expect.any(Object), {});
      expect(mockQueryInterface.bulkDelete).toHaveBeenCalledWith('job_skills', expect.any(Object), {});
      expect(mockQueryInterface.bulkDelete).toHaveBeenCalledWith('job_posts', expect.any(Object), {});
      expect(mockQueryInterface.bulkDelete).toHaveBeenCalledWith('company_aliases', expect.any(Object), {});
      expect(mockQueryInterface.bulkDelete).toHaveBeenCalledWith('companies', expect.any(Object), {});
    });
  });

  describe('2. Mock Jobs Data Quality', () => {
    beforeEach(async () => {
      await mockSeeder.up(mockQueryInterface);
    });

    it('should seed at least 8 realistic tech jobs across multiple levels and work modes', () => {
      const jobs = insertedTables['job_posts'];
      expect(jobs.length).toBeGreaterThanOrEqual(8);

      const titles = jobs.map(j => j.title);
      expect(titles).toContain('Senior DevOps & Cloud Platform Engineer');
      expect(titles).toContain('Lead Node.js Microservices Architect');
      expect(titles).toContain('Python & AI Computer Vision Specialist');
      expect(titles).toContain('Frontend React & Next.js Engineer');

      // Verify work modes and experience levels
      const workModes = new Set(jobs.map(j => j.work_mode));
      expect(workModes.has('remote')).toBe(true);
      expect(workModes.has('hybrid')).toBe(true);
      expect(workModes.has('on-site')).toBe(true);

      jobs.forEach(job => {
        expect(job.title).toBeTruthy();
        expect(job.description).toBeTruthy();
        expect(job.company_id).toBeGreaterThan(0);
        expect(job.salary_min).toBeGreaterThan(0);
        expect(job.salary_max).toBeGreaterThanOrEqual(job.salary_min);
        expect(job.salary_currency).toBe('EGP');
        expect(job.is_active).toBe(true);
      });
    });

    it('should seed associated required and optional skills for every job', () => {
      const jobSkills = insertedTables['job_skills'];
      expect(jobSkills.length).toBeGreaterThanOrEqual(15);

      const jobIds = new Set(insertedTables['job_posts'].map(j => j.id));
      jobSkills.forEach(js => {
        expect(jobIds.has(js.job_post_id)).toBe(true);
        expect(js.skill_id).toBeGreaterThan(0);
        expect(typeof js.is_required).toBe('boolean');
        expect(js.importance).toBeGreaterThanOrEqual(1);
      });
    });

    it('should format jobs cleanly with JobPostResource', () => {
      const sampleJob = insertedTables['job_posts'][0];
      const transformed = JobPostResource.toArray(sampleJob);

      expect(transformed.id).toBe(Number(sampleJob.id));
      expect(transformed.title).toBe(sampleJob.title);
      expect(transformed.work_mode).toBe(sampleJob.work_mode);
      expect(transformed.salary_min).toBe(sampleJob.salary_min);
      expect(transformed.salary_max).toBe(sampleJob.salary_max);
    });
  });

  describe('3. Mock "Hello in Matchin" Notifications Quality', () => {
    beforeEach(async () => {
      await mockSeeder.up(mockQueryInterface);
    });

    it('should seed multiple notifications featuring "hello" and matching context', () => {
      const notifications = insertedTables['notifications'];
      expect(notifications.length).toBeGreaterThanOrEqual(7);

      notifications.forEach(notif => {
        expect(notif.user_id).toBeDefined();
        expect(notif.type).toBe('job_match');

        // Check for greeting "hello" in either title or body (case-insensitive)
        const combined = `${notif.title} ${notif.body}`.toLowerCase();
        expect(combined).toMatch(/hello/i);
        expect(combined).toMatch(/match/i);

        // Verify valid JSON data payload
        expect(notif.data).toBeDefined();
        const parsedData = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
        expect(typeof parsedData).toBe('object');
        expect(parsedData).not.toBeNull();
        expect(parsedData.match_score || parsedData.top_job_id || parsedData.job_post_id).toBeDefined();
      });
    });

    it('should target both candidate users Ahmed (3) and Sara (4)', () => {
      const notifications = insertedTables['notifications'];
      const userIds = new Set(notifications.map(n => n.user_id));

      expect(userIds.has(3)).toBe(true);
      expect(userIds.has(4)).toBe(true);
    });

    it('should transform mock notifications correctly with NotificationResource', () => {
      const sampleNotification = insertedTables['notifications'][0];
      const modelLike = {
        ...sampleNotification,
        data: JSON.parse(sampleNotification.data)
      };

      const transformed = NotificationResource.toArray(modelLike);
      expect(transformed.id).toBe(Number(sampleNotification.id));
      expect(transformed.title).toBe(sampleNotification.title);
      expect(transformed.body).toBe(sampleNotification.body);
      expect(transformed.type).toBe('job_match');
      expect(transformed.data).toHaveProperty('job_post_id', 5);
      expect(transformed.data).toHaveProperty('match_score', 95.0);
    });

    it('should seed corresponding explainable JobMatch records in database', () => {
      const matches = insertedTables['job_matches'];
      expect(matches.length).toBeGreaterThanOrEqual(4);

      matches.forEach(m => {
        expect(m.match_score).toBeGreaterThanOrEqual(85.0);
        expect(['good', 'strong']).toContain(m.match_level);
        expect(JSON.parse(m.matched_skills)).toBeInstanceOf(Array);
        expect(m.explanation).toBeTruthy();
      });
    });
  });
});
