const { Op } = require('sequelize');
const db = require('../models');
const { NotFoundError, ValidationError } = require('../utils/errors');

class CompanyService {
  /**
   * List companies with filtering and pagination
   */
  async listCompanies(query = {}) {
    const {
      search,
      is_verified,
      is_active,
      industry,
      country,
      page = 1,
      per_page = 15
    } = query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { normalized_name: { [Op.like]: `%${search.toLowerCase()}%` } },
        { industry: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } }
      ];
    }

    if (is_verified !== undefined) {
      where.is_verified = is_verified;
    }
    if (is_active !== undefined) {
      where.is_active = is_active;
    }
    if (industry) {
      where.industry = industry;
    }
    if (country) {
      where.country = country;
    }

    const limit = Number(per_page);
    const offset = (Number(page) - 1) * limit;

    const { rows, count } = await db.Company.findAndCountAll({
      where,
      include: [
        { model: db.CompanyAlias, as: 'aliases' },
        { model: db.JobPost, as: 'jobPosts', attributes: ['id'] }
      ],
      order: [['name', 'ASC']],
      distinct: true,
      limit,
      offset
    });

    return {
      rows,
      count,
      page: Number(page),
      perPage: limit
    };
  }

  /**
   * Get single company by ID
   */
  async getCompany(companyId) {
    const company = await db.Company.findByPk(companyId, {
      include: [
        { model: db.CompanyAlias, as: 'aliases' },
        { model: db.JobPost, as: 'jobPosts', attributes: ['id'] }
      ]
    });

    if (!company) {
      throw new NotFoundError('Company not found.');
    }

    return company;
  }

  /**
   * Create new company
   */
  async createCompany(data) {
    const trimmed = data.name.trim();
    const normalized = trimmed.toLowerCase();

    const existing = await db.Company.findOne({
      where: { normalized_name: normalized }
    });

    if (existing) {
      throw new ValidationError('A company with this name already exists.');
    }

    return db.Company.create({
      ...data,
      name: trimmed,
      normalized_name: normalized
    });
  }

  /**
   * Update company
   */
  async updateCompany(companyId, data) {
    const company = await db.Company.findByPk(companyId);
    if (!company) {
      throw new NotFoundError('Company not found.');
    }

    if (data.name) {
      const normalized = data.name.trim().toLowerCase();
      const existing = await db.Company.findOne({
        where: {
          normalized_name: normalized,
          id: { [Op.ne]: companyId }
        }
      });
      if (existing) {
        throw new ValidationError('A company with this name already exists.');
      }
      company.name = data.name.trim();
      company.normalized_name = normalized;
    }

    Object.assign(company, data);
    await company.save();

    return this.getCompany(companyId);
  }

  /**
   * Merge source company into target company
   */
  async mergeCompanies(sourceCompanyId, targetCompanyId) {
    if (Number(sourceCompanyId) === Number(targetCompanyId)) {
      throw new ValidationError('Cannot merge a company into itself.');
    }

    const source = await db.Company.findByPk(sourceCompanyId);
    if (!source) {
      throw new NotFoundError('Source company not found.');
    }

    const target = await db.Company.findByPk(targetCompanyId);
    if (!target) {
      throw new NotFoundError('Target company not found.');
    }

    let reassignedJobsCount = 0;

    await db.sequelize.transaction(async (t) => {
      // 1. Reassign job posts
      const [affected] = await db.JobPost.update(
        { company_id: target.id },
        { where: { company_id: source.id }, transaction: t }
      );
      reassignedJobsCount = affected;

      // 2. Reassign aliases
      await db.CompanyAlias.update(
        { company_id: target.id },
        { where: { company_id: source.id }, transaction: t }
      );

      // 3. Create alias for source company's name pointing to target
      const existingAlias = await db.CompanyAlias.findOne({
        where: { normalized_alias: source.normalized_name },
        transaction: t
      });

      if (!existingAlias) {
        await db.CompanyAlias.create({
          company_id: target.id,
          alias: source.name,
          normalized_alias: source.normalized_name
        }, { transaction: t });
      }

      // 4. Delete source company
      await source.destroy({ transaction: t });
    });

    const refreshedTarget = await this.getCompany(target.id);
    return {
      targetCompany: refreshedTarget,
      reassigned_jobs_count: reassignedJobsCount,
      merged_source_id: Number(sourceCompanyId)
    };
  }

  /**
   * Verify company
   */
  async verifyCompany(companyId, actorId = null, req = null) {
    let company = null;
    if (!isNaN(companyId)) {
      company = await db.Company.findByPk(companyId);
    }
    if (!company) {
      company = await db.Company.findOne({
        where: {
          [db.Sequelize.Op.or]: [
            { id: isNaN(companyId) ? 0 : Number(companyId) },
            { name: String(companyId) },
            { normalized_name: String(companyId).toLowerCase().trim() }
          ]
        }
      });
    }
    if (!company) {
      throw new NotFoundError('Company not found.');
    }

    const oldVerified = company.is_verified;
    company.is_verified = true;
    await company.save();

    if (actorId) {
      try {
        const AuditLogService = require('./auditLog.service');
        await AuditLogService.logAction({
          actorId,
          action: 'company.verify',
          entityType: 'company',
          entityId: company.id,
          oldValues: { is_verified: oldVerified },
          newValues: { is_verified: true },
          req
        });
      } catch (_) {}
    }

    return this.getCompany(company.id);
  }

  /**
   * Reject company verification
   */
  async rejectCompany(companyId, reason = null, actorId = null, req = null) {
    let company = null;
    if (!isNaN(companyId)) {
      company = await db.Company.findByPk(companyId);
    }
    if (!company) {
      company = await db.Company.findOne({
        where: {
          [db.Sequelize.Op.or]: [
            { id: isNaN(companyId) ? 0 : Number(companyId) },
            { name: String(companyId) },
            { normalized_name: String(companyId).toLowerCase().trim() }
          ]
        }
      });
    }
    if (!company) {
      throw new NotFoundError('Company not found.');
    }

    const oldVerified = company.is_verified;
    company.is_verified = false;
    await company.save();

    if (actorId) {
      try {
        const AuditLogService = require('./auditLog.service');
        await AuditLogService.logAction({
          actorId,
          action: 'company.reject',
          entityType: 'company',
          entityId: company.id,
          oldValues: { is_verified: oldVerified },
          newValues: { is_verified: false, reason },
          req
        });
      } catch (_) {}
    }

    return this.getCompany(company.id);
  }
}

module.exports = new CompanyService();
