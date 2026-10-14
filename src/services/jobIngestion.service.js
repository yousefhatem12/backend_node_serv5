'use strict';

const { Op } = require('sequelize');
const db = require('../models');
const JobFingerprintService = require('./jobFingerprint.service');
const { NotFoundError, ValidationError } = require('../utils/errors');

class JobIngestionService {
  /**
   * Helper: Resolve JobSource by id or slug
   */
  static async resolveSource(identifier) {
    if (!identifier) return null;
    const isNumeric = !isNaN(identifier) && Number.isInteger(Number(identifier));
    const where = isNumeric ? { id: identifier } : { slug: identifier };
    return await db.JobSource.findOne({ where });
  }

  /**
   * List job sources with filtering and pagination
   */
  static async listSources(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page, 10) || 15));
    const offset = (page - 1) * perPage;

    const where = {};

    if (query.search) {
      const searchTerm = `%${query.search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: searchTerm } },
        { slug: { [Op.like]: searchTerm } }
      ];
    }

    if (query.source_type) {
      where.source_type = query.source_type;
    }

    if (query.collection_method) {
      where.collection_method = query.collection_method;
    }

    if (query.is_active !== undefined) {
      where.is_active = query.is_active === true || query.is_active === 'true' || query.is_active === '1';
    }

    if (query.schedule_enabled !== undefined) {
      where.schedule_enabled = query.schedule_enabled === true || query.schedule_enabled === 'true' || query.schedule_enabled === '1';
    }

    const { count, rows } = await db.JobSource.findAndCountAll({
      where,
      limit: perPage,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      sources: rows,
      pagination: {
        total: count,
        page,
        per_page: perPage,
        total_pages: Math.ceil(count / perPage) || 1
      }
    };
  }

  /**
   * Create a new job source
   */
  static async createSource(data) {
    let slug = data.slug;
    if (!slug && data.name) {
      slug = data.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    // Check unique slug
    const existing = await db.JobSource.findOne({ where: { slug } });
    if (existing) {
      throw new ValidationError('A job source with this slug already exists.', {
        slug: ['A job source with this slug already exists.']
      });
    }

    const source = await db.JobSource.create({
      name: data.name,
      slug,
      source_type: data.source_type || 'scraper',
      collection_method: data.collection_method || 'playwright',
      base_url: data.base_url || null,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      schedule_enabled: data.schedule_enabled !== undefined ? Boolean(data.schedule_enabled) : false,
      schedule_expression: data.schedule_expression || data.schedule_cron || null,
      configuration: data.configuration || null,
      notes: data.notes || null
    });

    return source;
  }

  /**
   * Retrieve job source details with health diagnostics
   */
  static async getSource(identifier) {
    const source = await this.resolveSource(identifier);
    if (!source) {
      throw new NotFoundError('Job source not found.');
    }

    // Calculate diagnostics
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalRuns, runs24h, runs7d] = await Promise.all([
      db.IngestionRun.count({ where: { job_source_id: source.id } }),
      db.IngestionRun.findAll({
        where: {
          job_source_id: source.id,
          created_at: { [Op.gte]: twentyFourHoursAgo }
        }
      }),
      db.IngestionRun.findAll({
        where: {
          job_source_id: source.id,
          created_at: { [Op.gte]: sevenDaysAgo }
        }
      })
    ]);

    let failed24h = 0;
    runs24h.forEach(r => {
      if (r.status === 'failed') failed24h++;
    });
    const errorRate24h = runs24h.length > 0 ? Number(((failed24h / runs24h.length) * 100).toFixed(2)) : 0;

    let jobsCollected7d = 0;
    runs7d.forEach(r => {
      jobsCollected7d += Number(r.jobs_imported || 0);
    });

    const diagnostics = {
      last_run_status: source.last_status || 'never_run',
      error_rate_24h: errorRate24h,
      jobs_collected_last_7d: jobsCollected7d,
      total_runs_count: totalRuns
    };

    return { source, diagnostics };
  }

  /**
   * Update job source
   */
  static async updateSource(identifier, data) {
    const source = await this.resolveSource(identifier);
    if (!source) {
      throw new NotFoundError('Job source not found.');
    }

    if (data.slug && data.slug !== source.slug) {
      const existing = await db.JobSource.findOne({
        where: {
          slug: data.slug,
          id: { [Op.ne]: source.id }
        }
      });
      if (existing) {
        throw new ValidationError('A job source with this slug already exists.', {
          slug: ['A job source with this slug already exists.']
        });
      }
      source.slug = data.slug;
    }

    if (data.name !== undefined) source.name = data.name;
    if (data.source_type !== undefined) source.source_type = data.source_type;
    if (data.collection_method !== undefined) source.collection_method = data.collection_method;
    if (data.base_url !== undefined) source.base_url = data.base_url;
    if (data.is_active !== undefined) source.is_active = Boolean(data.is_active);
    if (data.schedule_enabled !== undefined) source.schedule_enabled = Boolean(data.schedule_enabled);
    if (data.schedule_expression !== undefined) source.schedule_expression = data.schedule_expression;
    if (data.configuration !== undefined) source.configuration = data.configuration;
    if (data.notes !== undefined) source.notes = data.notes;

    await source.save();
    return source;
  }

  /**
   * Delete job source
   */
  static async deleteSource(identifier) {
    const source = await this.resolveSource(identifier);
    if (!source) {
      throw new NotFoundError('Job source not found.');
    }

    await source.destroy();
    return true;
  }

  /**
   * Trigger an ingestion execution run
   */
  static async triggerRun(identifier, { trigger_type = 'manual', items = null } = {}) {
    const source = await this.resolveSource(identifier);
    if (!source) {
      throw new NotFoundError('Job source not found.');
    }

    // Create IngestionRun record
    const run = await db.IngestionRun.create({
      job_source_id: source.id,
      trigger_type: trigger_type || 'manual',
      status: 'in_progress',
      started_at: new Date()
    });

    try {
      // Determine items to ingest
      let rawItems = items;
      if (!Array.isArray(rawItems)) {
        if (source.configuration && Array.isArray(source.configuration.sample_jobs)) {
          rawItems = source.configuration.sample_jobs;
        } else {
          rawItems = [];
        }
      }

      let jobsImported = 0;
      let duplicatesCount = 0;
      let errorsCount = 0;

      for (const item of rawItems) {
        try {
          const title = item.title || 'Untitled Vacancy';
          const companyName = item.company_name || item.company || 'Unknown Company';
          const description = item.description || 'No description provided.';
          const externalId = item.external_id ? String(item.external_id) : null;
          const sourceUrl = item.source_url || item.url || source.base_url || null;
          const employmentType = item.employment_type || 'full-time';
          const workMode = item.work_mode || (item.is_remote ? 'remote' : 'on-site');
          const country = item.country || 'Egypt';
          const city = item.city || 'Cairo';
          const publishedAt = item.published_at ? new Date(item.published_at) : new Date();

          // Generate deterministic vacancy fingerprint
          const fingerprint = JobFingerprintService.generate({
            companyIdentifier: companyName,
            title,
            location: [city, country].filter(Boolean).join(' '),
            country,
            city,
            workMode,
            employmentType,
            publicationDate: publishedAt
          });

          // Check for existing duplicates:
          // 1. By fingerprint among unique raw jobs
          // 2. By external_id for the same source
          let isDuplicate = false;

          const duplicateCandidate = await db.RawJob.findOne({
            where: {
              [Op.or]: [
                {
                  content_fingerprint: fingerprint,
                  deduplication_status: 'unique'
                },
                ...(externalId ? [{
                  job_source_id: source.id,
                  external_id: externalId
                }] : [])
              ]
            }
          });

          if (duplicateCandidate) {
            isDuplicate = true;
          }

          if (isDuplicate) {
            duplicatesCount++;
            await db.RawJob.create({
              job_source_id: source.id,
              ingestion_run_id: run.id,
              external_id: externalId,
              source_url: sourceUrl,
              raw_payload: item,
              content_fingerprint: fingerprint,
              extraction_status: 'processed',
              deduplication_status: 'duplicate',
              job_post_id: duplicateCandidate ? duplicateCandidate.job_post_id : null
            });
          } else {
            // Unique vacancy -> Resolve / create company & create JobPost
            const normCompanyName = companyName.trim().toLowerCase();

            let company = await db.Company.findOne({
              where: {
                [Op.or]: [
                  { normalized_name: normCompanyName },
                  { name: companyName.trim() }
                ]
              }
            });

            if (!company) {
              const alias = await db.CompanyAlias.findOne({
                where: { normalized_alias: normCompanyName },
                include: [{ model: db.Company, as: 'company' }]
              });
              if (alias && alias.company) {
                company = alias.company;
              }
            }

            if (!company) {
              company = await db.Company.create({
                name: companyName.trim(),
                normalized_name: normCompanyName,
                country: country || 'Egypt',
                city: city || 'Cairo',
                is_verified: false,
                is_active: true
              });
            }

            // Create normalized JobPost
            const jobPost = await db.JobPost.create({
              company_id: company.id,
              title,
              description,
              canonical_role: item.canonical_role || null,
              job_type: item.job_type === 'internship' ? 'internship' : 'job',
              employment_type: ['full-time', 'part-time', 'contract'].includes(employmentType) ? employmentType : 'full-time',
              work_mode: ['remote', 'hybrid', 'on-site'].includes(workMode) ? workMode : 'on-site',
              experience_level: ['entry', 'mid-level', 'senior', 'lead'].includes(item.experience_level) ? item.experience_level : 'mid-level',
              country,
              city,
              salary_min: item.salary_min ? parseFloat(item.salary_min) : null,
              salary_max: item.salary_max ? parseFloat(item.salary_max) : null,
              salary_currency: item.salary_currency || 'EGP',
              source: 'scraped',
              source_url: sourceUrl,
              application_method: item.application_method === 'internal' ? 'internal' : 'external',
              external_apply_url: item.external_apply_url || sourceUrl,
              published_at: publishedAt,
              is_active: true
            });

            // Extract and attach skills if present
            if (Array.isArray(item.skills) && item.skills.length > 0) {
              for (const skillName of item.skills) {
                if (typeof skillName === 'string' && skillName.trim()) {
                  const normSkill = skillName.trim().toLowerCase();
                  let skill = await db.Skill.findOne({
                    where: { normalized_name: normSkill }
                  });
                  if (!skill) {
                    skill = await db.Skill.create({
                      name: skillName.trim(),
                      normalized_name: normSkill
                    });
                  }
                  await db.JobSkill.findOrCreate({
                    where: {
                      job_post_id: jobPost.id,
                      skill_id: skill.id
                    },
                    defaults: {
                      is_required: true,
                      importance: 3
                    }
                  });
                }
              }
            }

            // Create RawJob entry linking to created JobPost
            await db.RawJob.create({
              job_source_id: source.id,
              ingestion_run_id: run.id,
              external_id: externalId,
              source_url: sourceUrl,
              raw_payload: item,
              content_fingerprint: fingerprint,
              extraction_status: 'processed',
              deduplication_status: 'unique',
              job_post_id: jobPost.id
            });

            jobsImported++;
          }
        } catch (itemErr) {
          errorsCount++;
          // Still record the failed raw job if possible
          try {
            await db.RawJob.create({
              job_source_id: source.id,
              ingestion_run_id: run.id,
              external_id: item.external_id ? String(item.external_id) : null,
              source_url: item.source_url || null,
              raw_payload: item,
              content_fingerprint: JobFingerprintService.generate({
                companyIdentifier: item.company || 'Unknown',
                title: item.title || 'Unknown',
                location: 'Unknown'
              }),
              extraction_status: 'failed',
              deduplication_status: 'unique',
              error_message: itemErr.message
            });
          } catch (_) {}
        }
      }

      // Finish run
      run.status = 'completed';
      run.jobs_found = rawItems.length;
      run.jobs_imported = jobsImported;
      run.duplicates_count = duplicatesCount;
      run.errors_count = errorsCount;
      run.finished_at = new Date();
      await run.save();

      // Update source metrics
      source.last_run_at = new Date();
      source.last_status = 'completed';

      // Update overall source error rate
      const allRuns = await db.IngestionRun.findAll({
        where: { job_source_id: source.id }
      });
      const failedCount = allRuns.filter(r => r.status === 'failed').length;
      source.error_rate = allRuns.length > 0 ? Number(((failedCount / allRuns.length) * 100).toFixed(2)) : 0;
      await source.save();

      return run;
    } catch (runErr) {
      run.status = 'failed';
      run.finished_at = new Date();
      run.error_message = runErr.message;
      await run.save();

      source.last_run_at = new Date();
      source.last_status = 'failed';
      await source.save();

      throw runErr;
    }
  }

  /**
   * List ingestion runs with filtering and pagination
   */
  static async listRuns(query = {}, sourceIdentifier = null) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page, 10) || 15));
    const offset = (page - 1) * perPage;

    const where = {};

    if (sourceIdentifier) {
      const source = await this.resolveSource(sourceIdentifier);
      if (!source) {
        throw new NotFoundError('Job source not found.');
      }
      where.job_source_id = source.id;
    } else if (query.job_source_id) {
      where.job_source_id = query.job_source_id;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.trigger_type) {
      where.trigger_type = query.trigger_type;
    }

    const { count, rows } = await db.IngestionRun.findAndCountAll({
      where,
      include: [
        {
          model: db.JobSource,
          as: 'jobSource',
          attributes: ['id', 'name', 'slug', 'source_type']
        }
      ],
      limit: perPage,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      runs: rows,
      pagination: {
        total: count,
        page,
        per_page: perPage,
        total_pages: Math.ceil(count / perPage) || 1
      }
    };
  }

  /**
   * List raw jobs with filtering and pagination
   */
  static async listRawJobs(query = {}, sourceIdentifier = null) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page, 10) || 15));
    const offset = (page - 1) * perPage;

    const where = {};

    if (sourceIdentifier) {
      const source = await this.resolveSource(sourceIdentifier);
      if (!source) {
        throw new NotFoundError('Job source not found.');
      }
      where.job_source_id = source.id;
    } else if (query.job_source_id) {
      where.job_source_id = query.job_source_id;
    }

    if (query.ingestion_run_id) {
      where.ingestion_run_id = query.ingestion_run_id;
    }

    if (query.extraction_status) {
      where.extraction_status = query.extraction_status;
    }

    if (query.deduplication_status) {
      where.deduplication_status = query.deduplication_status;
    }

    const { count, rows } = await db.RawJob.findAndCountAll({
      where,
      include: [
        {
          model: db.JobSource,
          as: 'jobSource',
          attributes: ['id', 'name', 'slug']
        },
        {
          model: db.JobPost,
          as: 'jobPost',
          attributes: ['id', 'title', 'company_id']
        }
      ],
      limit: perPage,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      rawJobs: rows,
      pagination: {
        total: count,
        page,
        per_page: perPage,
        total_pages: Math.ceil(count / perPage) || 1
      }
    };
  }

  /**
   * Get raw job by ID
   */
  static async getRawJob(rawJobId, sourceIdentifier = null) {
    const rawJob = await db.RawJob.findByPk(rawJobId, {
      include: [
        {
          model: db.JobSource,
          as: 'jobSource',
          attributes: ['id', 'name', 'slug']
        },
        {
          model: db.JobPost,
          as: 'jobPost',
          attributes: ['id', 'title', 'company_id']
        }
      ]
    });

    if (!rawJob) {
      throw new NotFoundError('Raw job not found.');
    }

    if (sourceIdentifier) {
      const source = await this.resolveSource(sourceIdentifier);
      if (!source || rawJob.job_source_id !== source.id) {
        throw new NotFoundError('Raw job does not belong to this source.');
      }
    }

    return rawJob;
  }
}

module.exports = JobIngestionService;
