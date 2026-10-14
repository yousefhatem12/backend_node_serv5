'use strict';

module.exports = (sequelize, DataTypes) => {
  const JobSource = sequelize.define('JobSource', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    source_type: {
      type: DataTypes.ENUM('api', 'scraper', 'rss', 'manual'),
      allowNull: false,
      defaultValue: 'scraper'
    },
    collection_method: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'playwright'
    },
    base_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    schedule_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    schedule_expression: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    configuration: {
      type: DataTypes.JSON,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    last_run_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    error_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    }
  }, {
    tableName: 'job_sources',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeValidate: (source) => {
        if (source.name && !source.slug) {
          source.slug = source.name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        }
      }
    }
  });

  JobSource.associate = (models) => {
    JobSource.hasMany(models.IngestionRun, {
      as: 'runs',
      foreignKey: 'job_source_id'
    });
    JobSource.hasMany(models.RawJob, {
      as: 'rawJobs',
      foreignKey: 'job_source_id'
    });
  };

  return JobSource;
};
