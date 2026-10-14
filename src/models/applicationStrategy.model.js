'use strict';

module.exports = (sequelize, DataTypes) => {
  const parseJson = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return val; }
    }
    return val;
  };

  const ApplicationStrategy = sequelize.define('ApplicationStrategy', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    job_post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    recommendation: {
      type: DataTypes.ENUM('apply_now', 'improve_gaps_first', 'alternative_roles'),
      allowNull: false
    },
    readiness_score: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    fit_level: {
      type: DataTypes.ENUM('strong_fit', 'moderate_fit', 'stretch'),
      allowNull: false
    },
    quick_wins: {
      type: DataTypes.JSON,
      allowNull: true,
      get() { return parseJson(this.getDataValue('quick_wins')); }
    },
    blocker_gaps: {
      type: DataTypes.JSON,
      allowNull: true,
      get() { return parseJson(this.getDataValue('blocker_gaps')); }
    },
    alternative_roles: {
      type: DataTypes.JSON,
      allowNull: true,
      get() { return parseJson(this.getDataValue('alternative_roles')); }
    },
    strategic_advice: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'application_strategies',
    timestamps: true,
    underscored: true
  });

  ApplicationStrategy.associate = (models) => {
    ApplicationStrategy.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    ApplicationStrategy.belongsTo(models.JobPost, {
      foreignKey: 'job_post_id',
      as: 'jobPost'
    });
  };

  return ApplicationStrategy;
};
