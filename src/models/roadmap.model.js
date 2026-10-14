'use strict';

module.exports = (sequelize, DataTypes) => {
  const Roadmap = sequelize.define('Roadmap', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    target_type: {
      type: DataTypes.ENUM('role', 'job'),
      allowNull: false,
      defaultValue: 'role'
    },
    target_role: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    target_job_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rationale: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('in_progress', 'completed', 'archived'),
      allowNull: false,
      defaultValue: 'in_progress'
    },
    progress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    generation_version: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1
    },
    previous_roadmap_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'roadmaps',
    timestamps: true,
    underscored: true
  });

  Roadmap.associate = (models) => {
    Roadmap.belongsTo(models.User, {
      as: 'user',
      foreignKey: 'user_id'
    });
    Roadmap.belongsTo(models.JobPost, {
      as: 'targetJob',
      foreignKey: 'target_job_id'
    });
    Roadmap.belongsTo(models.Roadmap, {
      as: 'previousRoadmap',
      foreignKey: 'previous_roadmap_id'
    });
    Roadmap.hasMany(models.RoadmapPhase, {
      as: 'phases',
      foreignKey: 'roadmap_id'
    });
  };

  return Roadmap;
};
