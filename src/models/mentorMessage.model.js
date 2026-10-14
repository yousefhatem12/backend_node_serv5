'use strict';

module.exports = (sequelize, DataTypes) => {
  const MentorMessage = sequelize.define('MentorMessage', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    conversation_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    sender: {
      type: DataTypes.ENUM('user', 'mentor'),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    suggested_actions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    context_snapshot: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'mentor_messages',
    timestamps: true,
    underscored: true
  });

  MentorMessage.associate = (models) => {
    MentorMessage.belongsTo(models.MentorConversation, {
      as: 'conversation',
      foreignKey: 'conversation_id'
    });
  };

  return MentorMessage;
};
