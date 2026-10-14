const db = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

class CandidateProfileService {
  /**
   * Find or initialize candidate profile for a user
   */
  async getOrCreateProfile(userId) {
    let [profile] = await db.CandidateProfile.findOrCreate({
      where: { user_id: userId },
      defaults: { user_id: userId }
    });

    // Ensure default career preferences exist
    await db.CareerPreference.findOrCreate({
      where: { candidate_profile_id: profile.id },
      defaults: { candidate_profile_id: profile.id }
    });

    return profile;
  }

  /**
   * Retrieve full candidate profile with portfolio items
   */
  async getFullProfile(user) {
    const profile = await this.getOrCreateProfile(user.id);
    const fullProfile = await db.CandidateProfile.findOne({
      where: { id: profile.id },
      include: [
        { model: db.CareerPreference, as: 'careerPreference' },
        { model: db.Education, as: 'educations', separate: true, order: [['start_date', 'DESC']] },
        { model: db.Experience, as: 'experiences', separate: true, order: [['start_date', 'DESC']] },
        { model: db.Project, as: 'projects', separate: true, order: [['id', 'DESC']] },
        {
          model: db.CandidateSkill,
          as: 'candidateSkills',
          separate: true,
          include: [{ model: db.Skill, as: 'skill' }]
        }
      ]
    });

    return { user, profile: fullProfile };
  }

  /**
   * Update candidate profile details
   */
  async updateProfile(user, data) {
    const profile = await this.getOrCreateProfile(user.id);
    Object.assign(profile, data);
    profile.checkCompletion();
    await profile.save();

    return this.getFullProfile(user);
  }

  /**
   * Retrieve career preferences
   */
  async getCareerPreferences(user) {
    const profile = await this.getOrCreateProfile(user.id);
    const [preference] = await db.CareerPreference.findOrCreate({
      where: { candidate_profile_id: profile.id },
      defaults: { candidate_profile_id: profile.id }
    });
    return preference;
  }

  /**
   * Update career preferences
   */
  async updateCareerPreferences(user, data) {
    const profile = await this.getOrCreateProfile(user.id);
    let preference = await db.CareerPreference.findOne({
      where: { candidate_profile_id: profile.id }
    });

    if (!preference) {
      preference = await db.CareerPreference.create({
        candidate_profile_id: profile.id,
        ...data
      });
    } else {
      // If target_roles is provided, also set target_role to the first role if not explicitly set
      if (data.target_roles && data.target_roles.length > 0 && !data.target_role) {
        data.target_role = data.target_roles[0];
      }
      Object.assign(preference, data);
      await preference.save();
    }

    return preference;
  }

  // --- EDUCATIONS CRUD ---

  async listEducations(userId) {
    const profile = await this.getOrCreateProfile(userId);
    return db.Education.findAll({
      where: { candidate_profile_id: profile.id },
      order: [['start_date', 'DESC']]
    });
  }

  async createEducation(userId, data) {
    const profile = await this.getOrCreateProfile(userId);
    return db.Education.create({
      candidate_profile_id: profile.id,
      ...data
    });
  }

  async getEducation(userId, educationId) {
    const profile = await this.getOrCreateProfile(userId);
    const education = await db.Education.findOne({
      where: { id: educationId, candidate_profile_id: profile.id }
    });
    if (!education) {
      throw new NotFoundError('Education record not found.');
    }
    return education;
  }

  async updateEducation(userId, educationId, data) {
    const education = await this.getEducation(userId, educationId);
    Object.assign(education, data);
    await education.save();
    return education;
  }

  async deleteEducation(userId, educationId) {
    const education = await this.getEducation(userId, educationId);
    await education.destroy();
  }

  // --- EXPERIENCES CRUD ---

  async listExperiences(userId) {
    const profile = await this.getOrCreateProfile(userId);
    return db.Experience.findAll({
      where: { candidate_profile_id: profile.id },
      order: [['start_date', 'DESC']]
    });
  }

  async createExperience(userId, data) {
    const profile = await this.getOrCreateProfile(userId);
    return db.Experience.create({
      candidate_profile_id: profile.id,
      ...data
    });
  }

  async getExperience(userId, experienceId) {
    const profile = await this.getOrCreateProfile(userId);
    const experience = await db.Experience.findOne({
      where: { id: experienceId, candidate_profile_id: profile.id }
    });
    if (!experience) {
      throw new NotFoundError('Experience record not found.');
    }
    return experience;
  }

  async updateExperience(userId, experienceId, data) {
    const experience = await this.getExperience(userId, experienceId);
    Object.assign(experience, data);
    await experience.save();
    return experience;
  }

  async deleteExperience(userId, experienceId) {
    const experience = await this.getExperience(userId, experienceId);
    await experience.destroy();
  }

  // --- PROJECTS CRUD ---

  async listProjects(userId) {
    const profile = await this.getOrCreateProfile(userId);
    return db.Project.findAll({
      where: { candidate_profile_id: profile.id },
      order: [['id', 'DESC']]
    });
  }

  async createProject(userId, data) {
    const profile = await this.getOrCreateProfile(userId);
    return db.Project.create({
      candidate_profile_id: profile.id,
      ...data
    });
  }

  async getProject(userId, projectId) {
    const profile = await this.getOrCreateProfile(userId);
    const project = await db.Project.findOne({
      where: { id: projectId, candidate_profile_id: profile.id }
    });
    if (!project) {
      throw new NotFoundError('Project record not found.');
    }
    return project;
  }

  async updateProject(userId, projectId, data) {
    const project = await this.getProject(userId, projectId);
    Object.assign(project, data);
    await project.save();
    return project;
  }

  async deleteProject(userId, projectId) {
    const project = await this.getProject(userId, projectId);
    await project.destroy();
  }
}

module.exports = new CandidateProfileService();
