'use strict';

module.exports = (sequelize, DataTypes) => {
  const SkillAlias = sequelize.define('SkillAlias', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    skill_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    alias: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    normalized_alias: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'skill_aliases',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeValidate: (sa) => {
        if (sa.alias) {
          sa.normalized_alias = sa.alias.trim().toLowerCase();
        }
      }
    }
  });

  SkillAlias.associate = (models) => {
    SkillAlias.belongsTo(models.Skill, {
      as: 'skill',
      foreignKey: 'skill_id'
    });
  };

  return SkillAlias;
};
