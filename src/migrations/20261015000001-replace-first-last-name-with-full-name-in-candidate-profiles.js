'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('candidate_profiles').catch(() => null);
    if (!tableInfo) return;

    // Drop legacy first_name if present
    if (tableInfo.first_name) {
      await queryInterface.removeColumn('candidate_profiles', 'first_name');
    }

    // Drop legacy last_name if present
    if (tableInfo.last_name) {
      await queryInterface.removeColumn('candidate_profiles', 'last_name');
    }

    // Ensure full_name column exists
    if (!tableInfo.full_name) {
      await queryInterface.addColumn('candidate_profiles', 'full_name', {
        type: Sequelize.STRING(150),
        allowNull: true
      });
    }

    // Ensure avatar column exists
    if (!tableInfo.avatar) {
      await queryInterface.addColumn('candidate_profiles', 'avatar', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('candidate_profiles').catch(() => null);
    if (!tableInfo) return;

    if (tableInfo.full_name) {
      await queryInterface.removeColumn('candidate_profiles', 'full_name');
    }
    if (!tableInfo.first_name) {
      await queryInterface.addColumn('candidate_profiles', 'first_name', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }
    if (!tableInfo.last_name) {
      await queryInterface.addColumn('candidate_profiles', 'last_name', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }
  }
};
