const { Model } = require('sequelize');

const APPLICATION_STATUSES = [
  'submitted',
  'under_review',
  'shortlisted',
  'interview',
  'offer',
  'rejected',
  'withdrawn'
];

module.exports = (sequelize, DataTypes) => {
  class Application extends Model {
    static associate(models) {
      Application.belongsTo(models.CandidateProfile, {
        foreignKey: 'candidate_profile_id',
        as: 'candidateProfile'
      });
      Application.belongsTo(models.JobPost, {
        foreignKey: 'job_post_id',
        as: 'job'
      });
      Application.belongsTo(models.CvDocument, {
        foreignKey: 'cv_document_id',
        as: 'cvDocument'
      });
      Application.hasMany(models.ApplicationStatusHistory, {
        foreignKey: 'application_id',
        as: 'histories'
      });
    }

    canTransitionTo(newStatus) {
      if (this.status === 'withdrawn') return false;
      if (this.status === newStatus) return false;
      return APPLICATION_STATUSES.includes(newStatus);
    }
  }

  Application.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      candidate_profile_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
      },
      job_post_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
      },
      cv_document_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'submitted',
        validate: {
          isIn: [APPLICATION_STATUSES]
        }
      },
      cover_letter: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      applied_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Application',
      tableName: 'applications',
      underscored: true
    }
  );

  Application.STATUSES = APPLICATION_STATUSES;

  return Application;
};
