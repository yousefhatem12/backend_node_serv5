'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. job_sources
    await queryInterface.createTable('job_sources', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true
      },
      source_type: {
        type: Sequelize.ENUM('api', 'scraper', 'rss', 'manual'),
        allowNull: false,
        defaultValue: 'scraper'
      },
      collection_method: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'playwright'
      },
      base_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      schedule_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      schedule_expression: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      configuration: {
        type: Sequelize.JSON,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      last_run_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_status: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      error_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
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

    // 2. ingestion_runs
    await queryInterface.createTable('ingestion_runs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      job_source_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'job_sources',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      trigger_type: {
        type: Sequelize.ENUM('scheduled', 'manual'),
        allowNull: false,
        defaultValue: 'manual'
      },
      status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
      },
      jobs_found: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      jobs_imported: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      duplicates_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      errors_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      finished_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      error_message: {
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

    // 3. raw_jobs
    await queryInterface.createTable('raw_jobs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      job_source_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'job_sources',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ingestion_run_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'ingestion_runs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      external_id: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      source_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      raw_payload: {
        type: Sequelize.JSON,
        allowNull: false
      },
      content_fingerprint: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      extraction_status: {
        type: Sequelize.ENUM('pending', 'processed', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
      },
      deduplication_status: {
        type: Sequelize.ENUM('unique', 'duplicate'),
        allowNull: false,
        defaultValue: 'unique'
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
      error_message: {
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

    // Add indexes for efficient deduplication and queries
    await queryInterface.addIndex('raw_jobs', ['content_fingerprint'], {
      name: 'idx_raw_jobs_fingerprint'
    });
    await queryInterface.addIndex('raw_jobs', ['job_source_id', 'external_id'], {
      name: 'idx_raw_jobs_source_external'
    });
    await queryInterface.addIndex('raw_jobs', ['ingestion_run_id'], {
      name: 'idx_raw_jobs_run'
    });
    await queryInterface.addIndex('ingestion_runs', ['job_source_id', 'created_at'], {
      name: 'idx_ingestion_runs_source_created'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('raw_jobs');
    await queryInterface.dropTable('ingestion_runs');
    await queryInterface.dropTable('job_sources');
  }
};
