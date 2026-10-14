'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);
    const now = new Date();

    // 1. Seed candidate user 4 (Sara Tarek) if not exists
    await queryInterface.bulkInsert('users', [
      {
        id: 4,
        name: 'Sara Tarek',
        email: 'sara.tarek@example.com',
        password: passwordHash,
        phone: '+201098765432',
        avatar: null,
        role: 'candidate',
        is_active: true,
        email_verified_at: now,
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 2. Seed Candidate Profiles for Ahmed (3) and Sara (4)
    await queryInterface.bulkInsert('candidate_profiles', [
      {
        id: 1,
        user_id: 3,
        job_title: 'Full Stack Node.js Engineer',
        country: 'Egypt',
        city: 'Cairo',
        years_of_experience: 3,
        professional_summary: 'Full Stack Node.js & TypeScript Engineer with 3 years experience building scalable backend microservices and payment gateways.',
        profile_completed_at: now,
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        user_id: 4,
        job_title: 'Junior Frontend Developer',
        country: 'Egypt',
        city: 'Alexandria',
        years_of_experience: 1,
        professional_summary: 'Junior Frontend Developer passionate about React, modern CSS, and accessible component design systems.',
        profile_completed_at: now,
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 3. Career Preferences
    await queryInterface.bulkInsert('career_preferences', [
      {
        id: 1,
        candidate_profile_id: 1,
        target_role: 'Senior Backend Engineer',
        target_roles: JSON.stringify(['Senior Backend Engineer', 'Lead Node.js Architect']),
        job_type: 'full-time',
        work_mode: 'remote',
        preferred_country: 'Egypt',
        preferred_city: 'Cairo',
        experience_level: 'senior',
        career_goal: 'Lead backend microservice architecture in high-growth tech companies.',
        open_to_relocation: false,
        preferred_industries: JSON.stringify(['FinTech', 'SaaS', 'E-Commerce']),
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        candidate_profile_id: 2,
        target_role: 'Frontend React Specialist',
        target_roles: JSON.stringify(['Frontend React Specialist', 'UI Engineer']),
        job_type: 'full-time',
        work_mode: 'hybrid',
        preferred_country: 'Egypt',
        preferred_city: 'Alexandria',
        experience_level: 'mid-level',
        career_goal: 'Specialize in frontend web performance and accessible design systems.',
        open_to_relocation: false,
        preferred_industries: JSON.stringify(['EdTech', 'Creative Tech']),
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 4. Educations
    await queryInterface.bulkInsert('educations', [
      {
        id: 1,
        candidate_profile_id: 1,
        institution: 'Cairo University',
        degree: 'Bachelor of Science',
        field_of_study: 'Computer Science',
        start_date: '2019-09-01',
        end_date: '2023-06-30',
        grade: 'Very Good',
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 5. Experiences
    await queryInterface.bulkInsert('experiences', [
      {
        id: 1,
        candidate_profile_id: 1,
        company_name: 'Fawry E-Payments',
        job_title: 'Backend Node.js Developer',
        employment_type: 'full-time',
        start_date: '2023-07-01',
        end_date: null,
        is_current: true,
        description: 'Engineered high-throughput payment reconciliation microservices using Node.js, Express, and MySQL.',
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 6. Projects
    await queryInterface.bulkInsert('projects', [
      {
        id: 1,
        candidate_profile_id: 1,
        name: 'Open Source Distributed Cache Manager',
        description: 'Lightweight in-memory cache clustering adapter for Node.js applications with LRU eviction.',
        project_url: 'https://github.com/ahmedwael/node-dist-cache',
        github_url: 'https://github.com/ahmedwael/node-dist-cache',
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 7. Candidate Skills
    await queryInterface.bulkInsert('candidate_skills', [
      { id: 1, candidate_profile_id: 1, skill_id: 7, created_at: now, updated_at: now }, // Node.js
      { id: 2, candidate_profile_id: 1, skill_id: 3, created_at: now, updated_at: now }, // TypeScript
      { id: 3, candidate_profile_id: 1, skill_id: 15, created_at: now, updated_at: now }, // PostgreSQL/SQL
      { id: 4, candidate_profile_id: 2, skill_id: 8, created_at: now, updated_at: now }, // React
      { id: 5, candidate_profile_id: 2, skill_id: 2, created_at: now, updated_at: now }  // JavaScript
    ], { ignoreDuplicates: true });

    // 8. CV Documents & Extractions
    await queryInterface.bulkInsert('cv_documents', [
      {
        id: 1,
        candidate_profile_id: 1,
        original_filename: 'Ahmed_Wael_CV_2026.pdf',
        storage_path: 'cvs/ahmed_cv_v1.pdf',
        mime_type: 'application/pdf',
        file_size: 145000,
        version: 1,
        is_current: true,
        status: 'completed',
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    await queryInterface.bulkInsert('cv_extractions', [
      {
        id: 1,
        cv_document_id: 1,
        attempt_number: 1,
        status: 'completed',
        confidence_score: 0.94,
        extracted_data: JSON.stringify({
          raw_text: 'Ahmed Wael - Full Stack Node.js Engineer with 3+ years experience building fintech microservices, REST APIs, and event-driven backends.',
          skills: ['Node.js', 'Express', 'MySQL', 'TypeScript'],
          experience_years: 3
        }),
        completed_at: now,
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 9. Job Applications & History
    await queryInterface.bulkInsert('applications', [
      {
        id: 1,
        candidate_profile_id: 1,
        job_post_id: 1,
        cv_document_id: 1,
        status: 'under_review',
        applied_at: now,
        notes: 'Candidate submitted portfolio with live API demo.',
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        candidate_profile_id: 1,
        job_post_id: 2,
        cv_document_id: 1,
        status: 'interview',
        applied_at: now,
        notes: 'Technical interview scheduled for Tuesday 2 PM.',
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    await queryInterface.bulkInsert('application_status_histories', [
      {
        id: 1,
        application_id: 1,
        changed_by_user_id: 3,
        from_status: null,
        to_status: 'submitted',
        notes: 'Initial application submission via SkillMatch platform.',
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        application_id: 1,
        changed_by_user_id: 2,
        from_status: 'submitted',
        to_status: 'under_review',
        notes: 'Application passed preliminary automated skill gap screening.',
        created_at: now,
        updated_at: now
      },
      {
        id: 3,
        application_id: 2,
        changed_by_user_id: 2,
        from_status: 'under_review',
        to_status: 'interview',
        notes: 'Recruiter invited candidate for live architecture round.',
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 10. Saved Jobs
    await queryInterface.bulkInsert('saved_jobs', [
      { id: 1, candidate_profile_id: 1, job_post_id: 2, created_at: now, updated_at: now }
    ], { ignoreDuplicates: true });

    // 11. Job Ingestion Source & Run
    await queryInterface.bulkInsert('job_sources', [
      {
        id: 1,
        name: 'Wuzzuf Egypt Tech API',
        slug: 'wuzzuf-egypt-tech',
        source_type: 'api',
        collection_method: 'http_json',
        base_url: 'https://api.wuzzuf.net/v1/jobs',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    await queryInterface.bulkInsert('ingestion_runs', [
      {
        id: 1,
        job_source_id: 1,
        trigger_type: 'manual',
        status: 'completed',
        jobs_found: 25,
        jobs_imported: 18,
        duplicates_count: 5,
        errors_count: 2,
        started_at: now,
        finished_at: now,
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 12. Dynamic Career Roadmap & Hierarchy
    await queryInterface.bulkInsert('roadmaps', [
      {
        id: 1,
        user_id: 3,
        target_type: 'role',
        target_role: 'Senior Backend Engineer',
        title: 'Senior Backend Engineer Career Roadmap',
        description: 'Comprehensive pathway to advance from mid-level to senior backend engineer mastering distributed systems and high concurrency.',
        rationale: 'Prioritizes architecture patterns, indexing, and Docker microservices based on current skill assessment.',
        status: 'in_progress',
        progress: 25.00,
        generation_version: 1,
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    await queryInterface.bulkInsert('roadmap_phases', [
      {
        id: 1,
        roadmap_id: 1,
        order: 1,
        title: 'Phase 1: Foundations & Prerequisites',
        description: 'Consolidate distributed systems theory and database internals.',
        status: 'completed',
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        roadmap_id: 1,
        order: 2,
        title: 'Phase 2: High Concurrency & Containerization',
        description: 'Docker containerization and Redis pub/sub architectures.',
        status: 'in_progress',
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    await queryInterface.bulkInsert('roadmap_milestones', [
      {
        id: 1,
        roadmap_phase_id: 1,
        order: 1,
        title: 'Master ACID transactions and indexing',
        description: 'Deep dive into transaction isolation, locking, and query execution plans.',
        status: 'completed',
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        roadmap_phase_id: 2,
        order: 1,
        title: 'Build microservice with Docker & Redis',
        description: 'Containerize multi-service applications with caching and message queues.',
        status: 'in_progress',
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    await queryInterface.bulkInsert('roadmap_tasks', [
      {
        id: 1,
        roadmap_milestone_id: 1,
        order: 1,
        title: 'Review composite B-Tree indexes and query execution plans',
        description: 'Analyze EXPLAIN output on high-volume MySQL queries.',
        status: 'completed',
        weight: 10,
        evidence: 'https://github.com/ahmedwael/mysql-indexing-lab',
        notes: 'Verified index usage on multi-column where clauses.',
        completed_at: now,
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        roadmap_milestone_id: 2,
        order: 1,
        title: 'Containerize multi-service Express app with Docker Compose',
        description: 'Configure multi-stage Docker builds and docker-compose orchestration.',
        status: 'pending',
        weight: 15,
        evidence: null,
        notes: null,
        completed_at: null,
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 13. AI Mentor Conversation & Messages
    await queryInterface.bulkInsert('mentor_conversations', [
      {
        id: 1,
        user_id: 3,
        title: 'Fintech Backend Transition Guidance',
        context_mode: 'job_specific',
        is_archived: false,
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    await queryInterface.bulkInsert('mentor_messages', [
      {
        id: 1,
        conversation_id: 1,
        sender: 'user',
        message: 'How should I prepare for my upcoming PayMob architecture interview next week?',
        suggested_actions: null,
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        conversation_id: 1,
        sender: 'mentor',
        message: 'Focus on transaction isolation levels, idempotency keys in payment webhooks, and how you handle concurrent checkout requests under peak flash-sales.',
        suggested_actions: JSON.stringify([
          { label: 'Practice Payment Idempotency Questions', action_type: 'interview_prep', target_id: 'q3' },
          { label: 'Review Active Application', action_type: 'view_application', target_id: '2' }
        ]),
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 14. Job Match
    await queryInterface.bulkInsert('job_matches', [
      {
        id: 1,
        user_id: 3,
        job_post_id: 1,
        match_score: 87.50,
        match_level: 'strong',
        matched_skills_count: 3,
        missing_skills_count: 1,
        matched_skills: JSON.stringify(['Node.js', 'TypeScript', 'PostgreSQL']),
        missing_skills: JSON.stringify(['Docker']),
        gap_analysis: JSON.stringify({ must_have_missing: ['Docker'], nice_to_have_missing: [] }),
        explanation: 'High match based on verified Node.js and TypeScript skills.',
        calculated_at: now,
        is_stale: false,
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 15. AI Review Queue Item & Audit
    await queryInterface.bulkInsert('ai_review_items', [
      {
        id: 1,
        entity_type: 'cv_extraction',
        entity_id: 1,
        source: 'cv_parser',
        status: 'approved',
        trigger_reason: 'Low confidence in legacy framework extraction',
        confidence: 0.68,
        raw_input: 'Experience with Node.js and AngularJS legacy port',
        proposed_payload: JSON.stringify({ skills: ['Node.js', 'AngularJS'] }),
        corrected_payload: null,
        reviewer_id: 2,
        decision_reason: 'Confirmed skills match candidate profile evidence.',
        reviewed_at: now,
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    await queryInterface.bulkInsert('ai_review_audits', [
      {
        id: 1,
        ai_review_item_id: 1,
        actor_id: 2,
        action: 'approved',
        old_status: 'pending',
        new_status: 'approved',
        decision_reason: 'Confirmed skills match candidate profile evidence.',
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 16. CV Improvement Analysis
    await queryInterface.bulkInsert('cv_improvement_analyses', [
      {
        id: 1,
        user_id: 3,
        cv_document_id: 1,
        job_post_id: 1,
        target_role: 'Backend Node.js Engineer',
        overall_score: 82,
        critical_issues: JSON.stringify(['Experience bullets could feature more latency and throughput metrics.']),
        missing_keywords: JSON.stringify(['Docker', 'Kubernetes', 'CI/CD']),
        bullet_improvements: JSON.stringify([
          {
            section: 'Work Experience',
            role: 'Backend Node.js Developer',
            original_sample: 'Built APIs with Node.js and Express.',
            suggested_rewrite: 'Architected high-throughput payment APIs in Node.js, reducing average response latency by 28% across 100k daily transactions.',
            rationale: 'Includes quantifiable metrics and strong active verb.'
          }
        ]),
        structural_tips: JSON.stringify([
          'Maintain reverse-chronological layout.',
          'Group skills into Languages, Frameworks, and Databases.'
        ]),
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 17. Interview Prep Session & Answer
    await queryInterface.bulkInsert('interview_prep_sessions', [
      {
        id: 1,
        user_id: 3,
        job_post_id: 1,
        target_role: 'Backend Node.js Engineer',
        difficulty: 'mid-level',
        status: 'active',
        questions_payload: JSON.stringify([
          {
            id: 'q1',
            question: 'How does the Node.js event loop handle asynchronous I/O operations without blocking the main thread?',
            topic: 'Node.js Architecture',
            type: 'technical',
            difficulty: 'mid-level',
            model_answer_guidance: 'Explain libuv thread pool, polling phase, event demultiplexing, and callback queues.'
          }
        ]),
        total_questions: 1,
        answered_questions: 1,
        average_score: 85.00,
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    await queryInterface.bulkInsert('interview_prep_answers', [
      {
        id: 1,
        session_id: 1,
        question_id: 'q1',
        question_text: 'How does the Node.js event loop handle asynchronous I/O operations without blocking the main thread?',
        user_answer: 'Node.js uses libuv and non-blocking sockets. File and DNS I/O run on the libuv thread pool while network operations use OS epoll/kqueue.',
        score: 85,
        strengths: JSON.stringify(['Accurately explained libuv and OS event demultiplexing.']),
        improvements: JSON.stringify(['Could mention phases of the event loop (timers, poll, check).']),
        model_answer: 'Thorough coverage of event loop phases and thread pool allocation.',
        evaluated_at: now,
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 18. Application Strategy
    await queryInterface.bulkInsert('application_strategies', [
      {
        id: 1,
        user_id: 3,
        job_post_id: 1,
        recommendation: 'apply_now',
        readiness_score: 88,
        fit_level: 'strong_fit',
        quick_wins: JSON.stringify(['Emphasize your 3 years of Node.js production experience in your summary.']),
        blocker_gaps: JSON.stringify([]),
        alternative_roles: JSON.stringify([]),
        strategic_advice: 'Strong match with core backend requirements. Submit promptly with links to your live projects.',
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    // 19. Audit Logs & Notifications
    await queryInterface.bulkInsert('audit_logs', [
      {
        id: 1,
        action: 'ai_review.approve',
        entity_type: 'AiReviewItem',
        entity_id: 1,
        actor_id: 2,
        source: 'admin_portal',
        old_values: JSON.stringify({ status: 'pending' }),
        new_values: JSON.stringify({ status: 'approved' }),
        ip_address: '127.0.0.1',
        user_agent: 'SkillMatch-Admin/1.0',
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });

    await queryInterface.bulkInsert('notifications', [
      {
        id: 1,
        user_id: 3,
        type: 'interview_invitation',
        title: 'Interview Scheduled',
        body: 'FinTech Cloud Inc has invited you for a technical architecture interview!',
        data: JSON.stringify({ job_post_id: 2, application_id: 2 }),
        read_at: null,
        created_at: now,
        updated_at: now
      }
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('notifications', null, {});
    await queryInterface.bulkDelete('audit_logs', null, {});
    await queryInterface.bulkDelete('application_strategies', null, {});
    await queryInterface.bulkDelete('interview_prep_answers', null, {});
    await queryInterface.bulkDelete('interview_prep_sessions', null, {});
    await queryInterface.bulkDelete('cv_improvement_analyses', null, {});
    await queryInterface.bulkDelete('ai_review_audits', null, {});
    await queryInterface.bulkDelete('ai_review_items', null, {});
    await queryInterface.bulkDelete('job_matches', null, {});
    await queryInterface.bulkDelete('mentor_messages', null, {});
    await queryInterface.bulkDelete('mentor_conversations', null, {});
    await queryInterface.bulkDelete('roadmap_tasks', null, {});
    await queryInterface.bulkDelete('roadmap_milestones', null, {});
    await queryInterface.bulkDelete('roadmap_phases', null, {});
    await queryInterface.bulkDelete('roadmaps', null, {});
    await queryInterface.bulkDelete('ingestion_runs', null, {});
    await queryInterface.bulkDelete('job_sources', null, {});
    await queryInterface.bulkDelete('saved_jobs', null, {});
    await queryInterface.bulkDelete('application_status_histories', null, {});
    await queryInterface.bulkDelete('applications', null, {});
    await queryInterface.bulkDelete('cv_extractions', null, {});
    await queryInterface.bulkDelete('cv_documents', null, {});
    await queryInterface.bulkDelete('candidate_skills', null, {});
    await queryInterface.bulkDelete('projects', null, {});
    await queryInterface.bulkDelete('experiences', null, {});
    await queryInterface.bulkDelete('educations', null, {});
    await queryInterface.bulkDelete('career_preferences', null, {});
    await queryInterface.bulkDelete('candidate_profiles', null, {});
    await queryInterface.bulkDelete('users', { id: 4 }, {});
  }
};
