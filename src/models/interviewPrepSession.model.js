'use strict';

module.exports = (sequelize, DataTypes) => {
  const parseJson = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return val; }
    }
    return val;
  };

  const InterviewPrepSession = sequelize.define('InterviewPrepSession', {
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
      allowNull: true
    },
    target_role: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    difficulty: {
      type: DataTypes.ENUM('entry', 'mid-level', 'senior'),
      allowNull: false,
      defaultValue: 'mid-level'
    },
    status: {
      type: DataTypes.ENUM('active', 'completed'),
      allowNull: false,
      defaultValue: 'active'
    },
    questions_payload: {
      type: DataTypes.JSON,
      allowNull: false,
      get() { return parseJson(this.getDataValue('questions_payload')); }
    },
    total_questions: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    answered_questions: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    average_score: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true
    }
  }, {
    tableName: 'interview_prep_sessions',
    timestamps: true,
    underscored: true
  });

  InterviewPrepSession.associate = (models) => {
    InterviewPrepSession.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    InterviewPrepSession.belongsTo(models.JobPost, {
      foreignKey: 'job_post_id',
      as: 'jobPost'
    });
    InterviewPrepSession.hasMany(models.InterviewPrepAnswer, {
      foreignKey: 'session_id',
      as: 'answers'
    });
  };

  return InterviewPrepSession;
};
