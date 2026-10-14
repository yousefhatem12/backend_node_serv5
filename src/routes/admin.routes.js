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
  updateUserRoleSchema,
  listTaxonomySkillsQuerySchema,
  taxonomySkillParamSchema,
  createTaxonomySkillSchema,
  updateTaxonomySkillSchema,
  sourceParamSchema,
  mergeDuplicatesSchema
} = require('../validators');

// Must be authenticated and active admin (or super_admin)
router.use(authMiddleware, ensureActiveAdmin);


// --- SKILLS TAXONOMY ---
router.get('/taxonomy/skills', validate(listTaxonomySkillsQuerySchema), AdminSkillController.listTaxonomySkills);
router.post('/taxonomy/skills', validate(createTaxonomySkillSchema), AdminSkillController.createTaxonomySkill);
router.patch('/taxonomy/skills/:id', validate(taxonomySkillParamSchema), validate(updateTaxonomySkillSchema), AdminSkillController.updateTaxonomySkill);
router.delete('/taxonomy/skills/:id', validate(taxonomySkillParamSchema), AdminSkillController.deleteTaxonomySkill);

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

// --- COMPANY VERIFICATION & REJECTION OPERATIONS ---
// 1. Standard REST routes: /companies/:company/(verify|reject|approve|verification|status)
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

router.post('/companies/:company/status', validate(companyParamSchema), CompanyController.adminStatus);
router.patch('/companies/:company/status', validate(companyParamSchema), CompanyController.adminStatus);
router.put('/companies/:company/status', validate(companyParamSchema), CompanyController.adminStatus);

// 2. Singular routes: /company/:company/(verify|reject|approve|verification|status)
router.post('/company/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/company/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);
router.put('/company/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);

router.post('/company/:company/reject', validate(companyParamSchema), CompanyController.adminReject);
router.patch('/company/:company/reject', validate(companyParamSchema), CompanyController.adminReject);
router.put('/company/:company/reject', validate(companyParamSchema), CompanyController.adminReject);

router.post('/company/:company/approve', validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/company/:company/approve', validate(companyParamSchema), CompanyController.adminVerify);
router.put('/company/:company/approve', validate(companyParamSchema), CompanyController.adminVerify);

router.post('/company/:company/verification', validate(companyParamSchema), CompanyController.adminVerification);
router.patch('/company/:company/verification', validate(companyParamSchema), CompanyController.adminVerification);
router.put('/company/:company/verification', validate(companyParamSchema), CompanyController.adminVerification);

router.post('/company/:company/status', validate(companyParamSchema), CompanyController.adminStatus);
router.patch('/company/:company/status', validate(companyParamSchema), CompanyController.adminStatus);
router.put('/company/:company/status', validate(companyParamSchema), CompanyController.adminStatus);

// 3. Action-first routes: /(verify|reject)-company/:company and /companies/(verify|reject)/:company
router.post('/companies/verify/:company', validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/companies/verify/:company', validate(companyParamSchema), CompanyController.adminVerify);
router.put('/companies/verify/:company', validate(companyParamSchema), CompanyController.adminVerify);

router.post('/companies/reject/:company', validate(companyParamSchema), CompanyController.adminReject);
router.patch('/companies/reject/:company', validate(companyParamSchema), CompanyController.adminReject);
router.put('/companies/reject/:company', validate(companyParamSchema), CompanyController.adminReject);

router.post('/verify-company/:company', validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/verify-company/:company', validate(companyParamSchema), CompanyController.adminVerify);
router.put('/verify-company/:company', validate(companyParamSchema), CompanyController.adminVerify);

router.post('/reject-company/:company', validate(companyParamSchema), CompanyController.adminReject);
router.patch('/reject-company/:company', validate(companyParamSchema), CompanyController.adminReject);
router.put('/reject-company/:company', validate(companyParamSchema), CompanyController.adminReject);

// 4. Verification-queue aliases: /company-verifications/:company/*, /verification-requests/:company/*
router.post('/company-verifications/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/company-verifications/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);
router.put('/company-verifications/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);

router.post('/company-verifications/:company/reject', validate(companyParamSchema), CompanyController.adminReject);
router.patch('/company-verifications/:company/reject', validate(companyParamSchema), CompanyController.adminReject);
router.put('/company-verifications/:company/reject', validate(companyParamSchema), CompanyController.adminReject);

router.post('/company-verifications/:company/approve', validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/company-verifications/:company/approve', validate(companyParamSchema), CompanyController.adminVerify);
router.put('/company-verifications/:company/approve', validate(companyParamSchema), CompanyController.adminVerify);

router.post('/company-verification/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/company-verification/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);
router.put('/company-verification/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);

router.post('/company-verification/:company/reject', validate(companyParamSchema), CompanyController.adminReject);
router.patch('/company-verification/:company/reject', validate(companyParamSchema), CompanyController.adminReject);
router.put('/company-verification/:company/reject', validate(companyParamSchema), CompanyController.adminReject);

router.post('/verification-requests/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/verification-requests/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);
router.put('/verification-requests/:company/verify', validate(companyParamSchema), CompanyController.adminVerify);

router.post('/verification-requests/:company/reject', validate(companyParamSchema), CompanyController.adminReject);
router.patch('/verification-requests/:company/reject', validate(companyParamSchema), CompanyController.adminReject);
router.put('/verification-requests/:company/reject', validate(companyParamSchema), CompanyController.adminReject);

router.post('/companies/:company/verify-request', validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/companies/:company/verify-request', validate(companyParamSchema), CompanyController.adminVerify);
router.put('/companies/:company/verify-request', validate(companyParamSchema), CompanyController.adminVerify);

router.post('/companies/:company/reject-request', validate(companyParamSchema), CompanyController.adminReject);
router.patch('/companies/:company/reject-request', validate(companyParamSchema), CompanyController.adminReject);
router.put('/companies/:company/reject-request', validate(companyParamSchema), CompanyController.adminReject);

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
router.get('/sources', validate(listJobSourcesQuerySchema), AdminJobSourceController.listSources);
router.post('/sources', validate(createJobSourceSchema), AdminJobSourceController.createSource);
router.get('/sources/:id', validate(sourceParamSchema), AdminJobSourceController.showSource);
router.patch('/sources/:id', validate(sourceParamSchema), validate(updateJobSourceSchema), AdminJobSourceController.updateSource);
router.put('/sources/:id', validate(sourceParamSchema), validate(updateJobSourceSchema), AdminJobSourceController.updateSource);
router.delete('/sources/:id', validate(sourceParamSchema), AdminJobSourceController.deleteSource);
router.post('/sources/:id/trigger', validate(sourceParamSchema), validate(triggerRunSchema), AdminJobSourceController.triggerRun);

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
router.get('/ai-review/queue', validate(listAiReviewItemsQuerySchema), AdminAiReviewController.getQueue);
router.get('/ai-review/:id', validate(sourceParamSchema), AdminAiReviewController.showItem);
router.post('/ai-review/:id/approve', validate(sourceParamSchema), validate(approveAiReviewSchema), AdminAiReviewController.approveItem);
router.patch('/ai-review/:id/correct', validate(sourceParamSchema), validate(correctAiReviewSchema), AdminAiReviewController.correctItem);
router.post('/ai-review/:id/correct', validate(sourceParamSchema), validate(correctAiReviewSchema), AdminAiReviewController.correctItem);
router.post('/ai-review/:id/reject', validate(sourceParamSchema), validate(rejectAiReviewSchema), AdminAiReviewController.rejectItem);

router.get('/ai-review-items', validate(listAiReviewItemsQuerySchema), AdminAiReviewController.listItems);
router.get('/ai-review-items/:aiReviewItem', validate(aiReviewItemParamSchema), AdminAiReviewController.showItem);
router.post('/ai-review-items/:aiReviewItem/approve', validate(aiReviewItemParamSchema), validate(approveAiReviewSchema), AdminAiReviewController.approveItem);
router.patch('/ai-review-items/:aiReviewItem/correct', validate(aiReviewItemParamSchema), validate(correctAiReviewSchema), AdminAiReviewController.correctItem);
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
router.delete('/users/:user', validate(adminUserParamSchema), AdminOperationsController.deleteUser);
router.post('/users/:user/delete', validate(adminUserParamSchema), AdminOperationsController.deleteUser);

// Singular /user aliases
router.get('/user/:user', validate(adminUserParamSchema), AdminOperationsController.showUser);
router.patch('/user/:user', validate(adminUserParamSchema), validate(updateAdminUserSchema), AdminOperationsController.updateUser);
router.put('/user/:user', validate(adminUserParamSchema), validate(updateAdminUserSchema), AdminOperationsController.updateUser);
router.delete('/user/:user', validate(adminUserParamSchema), AdminOperationsController.deleteUser);
router.post('/user/:user/delete', validate(adminUserParamSchema), AdminOperationsController.deleteUser);

// --- DATA MODERATION (MERGE DUPLICATES) ---
router.post('/moderation/merge-duplicates', validate(mergeDuplicatesSchema), AdminOperationsController.mergeDuplicates);

// --- PLATFORM STATISTICS & DASHBOARD ---
router.get('/stats', AdminOperationsController.getStats);
router.get('/statistics', AdminOperationsController.getStatistics);
router.get('/dashboard', AdminOperationsController.getStatistics);

module.exports = router;

