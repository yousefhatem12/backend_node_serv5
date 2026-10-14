#!/usr/bin/env node
'use strict';

require('dotenv').config();
const { sequelize } = require('../src/models');
const mockSeeder = require('../src/seeders/20261015000005-seed-mock-jobs-and-matching-notifications');

async function run() {
  console.log('🔄 [SkillMatch Seeder] Initializing mock jobs and matching notifications...');

  try {
    await sequelize.authenticate();
    console.log('✅ [SkillMatch Seeder] Connected to database successfully.');

    const queryInterface = sequelize.getQueryInterface();
    await mockSeeder.up(queryInterface);

    console.log('🎉 [SkillMatch Seeder] Successfully seeded:');
    console.log('   - 5 Tech Companies (Swvl, Fawry, Valeo, Capiter, Bosta)');
    console.log('   - 8 Diverse Tech Jobs (DevOps, Node.js Architect, AI Specialist, React/Next.js, etc.)');
    console.log('   - Associated Job Skills mapping');
    console.log('   - Realistic Job Matches for candidates (88% - 95%)');
    console.log('   - 8 "Hello in matchin" notifications for candidates (Ahmed & Sara)');

    process.exit(0);
  } catch (error) {
    console.error('❌ [SkillMatch Seeder] Seeding failed:', error.message);
    process.exit(1);
  }
}

run();
