'use strict';

module.exports = (sequelize, DataTypes) => {
  const CvDocument = sequelize.define('CvDocument', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    candidate_profile_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    original_filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    storage_path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    file_size: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    version: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1
    },
    is_current: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'processing'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'cv_documents',
    timestamps: true,
    underscored: true
  });

  CvDocument.associate = (models) => {
    CvDocument.belongsTo(models.CandidateProfile, {
      as: 'candidateProfile',
      foreignKey: 'candidate_profile_id'
    });
    CvDocument.hasMany(models.CvExtraction, {
      as: 'extractions',
      foreignKey: 'cv_document_id'
    });
    CvDocument.hasMany(models.Application, {
      as: 'applications',
      foreignKey: 'cv_document_id'
    });
    CvDocument.hasMany(models.CvImprovementAnalysis, {
      as: 'analyses',
      foreignKey: 'cv_document_id'
    });
  };


  return CvDocument;
};
