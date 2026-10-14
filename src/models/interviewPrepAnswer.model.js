'use strict';

module.exports = (sequelize, DataTypes) => {
  const parseJson = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return val; }
    }
    return val;
  };

  const InterviewPrepAnswer = sequelize.define('InterviewPrepAnswer', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    session_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    question_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    user_answer: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    score: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: true
    },
    strengths: {
      type: DataTypes.JSON,
      allowNull: true,
      get() { return parseJson(this.getDataValue('strengths')); }
    },
    improvements: {
      type: DataTypes.JSON,
      allowNull: true,
      get() { return parseJson(this.getDataValue('improvements')); }
    },
    model_answer: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    evaluated_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'interview_prep_answers',
    timestamps: true,
    underscored: true
  });

  InterviewPrepAnswer.associate = (models) => {
    InterviewPrepAnswer.belongsTo(models.InterviewPrepSession, {
      foreignKey: 'session_id',
      as: 'session'
    });
  };

  return InterviewPrepAnswer;
};
