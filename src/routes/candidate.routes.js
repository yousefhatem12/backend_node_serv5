const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const { ensureActiveCandidate } = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');

const CandidateProfileController = require('../controllers/candidateProfile.controller');
const EducationController = require('../controllers/education.controller');
const ExperienceController = require('../controllers/experience.controller');
const ProjectController = require('../controllers/project.controller');
const SkillController = require('../controllers/skill.controller');
const MatchController = require('../controllers/match.controller');
const JobController = require('../controllers/job.controller');

const {
  updateProfileSchema,
  updateCareerPreferencesSchema,
  educationSchema,
  updateEducationSchema,
  experienceSchema,
  updateExperienceSchema,
  projectSchema,
  updateProjectSchema,
  addCandidateSkillSchema,
  idParamSchema,
  recommendationsQuerySchema,
  listJobsQuerySchema
} = require('../validators');

// Protect all candidate routes: must be authenticated and active candidate
router.use(authMiddleware, ensureActiveCandidate);

// --- RECOMMENDED JOBS & CANDIDATE JOBS ---
router.get('/recommended-jobs', validate(recommendationsQuerySchema), MatchController.getRecommendations);
router.get('/jobs/recommended', validate(recommendationsQuerySchema), MatchController.getRecommendations);
router.get('/jobs/recommendations', validate(recommendationsQuerySchema), MatchController.getRecommendations);
router.get('/job-posts/recommended', validate(recommendationsQuerySchema), MatchController.getRecommendations);
router.get('/jobs', validate(listJobsQuerySchema), JobController.list);
router.get('/jobs/list', validate(listJobsQuerySchema), JobController.list);
router.get('/jobs/feed', validate(listJobsQuerySchema), JobController.list);
router.get('/job-posts', validate(listJobsQuerySchema), JobController.list);
router.get('/job-posts/list', validate(listJobsQuerySchema), JobController.list);
router.get('/skill-gaps', MatchController.getSkillGaps);

// --- PROFILE & CAREER PREFERENCES ---
router.get('/profile', CandidateProfileController.getProfile);
router.patch('/profile', validate(updateProfileSchema), CandidateProfileController.updateProfile);

router.get('/career-preferences', CandidateProfileController.getCareerPreferences);
router.patch('/career-preferences', validate(updateCareerPreferencesSchema), CandidateProfileController.updateCareerPreferences);

// --- SKILLS CRUD ---
router.get('/skills', SkillController.listCandidateSkills);
router.post('/skills', validate(addCandidateSkillSchema), SkillController.addCandidateSkill);
router.delete('/skills/:id', validate(idParamSchema), SkillController.deleteCandidateSkill);

// --- EDUCATIONS CRUD ---
router.get('/educations', EducationController.index);
router.post('/educations', validate(educationSchema), EducationController.create);
router.get('/educations/:id', validate(idParamSchema), EducationController.show);
router.patch('/educations/:id', validate(updateEducationSchema), EducationController.update);
router.delete('/educations/:id', validate(idParamSchema), EducationController.destroy);

// --- EXPERIENCES CRUD ---
router.get('/experiences', ExperienceController.index);
router.post('/experiences', validate(experienceSchema), ExperienceController.create);
router.get('/experiences/:id', validate(idParamSchema), ExperienceController.show);
router.patch('/experiences/:id', validate(updateExperienceSchema), ExperienceController.update);
router.delete('/experiences/:id', validate(idParamSchema), ExperienceController.destroy);

// --- PROJECTS CRUD ---
router.get('/projects', ProjectController.index);
router.post('/projects', validate(projectSchema), ProjectController.create);
router.get('/projects/:id', validate(idParamSchema), ProjectController.show);
router.patch('/projects/:id', validate(updateProjectSchema), ProjectController.update);
router.delete('/projects/:id', validate(idParamSchema), ProjectController.destroy);

// --- CV IMPROVEMENT ASSISTANT ---
const CvImproverController = require('../controllers/cvImprover.controller');
const { analyzeCvSchema, listCvImprovementsQuerySchema } = require('../validators');

router.post('/cv-improvements/analyze', validate(analyzeCvSchema), CvImproverController.analyze);
router.get('/cv-improvements/latest', CvImproverController.getLatest);
router.get('/cv-improvements', validate(listCvImprovementsQuerySchema), CvImproverController.listHistory);

module.exports = router;

