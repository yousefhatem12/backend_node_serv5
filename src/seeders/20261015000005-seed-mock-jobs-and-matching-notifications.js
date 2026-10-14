'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 45);

    // 1. Seed New Top Tech Companies
    const companies = [
      {
        id: 4,
        name: 'Swvl',
        normalized_name: 'swvl',
        industry: 'Mobility Tech & Transit',
        country: 'Egypt',
        city: 'Cairo',
        website_url: 'https://swvl.com',
        description: 'Global tech-enabled mass transit and shared mobility platform.',
        is_verified: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 5,
        name: 'Fawry Banking & Payment Technology Services',
        normalized_name: 'fawry banking & payment technology services',
        industry: 'FinTech & Banking',
        country: 'Egypt',
        city: 'Cairo',
        website_url: 'https://fawry.com',
        description: 'Leading digital transformation & electronic payment platform in Egypt and MEA.',
        is_verified: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 6,
        name: 'Valeo Egypt',
        normalized_name: 'valeo egypt',
        industry: 'Automotive Software & AI',
        country: 'Egypt',
        city: 'Giza',
        website_url: 'https://www.valeo.com',
        description: 'Global automotive tech leader developing AI computer vision and embedded driving software.',
        is_verified: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 7,
        name: 'Capiter',
        normalized_name: 'capiter',
        industry: 'B2B E-Commerce & Supply Chain',
        country: 'Egypt',
        city: 'Cairo',
        website_url: 'https://capiter.com',
        description: 'B2B marketplace connecting FMCGs, wholesalers, and merchants with embedded finance.',
        is_verified: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 8,
        name: 'Bosta',
        normalized_name: 'bosta',
        industry: 'Logistics Tech & Delivery',
        country: 'Egypt',
        city: 'Cairo',
        website_url: 'https://bosta.co',
        description: 'Fast-growing on-demand courier and e-commerce fulfillment tech provider in Egypt & Saudi Arabia.',
        is_verified: true,
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('companies', companies, { ignoreDuplicates: true });

    // 2. Seed Company Aliases
    const aliases = [
      { id: 3, company_id: 4, alias: 'Swvl Egypt', normalized_alias: 'swvl egypt', created_at: now, updated_at: now },
      { id: 4, company_id: 5, alias: 'Fawry', normalized_alias: 'fawry', created_at: now, updated_at: now },
      { id: 5, company_id: 6, alias: 'Valeo Smart Village', normalized_alias: 'valeo smart village', created_at: now, updated_at: now },
      { id: 6, company_id: 8, alias: 'Bosta Deliveries', normalized_alias: 'bosta deliveries', created_at: now, updated_at: now }
    ];

    await queryInterface.bulkInsert('company_aliases', aliases, { ignoreDuplicates: true });

    // 3. Seed Diverse Mock Job Posts (id 4 through 11)
    const jobPosts = [
      {
        id: 4,
        company_id: 4,
        title: 'Senior DevOps & Cloud Platform Engineer',
        canonical_role: 'DevOps Engineer',
        description: 'We are seeking a Senior DevOps Engineer to scale our multi-region Kubernetes clusters on AWS, streamline GitOps deployment pipelines, and maintain zero-downtime microservices.',
        job_type: 'job',
        employment_type: 'full-time',
        work_mode: 'remote',
        experience_level: 'senior',
        country: 'Egypt',
        city: 'Cairo',
        min_years_experience: 5,
        max_years_experience: 9,
        salary_min: 55000,
        salary_max: 85000,
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
        id: 5,
        company_id: 5,
        title: 'Lead Node.js Microservices Architect',
        canonical_role: 'Lead Backend Engineer',
        description: 'Lead the architecture and implementation of high-throughput payment transaction processors handling millions of financial events daily with Node.js, Express, and distributed event streaming.',
        job_type: 'job',
        employment_type: 'full-time',
        work_mode: 'hybrid',
        experience_level: 'lead',
        country: 'Egypt',
        city: 'Cairo',
        min_years_experience: 6,
        max_years_experience: 11,
        salary_min: 75000,
        salary_max: 115000,
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
        id: 6,
        company_id: 6,
        title: 'Python & AI Computer Vision Specialist',
        canonical_role: 'AI Engineer',
        description: 'Work on cutting-edge automotive deep learning models and real-time computer vision inference systems embedded in next-generation autonomous driving ECUs.',
        job_type: 'job',
        employment_type: 'full-time',
        work_mode: 'hybrid',
        experience_level: 'mid-level',
        country: 'Egypt',
        city: 'Giza',
        min_years_experience: 3,
        max_years_experience: 6,
        salary_min: 42000,
        salary_max: 68000,
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
        id: 7,
        company_id: 2,
        title: 'Frontend React & Next.js Engineer',
        canonical_role: 'Frontend Developer',
        description: 'Join PayMob’s digital merchant portal squad. You will build highly responsive, accessible checkout dashboards with React 19, Next.js, and TypeScript.',
        job_type: 'job',
        employment_type: 'full-time',
        work_mode: 'remote',
        experience_level: 'mid-level',
        country: 'Egypt',
        city: 'Cairo',
        min_years_experience: 2,
        max_years_experience: 5,
        salary_min: 32000,
        salary_max: 52000,
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
        id: 8,
        company_id: 7,
        title: 'Full Stack JavaScript Engineer',
        canonical_role: 'Full Stack Developer',
        description: 'Develop full-stack merchant order fulfillment and inventory tracking services using TypeScript, Node.js, and React within our agile product teams.',
        job_type: 'job',
        employment_type: 'full-time',
        work_mode: 'hybrid',
        experience_level: 'mid-level',
        country: 'Egypt',
        city: 'Cairo',
        min_years_experience: 3,
        max_years_experience: 6,
        salary_min: 35000,
        salary_max: 55000,
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
        id: 9,
        company_id: 8,
        title: 'Junior Backend Engineer (Go & Node.js)',
        canonical_role: 'Backend Developer',
        description: 'Help engineer our next-generation logistics tracking, courier geofencing, and automated parcel sorting pipelines built with Go and Node.js.',
        job_type: 'job',
        employment_type: 'full-time',
        work_mode: 'on-site',
        experience_level: 'entry',
        country: 'Egypt',
        city: 'Cairo',
        min_years_experience: 1,
        max_years_experience: 3,
        salary_min: 22000,
        salary_max: 35000,
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
        id: 10,
        company_id: 3,
        title: 'Mobile & Cloud Infrastructure Intern',
        canonical_role: 'DevOps Engineer',
        description: 'A paid 6-month hands-on internship with Instabug’s Site Reliability Engineering team working on Docker containerization, Kubernetes monitoring, and CI/CD pipelines.',
        job_type: 'internship',
        employment_type: 'contract',
        work_mode: 'remote',
        experience_level: 'entry',
        country: 'Egypt',
        city: 'Cairo',
        min_years_experience: 0,
        max_years_experience: 1,
        salary_min: 12000,
        salary_max: 18000,
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
        id: 11,
        company_id: 1,
        title: 'Cloud Security & Compliance Engineer',
        canonical_role: 'Security Engineer',
        description: 'Protect multinational telecom infrastructure through automated cloud security scanning, IAM governance, and zero-trust policy enforcement across hybrid cloud estates.',
        job_type: 'job',
        employment_type: 'full-time',
        work_mode: 'hybrid',
        experience_level: 'senior',
        country: 'Egypt',
        city: 'Giza',
        min_years_experience: 5,
        max_years_experience: 9,
        salary_min: 52000,
        salary_max: 82000,
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

    // 4. Seed Job Skills Requirements (Mapping to Canonical Skills 1-18)
    // 2=JS, 3=TS, 4=Python, 5=Go, 7=Express.js, 8=React, 10=Next.js, 11=Docker, 12=Kubernetes, 13=AWS, 14=CI/CD, 15=MySQL, 16=PostgreSQL, 18=Git
    const jobSkills = [
      // Job 4: Senior DevOps (Swvl)
      { job_post_id: 4, skill_id: 11, is_required: true, importance: 5, required_level: 'senior', created_at: now, updated_at: now },
      { job_post_id: 4, skill_id: 12, is_required: true, importance: 5, required_level: 'senior', created_at: now, updated_at: now },
      { job_post_id: 4, skill_id: 13, is_required: true, importance: 5, required_level: 'senior', created_at: now, updated_at: now },
      { job_post_id: 4, skill_id: 14, is_required: true, importance: 4, required_level: 'senior', created_at: now, updated_at: now },

      // Job 5: Lead Node.js Architect (Fawry)
      { job_post_id: 5, skill_id: 7, is_required: true, importance: 5, required_level: 'lead', created_at: now, updated_at: now },
      { job_post_id: 5, skill_id: 3, is_required: true, importance: 5, required_level: 'lead', created_at: now, updated_at: now },
      { job_post_id: 5, skill_id: 15, is_required: true, importance: 4, required_level: 'senior', created_at: now, updated_at: now },
      { job_post_id: 5, skill_id: 11, is_required: false, importance: 3, required_level: 'mid-level', created_at: now, updated_at: now },

      // Job 6: AI Computer Vision (Valeo)
      { job_post_id: 6, skill_id: 4, is_required: true, importance: 5, required_level: 'mid-level', created_at: now, updated_at: now },
      { job_post_id: 6, skill_id: 11, is_required: false, importance: 3, required_level: 'mid-level', created_at: now, updated_at: now },
      { job_post_id: 6, skill_id: 18, is_required: true, importance: 3, required_level: 'mid-level', created_at: now, updated_at: now },

      // Job 7: Frontend React & Next.js (PayMob)
      { job_post_id: 7, skill_id: 8, is_required: true, importance: 5, required_level: 'mid-level', created_at: now, updated_at: now },
      { job_post_id: 7, skill_id: 10, is_required: true, importance: 4, required_level: 'mid-level', created_at: now, updated_at: now },
      { job_post_id: 7, skill_id: 3, is_required: true, importance: 4, required_level: 'mid-level', created_at: now, updated_at: now },
      { job_post_id: 7, skill_id: 2, is_required: true, importance: 4, required_level: 'mid-level', created_at: now, updated_at: now },

      // Job 8: Full Stack JS Engineer (Capiter)
      { job_post_id: 8, skill_id: 7, is_required: true, importance: 4, required_level: 'mid-level', created_at: now, updated_at: now },
      { job_post_id: 8, skill_id: 8, is_required: true, importance: 4, required_level: 'mid-level', created_at: now, updated_at: now },
      { job_post_id: 8, skill_id: 3, is_required: true, importance: 4, required_level: 'mid-level', created_at: now, updated_at: now },
      { job_post_id: 8, skill_id: 16, is_required: false, importance: 3, required_level: 'mid-level', created_at: now, updated_at: now },

      // Job 9: Junior Backend Go & Node (Bosta)
      { job_post_id: 9, skill_id: 5, is_required: true, importance: 4, required_level: 'entry', created_at: now, updated_at: now },
      { job_post_id: 9, skill_id: 7, is_required: true, importance: 4, required_level: 'entry', created_at: now, updated_at: now },
      { job_post_id: 9, skill_id: 15, is_required: true, importance: 3, required_level: 'entry', created_at: now, updated_at: now },

      // Job 10: Mobile & Cloud Intern (Instabug)
      { job_post_id: 10, skill_id: 11, is_required: true, importance: 4, required_level: 'entry', created_at: now, updated_at: now },
      { job_post_id: 10, skill_id: 14, is_required: true, importance: 3, required_level: 'entry', created_at: now, updated_at: now },
      { job_post_id: 10, skill_id: 18, is_required: true, importance: 3, required_level: 'entry', created_at: now, updated_at: now },

      // Job 11: Cloud Security (Vodafone)
      { job_post_id: 11, skill_id: 13, is_required: true, importance: 5, required_level: 'senior', created_at: now, updated_at: now },
      { job_post_id: 11, skill_id: 11, is_required: true, importance: 4, required_level: 'senior', created_at: now, updated_at: now },
      { job_post_id: 11, skill_id: 14, is_required: true, importance: 4, required_level: 'senior', created_at: now, updated_at: now }
    ];

    await queryInterface.bulkInsert('job_skills', jobSkills, { ignoreDuplicates: true });

    // 5. Seed Additional Realistic Job Matches for Candidates
    const jobMatches = [
      {
        id: 2,
        user_id: 3,
        job_post_id: 5,
        match_score: 95.00,
        match_level: 'strong',
        matched_skills_count: 4,
        missing_skills_count: 0,
        matched_skills: JSON.stringify(['Express.js', 'TypeScript', 'MySQL', 'Docker']),
        missing_skills: JSON.stringify([]),
        gap_analysis: JSON.stringify({ must_have_missing: [], nice_to_have_missing: [] }),
        explanation: 'Outstanding fit! All core technical requirements match candidate background with 3+ years in high-concurrency Node.js.',
        calculated_at: now,
        is_stale: false,
        created_at: now,
        updated_at: now
      },
      {
        id: 3,
        user_id: 3,
        job_post_id: 4,
        match_score: 91.50,
        match_level: 'strong',
        matched_skills_count: 3,
        missing_skills_count: 1,
        matched_skills: JSON.stringify(['Docker', 'AWS', 'CI/CD']),
        missing_skills: JSON.stringify(['Kubernetes']),
        gap_analysis: JSON.stringify({ must_have_missing: ['Kubernetes'], nice_to_have_missing: [] }),
        explanation: 'High match based on strong cloud foundations and verified Docker/CI-CD workflows.',
        calculated_at: now,
        is_stale: false,
        created_at: now,
        updated_at: now
      },
      {
        id: 4,
        user_id: 4,
        job_post_id: 7,
        match_score: 92.00,
        match_level: 'strong',
        matched_skills_count: 4,
        missing_skills_count: 0,
        matched_skills: JSON.stringify(['JavaScript', 'TypeScript', 'React', 'Next.js']),
        missing_skills: JSON.stringify([]),
        gap_analysis: JSON.stringify({ must_have_missing: [], nice_to_have_missing: [] }),
        explanation: 'Excellent alignment with candidate target role in frontend UI engineering and modern Next.js ecosystem.',
        calculated_at: now,
        is_stale: false,
        created_at: now,
        updated_at: now
      },
      {
        id: 5,
        user_id: 4,
        job_post_id: 10,
        match_score: 88.00,
        match_level: 'good',
        matched_skills_count: 2,
        missing_skills_count: 1,
        matched_skills: JSON.stringify(['Docker', 'Git']),
        missing_skills: JSON.stringify(['CI/CD']),
        gap_analysis: JSON.stringify({ must_have_missing: ['CI/CD'], nice_to_have_missing: [] }),
        explanation: 'Good entry-level match for cloud and container operations.',
        calculated_at: now,
        is_stale: false,
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('job_matches', jobMatches, { ignoreDuplicates: true });

    // 6. Seed Mock Matching Notifications ("hello in matchin")
    const notifications = [
      {
        id: 2,
        user_id: 3,
        type: 'job_match',
        title: 'Hello! New 95% Match in Backend Engineering',
        body: 'Hello Ahmed! We found a 95% match for your profile in Lead Node.js Microservices Architect at Fawry. Check out your skill compatibility now!',
        data: JSON.stringify({
          job_post_id: 5,
          job_title: 'Lead Node.js Microservices Architect',
          company_name: 'Fawry Banking & Payment Technology Services',
          match_score: 95.0,
          match_level: 'strong'
        }),
        read_at: null,
        created_at: now,
        updated_at: now
      },
      {
        id: 3,
        user_id: 3,
        type: 'job_match',
        title: 'Hello from MatchEngine: High Match Alert (91%)',
        body: 'Hello! You have matched with Senior DevOps & Cloud Platform Engineer at Swvl with an exceptional 91% match score.',
        data: JSON.stringify({
          job_post_id: 4,
          job_title: 'Senior DevOps & Cloud Platform Engineer',
          company_name: 'Swvl',
          match_score: 91.5,
          match_level: 'strong'
        }),
        read_at: null,
        created_at: new Date(now.getTime() - 1000 * 60 * 30), // 30 mins ago
        updated_at: now
      },
      {
        id: 4,
        user_id: 3,
        type: 'job_match',
        title: 'Hello Ahmed! Match Score Recalculated',
        body: 'Hello! Your latest roadmap skill progress has boosted your match score to 94% for Full Stack React / Node Developer at PayMob.',
        data: JSON.stringify({
          job_post_id: 2,
          job_title: 'Full Stack React / Node Developer',
          company_name: 'PayMob',
          match_score: 94.0,
          match_level: 'strong',
          previous_score: 82.0
        }),
        read_at: new Date(now.getTime() - 1000 * 60 * 120), // 2 hours ago (read)
        created_at: new Date(now.getTime() - 1000 * 60 * 180),
        updated_at: now
      },
      {
        id: 5,
        user_id: 3,
        type: 'job_match',
        title: 'Hello! Daily Matching Digest',
        body: 'Hello Ahmed! Here is your daily job matching summary: 4 high-match tech roles currently available with an average match score of 91%.',
        data: JSON.stringify({
          digest_date: '2026-10-15',
          total_matches: 4,
          highest_score: 95.0,
          match_score: 95.0,
          top_roles: ['Lead Node.js Microservices Architect', 'Senior DevOps & Cloud Platform Engineer']
        }),
        read_at: null,
        created_at: new Date(now.getTime() - 1000 * 60 * 240), // 4 hours ago
        updated_at: now
      },
      {
        id: 6,
        user_id: 4,
        type: 'job_match',
        title: 'Hello Sara! You Have a 92% Match in Frontend React',
        body: 'Hello Sara! MatchEngine found an exciting opportunity matching your skills: Frontend React & Next.js Engineer at PayMob with a 92% match score.',
        data: JSON.stringify({
          job_post_id: 7,
          job_title: 'Frontend React & Next.js Engineer',
          company_name: 'PayMob',
          match_score: 92.0,
          match_level: 'strong'
        }),
        read_at: null,
        created_at: now,
        updated_at: now
      },
      {
        id: 7,
        user_id: 4,
        type: 'job_match',
        title: 'Hello from SkillMatch Matching Hub',
        body: 'Hello! 3 new matching opportunities in Cairo and Alexandria were found today that match your target roles.',
        data: JSON.stringify({
          match_count: 3,
          top_job_id: 7,
          match_score: 89.0,
          locations: ['Cairo', 'Alexandria', 'Remote']
        }),
        read_at: null,
        created_at: new Date(now.getTime() - 1000 * 60 * 45), // 45 mins ago
        updated_at: now
      },
      {
        id: 8,
        user_id: 4,
        type: 'job_match',
        title: 'Hello! New Internship Match (88%)',
        body: 'Hello! You matched with Mobile & Cloud Infrastructure Intern at Instabug. Perfect match for your upcoming career milestones!',
        data: JSON.stringify({
          job_post_id: 10,
          job_title: 'Mobile & Cloud Infrastructure Intern',
          company_name: 'Instabug',
          match_score: 88.0,
          match_level: 'good'
        }),
        read_at: new Date(now.getTime() - 1000 * 60 * 60), // 1 hour ago (read)
        created_at: new Date(now.getTime() - 1000 * 60 * 90),
        updated_at: now
      },
      {
        id: 9,
        user_id: 3,
        type: 'job_match',
        title: 'Hello! AI Matching Recommendation',
        body: 'Hello! Our AI Matching Engine identified Python & AI Computer Vision Specialist at Valeo as a high-potential career step for you.',
        data: JSON.stringify({
          job_post_id: 6,
          job_title: 'Python & AI Computer Vision Specialist',
          company_name: 'Valeo Egypt',
          match_score: 86.5,
          match_level: 'good'
        }),
        read_at: null,
        created_at: new Date(now.getTime() - 1000 * 60 * 360), // 6 hours ago
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('notifications', notifications, { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    const { Op } = require('sequelize');

    // Remove seeded notifications
    await queryInterface.bulkDelete('notifications', {
      id: { [Op.in]: [2, 3, 4, 5, 6, 7, 8, 9] }
    }, {});

    // Remove seeded job matches
    await queryInterface.bulkDelete('job_matches', {
      id: { [Op.in]: [2, 3, 4, 5] }
    }, {});

    // Remove seeded job skills
    await queryInterface.bulkDelete('job_skills', {
      job_post_id: { [Op.in]: [4, 5, 6, 7, 8, 9, 10, 11] }
    }, {});

    // Remove seeded job posts
    await queryInterface.bulkDelete('job_posts', {
      id: { [Op.in]: [4, 5, 6, 7, 8, 9, 10, 11] }
    }, {});

    // Remove seeded company aliases
    await queryInterface.bulkDelete('company_aliases', {
      id: { [Op.in]: [3, 4, 5, 6] }
    }, {});

    // Remove seeded companies
    await queryInterface.bulkDelete('companies', {
      id: { [Op.in]: [4, 5, 6, 7, 8] }
    }, {});
  }
};
