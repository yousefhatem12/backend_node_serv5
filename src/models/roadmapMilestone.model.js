'use strict';

module.exports = (sequelize, DataTypes) => {
  const RoadmapMilestone = sequelize.define('RoadmapMilestone', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    roadmap_phase_id: {
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
    target_skill_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    }
  }, {
    tableName: 'roadmap_milestones',
    timestamps: true,
    underscored: true
  });

  RoadmapMilestone.associate = (models) => {
    RoadmapMilestone.belongsTo(models.RoadmapPhase, {
      as: 'phase',
      foreignKey: 'roadmap_phase_id'
    });
    RoadmapMilestone.belongsTo(models.Skill, {
      as: 'targetSkill',
      foreignKey: 'target_skill_id'
    });
    RoadmapMilestone.hasMany(models.RoadmapTask, {
      as: 'tasks',
      foreignKey: 'roadmap_milestone_id'
    });
  };

  return RoadmapMilestone;
};
