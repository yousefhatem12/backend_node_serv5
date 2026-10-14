'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // 1. Categories
    const categories = [
      { id: 1, name: 'Programming Languages', description: 'Core languages', created_at: now, updated_at: now },
      { id: 2, name: 'Web Frameworks', description: 'Frontend and backend frameworks', created_at: now, updated_at: now },
      { id: 3, name: 'Cloud & DevOps', description: 'Infrastructure, containers, cloud platforms', created_at: now, updated_at: now },
      { id: 4, name: 'Databases', description: 'Relational, document, key-value datastores', created_at: now, updated_at: now },
      { id: 5, name: 'Tools & Version Control', description: 'Developer productivity tools', created_at: now, updated_at: now }
    ];

    await queryInterface.bulkInsert('skill_categories', categories, { ignoreDuplicates: true });

    // 2. Canonical Skills
    const skills = [
      // Languages
      { id: 1, skill_category_id: 1, name: 'PHP', normalized_name: 'php', category: 'Programming Languages', is_verified: true, created_at: now, updated_at: now },
      { id: 2, skill_category_id: 1, name: 'JavaScript', normalized_name: 'javascript', category: 'Programming Languages', is_verified: true, created_at: now, updated_at: now },
      { id: 3, skill_category_id: 1, name: 'TypeScript', normalized_name: 'typescript', category: 'Programming Languages', is_verified: true, created_at: now, updated_at: now },
      { id: 4, skill_category_id: 1, name: 'Python', normalized_name: 'python', category: 'Programming Languages', is_verified: true, created_at: now, updated_at: now },
      { id: 5, skill_category_id: 1, name: 'Go', normalized_name: 'go', category: 'Programming Languages', is_verified: true, created_at: now, updated_at: now },

      // Frameworks
      { id: 6, skill_category_id: 2, name: 'Laravel', normalized_name: 'laravel', category: 'Web Frameworks', is_verified: true, created_at: now, updated_at: now },
      { id: 7, skill_category_id: 2, name: 'Express.js', normalized_name: 'express.js', category: 'Web Frameworks', is_verified: true, created_at: now, updated_at: now },
      { id: 8, skill_category_id: 2, name: 'React', normalized_name: 'react', category: 'Web Frameworks', is_verified: true, created_at: now, updated_at: now },
      { id: 9, skill_category_id: 2, name: 'Vue.js', normalized_name: 'vue.js', category: 'Web Frameworks', is_verified: true, created_at: now, updated_at: now },
      { id: 10, skill_category_id: 2, name: 'Next.js', normalized_name: 'next.js', category: 'Web Frameworks', is_verified: true, created_at: now, updated_at: now },

      // DevOps
      { id: 11, skill_category_id: 3, name: 'Docker', normalized_name: 'docker', category: 'Cloud & DevOps', is_verified: true, created_at: now, updated_at: now },
      { id: 12, skill_category_id: 3, name: 'Kubernetes', normalized_name: 'kubernetes', category: 'Cloud & DevOps', is_verified: true, created_at: now, updated_at: now },
      { id: 13, skill_category_id: 3, name: 'AWS', normalized_name: 'aws', category: 'Cloud & DevOps', is_verified: true, created_at: now, updated_at: now },
      { id: 14, skill_category_id: 3, name: 'CI/CD', normalized_name: 'ci/cd', category: 'Cloud & DevOps', is_verified: true, created_at: now, updated_at: now },

      // Databases
      { id: 15, skill_category_id: 4, name: 'MySQL', normalized_name: 'mysql', category: 'Databases', is_verified: true, created_at: now, updated_at: now },
      { id: 16, skill_category_id: 4, name: 'PostgreSQL', normalized_name: 'postgresql', category: 'Databases', is_verified: true, created_at: now, updated_at: now },
      { id: 17, skill_category_id: 4, name: 'MongoDB', normalized_name: 'mongodb', category: 'Databases', is_verified: true, created_at: now, updated_at: now },

      // Tools
      { id: 18, skill_category_id: 5, name: 'Git', normalized_name: 'git', category: 'Tools & Version Control', is_verified: true, created_at: now, updated_at: now }
    ];

    await queryInterface.bulkInsert('skills', skills, { ignoreDuplicates: true });

    // 3. Aliases
    const aliases = [
      { id: 1, skill_id: 12, alias: 'k8s', normalized_alias: 'k8s', created_at: now, updated_at: now },
      { id: 2, skill_id: 16, alias: 'postgres', normalized_alias: 'postgres', created_at: now, updated_at: now },
      { id: 3, skill_id: 9, alias: 'vue3', normalized_alias: 'vue3', created_at: now, updated_at: now },
      { id: 4, skill_id: 2, alias: 'js', normalized_alias: 'js', created_at: now, updated_at: now },
      { id: 5, skill_id: 3, alias: 'ts', normalized_alias: 'ts', created_at: now, updated_at: now }
    ];

    await queryInterface.bulkInsert('skill_aliases', aliases, { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('skill_aliases', null, {});
    await queryInterface.bulkDelete('skills', null, {});
    await queryInterface.bulkDelete('skill_categories', null, {});
  }
};
