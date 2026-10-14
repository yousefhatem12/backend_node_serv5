'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. companies table
    await queryInterface.createTable('companies', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true
      },
      normalized_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true
      },
      industry: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      website_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      linkedin_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      logo_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.addIndex('companies', ['normalized_name'], {
      name: 'companies_normalized_name_index'
    });

    // 2. company_aliases table
    await queryInterface.createTable('company_aliases', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      company_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      alias: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true
      },
      normalized_alias: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true
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

    await queryInterface.addIndex('company_aliases', ['normalized_alias'], {
      name: 'company_aliases_normalized_alias_index'
    });

    // 3. job_posts table
    await queryInterface.createTable('job_posts', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      company_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      canonical_role: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      job_type: {
        type: Sequelize.ENUM('job', 'internship'),
        allowNull: false,
        defaultValue: 'job'
      },
      employment_type: {
        type: Sequelize.ENUM('full-time', 'part-time', 'contract'),
        allowNull: false,
        defaultValue: 'full-time'
      },
      work_mode: {
        type: Sequelize.ENUM('remote', 'hybrid', 'on-site'),
        allowNull: false,
        defaultValue: 'on-site'
      },
      experience_level: {
        type: Sequelize.ENUM('entry', 'mid-level', 'senior', 'lead'),
        allowNull: false,
        defaultValue: 'mid-level'
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      min_years_experience: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: 0
      },
      max_years_experience: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      salary_min: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true
      },
      salary_max: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true
      },
      salary_currency: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: 'EGP'
      },
      source: {
        type: Sequelize.ENUM('internal', 'scraped', 'aggregated'),
        allowNull: false,
        defaultValue: 'internal'
      },
      source_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      application_method: {
        type: Sequelize.ENUM('internal', 'external'),
        allowNull: false,
        defaultValue: 'internal'
      },
      external_apply_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      expires_at: {
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

    await queryInterface.addIndex('job_posts', ['company_id'], { name: 'job_posts_company_id_index' });
    await queryInterface.addIndex('job_posts', ['is_active', 'expires_at'], { name: 'job_posts_active_expires_index' });
    await queryInterface.addIndex('job_posts', ['job_type', 'work_mode', 'experience_level'], { name: 'job_posts_filters_index' });

    // 4. job_skills table
    await queryInterface.createTable('job_skills', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
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
      skill_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'skills',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      importance: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 3
      },
      required_level: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'mid-level'
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

    await queryInterface.addIndex('job_skills', ['job_post_id', 'skill_id'], {
      unique: true,
      name: 'job_skills_unique_post_skill'
    });

    // 5. saved_jobs table
    await queryInterface.createTable('saved_jobs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      candidate_profile_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'candidate_profiles',
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

    await queryInterface.addIndex('saved_jobs', ['candidate_profile_id', 'job_post_id'], {
      unique: true,
      name: 'saved_jobs_unique_profile_post'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saved_jobs');
    await queryInterface.dropTable('job_skills');
    await queryInterface.dropTable('job_posts');
    await queryInterface.dropTable('company_aliases');
    await queryInterface.dropTable('companies');
  }
};
