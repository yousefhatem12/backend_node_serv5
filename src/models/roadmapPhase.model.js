'use strict';

module.exports = (sequelize, DataTypes) => {
  const RoadmapPhase = sequelize.define('RoadmapPhase', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    roadmap_id: {
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
    }
  }, {
    tableName: 'roadmap_phases',
    timestamps: true,
    underscored: true
  });

  RoadmapPhase.associate = (models) => {
    RoadmapPhase.belongsTo(models.Roadmap, {
      as: 'roadmap',
      foreignKey: 'roadmap_id'
    });
    RoadmapPhase.hasMany(models.RoadmapMilestone, {
      as: 'milestones',
      foreignKey: 'roadmap_phase_id'
    });
  };

  return RoadmapPhase;
};
