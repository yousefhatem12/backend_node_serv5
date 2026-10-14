'use strict';

module.exports = (sequelize, DataTypes) => {
  const JobSkill = sequelize.define('JobSkill', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    job_post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    skill_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    importance: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 3
    },
    required_level: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'mid-level'
    }
  }, {
    tableName: 'job_skills',
    timestamps: true,
    underscored: true
  });

  JobSkill.associate = (models) => {
    JobSkill.belongsTo(models.JobPost, {
      as: 'jobPost',
      foreignKey: 'job_post_id'
    });
    JobSkill.belongsTo(models.Skill, {
      as: 'skill',
      foreignKey: 'skill_id'
    });
  };

  return JobSkill;
};
