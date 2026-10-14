'use strict';

module.exports = (sequelize, DataTypes) => {
  const Skill = sequelize.define('Skill', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    skill_category_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    normalized_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'skills',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeValidate: (skill) => {
        if (skill.name) {
          skill.normalized_name = skill.name.trim().toLowerCase();
        }
      }
    }
  });

  Skill.associate = (models) => {
    Skill.belongsTo(models.SkillCategory, {
      as: 'skillCategory',
      foreignKey: 'skill_category_id'
    });
    Skill.hasMany(models.SkillAlias, {
      as: 'aliases',
      foreignKey: 'skill_id'
    });
    Skill.hasMany(models.CandidateSkill, {
      as: 'candidateSkills',
      foreignKey: 'skill_id'
    });
    Skill.hasMany(models.RoadmapMilestone, {
      as: 'roadmapMilestones',
      foreignKey: 'target_skill_id'
    });
  };

  return Skill;
};
