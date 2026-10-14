const fs = require('fs');
const path = require('path');
const db = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

function removeOldAvatarFile(oldAvatar) {
  if (oldAvatar && typeof oldAvatar === 'string' && oldAvatar.startsWith('/uploads/avatars/')) {
    const fullPath = path.join(process.cwd(), oldAvatar);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        // Ignore file unlink error
      }
    }
  }
}

class CandidateProfileService {
  /**
   * Find or initialize candidate profile for a user
   */
  async getOrCreateProfile(userId) {
    const rawId = typeof userId === 'object' && userId ? userId.id : userId;
    let userInstance = typeof userId === 'object' && userId && userId.name ? userId : null;
    if (!userInstance && rawId) {
      userInstance = await db.User.findByPk(rawId);
    }

    let [profile] = await db.CandidateProfile.findOrCreate({
      where: { user_id: rawId },
      defaults: {
        user_id: rawId,
        full_name: userInstance ? userInstance.name : null,
        avatar: userInstance ? userInstance.avatar : null
      }
    });

    if (!profile.full_name && userInstance && userInstance.name) {
      profile.full_name = userInstance.name;
    }
    if (!profile.avatar && userInstance && userInstance.avatar) {
      profile.avatar = userInstance.avatar;
    }
    if (profile.changed && profile.changed()) {
      await profile.save();
    }

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
    const profile = await this.getOrCreateProfile(user);
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
    const profile = await this.getOrCreateProfile(user);
    
    // Explicitly handle and persist full_name
    if (data.full_name !== undefined) {
      const cleanFullName = data.full_name ? data.full_name.trim() : null;
      profile.full_name = cleanFullName;
      if (user && cleanFullName) {
        user.name = cleanFullName;
        await user.save();
      }
    }

    // Explicitly handle and persist avatar / avater
    const avatarInput = data.avatar !== undefined ? data.avatar : data.avater;
    if (avatarInput !== undefined) {
      const cleanAvatar = (avatarInput && String(avatarInput).trim() !== '') ? String(avatarInput).trim() : null;
      if (profile.avatar && profile.avatar !== cleanAvatar) {
        removeOldAvatarFile(profile.avatar);
      }
      profile.avatar = cleanAvatar;
      if (user) {
        user.avatar = cleanAvatar;
        await user.save();
      }
    }

    Object.assign(profile, data);
    profile.checkCompletion();
    await profile.save();

    return this.getFullProfile(user);
  }

  /**
   * Delete candidate avatar photo from profile and database
   */
  async deleteAvatar(user) {
    const profile = await this.getOrCreateProfile(user);
    const oldAvatar = profile.avatar || (user && user.avatar);

    if (oldAvatar) {
      removeOldAvatarFile(oldAvatar);
    }

    profile.avatar = null;
    await profile.save();

    if (user) {
      user.avatar = null;
      await user.save();
    }

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
