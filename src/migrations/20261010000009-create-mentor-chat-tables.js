'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. mentor_conversations
    await queryInterface.createTable('mentor_conversations', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      context_mode: {
        type: Sequelize.ENUM('general', 'job', 'roadmap', 'interview_prep', 'application'),
        allowNull: false,
        defaultValue: 'general'
      },
      context_metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      is_archived: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      last_message_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // 2. mentor_messages
    await queryInterface.createTable('mentor_messages', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      conversation_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'mentor_conversations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sender: {
        type: Sequelize.ENUM('user', 'mentor'),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      suggested_actions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      context_snapshot: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Indexes
    await queryInterface.addIndex('mentor_conversations', ['user_id', 'is_archived'], {
      name: 'idx_mentor_conversations_user_archived'
    });
    await queryInterface.addIndex('mentor_conversations', ['user_id', 'last_message_at'], {
      name: 'idx_mentor_conversations_user_last_msg'
    });
    await queryInterface.addIndex('mentor_messages', ['conversation_id', 'created_at'], {
      name: 'idx_mentor_messages_conv_created'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('mentor_messages');
    await queryInterface.dropTable('mentor_conversations');
  }
};
