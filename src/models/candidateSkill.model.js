'use strict';

module.exports = (sequelize, DataTypes) => {
  const CandidateSkill = sequelize.define('CandidateSkill', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    candidate_profile_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    skill_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    source: {
      type: DataTypes.ENUM('manual', 'cv', 'ai'),
      allowNull: false,
      defaultValue: 'manual'
    },
    proficiency_level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
      allowNull: false,
      defaultValue: 'intermediate'
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'candidate_skills',
    timestamps: true,
    underscored: true
  });

  CandidateSkill.associate = (models) => {
    CandidateSkill.belongsTo(models.CandidateProfile, {
      as: 'candidateProfile',
      foreignKey: 'candidate_profile_id'
    });
    CandidateSkill.belongsTo(models.Skill, {
      as: 'skill',
      foreignKey: 'skill_id'
    });
  };

  return CandidateSkill;
};
