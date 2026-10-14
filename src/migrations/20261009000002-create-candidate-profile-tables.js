'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. candidate_profiles table
    await queryInterface.createTable('candidate_profiles', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      full_name: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      date_of_birth: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'other'),
        allowNull: true
      },
      job_title: {
        type: Sequelize.STRING(150),
        allowNull: true
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
      github_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      linkedin_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      portfolio_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      military_status: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      years_of_experience: {
        type: Sequelize.DECIMAL(4, 1),
        allowNull: true,
        defaultValue: 0
      },
      looking_status: {
        type: Sequelize.ENUM('actively_looking', 'casually_looking', 'not_looking'),
        allowNull: false,
        defaultValue: 'actively_looking'
      },
      professional_summary: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      profile_completed_at: {
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

    await queryInterface.addIndex('candidate_profiles', ['user_id'], { unique: true });

    // 2. career_preferences table
    await queryInterface.createTable('career_preferences', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      candidate_profile_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        unique: true,
        references: {
          model: 'candidate_profiles',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      target_role: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      target_roles: {
        type: Sequelize.JSON,
        allowNull: true
      },
      job_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'full-time'
      },
      work_mode: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'remote'
      },
      preferred_country: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      preferred_city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      experience_level: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'mid-level'
      },
      career_goal: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      open_to_relocation: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      preferred_industries: {
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

    await queryInterface.addIndex('career_preferences', ['candidate_profile_id'], { unique: true });

    // 3. educations table
    await queryInterface.createTable('educations', {
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      institution: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      degree: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      field_of_study: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      education_level: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'bachelor'
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      is_current: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      grade: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      source: {
        type: Sequelize.ENUM('manual', 'cv'),
        allowNull: false,
        defaultValue: 'manual'
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

    await queryInterface.addIndex('educations', ['candidate_profile_id', 'start_date']);

    // 4. experiences table
    await queryInterface.createTable('experiences', {
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      job_title: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      company_name: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      employment_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'full-time'
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      is_current: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      technologies: {
        type: Sequelize.JSON,
        allowNull: true
      },
      source: {
        type: Sequelize.ENUM('manual', 'cv'),
        allowNull: false,
        defaultValue: 'manual'
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

    await queryInterface.addIndex('experiences', ['candidate_profile_id', 'start_date']);

    // 5. projects table
    await queryInterface.createTable('projects', {
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      technologies: {
        type: Sequelize.JSON,
        allowNull: true
      },
      project_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      github_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      source: {
        type: Sequelize.ENUM('manual', 'cv'),
        allowNull: false,
        defaultValue: 'manual'
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

    await queryInterface.addIndex('projects', ['candidate_profile_id']);

    // 6. certificates table
    await queryInterface.createTable('certificates', {
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      issuing_organization: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      issue_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      expiration_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      credential_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      credential_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      source: {
        type: Sequelize.ENUM('manual', 'cv'),
        allowNull: false,
        defaultValue: 'manual'
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

    await queryInterface.addIndex('certificates', ['candidate_profile_id']);

    // 7. languages table
    await queryInterface.createTable('languages', {
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      language: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      proficiency: {
        type: Sequelize.ENUM('basic', 'conversational', 'fluent', 'native'),
        allowNull: false,
        defaultValue: 'conversational'
      },
      source: {
        type: Sequelize.ENUM('manual', 'cv'),
        allowNull: false,
        defaultValue: 'manual'
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

    await queryInterface.addIndex('languages', ['candidate_profile_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('languages');
    await queryInterface.dropTable('certificates');
    await queryInterface.dropTable('projects');
    await queryInterface.dropTable('experiences');
    await queryInterface.dropTable('educations');
    await queryInterface.dropTable('career_preferences');
    await queryInterface.dropTable('candidate_profiles');
  }
};
