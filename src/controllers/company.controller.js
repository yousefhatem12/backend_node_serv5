const companyService = require('../services/company.service');
const CompanyResource = require('../resources/company.resource');
const { success, paginated, buildPaginationMeta } = require('../utils/response');

class CompanyController {
  /**
   * GET /api/admin/companies
   */
  static async adminList(req, res, next) {
    try {
      const result = await companyService.listCompanies(req.query);
      const { meta, links } = buildPaginationMeta(
        result.count,
        result.page,
        result.perPage,
        `${req.protocol}://${req.get('host')}/api/admin/companies`
      );
      return paginated(res, CompanyResource.collection(result.rows), meta, links);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/companies
   */
  static async adminCreate(req, res, next) {
    try {
      const company = await companyService.createCompany(req.body);
      return res.status(201).json({
        data: CompanyResource.toArray(company)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/companies/:company
   */
  static async adminShow(req, res, next) {
    try {
      const company = await companyService.getCompany(req.params.company);
      return success(res, CompanyResource.toArray(company));
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/admin/companies/:company
   */
  static async adminUpdate(req, res, next) {
    try {
      const company = await companyService.updateCompany(req.params.company, req.body);
      return success(res, CompanyResource.toArray(company));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/companies/:sourceCompany/merge
   */
  static async adminMerge(req, res, next) {
    try {
      const { target_company_id } = req.body;
      const result = await companyService.mergeCompanies(req.params.sourceCompany, target_company_id);
      return res.status(200).json({
        data: CompanyResource.toArray(result.targetCompany),
        meta: {
          reassigned_jobs_count: result.reassigned_jobs_count,
          merged_source_id: result.merged_source_id
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CompanyController;
