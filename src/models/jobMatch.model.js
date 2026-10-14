'use strict';

module.exports = (sequelize, DataTypes) => {
  const JobMatch = sequelize.define('JobMatch', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    job_post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    match_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    match_level: {
      type: DataTypes.ENUM('low', 'moderate', 'good', 'strong'),
      allowNull: false,
      defaultValue: 'moderate'
    },
    matched_skills_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    missing_skills_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    matched_skills: {
      type: DataTypes.JSON,
      allowNull: true
    },
    missing_skills: {
      type: DataTypes.JSON,
      allowNull: true
    },
    gap_analysis: {
      type: DataTypes.JSON,
      allowNull: true
    },
    explanation: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    calculated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    is_stale: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'job_matches',
    timestamps: true,
    underscored: true
  });

  JobMatch.associate = (models) => {
    JobMatch.belongsTo(models.User, {
      as: 'user',
      foreignKey: 'user_id'
    });
    JobMatch.belongsTo(models.JobPost, {
      as: 'jobPost',
      foreignKey: 'job_post_id'
    });
  };

  return JobMatch;
};
