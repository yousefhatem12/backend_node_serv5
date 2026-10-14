'use strict';

module.exports = (sequelize, DataTypes) => {
  const MentorConversation = sequelize.define('MentorConversation', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    context_mode: {
      type: DataTypes.ENUM('general', 'job', 'roadmap', 'interview_prep', 'application'),
      allowNull: false,
      defaultValue: 'general'
    },
    context_metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    is_archived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'mentor_conversations',
    timestamps: true,
    underscored: true
  });

  MentorConversation.associate = (models) => {
    MentorConversation.belongsTo(models.User, {
      as: 'user',
      foreignKey: 'user_id'
    });
    MentorConversation.hasMany(models.MentorMessage, {
      as: 'messages',
      foreignKey: 'conversation_id'
    });
  };

  return MentorConversation;
};
