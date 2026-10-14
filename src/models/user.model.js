const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('candidate', 'admin', 'super_admin'),
      allowNull: false,
      defaultValue: 'candidate'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    underscored: true,
    timestamps: true,
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password')) {
          // If password is not already hashed with bcrypt
          if (!user.password.startsWith('$2')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        }
      }
    }
  });

  // Instance method to verify password
  User.prototype.verifyPassword = async function (plainPassword) {
    if (!this.password) return false;
    // Normalize Laravel bcrypt prefix $2y$ to $2b$ for bcryptjs compatibility
    const normalizedHash = this.password.replace(/^\$2y\$/, '$2b$');
    return bcrypt.compare(plainPassword, normalizedHash);
  };

  User.associate = (models) => {
    User.hasOne(models.CandidateProfile, { foreignKey: 'user_id', as: 'candidateProfile' });
    User.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });
    User.hasMany(models.JobMatch, { foreignKey: 'user_id', as: 'jobMatches' });
    User.hasMany(models.Roadmap, { foreignKey: 'user_id', as: 'roadmaps' });
    User.hasMany(models.MentorConversation, { foreignKey: 'user_id', as: 'mentorConversations' });
    User.hasMany(models.AuditLog, { foreignKey: 'actor_id', as: 'auditLogs' });
    User.hasMany(models.AiReviewAudit, { foreignKey: 'actor_id', as: 'reviewAudits' });
    User.hasMany(models.CvImprovementAnalysis, { foreignKey: 'user_id', as: 'cvImprovementAnalyses' });
    User.hasMany(models.InterviewPrepSession, { foreignKey: 'user_id', as: 'interviewPrepSessions' });
    User.hasMany(models.ApplicationStrategy, { foreignKey: 'user_id', as: 'applicationStrategies' });
  };


  return User;
};
