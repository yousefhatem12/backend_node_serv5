'use strict';

module.exports = (sequelize, DataTypes) => {
  const IngestionRun = sequelize.define('IngestionRun', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    job_source_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    trigger_type: {
      type: DataTypes.ENUM('scheduled', 'manual'),
      allowNull: false,
      defaultValue: 'manual'
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    jobs_found: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    jobs_imported: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    duplicates_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    errors_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    finished_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'ingestion_runs',
    timestamps: true,
    underscored: true
  });

  IngestionRun.associate = (models) => {
    IngestionRun.belongsTo(models.JobSource, {
      as: 'jobSource',
      foreignKey: 'job_source_id'
    });
    IngestionRun.hasMany(models.RawJob, {
      as: 'rawJobs',
      foreignKey: 'ingestion_run_id'
    });
  };

  return IngestionRun;
};
