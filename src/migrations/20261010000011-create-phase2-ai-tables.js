'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. cv_improvement_analyses
    await queryInterface.createTable('cv_improvement_analyses', {
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
      cv_document_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'cv_documents',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      job_post_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'job_posts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      target_role: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      overall_score: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      critical_issues: {
        type: Sequelize.JSON,
        allowNull: true
      },
      missing_keywords: {
        type: Sequelize.JSON,
        allowNull: true
      },
      bullet_improvements: {
        type: Sequelize.JSON,
        allowNull: true
      },
      structural_tips: {
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

    await queryInterface.addIndex('cv_improvement_analyses', ['user_id']);
    await queryInterface.addIndex('cv_improvement_analyses', ['job_post_id']);

    // 2. interview_prep_sessions
    await queryInterface.createTable('interview_prep_sessions', {
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
      job_post_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'job_posts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      target_role: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      difficulty: {
        type: Sequelize.ENUM('entry', 'mid-level', 'senior'),
        allowNull: false,
        defaultValue: 'mid-level'
      },
      status: {
        type: Sequelize.ENUM('active', 'completed'),
        allowNull: false,
        defaultValue: 'active'
      },
      questions_payload: {
        type: Sequelize.JSON,
        allowNull: false
      },
      total_questions: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      answered_questions: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      average_score: {
        type: Sequelize.DECIMAL(4, 2),
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

    await queryInterface.addIndex('interview_prep_sessions', ['user_id']);
    await queryInterface.addIndex('interview_prep_sessions', ['job_post_id']);

    // 3. interview_prep_answers
    await queryInterface.createTable('interview_prep_answers', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      session_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'interview_prep_sessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      question_id: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      question_text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      user_answer: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      score: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: true
      },
      strengths: {
        type: Sequelize.JSON,
        allowNull: true
      },
      improvements: {
        type: Sequelize.JSON,
        allowNull: true
      },
      model_answer: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      evaluated_at: {
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

    await queryInterface.addIndex('interview_prep_answers', ['session_id']);

    // 4. application_strategies
    await queryInterface.createTable('application_strategies', {
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
      job_post_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'job_posts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      recommendation: {
        type: Sequelize.ENUM('apply_now', 'improve_gaps_first', 'alternative_roles'),
        allowNull: false
      },
      readiness_score: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      fit_level: {
        type: Sequelize.ENUM('strong_fit', 'moderate_fit', 'stretch'),
        allowNull: false
      },
      quick_wins: {
        type: Sequelize.JSON,
        allowNull: true
      },
      blocker_gaps: {
        type: Sequelize.JSON,
        allowNull: true
      },
      alternative_roles: {
        type: Sequelize.JSON,
        allowNull: true
      },
      strategic_advice: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('application_strategies', ['user_id', 'job_post_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('application_strategies');
    await queryInterface.dropTable('interview_prep_answers');
    await queryInterface.dropTable('interview_prep_sessions');
    await queryInterface.dropTable('cv_improvement_analyses');
  }
};
