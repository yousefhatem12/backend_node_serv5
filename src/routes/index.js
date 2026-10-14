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
const { validate, roadmapTaskParamSchema, completeRoadmapTaskSchema, companyParamSchema } = require('../validators');

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

module.exports = router;
