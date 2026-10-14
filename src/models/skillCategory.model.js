'use strict';

module.exports = (sequelize, DataTypes) => {
  const SkillCategory = sequelize.define('SkillCategory', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'skill_categories',
    timestamps: true,
    underscored: true
  });

  SkillCategory.associate = (models) => {
    SkillCategory.hasMany(models.Skill, {
      as: 'skills',
      foreignKey: 'skill_category_id'
    });
  };

  return SkillCategory;
};
