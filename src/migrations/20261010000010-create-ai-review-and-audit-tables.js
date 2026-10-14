'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. ai_review_items
    await queryInterface.createTable('ai_review_items', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      entity_type: {
        type: Sequelize.ENUM('cv_extraction', 'job_post', 'skill'),
        allowNull: false
      },
      entity_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      source: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'ai_engine'
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'corrected', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      trigger_reason: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      confidence: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      raw_input: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      proposed_payload: {
        type: Sequelize.JSON,
        allowNull: false
      },
      corrected_payload: {
        type: Sequelize.JSON,
        allowNull: true
      },
      reviewer_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      decision_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reviewer_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reviewed_at: {
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

    // 2. ai_review_audits
    await queryInterface.createTable('ai_review_audits', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      ai_review_item_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'ai_review_items',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      actor_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action: {
        type: Sequelize.ENUM('approved', 'corrected', 'rejected'),
        allowNull: false
      },
      old_status: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      new_status: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      decision_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reviewer_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      corrected_payload: {
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

    // 3. audit_logs
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      actor_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      entity_type: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      entity_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true
      },
      source: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'admin_portal'
      },
      old_values: {
        type: Sequelize.JSON,
        allowNull: true
      },
      new_values: {
        type: Sequelize.JSON,
        allowNull: true
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.STRING(255),
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
    await queryInterface.addIndex('ai_review_items', ['status', 'entity_type'], {
      name: 'idx_ai_review_status_entity'
    });
    await queryInterface.addIndex('ai_review_items', ['confidence'], {
      name: 'idx_ai_review_confidence'
    });
    await queryInterface.addIndex('ai_review_audits', ['ai_review_item_id'], {
      name: 'idx_ai_review_audits_item'
    });
    await queryInterface.addIndex('audit_logs', ['action'], {
      name: 'idx_audit_logs_action'
    });
    await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id'], {
      name: 'idx_audit_logs_entity'
    });
    await queryInterface.addIndex('audit_logs', ['actor_id'], {
      name: 'idx_audit_logs_actor'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('ai_review_audits');
    await queryInterface.dropTable('ai_review_items');
  }
};
