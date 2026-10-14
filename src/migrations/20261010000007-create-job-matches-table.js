'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('job_matches', {
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
      match_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      match_level: {
        type: Sequelize.ENUM('low', 'moderate', 'good', 'strong'),
        allowNull: false,
        defaultValue: 'moderate'
      },
      matched_skills_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      missing_skills_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      matched_skills: {
        type: Sequelize.JSON,
        allowNull: true
      },
      missing_skills: {
        type: Sequelize.JSON,
        allowNull: true
      },
      gap_analysis: {
        type: Sequelize.JSON,
        allowNull: true
      },
      explanation: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      calculated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      is_stale: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    // Add unique index on (user_id, job_post_id) so each candidate has one current match per job
    await queryInterface.addIndex('job_matches', ['user_id', 'job_post_id'], {
      unique: true,
      name: 'idx_job_matches_user_job_unique'
    });

    // Add index for fast recommendation queries ordered by match score
    await queryInterface.addIndex('job_matches', ['user_id', 'match_score'], {
      name: 'idx_job_matches_user_score'
    });

    // Add index for match level queries
    await queryInterface.addIndex('job_matches', ['user_id', 'match_level'], {
      name: 'idx_job_matches_user_level'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('job_matches');
  }
};
