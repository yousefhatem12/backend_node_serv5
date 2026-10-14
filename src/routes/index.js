const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const candidateRoutes = require('./candidate.routes');
const skillsRoutes = require('./skills.routes');
const adminRoutes = require('./admin.routes');
const cvRoutes = require('./cv.routes');
const jobsRoutes = require('./jobs.routes');
const applicationRoutes = require('./application.routes');
const notificationRoutes = require('./notification.routes');
const roadmapRoutes = require('./roadmap.routes');
const mentorRoutes = require('./mentor.routes');
const interviewPrepRoutes = require('./interviewPrep.routes');
const applicationStrategyRoutes = require('./applicationStrategy.routes');

const docsRoutes = require('./docs.routes');

const authMiddleware = require('../middlewares/auth.middleware');
const { ensureActiveCandidate, ensureActiveAdmin } = require('../middlewares/roles.middleware');
const JobController = require('../controllers/job.controller');
const CompanyController = require('../controllers/company.controller');
const RoadmapController = require('../controllers/roadmap.controller');
const AdminOperationsController = require('../controllers/adminOperations.controller');
const { validate, roadmapTaskParamSchema, completeRoadmapTaskSchema, companyParamSchema, adminUserParamSchema } = require('../validators');

// Set _mountPath for route reflection and documentation coverage
healthRoutes._mountPath = '';
authRoutes._mountPath = '/auth';
candidateRoutes._mountPath = '/candidate';
skillsRoutes._mountPath = '/skills';
adminRoutes._mountPath = '/admin';
cvRoutes._mountPath = '/cv';
jobsRoutes._mountPath = '/jobs';
applicationRoutes._mountPath = '/applications';
notificationRoutes._mountPath = '/notifications';
roadmapRoutes._mountPath = '/roadmaps';
mentorRoutes._mountPath = '/mentor';
interviewPrepRoutes._mountPath = '/interview-prep';
applicationStrategyRoutes._mountPath = '/application-strategy';
docsRoutes._mountPath = '/docs';

// Mount routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/candidate', candidateRoutes);
router.use('/candidates', candidateRoutes);
router.use('/skills', skillsRoutes);
router.use('/admin', adminRoutes);
router.use('/cv', cvRoutes);
router.use('/jobs', jobsRoutes);
router.use('/job-posts', jobsRoutes);
router.use('/applications', applicationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/roadmaps', roadmapRoutes);
router.use('/mentor', mentorRoutes);
router.use('/interview-prep', interviewPrepRoutes);
router.use('/application-strategy', applicationStrategyRoutes);
router.use('/docs', docsRoutes);


// Saved jobs candidate routes
router.get('/saved-jobs', authMiddleware, ensureActiveCandidate, JobController.savedJobs);
router.delete('/saved-jobs/:jobPost', authMiddleware, ensureActiveCandidate, JobController.unsave);

// Roadmap task completion route matching Laravel /api/roadmap-tasks/{roadmapTask}/complete
router.patch(
  '/roadmap-tasks/:roadmapTask/complete',
  authMiddleware,
  ensureActiveCandidate,
  validate(roadmapTaskParamSchema),
  validate(completeRoadmapTaskSchema),
  RoadmapController.completeTask
);

// Direct Company Verification routes (accessible with or without /admin prefix)
router.post('/companies/:company/verify', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/companies/:company/verify', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);
router.put('/companies/:company/verify', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);

router.post('/companies/:company/reject', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminReject);
router.patch('/companies/:company/reject', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminReject);
router.put('/companies/:company/reject', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminReject);

router.post('/companies/:company/approve', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/companies/:company/approve', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);
router.put('/companies/:company/approve', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);

router.post('/companies/:company/verification', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerification);
router.patch('/companies/:company/verification', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerification);
router.put('/companies/:company/verification', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerification);

router.post('/companies/:company/status', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminStatus);
router.patch('/companies/:company/status', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminStatus);
router.put('/companies/:company/status', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminStatus);

// Singular /company/... direct aliases
router.post('/company/:company/verify', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/company/:company/verify', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);
router.put('/company/:company/verify', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);

router.post('/company/:company/reject', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminReject);
router.patch('/company/:company/reject', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminReject);
router.put('/company/:company/reject', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminReject);

router.post('/company/:company/approve', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/company/:company/approve', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);
router.put('/company/:company/approve', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);

router.post('/company/:company/verification', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerification);
router.patch('/company/:company/verification', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerification);
router.put('/company/:company/verification', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerification);

router.post('/company/:company/status', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminStatus);
router.patch('/company/:company/status', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminStatus);
router.put('/company/:company/status', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminStatus);

// Inverted and verification-request aliases
router.post('/companies/verify/:company', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/companies/verify/:company', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);
router.put('/companies/verify/:company', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);

router.post('/companies/reject/:company', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminReject);
router.patch('/companies/reject/:company', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminReject);
router.put('/companies/reject/:company', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminReject);

router.post('/company-verifications/:company/verify', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);
router.patch('/company-verifications/:company/verify', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);
router.put('/company-verifications/:company/verify', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminVerify);

router.post('/company-verifications/:company/reject', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminReject);
router.patch('/company-verifications/:company/reject', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminReject);
router.put('/company-verifications/:company/reject', authMiddleware, ensureActiveAdmin, validate(companyParamSchema), CompanyController.adminReject);

// Direct User Delete Operations (supporting /users/:user and /user/:user)
router.delete('/users/:user', authMiddleware, ensureActiveAdmin, validate(adminUserParamSchema), AdminOperationsController.deleteUser);
router.delete('/user/:user', authMiddleware, ensureActiveAdmin, validate(adminUserParamSchema), AdminOperationsController.deleteUser);
router.post('/users/:user/delete', authMiddleware, ensureActiveAdmin, validate(adminUserParamSchema), AdminOperationsController.deleteUser);
router.post('/user/:user/delete', authMiddleware, ensureActiveAdmin, validate(adminUserParamSchema), AdminOperationsController.deleteUser);

module.exports = router;
