'use strict';

module.exports = (sequelize, DataTypes) => {
  const AiReviewAudit = sequelize.define('AiReviewAudit', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    ai_review_item_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    actor_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    action: {
      type: DataTypes.ENUM('approved', 'corrected', 'rejected'),
      allowNull: false
    },
    old_status: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    new_status: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    decision_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewer_notes: {
      type: DataTypes.TEXT,
      allowNull: true
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
    }

  }, {
    tableName: 'ai_review_audits',
    timestamps: true,
    underscored: true
  });

  AiReviewAudit.associate = (models) => {
    AiReviewAudit.belongsTo(models.AiReviewItem, {
      as: 'reviewItem',
      foreignKey: 'ai_review_item_id'
    });
    AiReviewAudit.belongsTo(models.User, {
      as: 'actor',
      foreignKey: 'actor_id'
    });
  };

  return AiReviewAudit;
};
