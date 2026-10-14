'use strict';

module.exports = (sequelize, DataTypes) => {
  const SavedJob = sequelize.define('SavedJob', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    candidate_profile_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    job_post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    }
  }, {
    tableName: 'saved_jobs',
    timestamps: true,
    underscored: true
  });

  SavedJob.associate = (models) => {
    SavedJob.belongsTo(models.CandidateProfile, {
      as: 'candidateProfile',
      foreignKey: 'candidate_profile_id'
    });
    SavedJob.belongsTo(models.JobPost, {
      as: 'jobPost',
      foreignKey: 'job_post_id'
    });
  };

  return SavedJob;
};
