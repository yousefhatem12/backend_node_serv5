# 🚀 SkillMatch Backend (Node.js + Express + Sequelize + MySQL)

SkillMatch is a production-grade Career Intelligence & Job-Matching platform backend, completely migrated and extended from Laravel into **Node.js LTS (CommonJS) + Express**, **Sequelize ORM**, and **MySQL (XAMPP)**.

---

## 📋 Table of Contents
- [Architecture & Design Principles](#-architecture--design-principles)
- [🤖 AI Endpoints & Integration Guide (Parts 1-12)](./README_AI_INTEGRATION.md)
- [Prerequisites & Environment Setup](#-prerequisites--environment-setup)
- [Database Migrations & Seeders](#-database-migrations--seeders)
- [Running the Application](#-running-the-application)
- [Background Queue & Cron Scheduler](#-background-queue--cron-scheduler)
- [API Domains & Endpoint Reference](#-api-domains--endpoint-reference)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Security, Performance & Hardening](#-security-performance--hardening)
- [Phase Summary & Status](#-phase-summary--status)

---

## 🏛 Architecture & Design Principles

The backend adheres strictly to modular MVC patterns, strong validation boundaries, and zero unapproved external infrastructure dependencies (No Redis, Docker, Kafka, BullMQ, or Prisma):

```
skillmatch-backend-node/
├── src/
│   ├── app.js                 # Express application setup, middlewares, routes mounting
│   ├── server.js              # Server bootstrapper, DB authentication, worker & cron initialization
│   ├── config/                # Environment variables, database connection, constants
│   ├── controllers/           # HTTP handlers (delegates to services, returns standard resources)
│   ├── services/              # Business logic layer, domain orchestration, audit logging
│   ├── models/                # Sequelize model definitions and relational associations
│   ├── migrations/            # 11 Sequelize CLI schema migrations
│   ├── seeders/               # 4 Database seeders (roles, taxonomy, companies/jobs, demo ecosystem)
│   ├── validators/            # Dedicated Zod validation schemas strictly outside controllers
│   ├── middlewares/           # Authentication (JWT), RBAC roles, rate limiting, locale, errors
│   ├── routes/                # Modular Express routers mounted under /api
│   ├── resources/             # Laravel-compatible API resource transformers
│   ├── ai/                    # Rule-based fallback engines & adapters for external AI services
│   ├── jobs/                  # Database-backed in-process queue worker and node-cron scheduler
│   ├── locales/               # Bilingual i18n dictionaries (en.json, ar.json)
│   └── utils/                 # Structured Winston logger, standard response envelopes, errors
├── tests/
│   ├── unit/                  # Pure unit tests (validators, responses, RBAC, queue worker)
│   └── integration/           # Supertest API tests covering all domains on skillmatch_test
├── storage/                   # File uploads (CV documents, temporary parsing artifacts)
├── .env.example               # Standard environment configuration template
├── package.json               # Dependencies and execution scripts
├── PROGRESS.md                # Phase-by-phase implementation tracker
└── README.md                  # Comprehensive handover documentation
```

### 🔑 Key Architecture Rules
1. **Validation Boundary**: All validation schemas reside in `src/validators/` outside controllers. Requests are validated via `validate.middleware.js` using Zod and return exact Laravel-compatible 422 maps:
   ```json
   {
     "message": "The given data was invalid.",
     "errors": {
       "email": ["Invalid email address."]
     }
   }
   ```
2. **Response Envelopes**:
   - Single item: `{ "data": { ... } }`
   - Action confirmation: `{ "message": "...", "data": { ... } }`
   - Paginated list: `{ "data": [ ... ], "links": { ... }, "meta": { "current_page": 1, "last_page": 5, "per_page": 15, "total": 68 } }`
3. **Database-Backed Asynchronous Queues**: Zero Redis required. Background processing uses atomic MySQL row locking (`SELECT FOR UPDATE` / `SKIP LOCKED`) on the `jobs` table with exponential backoff and failed job tracking.
4. **AI Microservice Readiness**: Dedicated AI service adapters (`AiMatchService`, `AiRoadmapService`, `AiMentorService`, `AiCvImproverService`, `AiInterviewCoachService`, `AiApplicationStrategyService`) operate with deterministic local fallbacks and can seamlessly toggle to external AI endpoints via environment variables.

---

## 🛠 Prerequisites & Environment Setup

### 1. Requirements
- **Node.js LTS** (v20+ or v25+)
- **npm** (v10+)
- **XAMPP** (or MySQL 8.0+ / MariaDB 10.4+) running on `127.0.0.1:3306` with default user `root` (no password).

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure MySQL has the application and test databases created:
```sql
CREATE DATABASE IF NOT EXISTS skillmatch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS skillmatch_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 🗄 Database Migrations & Seeders

### Run Migrations
Run schema migrations on the main database:
```bash
npm run migrate
```
For the test database:
```bash
npm run migrate:test
```

### Run Database Seeders
Seed the default administrator accounts, skills taxonomy, tech companies, job postings, and the full demo ecosystem:
```bash
npm run seed
```

#### Default Credentials Seeded:
| Role | Email | Password |
|---|---|---|
| **Super Admin** | `superadmin@skillmatch.com` | `Password123!` |
| **Admin** | `admin@skillmatch.com` | `Password123!` |
| **Candidate 1** | `ahmed.wael@example.com` | `Password123!` |
| **Candidate 2** | `sara.tarek@example.com` | `Password123!` |

---

## 🚀 Running the Application

### Development Mode (with nodemon):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server starts by default on port `8000`:
- **API Base URL**: `http://localhost:8000/api`
- **Health Check**: `http://localhost:8000/api/health`

---

## ⚙ Background Queue & Cron Scheduler

1. **Queue Worker**:
   - Polling interval: 2 seconds.
   - Built-in handlers:
     - `cv_parsing`: Background parsing of candidate CV documents.
     - `job_ingestion_run`: Background execution of scheduled job scrapers and API feeds.
     - `job_match_recalculation`: Dynamic recalculation of vacancy match scores upon skill profile updates.
2. **Cron Scheduler** (`node-cron`):
   - Inactive job expiry sweep (Daily at midnight).
   - Ingestion source scheduled execution checks (Hourly).
   - Email verification token cleanup (Daily at 03:00 AM).

---

## 🌐 API Domains & Endpoint Reference

### 1. Health & Localization
- `GET /api/health` — System status, database health, uptime, and bilingual greeting (`Accept-Language: ar` / `en`).

### 2. Authentication & Password Security
- `POST /api/auth/register` — Candidate registration (Rate limited: 10/min).
- `POST /api/auth/verify-email-otp` — Verify 6-digit email activation OTP.
- `POST /api/auth/resend-email-otp` — Resend activation OTP (Rate limited: 1/min).
- `POST /api/auth/login` — Account login, Bearer JWT issuance.
- `GET /api/auth/me` — Authenticated user identity.
- `POST /api/auth/refresh` — Refresh expired JWT token.
- `POST /api/auth/logout` — Revoke token / session invalidation.
- `POST /api/auth/forgot-password` — Request password reset OTP.
- `POST /api/auth/forgot-password/verify-otp` — Exchange OTP for temporary reset token.
- `POST /api/auth/reset-password` — Finalize password reset.

### 3. Candidate Profile & Portfolio
- `GET /api/candidate/profile` — Full candidate profile with educations, experiences, projects.
- `PATCH /api/candidate/profile` — Update candidate profile attributes.
- `GET /api/candidate/career-preferences` — Candidate role, industry, and work mode targets.
- `PATCH /api/candidate/career-preferences` — Update career preferences.
- `GET|POST /api/candidate/educations` — Educations listing & creation.
- `GET|PATCH|DELETE /api/candidate/educations/:id` — Education item management.
- `GET|POST /api/candidate/experiences` — Work experiences listing & creation.
- `GET|PATCH|DELETE /api/candidate/experiences/:id` — Work experience item management.
- `GET|POST /api/candidate/projects` — Projects listing & creation.
- `GET|PATCH|DELETE /api/candidate/projects/:id` — Project item management.

### 4. Skills Taxonomy & Candidate Skills
- `GET /api/skills/search` — Search canonical skills and aliases with deduplication.
- `GET|POST /api/candidate/skills` — Candidate attached skills management.
- `DELETE /api/candidate/skills/:id` — Remove candidate skill attachment.
- `POST /api/admin/skills` — (Admin) Create canonical skill.
- `PATCH /api/admin/skills/:id` — (Admin) Update skill attributes.
- `POST /api/admin/skills/:id/merge` — (Admin) Merge duplicate skill into canonical target.
- `GET|POST /api/admin/skills/:id/aliases` — (Admin) Skill aliases management.
- `PATCH|DELETE /api/admin/skills/:id/aliases/:aliasId` — (Admin) Update or remove alias.

### 5. CV Document Lifecycle
- `POST /api/cv/upload` — Upload PDF/DOCX (up to 5MB), dispatch background parsing job.
- `GET /api/cv/status/:cvDocument` — Processing status and extracted entity payload.
- `GET /api/cv/history` — All candidate uploaded CV versions.
- `POST /api/cv/retry/:cvDocument` — Re-queue failed parsing attempt.
- `POST /api/cv/extractions/:extraction/verify` — Candidate confirms extracted skills and experience, updating profile completion.

### 6. Companies & Jobs Feed
- `GET /api/jobs` — Public vacancies feed with multi-faceted filtering, skill requirements, and pagination.
- `GET /api/jobs/:jobPost` — Vacancy details with company profile and required skills.
- `POST|DELETE /api/jobs/:jobPost/save` — Save/bookmark vacancy.
- `GET /api/saved-jobs` — List saved vacancies.
- `GET|POST /api/admin/companies` — (Admin) Company directory and creation.
- `GET|PATCH /api/admin/companies/:company` — (Admin) Company profile management.
- `POST /api/admin/companies/:sourceCompany/merge` — (Admin) Merge company duplicate into target.
- `POST /api/admin/jobs` — (Admin) Create job vacancy with skill requirements.
- `PATCH /api/admin/jobs/:jobPost` — (Admin) Update vacancy attributes and skill requirements.

### 7. Applications Lifecycle
- `GET /api/applications` — Applications list (candidate sees own, admin sees platform-wide).
- `POST /api/applications` — Submit application with duplicate prevention and vacancy validation.
- `GET /api/applications/:application` — Application details with chronological status audit trail.
- `PATCH /api/applications/:application/status` — (Admin) Progress application through hiring stages.
- `POST /api/applications/:application/withdraw` — Candidate self-withdrawal.
- `PATCH /api/applications/:application/notes` — Private candidate tracking notes.

### 8. Notifications System
- `GET /api/notifications` — In-app notification inbox with `unread_only` filter.
- `GET /api/notifications/unread-count` — Real-time unread notifications counter badge.
- `PATCH /api/notifications/:notification/read` — Mark notification as read.
- `PATCH /api/notifications/read-all` — Mark all user notifications as read.
- `POST /api/admin/notifications/compose` — (Admin) Broadcast announcement or send targeted alerts.

### 9. Job Aggregation & Ingestion Pipeline
- `GET|POST /api/admin/job-sources` — (Admin) Manage external job sources (API, scraper, RSS).
- `GET|PATCH|DELETE /api/admin/job-sources/:jobSource` — (Admin) Source details and configuration.
- `POST /api/admin/job-sources/:jobSource/run` — (Admin) Trigger manual or batched ingestion run.
- `GET /api/admin/job-sources/:jobSource/runs` — (Admin) Ingestion runs history for source.
- `GET /api/admin/ingestion-runs` — (Admin) Platform-wide ingestion runs telemetry.
- `GET /api/admin/raw-jobs` — (Admin) Staged raw vacancy payloads with deduplication status.

### 10. Match Engine & Explainable Fit
- `GET /api/jobs/:jobPost/match` — Explainable match score (0-100), matched/missing skills, and gap analysis.
- `POST /api/jobs/:jobPost/match/recalculate` — Force recalculation of match score.
- `GET /api/jobs/recommendations` — Personalized vacancies feed ranked descending by match score.
- `GET /api/candidate/skill-gaps` — Aggregated high-priority skill gaps across target vacancies.
- `GET /api/admin/job-matches` — (Admin) Platform-wide match records inspection.

### 11. Dynamic Career Roadmaps
- `POST /api/roadmaps` — Generate personalized 4-phase career roadmap targeting role or job.
- `GET /api/roadmaps` — List candidate roadmaps.
- `GET /api/roadmaps/:roadmap` — Full roadmap hierarchy (Phases -> Milestones -> Tasks).
- `POST /api/roadmaps/:roadmap/refresh` — Versioned roadmap regeneration based on updated skills.
- `PATCH /api/roadmap-tasks/:roadmapTask/complete` — Mark learning task completed and recalculate weighted progress.

### 12. AI Career Mentor Chat
- `POST /api/mentor/conversations` — Start mentor session with grounded context.
- `GET /api/mentor/conversations` — List candidate conversation sessions.
- `GET /api/mentor/conversations/:conversation` — Conversation details and chronological message history.
- `POST /api/mentor/conversations/:conversation/messages` — Post message, obtain grounded AI mentor reply with suggested actions.
- `PATCH /api/mentor/conversations/:conversation` — Rename session or toggle archive state.
- `DELETE /api/mentor/conversations/:conversation` — Delete conversation session.
- `GET /api/mentor/context-preview` — Inspect grounded candidate context snapshot.

### 13. Admin Operations & AI Review Queue
- `GET /api/admin/ai-review-items` — (Admin) Review queue items with confidence and status filters.
- `GET /api/admin/ai-review-items/:aiReviewItem` — (Admin) Detailed review item with 3-way payload comparison.
- `POST /api/admin/ai-review-items/:aiReviewItem/approve` — (Admin) Approve pending AI review item.
- `POST /api/admin/ai-review-items/:aiReviewItem/correct` — (Admin) Human-in-the-loop correction.
- `POST /api/admin/ai-review-items/:aiReviewItem/reject` — (Admin) Reject review item with reason.
- `GET /api/admin/audit-logs` — (Admin) Global immutable audit trail.
- `GET /api/admin/users` — (Admin) Platform user directory with role and status filters.
- `GET /api/admin/users/:user` — (Admin) User profile and activity details.
- `PATCH /api/admin/users/:user/status` — (Admin) Activate/suspend user account.
- `PATCH /api/admin/users/:user/role` — (Admin) Update user role (candidate, admin, super_admin).
- `GET /api/admin/statistics` — (Admin) Platform-wide telemetry and dashboard metrics.

### 14. Phase-2 AI Features
- `POST /api/candidate/cv-improvements/analyze` — ATS & STAR format CV analysis against role or job post.
- `GET /api/candidate/cv-improvements/latest` — Latest CV improvement analysis.
- `GET /api/candidate/cv-improvements` — Paginated history of CV improvements.
- `POST /api/interview-prep/sessions` — Initialize 5-question mock technical & behavioral interview session.
- `GET /api/interview-prep/sessions` — List candidate interview prep sessions.
- `GET /api/interview-prep/sessions/:session` — Session questions, user answers, and evaluations.
- `POST /api/interview-prep/sessions/:session/evaluate` — Submit answer for automated evaluation and scoring.
- `POST /api/application-strategy/assess` — Assess vacancy application readiness (0-100), quick wins, and blocker gaps.
- `GET /api/application-strategy/:strategy` — Application strategy assessment details.
- `GET /api/application-strategy` — Paginated history of strategy assessments.

---

## 🧪 Testing & Quality Assurance

The test suite runs with **Jest** and **Supertest** against the dedicated `skillmatch_test` database:

```bash
npm test
```

### Coverage Overview
- **19 Test Suites** (100% Passing)
- **262 Integration & Unit Tests**
- Covers authentication, security headers, role authorization, validation schemas, CV parsing, job ingestion, match scoring, roadmaps, mentor chat, admin moderation, AI review queue, Phase-2 AI, and production hardening.

---

## 🛡 Security, Performance & Hardening

1. **HTTP Security**:
   - `helmet` security headers enabled (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`).
   - `cors` origin isolation.
2. **Rate Limiting**:
   - Authentication endpoints throttled to prevent brute force (Registration: 10/min, Login: 5/min, OTP Resend: 1/min).
   - Generative AI endpoints throttled (Roadmap generation: 5/min, CV analysis: 5/min, Interview prep: 10/min).
3. **Sensitive Data Protection**:
   - Winston logger automatically redacts sensitive fields (`password`, `token`, `secret`, `authorization`, `apiKey`) to prevent credential leakage in log files or console streams.
4. **Graceful Shutdown**:
   - Listens for `SIGINT` and `SIGTERM` signals.
   - Halts the background worker polling and cron jobs.
   - Closes open HTTP listeners and safely drains the Sequelize MySQL connection pool.
5. **Database Indexing**:
   - Optimized composite B-Tree indexes across all foreign keys, status columns, slugs, and lookup queries.

---

## 🚦 Phase Summary & Status

| Phase | Description | Status |
|---|---|---|
| **Phase 0** | Scaffold, MVC, Sequelize + XAMPP, Queue, Worker, Scheduler, Validators | **Completed** ✅ |
| **Phase 1** | Auth & Security: Register, OTP Verify/Resend, Login, Me, Refresh, Password Reset, RBAC | **Completed** ✅ |
| **Phase 2** | Candidate Profile & Career Preferences, Educations, Experiences, Projects | **Completed** ✅ |
| **Phase 3** | Skills Taxonomy, Aliases, Candidate Skills, Search & Merging | **Completed** ✅ |
| **Phase 4** | CV Lifecycle: Upload, Versioning, Background Parsing, Verify/Sync | **Completed** ✅ |
| **Phase 5** | Companies, Jobs Feed, Filtering & Expiry | **Completed** ✅ |
| **Phase 6** | Saved Jobs, Applications Lifecycle, Status History & Notes | **Completed** ✅ |
| **Phase 7** | In-App Notifications, Unread Counter & Admin Composer | **Completed** ✅ |
| **Phase 8** | Job Aggregation Pipeline: Sources, Ingestion, Deduplication, Fingerprinting | **Completed** ✅ |
| **Phase 9** | Match Engine, Explainable Skill Gaps & Personalized Recommendations | **Completed** ✅ |
| **Phase 10** | Dynamic Career Roadmaps, Milestones, Weighted Progress & Refresh | **Completed** ✅ |
| **Phase 11** | AI Mentor Chat: Context Builder, Conversation Sessions & History | **Completed** ✅ |
| **Phase 12** | Admin Operations: Users, Statistics, Moderation & AI Review Queue | **Completed** ✅ |
| **Phase 13** | Phase-2 AI: CV Improver, Interview Prep, Application Strategy | **Completed** ✅ |
| **Phase 14** | Hardening, Performance, Demo Seeders & Handover Artifacts | **Completed** ✅ |
