const companyService = require('../services/company.service');
const CompanyResource = require('../resources/company.resource');
const { success, actionSuccess, paginated, buildPaginationMeta } = require('../utils/response');

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

  /**
   * POST/PATCH /api/admin/companies/:company/verify
   */
  static async adminVerify(req, res, next) {
    try {
      const companyId = req.params.company || req.params.id || req.params.companyId;
      const company = await companyService.verifyCompany(companyId, req.user?.id, req);
      return actionSuccess(res, 'Company verified successfully.', CompanyResource.toArray(company));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST/PATCH /api/admin/companies/:company/reject
   */
  static async adminReject(req, res, next) {
    try {
      const companyId = req.params.company || req.params.id || req.params.companyId;
      const reason = req.body?.reason || req.body?.rejection_reason || req.body?.decision_reason || null;
      const company = await companyService.rejectCompany(companyId, reason, req.user?.id, req);
      return actionSuccess(res, 'Company verification rejected.', CompanyResource.toArray(company));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST/PATCH /api/admin/companies/:company/verification
   */
  static async adminVerification(req, res, next) {
    try {
      const companyId = req.params.company || req.params.id || req.params.companyId;
      const isVerified = req.body.is_verified !== undefined
        ? Boolean(req.body.is_verified)
        : (req.body.status === 'verified' || req.body.status === 'approved' || req.body.action === 'verify');
      const company = isVerified
        ? await companyService.verifyCompany(companyId, req.user?.id, req)
        : await companyService.rejectCompany(companyId, req.body?.reason || req.body?.rejection_reason, req.user?.id, req);
      const message = isVerified ? 'Company verified successfully.' : 'Company verification rejected.';
      return actionSuccess(res, message, CompanyResource.toArray(company));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST/PATCH/PUT /api/admin/companies/:company/status
   */
  static async adminStatus(req, res, next) {
    try {
      const companyId = req.params.company || req.params.id || req.params.companyId;
      const isVerified = req.body.is_verified !== undefined
        ? Boolean(req.body.is_verified)
        : (['verified', 'approved', 'verify', 'approve'].includes(String(req.body.status || req.body.verification_status || req.body.action).toLowerCase()));
      const company = isVerified
        ? await companyService.verifyCompany(companyId, req.user?.id, req)
        : await companyService.rejectCompany(companyId, req.body?.reason || req.body?.rejection_reason, req.user?.id, req);
      const message = isVerified ? 'Company verified successfully.' : 'Company verification rejected.';
      return actionSuccess(res, message, CompanyResource.toArray(company));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CompanyController;
