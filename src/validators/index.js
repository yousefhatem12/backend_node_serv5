const validate = require('../middlewares/validate.middleware');
const common = require('./common.validator');
const auth = require('./auth.validator');
const candidateProfile = require('./candidateProfile.validator');
const skills = require('./skills.validator');
const cv = require('./cv.validator');
const jobs = require('./jobs.validator');
const applications = require('./applications.validator');
const notifications = require('./notifications.validator');
const jobSources = require('./jobSources.validator');
const match = require('./match.validator');
const roadmaps = require('./roadmaps.validator');
const mentor = require('./mentor.validator');
const adminOperations = require('./adminOperations.validator');
const phase2Ai = require('./phase2Ai.validator');

module.exports = {
  validate,
  ...common,
  ...auth,
  ...candidateProfile,
  ...skills,
  ...cv,
  ...jobs,
  ...applications,
  ...notifications,
  ...jobSources,
  ...match,
  ...roadmaps,
  ...mentor,
  ...adminOperations,
  ...phase2Ai
};


