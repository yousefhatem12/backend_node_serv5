'use strict';

module.exports = (sequelize, DataTypes) => {
  const CvExtraction = sequelize.define('CvExtraction', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    cv_document_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    attempt_number: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    confidence_score: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true
    },
    extracted_data: {
      type: DataTypes.JSON,
      allowNull: true,
      get() {
        const raw = this.getDataValue('extracted_data');
        if (typeof raw === 'string') {
          try {
            return JSON.parse(raw);
          } catch (e) {
            return raw;
          }
        }
        return raw;
      }
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'cv_extractions',
    timestamps: true,
    underscored: true
  });

  CvExtraction.associate = (models) => {
    CvExtraction.belongsTo(models.CvDocument, {
      as: 'cvDocument',
      foreignKey: 'cv_document_id'
    });
  };

  return CvExtraction;
};
