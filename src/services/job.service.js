const { Op } = require('sequelize');
const db = require('../models');
const { NotFoundError, ValidationError } = require('../utils/errors');
const candidateProfileService = require('./candidateProfile.service');

class JobService {
  /**
   * List jobs feed with filters, search, and pagination
   */
  async listJobs(query = {}, candidateUserId = null) {
    const {
      search,
      sort = 'newest',
      company_id,
      is_verified_company,
      job_type,
      work_mode,
      employment_type,
      experience_level,
      country,
      state,
      city,
      application_method,
      required_skill_ids,
      preferred_skill_ids,
      page = 1,
      per_page = 15
    } = query;

    const where = {
      is_active: true,
      [Op.or]: [
        { expires_at: null },
        { expires_at: { [Op.gt]: new Date() } }
      ]
    };

    if (company_id) {
      where.company_id = company_id;
    }
    if (job_type) {
      where.job_type = job_type;
    }
    if (work_mode) {
      where.work_mode = work_mode;
    }
    if (employment_type) {
      where.employment_type = employment_type;
    }
    if (experience_level) {
      where.experience_level = experience_level;
    }
    if (country) {
      where.country = country;
    }
    if (state) {
      where.state = state;
    }
    if (city) {
      where.city = city;
    }
    if (application_method) {
      where.application_method = application_method;
    }

    if (search) {
      const trimmed = search.trim();
      const matchingCompanies = await db.Company.findAll({
        attributes: ['id'],
        where: { name: { [Op.like]: `%${trimmed}%` } },
        raw: true
      });
      const matchingCompanyIds = matchingCompanies.map(c => c.id);

      const searchConditions = [
        { title: { [Op.like]: `%${trimmed}%` } },
        { canonical_role: { [Op.like]: `%${trimmed}%` } },
        { description: { [Op.like]: `%${trimmed}%` } }
      ];

      if (matchingCompanyIds.length > 0) {
        searchConditions.push({ company_id: { [Op.in]: matchingCompanyIds } });
      }

      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({ [Op.or]: searchConditions });
    }

    const companyWhere = {};
    if (is_verified_company !== undefined) {
      companyWhere.is_verified = is_verified_company;
    }

    // Normalize required skill ids
    const normalizedReqSkillIds = required_skill_ids
      ? (Array.isArray(required_skill_ids)
          ? required_skill_ids.map(Number)
          : String(required_skill_ids).split(',').map(s => Number(s.trim())).filter(n => !isNaN(n)))
      : [];

    if (normalizedReqSkillIds.length > 0) {
      const matchingJobIds = await db.JobSkill.findAll({
        attributes: ['job_post_id'],
        where: {
          is_required: true,
          skill_id: { [Op.in]: normalizedReqSkillIds }
        },
        raw: true
      });
      const jobIds = matchingJobIds.map(m => m.job_post_id);
      where.id = { [Op.in]: jobIds.length > 0 ? jobIds : [0] };
    }

    // Normalize preferred skill ids
    const normalizedPrefSkillIds = preferred_skill_ids
      ? (Array.isArray(preferred_skill_ids)
          ? preferred_skill_ids.map(Number)
          : String(preferred_skill_ids).split(',').map(s => Number(s.trim())).filter(n => !isNaN(n)))
      : [];

    if (normalizedPrefSkillIds.length > 0) {
      const matchingJobIds = await db.JobSkill.findAll({
        attributes: ['job_post_id'],
        where: {
          is_required: false,
          skill_id: { [Op.in]: normalizedPrefSkillIds }
        },
        raw: true
      });
      const jobIds = matchingJobIds.map(m => m.job_post_id);
      const safeJobIds = jobIds.length > 0 ? jobIds : [0];
      if (where.id) {
        where.id = { [Op.and]: [where.id, { [Op.in]: safeJobIds }] };
      } else {
        where.id = { [Op.in]: safeJobIds };
      }
    }

    let order = [['published_at', 'DESC'], ['id', 'DESC']];
    if (sort === 'relevance') {
      order = [['published_at', 'DESC']];
    }

    const limit = Number(per_page);
    const offset = (Number(page) - 1) * limit;

    const { rows, count } = await db.JobPost.findAndCountAll({
      where,
      include: [
        {
          model: db.Company,
          as: 'company',
          where: Object.keys(companyWhere).length > 0 ? companyWhere : undefined
        },
        {
          model: db.JobSkill,
          as: 'jobSkills',
          include: [{ model: db.Skill, as: 'skill' }]
        }
      ],
      order,
      distinct: true,
      limit,
      offset
    });

    // Check saved status if candidate is logged in
    const savedJobIds = new Set();
    if (candidateUserId) {
      const profile = await candidateProfileService.getOrCreateProfile(candidateUserId);
      const saved = await db.SavedJob.findAll({
        where: { candidate_profile_id: profile.id },
        attributes: ['job_post_id']
      });
      saved.forEach(s => savedJobIds.add(Number(s.job_post_id)));
    }

    return {
      rows,
      count,
      page: Number(page),
      perPage: limit,
      savedJobIds
    };
  }

  /**
   * List jobs for admin dashboard (shows all jobs, including inactive/expired unless explicitly filtered)
   */
  async adminListJobs(query = {}) {
    const {
      search,
      sort = 'newest',
      company_id,
      is_active,
      job_type,
      work_mode,
      employment_type,
      experience_level,
      country,
      state,
      city,
      application_method,
      required_skill_ids,
      page = 1,
      per_page = 15
    } = query;

    const where = {};

    if (is_active !== undefined) {
      if (typeof is_active === 'string') {
        where.is_active = is_active === 'true' || is_active === '1';
      } else {
        where.is_active = Boolean(is_active);
      }
    }

    if (company_id) {
      where.company_id = company_id;
    }
    if (job_type) {
      where.job_type = job_type;
    }
    if (work_mode) {
      where.work_mode = work_mode;
    }
    if (employment_type) {
      where.employment_type = employment_type;
    }
    if (experience_level) {
      where.experience_level = experience_level;
    }
    if (country) {
      where.country = country;
    }
    if (state) {
      where.state = state;
    }
    if (city) {
      where.city = city;
    }
    if (application_method) {
      where.application_method = application_method;
    }

    const searchTerm = (search || query.q || '').trim();
    if (searchTerm) {
      const matchingCompanies = await db.Company.findAll({
        attributes: ['id'],
        where: { name: { [Op.like]: `%${searchTerm}%` } },
        raw: true
      });
      const matchingCompanyIds = matchingCompanies.map(c => c.id);

      const searchConditions = [
        { title: { [Op.like]: `%${searchTerm}%` } },
        { canonical_role: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } }
      ];

      if (matchingCompanyIds.length > 0) {
        searchConditions.push({ company_id: { [Op.in]: matchingCompanyIds } });
      }

      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({ [Op.or]: searchConditions });
    }

    const normalizedReqSkillIds = required_skill_ids
      ? (Array.isArray(required_skill_ids)
          ? required_skill_ids.map(Number)
          : String(required_skill_ids).split(',').map(s => Number(s.trim())).filter(n => !isNaN(n)))
      : [];

    if (normalizedReqSkillIds.length > 0) {
      const matchingJobIds = await db.JobSkill.findAll({
        attributes: ['job_post_id'],
        where: {
          is_required: true,
          skill_id: { [Op.in]: normalizedReqSkillIds }
        },
        raw: true
      });
      const jobIds = matchingJobIds.map(m => m.job_post_id);
      where.id = { [Op.in]: jobIds.length > 0 ? jobIds : [0] };
    }

    let order = [['created_at', 'DESC'], ['id', 'DESC']];
    if (sort === 'published_at') {
      order = [['published_at', 'DESC'], ['id', 'DESC']];
    }

    const limit = Number(query.limit || per_page || 15);
    const offset = (Number(page) - 1) * limit;

    const { rows, count } = await db.JobPost.findAndCountAll({
      where,
      include: [
        {
          model: db.Company,
          as: 'company'
        },
        {
          model: db.JobSkill,
          as: 'jobSkills',
          include: [{ model: db.Skill, as: 'skill' }]
        }
      ],
      order,
      distinct: true,
      limit,
      offset
    });

    return {
      rows,
      count,
      page: Number(page),
      perPage: limit,
      savedJobIds: new Set()
    };
  }

  /**
   * Get single job post details
   */
  async getJob(jobId, candidateUserId = null) {
    const job = await db.JobPost.findByPk(jobId, {
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
      throw new NotFoundError('Job post not found.');
    }

    let isSaved = false;
    if (candidateUserId) {
      const profile = await candidateProfileService.getOrCreateProfile(candidateUserId);
      const saved = await db.SavedJob.findOne({
        where: { candidate_profile_id: profile.id, job_post_id: job.id }
      });
      isSaved = Boolean(saved);
    }

    return { job, isSaved };
  }

  /**
   * Save / bookmark a job
   */
  async saveJob(candidateUserId, jobId) {
    const profile = await candidateProfileService.getOrCreateProfile(candidateUserId);
    const job = await db.JobPost.findByPk(jobId);
    if (!job) {
      throw new NotFoundError('Job post not found.');
    }

    await db.SavedJob.findOrCreate({
      where: {
        candidate_profile_id: profile.id,
        job_post_id: job.id
      },
      defaults: {
        candidate_profile_id: profile.id,
        job_post_id: job.id
      }
    });

    return { job_id: Number(jobId), is_saved: true };
  }

  /**
   * Unsave / remove bookmark for a job
   */
  async unsaveJob(candidateUserId, jobId) {
    const profile = await candidateProfileService.getOrCreateProfile(candidateUserId);

    const saved = await db.SavedJob.findOne({
      where: {
        candidate_profile_id: profile.id,
        job_post_id: jobId
      }
    });

    if (saved) {
      await saved.destroy();
    }

    return { job_id: Number(jobId), is_saved: false };
  }

  /**
   * List saved jobs for candidate
   */
  async listSavedJobs(candidateUserId, query = {}) {
    const { page = 1, per_page = 15 } = query;
    const profile = await candidateProfileService.getOrCreateProfile(candidateUserId);

    const limit = Number(per_page);
    const offset = (Number(page) - 1) * limit;

    const { rows: savedRows, count } = await db.SavedJob.findAndCountAll({
      where: { candidate_profile_id: profile.id },
      include: [
        {
          model: db.JobPost,
          as: 'jobPost',
          include: [
            { model: db.Company, as: 'company' },
            {
              model: db.JobSkill,
              as: 'jobSkills',
              include: [{ model: db.Skill, as: 'skill' }]
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    const rows = savedRows.map(s => s.jobPost).filter(Boolean);
    const savedJobIds = new Set(rows.map(j => Number(j.id)));

    return {
      rows,
      count,
      page: Number(page),
      perPage: limit,
      savedJobIds
    };
  }

  /**
   * Admin create job post
   */
  async createJobPost(data) {
    const { required_skills = [], preferred_skills = [], ...jobData } = data;

    const company = await db.Company.findByPk(jobData.company_id);
    if (!company) {
      throw new ValidationError('The specified company does not exist.');
    }

    if (!jobData.published_at) {
      jobData.published_at = new Date();
    }

    const job = await db.JobPost.create(jobData);

    // Create required skills
    const skillsToInsert = [];
    for (const item of required_skills) {
      skillsToInsert.push({
        job_post_id: job.id,
        skill_id: item.skill_id,
        is_required: true,
        importance: item.importance || 3,
        required_level: item.required_level || 'mid-level'
      });
    }

    // Create preferred skills
    for (const item of preferred_skills) {
      skillsToInsert.push({
        job_post_id: job.id,
        skill_id: item.skill_id,
        is_required: false,
        importance: item.importance || 3,
        required_level: item.required_level || 'mid-level'
      });
    }

    if (skillsToInsert.length > 0) {
      await db.JobSkill.bulkCreate(skillsToInsert, { ignoreDuplicates: true });
    }

    return this.getJob(job.id);
  }

  /**
   * Admin update job post
   */
  async updateJobPost(jobId, data) {
    const job = await db.JobPost.findByPk(jobId);
    if (!job) {
      throw new NotFoundError('Job post not found.');
    }

    const { required_skills, preferred_skills, ...jobData } = data;

    Object.assign(job, jobData);
    await job.save();

    if (required_skills !== undefined || preferred_skills !== undefined) {
      await db.JobSkill.destroy({ where: { job_post_id: jobId } });
      const skillsToInsert = [];

      if (Array.isArray(required_skills)) {
        for (const item of required_skills) {
          skillsToInsert.push({
            job_post_id: job.id,
            skill_id: item.skill_id,
            is_required: true,
            importance: item.importance || 3,
            required_level: item.required_level || 'mid-level'
          });
        }
      }

      if (Array.isArray(preferred_skills)) {
        for (const item of preferred_skills) {
          skillsToInsert.push({
            job_post_id: job.id,
            skill_id: item.skill_id,
            is_required: false,
            importance: item.importance || 3,
            required_level: item.required_level || 'mid-level'
          });
        }
      }

      if (skillsToInsert.length > 0) {
        await db.JobSkill.bulkCreate(skillsToInsert, { ignoreDuplicates: true });
      }
    }

    return this.getJob(job.id);
  }

  /**
   * Delete job post
   */
  async deleteJobPost(jobId) {
    const job = await db.JobPost.findByPk(jobId);
    if (!job) {
      throw new NotFoundError('Job post not found.');
    }
    await job.destroy();
    return { success: true };
  }
}

module.exports = new JobService();
