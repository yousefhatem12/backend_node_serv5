'use strict';

module.exports = (sequelize, DataTypes) => {
  const RoadmapTask = sequelize.define('RoadmapTask', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    roadmap_milestone_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    order: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    weight: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1
    },
    evidence: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'roadmap_tasks',
    timestamps: true,
    underscored: true
  });

  RoadmapTask.associate = (models) => {
    RoadmapTask.belongsTo(models.RoadmapMilestone, {
      as: 'milestone',
      foreignKey: 'roadmap_milestone_id'
    });
  };

  return RoadmapTask;
};
