'use strict';

module.exports = (sequelize, DataTypes) => {
  const RawJob = sequelize.define('RawJob', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    job_source_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    ingestion_run_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    external_id: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    source_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    raw_payload: {
      type: DataTypes.JSON,
      allowNull: false
    },
    content_fingerprint: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    extraction_status: {
      type: DataTypes.ENUM('pending', 'processed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    deduplication_status: {
      type: DataTypes.ENUM('unique', 'duplicate'),
      allowNull: false,
      defaultValue: 'unique'
    },
    job_post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'raw_jobs',
    timestamps: true,
    underscored: true
  });

  RawJob.associate = (models) => {
    RawJob.belongsTo(models.JobSource, {
      as: 'jobSource',
      foreignKey: 'job_source_id'
    });
    RawJob.belongsTo(models.IngestionRun, {
      as: 'ingestionRun',
      foreignKey: 'ingestion_run_id'
    });
    RawJob.belongsTo(models.JobPost, {
      as: 'jobPost',
      foreignKey: 'job_post_id'
    });
  };

  return RawJob;
};
