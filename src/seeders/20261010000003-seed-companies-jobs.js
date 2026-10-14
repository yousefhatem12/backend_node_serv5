'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    // 1. Seed companies
    const companies = [
      {
        id: 1,
        name: 'Vodafone Intelligent Solutions (_VOIS)',
        normalized_name: 'vodafone intelligent solutions (_vois)',
        industry: 'Telecommunications & IT',
        country: 'Egypt',
        city: 'Giza',
        website_url: 'https://www.vodafone.com',
        description: 'Technology shared services centre for Vodafone Group.',
        is_verified: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        name: 'PayMob',
        normalized_name: 'paymob',
        industry: 'Fintech',
        country: 'Egypt',
        city: 'Cairo',
        website_url: 'https://paymob.com',
        description: 'Leading financial services and payment infrastructure provider.',
        is_verified: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 3,
        name: 'Instabug',
        normalized_name: 'instabug',
        industry: 'Software & Mobile DevOps',
        country: 'Egypt',
        city: 'Cairo',
        website_url: 'https://instabug.com',
        description: 'Mobile-first application performance monitoring and bug reporting.',
        is_verified: true,
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('companies', companies, { ignoreDuplicates: true });

    // 2. Seed company aliases
    const aliases = [
      {
        id: 1,
        company_id: 1,
        alias: '_VOIS',
        normalized_alias: '_vois',
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        company_id: 2,
        alias: 'PayMob Solutions',
        normalized_alias: 'paymob solutions',
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('company_aliases', aliases, { ignoreDuplicates: true });

    // 3. Seed job posts
    const jobPosts = [
      {
        id: 1,
        company_id: 1,
        title: 'Backend Node.js Engineer',
        canonical_role: 'Node.js Developer',
        description: 'We are looking for a skilled Backend Node.js Engineer to build scalable microservices and APIs.',
        job_type: 'job',
        employment_type: 'full-time',
        work_mode: 'hybrid',
        experience_level: 'mid-level',
        country: 'Egypt',
        city: 'Giza',
        min_years_experience: 2,
        max_years_experience: 5,
        salary_min: 25000,
        salary_max: 40000,
        salary_currency: 'EGP',
        source: 'internal',
        application_method: 'internal',
        published_at: now,
        expires_at: futureDate,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        company_id: 2,
        title: 'Full Stack React / Node Developer',
        canonical_role: 'Full Stack Developer',
        description: 'Join our merchant platforms squad building high-throughput payment checkout flows.',
        job_type: 'job',
        employment_type: 'full-time',
        work_mode: 'remote',
        experience_level: 'senior',
        country: 'Egypt',
        city: 'Cairo',
        min_years_experience: 4,
        max_years_experience: 8,
        salary_min: 45000,
        salary_max: 70000,
        salary_currency: 'EGP',
        source: 'internal',
        application_method: 'internal',
        published_at: now,
        expires_at: futureDate,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 3,
        company_id: 3,
        title: 'Software Engineering Intern',
        canonical_role: 'Software Engineer',
        description: 'Summer internship program for top CS students passionate about mobile and distributed systems.',
        job_type: 'internship',
        employment_type: 'contract',
        work_mode: 'on-site',
        experience_level: 'entry',
        country: 'Egypt',
        city: 'Cairo',
        min_years_experience: 0,
        max_years_experience: 1,
        salary_min: 8000,
        salary_max: 12000,
        salary_currency: 'EGP',
        source: 'internal',
        application_method: 'internal',
        published_at: now,
        expires_at: futureDate,
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('job_posts', jobPosts, { ignoreDuplicates: true });

    // 4. Seed job skills (Node.js/Express = 7, TypeScript = 3, React = 8, Docker = 11, PostgreSQL = 15)
    const jobSkills = [
      { job_post_id: 1, skill_id: 7, is_required: true, importance: 5, required_level: 'mid-level', created_at: now, updated_at: now },
      { job_post_id: 1, skill_id: 3, is_required: true, importance: 4, required_level: 'mid-level', created_at: now, updated_at: now },
      { job_post_id: 1, skill_id: 11, is_required: false, importance: 3, required_level: 'mid-level', created_at: now, updated_at: now },
      { job_post_id: 2, skill_id: 8, is_required: true, importance: 5, required_level: 'senior', created_at: now, updated_at: now },
      { job_post_id: 2, skill_id: 7, is_required: true, importance: 4, required_level: 'senior', created_at: now, updated_at: now },
      { job_post_id: 3, skill_id: 2, is_required: true, importance: 3, required_level: 'entry', created_at: now, updated_at: now }
    ];

    await queryInterface.bulkInsert('job_skills', jobSkills, { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('job_skills', null, {});
    await queryInterface.bulkDelete('job_posts', null, {});
    await queryInterface.bulkDelete('company_aliases', null, {});
    await queryInterface.bulkDelete('companies', null, {});
  }
};
