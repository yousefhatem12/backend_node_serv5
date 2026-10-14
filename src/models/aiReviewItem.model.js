'use strict';

module.exports = (sequelize, DataTypes) => {
  const AiReviewItem = sequelize.define('AiReviewItem', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    entity_type: {
      type: DataTypes.ENUM('cv_extraction', 'job_post', 'skill'),
      allowNull: false
    },
    entity_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'ai_engine'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'corrected', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    trigger_reason: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    confidence: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    raw_input: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    proposed_payload: {
      type: DataTypes.JSON,
      allowNull: false,
      get() {
        const val = this.getDataValue('proposed_payload');
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
      }
    },
    corrected_payload: {
      type: DataTypes.JSON,
      allowNull: true,
      get() {
        const val = this.getDataValue('corrected_payload');
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
      }
    },

    reviewer_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    decision_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewer_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'ai_review_items',
    timestamps: true,
    underscored: true
  });

  AiReviewItem.associate = (models) => {
    AiReviewItem.belongsTo(models.User, {
      as: 'reviewer',
      foreignKey: 'reviewer_id'
    });
    AiReviewItem.hasMany(models.AiReviewAudit, {
      as: 'audits',
      foreignKey: 'ai_review_item_id'
    });
  };

  return AiReviewItem;
};
