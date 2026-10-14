'use strict';

module.exports = (sequelize, DataTypes) => {
  const JobPost = sequelize.define('JobPost', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    canonical_role: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    job_type: {
      type: DataTypes.ENUM('job', 'internship'),
      allowNull: false,
      defaultValue: 'job'
    },
    employment_type: {
      type: DataTypes.ENUM('full-time', 'part-time', 'contract'),
      allowNull: false,
      defaultValue: 'full-time'
    },
    work_mode: {
      type: DataTypes.ENUM('remote', 'hybrid', 'on-site'),
      allowNull: false,
      defaultValue: 'on-site'
    },
    experience_level: {
      type: DataTypes.ENUM('entry', 'mid-level', 'senior', 'lead'),
      allowNull: false,
      defaultValue: 'mid-level'
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
    min_years_experience: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: 0
    },
    max_years_experience: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    salary_min: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    salary_max: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    salary_currency: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'EGP'
    },
    source: {
      type: DataTypes.ENUM('internal', 'scraped', 'aggregated'),
      allowNull: false,
      defaultValue: 'internal'
    },
    source_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    application_method: {
      type: DataTypes.ENUM('internal', 'external'),
      allowNull: false,
      defaultValue: 'internal'
    },
    external_apply_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'job_posts',
    timestamps: true,
    underscored: true
  });

  JobPost.prototype.isExpired = function () {
    if (!this.expires_at) return false;
    return new Date() > new Date(this.expires_at);
  };

  JobPost.associate = (models) => {
    JobPost.belongsTo(models.Company, {
      as: 'company',
      foreignKey: 'company_id'
    });
    JobPost.hasMany(models.JobSkill, {
      as: 'jobSkills',
      foreignKey: 'job_post_id'
    });
    JobPost.belongsToMany(models.Skill, {
      through: models.JobSkill,
      as: 'skills',
      foreignKey: 'job_post_id',
      otherKey: 'skill_id'
    });
    JobPost.hasMany(models.SavedJob, {
      as: 'savedJobs',
      foreignKey: 'job_post_id'
    });
    JobPost.hasMany(models.Application, {
      as: 'applications',
      foreignKey: 'job_post_id'
    });
    JobPost.hasMany(models.RawJob, {
      as: 'rawJobs',
      foreignKey: 'job_post_id'
    });
    JobPost.hasMany(models.JobMatch, {
      as: 'matches',
      foreignKey: 'job_post_id'
    });
    JobPost.hasMany(models.Roadmap, {
      as: 'roadmaps',
      foreignKey: 'target_job_id'
    });
    JobPost.hasMany(models.CvImprovementAnalysis, {
      as: 'cvAnalyses',
      foreignKey: 'job_post_id'
    });
    JobPost.hasMany(models.InterviewPrepSession, {
      as: 'interviewSessions',
      foreignKey: 'job_post_id'
    });
    JobPost.hasMany(models.ApplicationStrategy, {
      as: 'applicationStrategies',
      foreignKey: 'job_post_id'
    });
  };


  return JobPost;
};
