'use strict';

module.exports = (sequelize, DataTypes) => {
  const parseJson = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return val; }
    }
    return val;
  };

  const CvImprovementAnalysis = sequelize.define('CvImprovementAnalysis', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    cv_document_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    job_post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    target_role: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    overall_score: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    critical_issues: {
      type: DataTypes.JSON,
      allowNull: true,
      get() { return parseJson(this.getDataValue('critical_issues')); }
    },
    missing_keywords: {
      type: DataTypes.JSON,
      allowNull: true,
      get() { return parseJson(this.getDataValue('missing_keywords')); }
    },
    bullet_improvements: {
      type: DataTypes.JSON,
      allowNull: true,
      get() { return parseJson(this.getDataValue('bullet_improvements')); }
    },
    structural_tips: {
      type: DataTypes.JSON,
      allowNull: true,
      get() { return parseJson(this.getDataValue('structural_tips')); }
    }
  }, {
    tableName: 'cv_improvement_analyses',
    timestamps: true,
    underscored: true
  });

  CvImprovementAnalysis.associate = (models) => {
    CvImprovementAnalysis.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    CvImprovementAnalysis.belongsTo(models.CvDocument, {
      foreignKey: 'cv_document_id',
      as: 'cvDocument'
    });
    CvImprovementAnalysis.belongsTo(models.JobPost, {
      foreignKey: 'job_post_id',
      as: 'jobPost'
    });
  };

  return CvImprovementAnalysis;
};
