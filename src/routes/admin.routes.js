const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const { ensureActiveAdmin } = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');

const AdminSkillController = require('../controllers/adminSkill.controller');
const CompanyController = require('../controllers/company.controller');
const JobController = require('../controllers/job.controller');
const NotificationController = require('../controllers/notification.controller');
const AdminJobSourceController = require('../controllers/adminJobSource.controller');
const MatchController = require('../controllers/match.controller');
const AdminAiReviewController = require('../controllers/adminAiReview.controller');
const AdminOperationsController = require('../controllers/adminOperations.controller');

const {
  createSkillSchema,
  updateSkillSchema,
  mergeSkillSchema,
  createAliasSchema,
  updateAliasSchema,
  idParamSchema,
  listCompaniesQuerySchema,
  companyParamSchema,
  sourceCompanyParamSchema,
  createCompanySchema,
  updateCompanySchema,
  mergeCompanySchema,
  jobPostParamSchema,
  createJobPostSchema,
  updateJobPostSchema,
  adminComposeNotificationSchema,
  listJobSourcesQuerySchema,
  jobSourceParamSchema,
  createJobSourceSchema,
  updateJobSourceSchema,
  triggerRunSchema,
  listRunsQuerySchema,
  listRawJobsQuerySchema,
  rawJobParamSchema,
  adminListMatchesQuerySchema,
  listAiReviewItemsQuerySchema,
  aiReviewItemParamSchema,
  approveAiReviewSchema,
  correctAiReviewSchema,
  rejectAiReviewSchema,
  listAuditLogsQuerySchema,
  listAdminUsersQuerySchema,
  adminUserParamSchema,
  createAdminUserSchema,
  updateAdminUserSchema,
  updateUserStatusSchema,
  updateUserRoleSchema
} = require('../validators');

// Must be authenticated and active admin (or super_admin)
router.use(authMiddleware, ensureActiveAdmin);


// --- SKILLS TAXONOMY ---
router.post('/skills', validate(createSkillSchema), AdminSkillController.createSkill);
router.patch('/skills/:id', validate(idParamSchema), validate(updateSkillSchema), AdminSkillController.updateSkill);
router.post('/skills/:sourceSkillId/merge', validate(mergeSkillSchema), AdminSkillController.mergeSkills);

// --- SKILL ALIASES ---
router.get('/skills/:id/aliases', validate(idParamSchema), AdminSkillController.listAliases);
router.post('/skills/:id/aliases', validate(idParamSchema), validate(createAliasSchema), AdminSkillController.addAlias);
router.patch('/skills/:id/aliases/:aliasId', validate(updateAliasSchema), AdminSkillController.updateAlias);
router.delete('/skills/:id/aliases/:aliasId', AdminSkillController.deleteAlias);

// --- COMPANIES MANAGEMENT ---
router.get('/companies', validate(listCompaniesQuerySchema), CompanyController.adminList);
router.post('/companies', validate(createCompanySchema), CompanyController.adminCreate);
router.get('/companies/:company', validate(companyParamSchema), CompanyController.adminShow);
router.patch('/companies/:company', validate(companyParamSchema), validate(updateCompanySchema), CompanyController.adminUpdate);
router.put('/companies/:company', validate(companyParamSchema), validate(updateCompanySchema), CompanyController.adminUpdate);
router.post('/companies/:sourceCompany/merge', validate(sourceCompanyParamSchema), validate(mergeCompanySchema), CompanyController.adminMerge);

// Company Verification Operations (supporting POST, PATCH, PUT)
router.post('/companies/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/companies/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);
router.put('/companies/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);

router.post('/companies/:company/reject', validate(companyParamSchema), CompanyController.adminReject);
router.patch('/companies/:company/reject', validate(companyParamSchema), CompanyController.adminReject);
router.put('/companies/:company/reject', validate(companyParamSchema), CompanyController.adminReject);

router.post('/companies/:company/approve', validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/companies/:company/approve', validate(companyParamSchema), CompanyController.adminVerify);
router.put('/companies/:company/approve', validate(companyParamSchema), CompanyController.adminVerify);

router.post('/companies/:company/verification', validate(companyParamSchema), CompanyController.adminVerification);
router.patch('/companies/:company/verification', validate(companyParamSchema), CompanyController.adminVerification);
router.put('/companies/:company/verification', validate(companyParamSchema), CompanyController.adminVerification);

// --- JOBS MANAGEMENT ---
router.get('/jobs', JobController.adminList);
router.get('/jobs/list', JobController.adminList);
router.get('/jobs/all', JobController.adminList);
router.get('/job-posts', JobController.adminList);
router.get('/job-posts/list', JobController.adminList);
router.get('/job-posts/all', JobController.adminList);
router.post('/jobs', validate(createJobPostSchema), JobController.adminCreate);
router.post('/job-posts', validate(createJobPostSchema), JobController.adminCreate);
router.get('/jobs/:jobPost', validate(jobPostParamSchema), JobController.adminShow);
router.get('/job-posts/:jobPost', validate(jobPostParamSchema), JobController.adminShow);
router.patch('/jobs/:jobPost', validate(jobPostParamSchema), validate(updateJobPostSchema), JobController.adminUpdate);
router.patch('/job-posts/:jobPost', validate(jobPostParamSchema), validate(updateJobPostSchema), JobController.adminUpdate);
router.put('/jobs/:jobPost', validate(jobPostParamSchema), validate(updateJobPostSchema), JobController.adminUpdate);
router.put('/job-posts/:jobPost', validate(jobPostParamSchema), validate(updateJobPostSchema), JobController.adminUpdate);
router.delete('/jobs/:jobPost', validate(jobPostParamSchema), JobController.adminDelete);
router.delete('/job-posts/:jobPost', validate(jobPostParamSchema), JobController.adminDelete);

// --- NOTIFICATIONS COMPOSER ---
router.post('/notifications/compose', validate(adminComposeNotificationSchema), NotificationController.adminCompose);
router.post('/notifications', validate(adminComposeNotificationSchema), NotificationController.adminCompose);

// --- JOB SOURCES & INGESTION PIPELINE ---
router.get('/job-sources', validate(listJobSourcesQuerySchema), AdminJobSourceController.listSources);
router.post('/job-sources', validate(createJobSourceSchema), AdminJobSourceController.createSource);
router.get('/job-sources/:jobSource', validate(jobSourceParamSchema), AdminJobSourceController.showSource);
router.patch('/job-sources/:jobSource', validate(jobSourceParamSchema), validate(updateJobSourceSchema), AdminJobSourceController.updateSource);
router.delete('/job-sources/:jobSource', validate(jobSourceParamSchema), AdminJobSourceController.deleteSource);
router.post('/job-sources/:jobSource/run', validate(jobSourceParamSchema), validate(triggerRunSchema), AdminJobSourceController.triggerRun);
router.get('/job-sources/:jobSource/runs', validate(jobSourceParamSchema), validate(listRunsQuerySchema), AdminJobSourceController.listSourceRuns);
router.get('/job-sources/:jobSource/raw-jobs', validate(jobSourceParamSchema), validate(listRawJobsQuerySchema), AdminJobSourceController.listSourceRawJobs);
router.get('/job-sources/:jobSource/raw-jobs/:rawJob', validate(rawJobParamSchema), AdminJobSourceController.showRawJob);

// Global Runs & Raw Ingestion
router.get('/ingestion-runs', validate(listRunsQuerySchema), AdminJobSourceController.listAllRuns);
router.get('/raw-jobs', validate(listRawJobsQuerySchema), AdminJobSourceController.listAllRawJobs);
router.get('/raw-jobs/:rawJob', validate(rawJobParamSchema), AdminJobSourceController.showRawJob);

// --- CANDIDATE MATCHES INSPECTION ---
router.get('/job-matches', validate(adminListMatchesQuerySchema), MatchController.adminListMatches);

// --- AI REVIEW QUEUE (HUMAN-IN-THE-LOOP) ---
router.get('/ai-review-items', validate(listAiReviewItemsQuerySchema), AdminAiReviewController.listItems);
router.get('/ai-review-items/:aiReviewItem', validate(aiReviewItemParamSchema), AdminAiReviewController.showItem);
router.post('/ai-review-items/:aiReviewItem/approve', validate(aiReviewItemParamSchema), validate(approveAiReviewSchema), AdminAiReviewController.approveItem);
router.post('/ai-review-items/:aiReviewItem/correct', validate(aiReviewItemParamSchema), validate(correctAiReviewSchema), AdminAiReviewController.correctItem);
router.post('/ai-review-items/:aiReviewItem/reject', validate(aiReviewItemParamSchema), validate(rejectAiReviewSchema), AdminAiReviewController.rejectItem);

// --- AUDIT LOGS ---
router.get('/audit-logs', validate(listAuditLogsQuerySchema), AdminOperationsController.listAuditLogs);

// --- USER MANAGEMENT & MODERATION ---
router.get('/users', validate(listAdminUsersQuerySchema), AdminOperationsController.listUsers);
router.post('/users', validate(createAdminUserSchema), AdminOperationsController.createUser);
router.get('/users/:user', validate(adminUserParamSchema), AdminOperationsController.showUser);
router.patch('/users/:user', validate(adminUserParamSchema), validate(updateAdminUserSchema), AdminOperationsController.updateUser);
router.put('/users/:user', validate(adminUserParamSchema), validate(updateAdminUserSchema), AdminOperationsController.updateUser);
router.patch('/users/:user/status', validate(adminUserParamSchema), validate(updateUserStatusSchema), AdminOperationsController.updateUserStatus);
router.put('/users/:user/status', validate(adminUserParamSchema), validate(updateUserStatusSchema), AdminOperationsController.updateUserStatus);
router.patch('/users/:user/role', validate(adminUserParamSchema), validate(updateUserRoleSchema), AdminOperationsController.updateUserRole);
router.put('/users/:user/role', validate(adminUserParamSchema), validate(updateUserRoleSchema), AdminOperationsController.updateUserRole);

// --- PLATFORM STATISTICS & DASHBOARD ---
router.get('/statistics', AdminOperationsController.getStatistics);
router.get('/dashboard', AdminOperationsController.getStatistics);

module.exports = router;

