module.exports = (sequelize, DataTypes) => {
  const CandidateProfile = sequelize.define('CandidateProfile', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      unique: true
    },
    full_name: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true
    },
    job_title: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    github_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    linkedin_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    portfolio_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    military_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    years_of_experience: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: true,
      defaultValue: 0
    },
    looking_status: {
      type: DataTypes.ENUM('actively_looking', 'casually_looking', 'not_looking'),
      allowNull: false,
      defaultValue: 'actively_looking'
    },
    professional_summary: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    profile_completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'candidate_profiles',
    underscored: true,
    timestamps: true
  });

  CandidateProfile.associate = (models) => {
    CandidateProfile.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    CandidateProfile.hasOne(models.CareerPreference, { foreignKey: 'candidate_profile_id', as: 'careerPreference' });
    CandidateProfile.hasMany(models.Education, { foreignKey: 'candidate_profile_id', as: 'educations' });
    CandidateProfile.hasMany(models.Experience, { foreignKey: 'candidate_profile_id', as: 'experiences' });
    CandidateProfile.hasMany(models.Project, { foreignKey: 'candidate_profile_id', as: 'projects' });
    CandidateProfile.hasMany(models.Certificate, { foreignKey: 'candidate_profile_id', as: 'certificates' });
    CandidateProfile.hasMany(models.Language, { foreignKey: 'candidate_profile_id', as: 'languages' });
    CandidateProfile.hasMany(models.CandidateSkill, { foreignKey: 'candidate_profile_id', as: 'candidateSkills' });
    CandidateProfile.belongsToMany(models.Skill, {
      through: models.CandidateSkill,
      foreignKey: 'candidate_profile_id',
      otherKey: 'skill_id',
      as: 'skills'
    });
    CandidateProfile.hasMany(models.CvDocument, { foreignKey: 'candidate_profile_id', as: 'cvDocuments' });
    CandidateProfile.hasMany(models.SavedJob, { foreignKey: 'candidate_profile_id', as: 'savedJobs' });
    CandidateProfile.hasMany(models.Application, { foreignKey: 'candidate_profile_id', as: 'applications' });
  };

  /**
   * Helper to recalculate profile completion status
   */
  CandidateProfile.prototype.checkCompletion = function () {
    const isComplete = Boolean(
      this.job_title &&
      this.country &&
      this.city &&
      this.professional_summary
    );

    if (isComplete && !this.profile_completed_at) {
      this.profile_completed_at = new Date();
    } else if (!isComplete && this.profile_completed_at) {
      this.profile_completed_at = null;
    }
  };

  return CandidateProfile;
};
