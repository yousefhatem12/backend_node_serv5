# 🌟 SkillMatch Backend Platform

[![Laravel](https://img.shields.io/badge/Laravel-11%20%2F%2012-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)](https://laravel.com)
[![PHP](https://img.shields.io/badge/PHP-8.3-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://php.net)
[![JWT Auth](https://img.shields.io/badge/JWT-tymon%2Fjwt--auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1%20%2F%20Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](http://localhost:8000/api/documentation)
[![Inertia.js](https://img.shields.io/badge/Inertia-React%20%2B%20TS-9553E9?style=for-the-badge&logo=inertia&logoColor=white)](https://inertiajs.com)

**SkillMatch** is a career intelligence and job matching platform built with Laravel 11/12, PHP 8.3, and Inertia/React. It bridges the gap between candidates and employers through automated job ingestion, deterministic deduplication, CV parsing with human-in-the-loop verification, intelligent job matching, and AI-driven personalized career learning roadmaps.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Comprehensive Features Breakdown](#-comprehensive-features-breakdown)
  - [1. Authentication, Security & Account Management](#1-authentication-security--account-management)
  - [2. Candidate Profile & Portfolio Management](#2-candidate-profile--portfolio-management)
  - [3. CV / Resume Processing & Verification Pipeline](#3-cv--resume-processing--verification-pipeline)
  - [4. Jobs Feed, Discovery & Matching Engine](#4-jobs-feed-discovery--matching-engine)
  - [5. Job Applications & Status Tracking Lifecycle](#5-job-applications--status-tracking-lifecycle)
  - [6. AI Career Roadmaps & Learning Progress](#6-ai-career-roadmaps--learning-progress)
  - [7. In-App Notification Center](#7-in-app-notification-center)
  - [8. Admin: Job Ingestion, Fingerprinting & Deduplication](#8-admin-job-ingestion-fingerprinting--deduplication)
  - [9. Admin: Company Intelligence & Entity Merging](#9-admin-company-intelligence--entity-merging)
  - [10. Admin: Skill Taxonomy & Ontology Management](#10-admin-skill-taxonomy--ontology-management)
  - [11. Admin: Human-in-the-Loop AI Review Queue](#11-admin-human-in-the-loop-ai-review-queue)
  - [12. Admin: System Audit Logging & Telemetry](#12-admin-system-audit-logging--telemetry)
  - [13. Internationalization (i18n) & Localization](#13-internationalization-i18n--localization)
  - [14. Frontend Admin & User Portal](#14-frontend-admin--user-portal)
- [Data Models & Schema](#-data-models--schema)
- [Environment Configuration (.env)](#-environment-configuration-env)
- [Local Installation & Setup](#-local-installation--setup)
- [Testing & Code Quality](#-testing--code-quality)
- [API Documentation & Reference](#-api-documentation--reference)

---

## 🏛 Architectural Overview

The application follows clean architecture principles with a strong separation of concerns:

```
                            ┌────────────────────────────────────────┐
                            │           Client Applications          │
                            │ (Inertia React SPA / Mobile / Swagger) │
                            └───────────────────┬────────────────────┘
                                                │ HTTP / REST / JWT
                                                ▼
                            ┌────────────────────────────────────────┐
                            │            HTTP Middleware             │
                            │  (JWT Auth, Roles, SetLocale, Throttle)│
                            └───────────────────┬────────────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
┌──────────────────┐                  ┌──────────────────┐                  ┌──────────────────┐
│   Auth & Users   │                  │ Candidate Domain │                  │   Admin Domain   │
│ - Register / OTP │                  │ - Profile & CV   │                  │ - Ingestion Runs │
│ - Login / JWT    │                  │ - Applications   │                  │ - Company Merging│
│ - OAuth Google   │                  │ - AI Roadmaps    │                  │ - AI Review Queue│
│ - Password Reset │                  │ - Saved Jobs     │                  │ - Skill Taxonomy │
└────────┬─────────┘                  └────────┬─────────┘                  └────────┬─────────┘
         │                                     │                                     │
         └─────────────────────────────────────┼─────────────────────────────────────┘
                                               │
                                               ▼
                            ┌────────────────────────────────────────┐
                            │            Service Layer               │
                            │ • JobDeduplicationService              │
                            │ • JobFingerprintService (SHA-256)      │
                            │ • RoadmapGenerationService             │
                            │ • CvExtractionReviewHandler            │
                            │ • CompanyManagementService             │
                            │ • SkillTaxonomyService                 │
                            └───────────────────┬────────────────────┘
                                                │
                                                ▼
                            ┌────────────────────────────────────────┐
                            │       Eloquent Models & Database       │
                            │      (MySQL / PostgreSQL / SQLite)     │
                            └────────────────────────────────────────┘
```

---

## 🚀 Comprehensive Features Breakdown

### 1. Authentication, Security & Account Management

- **JWT Authentication (`tymon/jwt-auth`)**: Stateless authentication issued under the `auth:api` guard. Supports token refresh, expiration, and claims.
- **Role-Based Access Control (RBAC)**: Distinct permissions and guards for:
  - `candidate`: Standard job-seeker access.
  - `admin` & `super_admin`: Administrative portal and management tools.
  - Middleware guards: `EnsureActiveCandidate`, `EnsureActiveAdmin`, `EnsureActiveUser`.
- **Email Verification via OTP**:
  - Secure 6-digit numeric OTP generation stored with expiration timestamps (`EmailOtp` model).
  - Resend OTP throttling to prevent spam.
  - Staging/Local testing toggle (`STATIC_OTP_ENABLED` & `STATIC_OTP_CODE`) for CI and local automation.
- **Forgot Password & Reset Pipeline**:
  - 3-step verification process: Request OTP -> Verify OTP token -> Secure Password Reset.
  - Strong password requirements (minimum 8 characters, mixed case, numbers, symbols).
- **Google Socialite OAuth 2.0**:
  - Seamless Google login/signup redirection (`/auth/google/redirect`) and callback handling (`/auth/google/callback`).
  - Automatic account provisioning and candidate profile initialization on first OAuth login.
- **Rate Limiting & Anti-Brute Force**:
  - Fine-grained IP and username throttling on auth routes (e.g. `throttle:5,1` for login, `throttle:password-reset-otp` for password recovery).

---

### 2. Candidate Profile & Portfolio Management

- **Core Candidate Profile**:
  - Personal details: Headline, professional summary, phone number, location, years of experience, and portfolio/social links (GitHub, LinkedIn, Portfolio website).
  - Status management: Actively looking, casually looking, not looking.
- **Career Preferences**:
  - Target job titles, employment types (Full-Time, Part-Time, Contract, Internship, Freelance).
  - Workplace settings: Remote, Hybrid, or Onsite.
  - Target salary expectations and geographic preferences.
- **Education Management**:
  - Full CRUD for academic background: Institution name, degree, field of study, start date, graduation date, ongoing status, and GPA/grade.
- **Work Experience Tracking**:
  - Complete employment history: Company name, job title, location, employment type, start/end dates, current position flag, and detailed achievements/responsibilities.
- **Project Showcase**:
  - Portfolio project entries: Project title, description, repository/live demo URLs, start/end dates, and associated tech stack.
- **Candidate Skillset**:
  - Associate recognized skills from the canonical taxonomy to candidate profiles.
  - Self-reported proficiency level (Beginner, Intermediate, Advanced, Expert) and years of experience per skill.

---

### 3. CV / Resume Processing & Verification Pipeline

- **Multi-Format Document Upload**:
  - Secure file upload accepting `PDF`, `DOC`, and `DOCX` up to 10 MB.
  - Stored safely on the configured filesystem disk (`local` or `s3`).
- **Parsing Lifecycle Tracking**:
  - Explicit document states: `uploaded` ➔ `processing` ➔ `completed` ➔ `failed`.
  - Asynchronous background parsing job triggers.
- **Automated Resume Extraction**:
  - Automatic extraction of contact details, educational history, work experience, certificates, and skills from unstructured CV text.
- **Human-in-the-Loop Candidate Verification**:
  - Extracted data is presented to the candidate in staging status (`CvExtraction`).
  - Candidate can review, edit, and verify the parsed items before they are synced into their live profile.
- **Retry Mechanism**:
  - Candidates can re-trigger parsing on failed CV uploads without re-uploading the file.
- **Historical CV Documents**:
  - Maintains document version history allowing candidates to manage multiple CV versions.

---

### 4. Jobs Feed, Discovery & Matching Engine

- **High-Performance Jobs Feed**:
  - Paginated vacancies with extensive filtering capabilities:
    - Full-text keyword search across titles, descriptions, and company names.
    - Workplace policy: Remote, Hybrid, Onsite.
    - Employment type: Full-time, Part-time, Contract, Internship.
    - Experience level: Entry, Mid, Senior, Lead.
    - Salary floor and ceiling filters.
    - Location, city, and company filters.
- **Smart Candidate-Job Match Scoring**:
  - Calculates alignment between candidate skills and job requirements (`JobMatch` model).
  - Computes match percentage and identifies missing skills.
- **Saved Jobs (Bookmarks)**:
  - Candidates can bookmark jobs for later review.
  - Dedicated paginated view of saved jobs with quick-apply actions.

---

### 5. Job Applications & Status Tracking Lifecycle

- **Seamless Application Submission**:
  - Apply with a single click selecting a verified CV document and optional cover note.
  - Prevents duplicate applications to the same vacancy.
- **Multi-Stage Application Lifecycle**:
  - State machine enforcing valid transitions:
    - `applied` ➔ `in_review` ➔ `interview` ➔ `offer` ➔ `rejected` / `withdrawn`
- **Application Status History**:
  - Every status change logs an immutable audit entry (`ApplicationStatusHistory`) capturing the old status, new status, timestamp, author, and contextual notes.
- **Candidate Self-Withdrawal**:
  - Candidates can withdraw an active application at any point before an offer is made.
- **Company & Admin Review**:
  - Hiring managers and administrators can review applications, inspect candidate profiles, and progress candidates through hiring stages.

---

### 6. AI Career Roadmaps & Learning Progress

- **Goal-Oriented Roadmap Generation**:
  - Candidates can generate tailored learning roadmaps for:
    - **Target Role** (e.g., "Senior DevOps Engineer", "Full-Stack Laravel Developer").
    - **Specific Job Post** (targets the exact missing skills required by an active job vacancy).
- **Skill Gap Analysis**:
  - Compares the candidate’s current skills against the target requirements and highlights learning gaps.
- **Hierarchical Learning Structure**:
  - **Phases**: High-level learning chapters (e.g. "Phase 1: Foundations", "Phase 2: Advanced Concepts").
  - **Milestones / Steps**: Structured progression units.
  - **Actionable Tasks**: Individual practical assignments, tutorials, or projects with resources and estimated completion times.
- **Interactive Task Completion & Progress Calculation**:
  - Candidates toggle tasks as `pending`, `in_progress`, or `completed`.
  - Overall roadmap progress percentage updates automatically via weighted calculation (`RoadmapProgressService`).
- **Dynamic Roadmap Refreshing**:
  - As candidates acquire skills or market trends evolve, roadmaps can be refreshed (`RoadmapRefreshService`), preserving already completed tasks while adjusting upcoming recommendations.
- **Offline / Template Generator Fallback**:
  - `TemplateRoadmapGenerator` guarantees roadmap delivery even when external AI APIs are unreachable.

---

### 7. In-App Notification Center

- **Event-Driven Alerts**:
  - Real-time notifications for application status updates, interview requests, roadmap milestones, and admin review alerts.
- **Notification Management**:
  - Paginated notifications feed with metadata payloads.
  - Real-time unread badge count (`/api/notifications/unread-count`).
  - Mark single notification as read.
  - Bulk "Mark all as read" endpoint.

---

### 8. Admin: Job Ingestion, Fingerprinting & Deduplication

- **External Job Sources Management**:
  - Configure job boards, scrapers, career pages, and APIs.
  - Configurable scraping intervals, source health metrics, error tracking, and active toggles.
- **Ingestion Runs Monitoring**:
  - Telemetry per ingestion run: Total raw jobs discovered, newly imported vacancies, duplicates detected, failed jobs, and run duration.
- **Raw Jobs Staging & Auditability**:
  - Stores complete raw JSON payloads and scraped HTML (`raw_jobs` table) ensuring full data lineage.
- **Data Normalization Engine**:
  - Standardizes job titles, HTML descriptions, salary representations (currencies, hourly vs. yearly), remote tags, and locations.
- **Deterministic Vacancy Fingerprinting (`JobFingerprintService`)**:
  - Generates SHA-256 fingerprint hashes combining:
    - Resolved canonical company identity.
    - Normalized comparison title (stripped of symbols and punctuation).
    - Normalized geographic location.
    - Employment type.
    - Stable publication date.
- **Advanced Deduplication Engine (`JobDeduplicationService`)**:
  - Evaluates duplicate candidates across multiple dimensions to eliminate duplicate job postings from multiple sources.

---

### 9. Admin: Company Intelligence & Entity Merging

- **Canonical Company Directory**:
  - Company profiles with verified legal names, domains, logos, headquarters, and descriptions.
- **Company Aliases**:
  - Handles scraping variations (e.g. "Google", "Google Inc.", "Google LLC", "Alphabet") mapping them to a single canonical company record.
- **Intelligent Company Merging (`/admin/companies/{source}/merge`)**:
  - Safely merges duplicate company records:
    - Transfers all associated job posts to the target company.
    - Moves company aliases and references.
    - Deletes or archives the duplicate source entity without orphaned records or foreign key conflicts.

---

### 10. Admin: Skill Taxonomy & Ontology Management

- **Standardized Skill Taxonomy**:
  - Centralized repository of technical and soft skills organized by categories (e.g., Languages, Frameworks, Cloud & DevOps, Databases, Management).
- **Fast Autocomplete & Search**:
  - High-performance indexed skill search endpoint (`/api/skills/search`) for frontend typeahead pickers.
- **Skill Aliases Mapping**:
  - Maps common abbreviations, typos, and variations to canonical skills (e.g., "k8s" ➔ "Kubernetes", "Vue3" ➔ "Vue.js", "Postgres" ➔ "PostgreSQL").
- **Skill Merging Engine (`/admin/skills/{source}/merge`)**:
  - Consolidates duplicated skill tags across the entire system, seamlessly updating candidate profile skills, job requirements, and roadmap mappings.

---

### 11. Admin: Human-in-the-Loop AI Review Queue

- **AI Review Queue (`ai_review_items`)**:
  - Centralized staging queue for AI-generated data with low confidence scores or flagged anomalies (e.g., uncertain CV extraction, ambiguous job classification).
- **Side-by-Side Review Interface**:
  - Displays original raw text/input next to the proposed AI output.
- **Three-Way Review Decisions**:
  - **Approve**: Accept the AI-generated data as-is and publish to production.
  - **Correct**: Apply manual corrections to the payload before publishing.
  - **Reject**: Discard the suggestion and mark the reason.
- **Decision Auditing (`ai_review_audits`)**:
  - Every human decision is permanently logged to support future machine learning fine-tuning and operational accountability.

---

### 12. Admin: System Audit Logging & Telemetry

- **Immutable Audit Trail (`audit_logs`)**:
  - Comprehensive logging of administrative actions across all key models (Companies, Jobs, Skills, Review Decisions, Ingestion Sources).
  - Captures:
    - Actor ID and role.
    - Action type (`create`, `update`, `delete`, `merge`, `approve`, `reject`).
    - Entity type and entity ID.
    - Before & after state JSON diffs.
    - Client IP address and User-Agent.

---

### 13. Internationalization (i18n) & Localization

- **Bilingual English & Arabic Support**:
  - Fully localized response messages, error strings, and notifications for `en` (English) and `ar` (Arabic).
- **Header-Driven Localization**:
  - Middleware inspects the `Accept-Language` header (`en`, `ar`, `ar-EG`, `en-US`) to dynamically configure the application locale per request.
- **Consistent API Contracts**:
  - Localization is applied strictly to human-readable messages without mutating internal machine keys, codes, or enums.

---

### 14. Frontend Admin & User Portal

- **Modern Single Page Application (SPA)**:
  - Built with **Inertia.js v3**, **React 18/19**, and **TypeScript**.
  - Styled with **Tailwind CSS** and modern responsive layout primitives.
  - Server-driven routing with zero client-side routing boilerplate.
- **Components & Layouts**:
  - Includes user settings, authentication views, and interactive dashboards.

---

## 🗄 Data Models & Schema

The database consists of 36+ Eloquent models orchestrating the platform:

| Domain | Key Models | Description |
|---|---|---|
| **Identity & Access** | `User`, `EmailOtp` | Users, roles (`candidate`, `admin`, `super_admin`), authentication & OTP verification. |
| **Candidate Profile** | `CandidateProfile`, `CareerPreference`, `Education`, `Experience`, `Project`, `Certificate`, `Language` | Complete candidate portfolio, academic and employment history, and preferences. |
| **Skills & Ontology** | `Skill`, `SkillCategory`, `SkillAlias`, `CandidateSkill`, `JobSkill` | Standardized skills taxonomy, synonyms/aliases, and candidate/job relationships. |
| **CV Processing** | `CvDocument`, `CvExtraction` | Uploaded resumes, status lifecycle, parsed data payloads, and verification flags. |
| **Jobs & Companies** | `Company`, `CompanyAlias`, `JobPost`, `SavedJob`, `JobMatch` | Canonical companies, aliases, job listings, candidate bookmarks, and match scores. |
| **Ingestion Pipeline** | `JobSource`, `IngestionRun`, `RawJob`, `JobSourceReference` | Scraping sources, run logs, raw payload storage, and source references. |
| **Applications** | `Application`, `ApplicationStatusHistory` | Job applications, candidate submissions, and historical status state machine. |
| **AI Roadmaps** | `Roadmap`, `RoadmapPhase`, `RoadmapMilestone`, `RoadmapStep`, `RoadmapTask` | Structured learning roadmaps, milestones, actionable tasks, and progress tracking. |
| **AI Governance** | `AiReviewItem`, `AiReviewAudit` | Human-in-the-loop review queue and audit log of decisions. |
| **Notifications & Audits**| `Notification`, `AuditLog` | In-app user notifications and system-wide admin audit log trail. |

---

## ⚙️ Environment Configuration (.env)

Below is the standard development configuration template. Create a `.env` file in the root directory:

```env
APP_NAME=SkillMatch
APP_ENV=local
APP_KEY=base64:dvPSpwB89tSyd0VVDRMN8t9Z65BApBe3eDLun3KQGWM=
APP_DEBUG=true
APP_URL=http://localhost:8000

# Static OTP for automated testing and local development (bypasses email dispatch)
STATIC_OTP_ENABLED=false
STATIC_OTP_CODE=123456

# Localization
APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

# Database (MySQL / PostgreSQL / SQLite)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=skillmatch
DB_USERNAME=root
DB_PASSWORD=

# Cache, Queue & Session
CACHE_STORE=database
QUEUE_CONNECTION=database
SESSION_DRIVER=database
SESSION_LIFETIME=120

# JWT Secret Key
JWT_SECRET=5IbJF1l9AeoPfjj9jf82TSllAQytc4YOYEj57sJDjn8KBcJNblHR06jU7TnJ6npX

# Google OAuth Credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"

# Mail Settings
MAIL_MAILER=log
MAIL_HOST=127.0.0.1
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS="no-reply@skillmatch.com"
MAIL_FROM_NAME="${APP_NAME}"

# Storage / S3 (optional for local development)
FILESYSTEM_DISK=local
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

# Frontend
VITE_APP_NAME="${APP_NAME}"
```

---

## 🛠 Local Installation & Setup

Follow these steps to set up the project on your local machine:

### Prerequisites

- **PHP 8.3+** with extensions: `pdo`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `curl`, `fileinfo`.
- **Composer 2+**
- **Node.js 20+** & **npm** / **pnpm**
- **MySQL 8.0+** or **PostgreSQL 15+** (or SQLite for quick testing)

### Step-by-Step Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yousefhatem12/backend_skillmatch_laravel.git
   cd backend_skillmatch_laravel
   ```

2. **Install PHP dependencies:**
   ```bash
   composer install
   ```

3. **Install JavaScript dependencies:**
   ```bash
   npm install
   ```

4. **Prepare Environment File:**
   ```bash
   cp .env.example .env
   php artisan key:generate
   php artisan jwt:secret
   ```

5. **Configure Database & Run Migrations with Seeds:**
   Make sure your database is running and credentials match your `.env`. Then execute:
   ```bash
   php artisan migrate:fresh --seed
   ```
   *This seeds default skills, job sources, sample companies, job posts, candidate profiles, and test users.*

6. **Create Public Storage Symlink:**
   ```bash
   php artisan storage:link
   ```

7. **Generate OpenAPI / Swagger Documentation (Optional):**
   ```bash
   php artisan l5-swagger:generate
   ```

8. **Start the Development Servers:**
   - **Backend API Server**:
     ```bash
     php artisan serve
     ```
   - **Vite Frontend Dev Server** (in a separate terminal):
     ```bash
     npm run dev
     ```

The API is now live at `http://localhost:8000/api`.

---

## 🧪 Testing & Code Quality

The project includes test suites and automated formatting:

```bash
# Run Pest / PHPUnit test suite
php artisan test --compact

# Run specific feature tests
php artisan test --filter=AuthControllerTest

# Run Laravel Pint code formatter
vendor/bin/pint --format agent

# Run static analysis (PHPStan)
./vendor/bin/phpstan analyse
```

---

## 📚 API Documentation & Reference

SkillMatch provides interactive and static documentation:

- **Interactive Swagger UI**:
  Open your browser at:
  ```
  http://localhost:8000/api/documentation
  ```
- **Comprehensive Endpoints Guide**:
  Inspect [`API_README.md`](API_README.md) for full request/response schemas, payloads, headers, query parameters, and error responses for all 40+ endpoints.
- **OpenAPI Specification**:
  The raw specification is available in [`docs/openapi.yaml`](docs/openapi.yaml).

---

## 📄 License

This software is released under the [MIT License](LICENSE).
