'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);
    const now = new Date();

    await queryInterface.bulkInsert('users', [
      {
        id: 1,
        name: 'Super Admin',
        email: 'superadmin@skillmatch.com',
        password: passwordHash,
        phone: '+201000000001',
        avatar: null,
        role: 'super_admin',
        is_active: true,
        email_verified_at: now,
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        name: 'Operations Admin',
        email: 'admin@skillmatch.com',
        password: passwordHash,
        phone: '+201000000002',
        avatar: null,
        role: 'admin',
        is_active: true,
        email_verified_at: now,
        created_at: now,
        updated_at: now
      },
      {
        id: 3,
        name: 'Ahmed Wael',
        email: 'ahmed.wael@example.com',
        password: passwordHash,
        phone: '+201012345678',
        avatar: null,
        role: 'candidate',
        is_active: true,
        email_verified_at: now,
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });
  },


  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', {
      email: ['superadmin@skillmatch.com', 'admin@skillmatch.com', 'ahmed.wael@example.com']
    }, {});
  }
};
