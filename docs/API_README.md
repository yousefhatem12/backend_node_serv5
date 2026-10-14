# 🚀 SkillMatch Backend API Documentation (`API_README.md`)

Welcome to the **SkillMatch Backend API** reference. This documentation describes each backend feature, architectural convention, and provides the exact input requirements and output JSON schemas for all endpoints.

---

## 📌 Table of Contents

1. [Architecture & Global Conventions](#-architecture--global-conventions)
   - [Base URL & Headers](#base-url--headers)
   - [Authentication & Roles](#authentication--roles)
   - [Localization & Languages](#localization--languages)
   - [Standard Response Formats](#standard-response-formats)
2. [1. Authentication & Account Management](#1-authentication--account-management)
3. [2. Candidate Profile & Career Preferences](#2-candidate-profile--career-preferences)
4. [3. Education, Experience & Projects](#3-education-experience--projects)
5. [4. Candidate Skills & Taxonomy Search](#4-candidate-skills--taxonomy-search)
6. [5. CV Document Upload, Parsing & Verification](#5-cv-document-upload-parsing--verification)
7. [6. Jobs Feed & Saved Jobs](#6-jobs-feed--saved-jobs)
8. [7. Job Applications & Status Tracking](#7-job-applications--status-tracking)
9. [8. AI Career Roadmaps & Progress Tracking](#8-ai-career-roadmaps--progress-tracking)
10. [9. In-App Notifications](#9-in-app-notifications)
11. [10. Admin: Companies Management & Merging](#10-admin-companies-management--merging)
12. [11. Admin: Job Sources, Runs & Raw Ingestion](#11-admin-job-sources-runs--raw-ingestion)
13. [12. Admin: Job Posts Management](#12-admin-job-posts-management)
14. [13. Admin: Skill Taxonomy & Aliases](#13-admin-skill-taxonomy--aliases)
15. [14. Admin: AI Review Queue (Human-in-the-Loop)](#14-admin-ai-review-queue-human-in-the-loop)
16. [15. Admin: Audit Logs](#15-admin-audit-logs)

---

## 🏛 Architecture & Global Conventions

### Base URL & Headers

- **Local Development**: `http://localhost:8000/api`
- **Swagger UI Interactive Docs**: `http://localhost:8000/api/documentation`
- **Default Headers**:
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <your_jwt_token>
  Accept-Language: en   # (or ar)
  ```

### Authentication & Roles

Authentication uses **JWT (JSON Web Tokens)** via `tymon/jwt-auth` under the `auth:api` guard.
- **Candidate User**: Must have `role: "candidate"` and `is_active: true`.
- **Admin User**: Must have `role: "admin"` or `role: "super_admin"` and `is_active: true`.
- Tokens expire after 60 minutes (`3600` seconds) by default.

### Localization & Languages

All endpoints support the `Accept-Language` header:
- `en` / `en-US` (English - default)
- `ar` / `ar-EG` (Arabic)
Localization applies to error messages, status messages, and feedback strings without mutating machine keys or enums.

### Standard Response Formats

#### 1. Success Response (Standard Object)
```json
{
  "data": { ... }
}
```

#### 2. Action Envelope (Used in CV, Applications & Roadmaps)
```json
{
  "status": "success",
  "message": "Action completed successfully.",
  "data": { ... }
}
```

#### 3. Paginated Response
```json
{
  "data": [ ... ],
  "links": {
    "first": "http://localhost:8000/api/jobs?page=1",
    "last": "http://localhost:8000/api/jobs?page=4",
    "prev": null,
    "next": "http://localhost:8000/api/jobs?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 4,
    "per_page": 15,
    "to": 15,
    "total": 52
  }
}
```

#### 4. Validation Error (`422 Unprocessable Content`)
```json
{
  "message": "The email field is required.",
  "errors": {
    "email": [
      "The email field is required."
    ]
  }
}
```

#### 5. Unauthorized / Forbidden (`401` / `403`)
```json
{
  "message": "Unauthenticated."
}
```

---

## 1. Authentication & Account Management

### Feature Overview
Handles user registration, JWT login, profile self-inspection, multi-step email verification via OTP, and password reset flows with temporary reset tokens.

---

### `POST /api/auth/register`
* **Access**: Public (Throttle: 10 req/min)
* **Description**: Registers a new candidate account and automatically generates and emails a 6-digit verification OTP.

#### Request JSON
```json
{
  "name": "Ahmed Wael",
  "email": "ahmed.wael@example.com",
  "password": "Password123!",
  "password_confirmation": "Password123!"
}
```

#### Response (`201 Created`)
```json
{
  "message": "Registration successful. Please verify your email using the OTP sent.",
  "email": "ahmed.wael@example.com",
  "user": {
    "id": 12,
    "name": "Ahmed Wael",
    "email": "ahmed.wael@example.com",
    "role": "candidate",
    "is_active": true,
    "created_at": "2026-10-07T12:00:00.000000Z"
  }
}
```

---

### `POST /api/auth/login`
* **Access**: Public (Throttle: 5 req/min)
* **Description**: Validates credentials and returns a Bearer JWT token. Rejects unverified accounts with `403`.

#### Request JSON
```json
{
  "email": "ahmed.wael@example.com",
  "password": "Password123!"
}
```

#### Response (`200 OK`)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 12,
    "name": "Ahmed Wael",
    "email": "ahmed.wael@example.com",
    "role": "candidate",
    "is_active": true,
    "email_verified_at": "2026-10-07T12:05:00.000000Z"
  }
}
```

---

### `GET /api/auth/me`
* **Access**: Authenticated (`auth:api`)
* **Description**: Returns the current authenticated user's information.

#### Response (`200 OK`)
```json
{
  "user": {
    "id": 12,
    "name": "Ahmed Wael",
    "email": "ahmed.wael@example.com",
    "phone": "+201000000000",
    "avatar": "https://example.com/avatar.jpg",
    "role": "candidate",
    "is_active": true,
    "email_verified_at": "2026-10-07T12:05:00.000000Z"
  }
}
```

---

### `POST /api/auth/verify-email-otp`
* **Access**: Public
* **Description**: Verifies a 6-digit email OTP. On success, marks `email_verified_at` and deletes the OTP code.

#### Request JSON
```json
{
  "email": "ahmed.wael@example.com",
  "otp": "123456"
}
```

#### Response (`200 OK`)
```json
{
  "message": "Email verified successfully.",
  "user": {
    "id": 12,
    "email": "ahmed.wael@example.com",
    "email_verified_at": "2026-10-07T12:05:00.000000Z"
  }
}
```

---

### `POST /api/auth/resend-email-otp`
* **Access**: Public (Throttle: 1 req/min)
* **Description**: Re-generates and sends a new 6-digit verification OTP to an unverified email address.

#### Request JSON
```json
{
  "email": "ahmed.wael@example.com"
}
```

#### Response (`200 OK`)
```json
{
  "message": "Verification code has been resent to your email."
}
```

---

### `POST /api/auth/forgot-password`
* **Access**: Public
* **Description**: Requests a 6-digit password reset OTP sent to the user's registered email.

#### Request JSON
```json
{
  "email": "ahmed.wael@example.com"
}
```

#### Response (`200 OK`)
```json
{
  "message": "Password reset code sent to your email."
}
```

---

### `POST /api/auth/forgot-password/verify-otp`
* **Access**: Public
* **Description**: Verifies the password reset OTP and exchanges it for a 64-character temporary `reset_token` valid for 10 minutes.

#### Request JSON
```json
{
  "email": "ahmed.wael@example.com",
  "otp": "123456"
}
```

#### Response (`200 OK`)
```json
{
  "message": "Password reset code verified successfully.",
  "reset_token": "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
  "expires_in": 600
}
```

---

### `POST /api/auth/reset-password`
* **Access**: Public
* **Description**: Completes the password reset using the verified `reset_token`.

#### Request JSON
```json
{
  "email": "ahmed.wael@example.com",
  "reset_token": "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
  "password": "NewStrongPassword123!",
  "password_confirmation": "NewStrongPassword123!"
}
```

#### Response (`200 OK`)
```json
{
  "message": "Password has been reset successfully."
}
```

---

## 2. Candidate Profile & Career Preferences

### Feature Overview
Manages the comprehensive candidate profile (summary, personal links, demographics) and target career preferences (target role, preferred industries, job types, relocation willingness).

---

### `GET /api/candidate/profile`
* **Access**: Candidate (`auth:api`, active candidate)
* **Description**: Retrieves the complete candidate profile including career preferences, educations, experiences, projects, skills, certificates, and CV documents.

#### Response (`200 OK`)
```json
{
  "data": {
    "profile_exists": true,
    "user": {
      "id": 12,
      "name": "Ahmed Wael",
      "email": "ahmed.wael@example.com",
      "phone": "+201012345678",
      "avatar": null,
      "role": "candidate",
      "is_active": true
    },
    "profile": {
      "id": 5,
      "date_of_birth": "1998-05-15",
      "gender": "male",
      "job_title": "Full Stack Software Engineer",
      "country": "Egypt",
      "state": "Cairo",
      "city": "Nasr City",
      "github_url": "https://github.com/ahmedwael",
      "linkedin_url": "https://linkedin.com/in/ahmedwael",
      "military_status": "exempted",
      "professional_summary": "Passionate software engineer with 4+ years building high-throughput web APIs and microservices.",
      "profile_completed_at": "2026-09-01T10:00:00.000000Z",
      "careerPreference": {
        "id": 5,
        "target_role": "Backend Engineer",
        "job_type": "full-time",
        "work_mode": "remote",
        "preferred_country": "Egypt",
        "preferred_city": "Cairo",
        "experience_level": "mid-level",
        "career_goal": "Advance to Senior Cloud Architect within 3 years.",
        "open_to_relocation": true,
        "target_roles": ["Backend Engineer", "API Engineer"],
        "preferred_industries": ["Fintech", "E-commerce"]
      },
      "educations": [],
      "experiences": [],
      "projects": [],
      "candidateSkills": [],
      "cvDocuments": []
    }
  }
}
```

---

### `PATCH /api/candidate/profile`
* **Access**: Candidate (`auth:api`, active candidate)
* **Description**: Updates fields on the candidate profile.

#### Request JSON
```json
{
  "job_title": "Senior Backend Developer",
  "country": "Egypt",
  "city": "Cairo",
  "github_url": "https://github.com/ahmedwael",
  "linkedin_url": "https://linkedin.com/in/ahmedwael",
  "professional_summary": "Updated senior backend engineer profile summary."
}
```

#### Response (`200 OK`)
*Returns the updated profile object matching `GET /api/candidate/profile`.*

---

### `GET /api/candidate/career-preferences`
* **Access**: Candidate (`auth:api`, active candidate)

#### Response (`200 OK`)
```json
{
  "data": {
    "id": 5,
    "target_role": "Senior PHP / Laravel Engineer",
    "job_type": "full-time",
    "work_mode": "remote",
    "preferred_country": "Egypt",
    "preferred_city": "Cairo",
    "experience_level": "senior",
    "career_goal": "Lead high-scale architectural design.",
    "open_to_relocation": true,
    "target_roles": ["Senior Backend Developer", "Tech Lead"],
    "preferred_industries": ["Fintech", "Healthtech"]
  }
}
```

---

### `PATCH /api/candidate/career-preferences`
* **Access**: Candidate (`auth:api`, active candidate)

#### Request JSON
```json
{
  "target_roles": ["Senior Backend Developer", "Software Architect"],
  "preferred_industries": ["Fintech", "SaaS"],
  "target_role": "Senior Backend Developer",
  "job_type": "full-time",
  "work_mode": "remote",
  "open_to_relocation": false
}
```

#### Response (`200 OK`)
*Returns the updated career preference object.*

---

## 3. Education, Experience & Projects

### Feature Overview
Enables candidates to manage granular portfolio items: Academic Degrees, Work Experience, and Portfolio Projects with date validation (`end_date >= start_date`, `is_current` rules).

---

### Educations CRUD

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/candidate/educations` | List candidate educations sorted by newest start date |
| `POST` | `/api/candidate/educations` | Add a new education entry |
| `GET` | `/api/candidate/educations/{education}` | Retrieve a specific education entry |
| `PATCH` | `/api/candidate/educations/{education}` | Update an education entry |
| `DELETE` | `/api/candidate/educations/{education}` | Delete an education entry (`204 No Content`) |

#### `POST /api/candidate/educations` Request JSON
```json
{
  "institution": "Cairo University",
  "degree": "Bachelor's Degree",
  "field_of_study": "Computer Science",
  "education_level": "bachelor",
  "start_date": "2016-09-01",
  "end_date": "2020-06-30",
  "is_current": false,
  "grade": "Excellent with Honors",
  "description": "Graduation project: Distributed Cloud Storage System."
}
```

#### Response (`201 Created`)
```json
{
  "data": {
    "id": 8,
    "institution": "Cairo University",
    "degree": "Bachelor's Degree",
    "field_of_study": "Computer Science",
    "education_level": "bachelor",
    "start_date": "2016-09-01",
    "end_date": "2020-06-30",
    "is_current": false,
    "grade": "Excellent with Honors",
    "description": "Graduation project: Distributed Cloud Storage System.",
    "source": "manual"
  }
}
```

---

### Work Experiences CRUD

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/candidate/experiences` | List candidate experiences |
| `POST` | `/api/candidate/experiences` | Add a work experience entry |
| `GET` | `/api/candidate/experiences/{experience}` | Retrieve a work experience entry |
| `PATCH` | `/api/candidate/experiences/{experience}` | Update a work experience entry |
| `DELETE` | `/api/candidate/experiences/{experience}` | Delete an experience entry (`204 No Content`) |

#### `POST /api/candidate/experiences` Request JSON
```json
{
  "job_title": "Backend Software Engineer",
  "company_name": "Tech Innovations Inc.",
  "employment_type": "full-time",
  "country": "Egypt",
  "city": "Cairo",
  "start_date": "2021-01-01",
  "end_date": null,
  "is_current": true,
  "description": "Architected RESTful microservices in Laravel and Docker.",
  "technologies": ["PHP", "Laravel", "MySQL", "Redis", "Docker"]
}
```

#### Response (`201 Created`)
```json
{
  "data": {
    "id": 14,
    "job_title": "Backend Software Engineer",
    "company_name": "Tech Innovations Inc.",
    "employment_type": "full-time",
    "country": "Egypt",
    "city": "Cairo",
    "start_date": "2021-01-01",
    "end_date": null,
    "is_current": true,
    "description": "Architected RESTful microservices in Laravel and Docker.",
    "technologies": ["PHP", "Laravel", "MySQL", "Redis", "Docker"],
    "source": "manual"
  }
}
```

---

### Projects CRUD

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/candidate/projects` | List candidate projects |
| `POST` | `/api/candidate/projects` | Add a project to profile |
| `GET` | `/api/candidate/projects/{project}` | Retrieve a project entry |
| `PATCH` | `/api/candidate/projects/{project}` | Update a project entry |
| `DELETE` | `/api/candidate/projects/{project}` | Delete a project entry (`204 No Content`) |

#### `POST /api/candidate/projects` Request JSON
```json
{
  "name": "E-Commerce Microservices Platform",
  "description": "High-volume distributed payment and inventory microservices.",
  "technologies": ["Laravel", "PostgreSQL", "Kafka", "Docker"],
  "project_url": "https://store.example.com",
  "github_url": "https://github.com/ahmedwael/ecommerce-service",
  "start_date": "2023-03-01",
  "end_date": "2023-09-01"
}
```

#### Response (`201 Created`)
```json
{
  "data": {
    "id": 20,
    "name": "E-Commerce Microservices Platform",
    "description": "High-volume distributed payment and inventory microservices.",
    "technologies": ["Laravel", "PostgreSQL", "Kafka", "Docker"],
    "project_url": "https://store.example.com",
    "github_url": "https://github.com/ahmedwael/ecommerce-service",
    "start_date": "2023-03-01",
    "end_date": "2023-09-01",
    "source": "manual"
  }
}
```

---

## 4. Candidate Skills & Taxonomy Search

### Feature Overview
Allows candidates to search standardized skills in the platform's global taxonomy with fuzzy matching and alias resolution, and link skills to their own profile.

---

### `GET /api/skills/search`
* **Access**: Authenticated (`auth:api`)
* **Query Parameters**:
  - `q` (*string, required*): Search query keyword (e.g. `python`, `react`, `larav`)

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": 1,
      "name": "Laravel",
      "normalized_name": "laravel",
      "category": "Web Frameworks"
    },
    {
      "id": 18,
      "name": "PHP",
      "normalized_name": "php",
      "category": "Programming Languages"
    }
  ]
}
```

---

### `GET /api/candidate/skills`
* **Access**: Candidate (`auth:api`, active candidate)
* **Description**: Returns all skills attached to the candidate profile.

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": 42,
      "skill_id": 1,
      "source": "manual",
      "proficiency_level": "expert",
      "skill": {
        "id": 1,
        "name": "Laravel",
        "normalized_name": "laravel",
        "category": "Web Frameworks"
      }
    }
  ]
}
```

---

### `POST /api/candidate/skills`
* **Access**: Candidate (`auth:api`, active candidate)
* **Description**: Attaches a skill to the candidate profile by skill name. Creates taxonomy entry if not existing.

#### Request JSON
```json
{
  "name": "Docker",
  "proficiency_level": "intermediate"
}
```

#### Response (`201 Created`)
```json
{
  "data": {
    "id": 43,
    "skill_id": 9,
    "source": "manual",
    "proficiency_level": "intermediate",
    "skill": {
      "id": 9,
      "name": "Docker",
      "normalized_name": "docker",
      "category": "DevOps"
    }
  }
}
```

---

### `DELETE /api/candidate/skills/{candidateSkill}`
* **Access**: Candidate (`auth:api`, active candidate)
* **Response**: `204 No Content`

---

## 5. CV Document Upload, Parsing & Verification

### Feature Overview
Handles resume uploads (PDF / DOCX up to 5MB), asynchronous AI parsing pipeline, extraction confidence scoring, and candidate verification before syncing extracted skills and experiences to profile.

---

### `POST /api/cv/upload`
* **Access**: Candidate (`auth:api`, active candidate)
* **Content-Type**: `multipart/form-data`
* **Description**: Uploads a new CV. Increments document version and initiates extraction pipeline.

#### Request Form Data
- `cv`: Binary file (`.pdf` or `.docx`, max 5120 KB, non-empty)

#### Response (`201 Created`)
```json
{
  "status": "success",
  "message": "CV uploaded successfully.",
  "data": {
    "id": 3,
    "original_filename": "Ahmed_Wael_Resume.pdf",
    "mime_type": "application/pdf",
    "file_size": 184520,
    "version": 1,
    "is_current": true,
    "status": "processing",
    "processed_at": null,
    "created_at": "2026-10-07T12:30:00.000000Z",
    "updated_at": "2026-10-07T12:30:00.000000Z",
    "extractions": [
      {
        "id": 5,
        "attempt_number": 1,
        "status": "pending",
        "confidence_score": null,
        "started_at": "2026-10-07T12:30:01.000000Z",
        "completed_at": null
      }
    ]
  }
}
```

---

### `GET /api/cv/status/{cvDocument}`
* **Access**: Candidate (owner only)
* **Description**: Checks current extraction status and retrieves parsed content.

#### Response (`200 OK`)
```json
{
  "data": {
    "id": 3,
    "original_filename": "Ahmed_Wael_Resume.pdf",
    "status": "completed",
    "version": 1,
    "is_current": true,
    "processed_at": "2026-10-07T12:30:25.000000Z",
    "extractions": [
      {
        "id": 5,
        "attempt_number": 1,
        "status": "completed",
        "confidence_score": 0.94,
        "started_at": "2026-10-07T12:30:01.000000Z",
        "completed_at": "2026-10-07T12:30:25.000000Z"
      }
    ]
  }
}
```

---

### `GET /api/cv/history`
* **Access**: Candidate (`auth:api`, active candidate)
* **Description**: Lists all uploaded CV versions for the candidate ordered descending by version number.

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": 3,
      "original_filename": "Ahmed_Wael_Resume.pdf",
      "version": 2,
      "is_current": true,
      "status": "completed"
    },
    {
      "id": 1,
      "original_filename": "Old_CV.pdf",
      "version": 1,
      "is_current": false,
      "status": "completed"
    }
  ]
}
```

---

### `POST /api/cv/retry/{cvDocument}`
* **Access**: Candidate (owner only)
* **Description**: Triggers a retry of the extraction pipeline on a previously failed CV document.

#### Response (`200 OK`)
```json
{
  "status": "success",
  "message": "CV processing retried successfully.",
  "data": {
    "id": 3,
    "status": "processing"
  }
}
```

---

### `POST /api/cv/extractions/{extraction}/verify`
* **Access**: Candidate (owner only)
* **Description**: Validates candidate-reviewed extracted items and merges confirmed skills and work experiences into the candidate's active profile.

#### Request JSON
```json
{
  "skills": [
    {
      "name": "PHP",
      "category": "Backend",
      "proficiency_level": "expert",
      "confidence_score": 0.95
    },
    {
      "name": "Laravel",
      "category": "Framework",
      "proficiency_level": "expert",
      "confidence_score": 0.98
    }
  ],
  "experiences": [
    {
      "company_name": "Acme Corp",
      "title": "Software Engineer",
      "start_date": "2021-01-01",
      "end_date": "2023-01-01",
      "description": "Developed backend APIs."
    }
  ]
}
```

#### Response (`200 OK`)
```json
{
  "status": "success",
  "message": "CV extraction verified and synced successfully.",
  "data": null
}
```

---

## 6. Jobs Feed & Saved Jobs

### Feature Overview
Provides candidates with personalized and filterable job listings (including search, full-text ranking, skill requirements, location, remote work mode) and bookmarks management.

---

### `GET /api/jobs`
* **Access**: Authenticated active user (`auth:api`)
* **Query Parameters**:
  - `search` (*string, optional*): Keyword query across title, canonical role, company, skills, description.
  - `sort` (*enum: `newest`, `relevance`*, default: `newest`).
  - `company_id` (*int, optional*): Filter by specific company.
  - `is_verified_company` (*bool, optional*): `true` or `false`.
  - `job_type` (*enum: `job`, `internship`*).
  - `work_mode` (*string, optional*): `remote`, `hybrid`, `on-site`.
  - `employment_type` (*string, optional*): `full-time`, `part-time`, `contract`.
  - `experience_level` (*string, optional*): `entry`, `mid-level`, `senior`.
  - `country`, `state`, `city` (*string, optional*).
  - `application_method` (*enum: `internal`, `external`*).
  - `required_skill_ids` (*array of int, optional*): Filter jobs that require these skill IDs.
  - `preferred_skill_ids` (*array of int, optional*): Filter jobs that prefer these skill IDs.
  - `page` (*int, default: 1*), `per_page` (*int, default: 15, max: 100*).

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": 101,
      "title": "Senior Laravel Developer",
      "job_type": "job",
      "work_mode": "remote",
      "employment_type": "full-time",
      "experience_level": "senior",
      "country": "Egypt",
      "state": "Cairo",
      "city": "Maadi",
      "min_years_experience": 5,
      "max_years_experience": 8,
      "source": "internal",
      "application_method": "internal",
      "published_at": "2026-10-05T09:00:00.000000Z",
      "expires_at": "2026-11-05T09:00:00.000000Z",
      "is_active": true,
      "is_expired": false,
      "is_saved": true,
      "company": {
        "id": 4,
        "name": "PayMob",
        "logo_url": "https://example.com/paymob.png",
        "is_verified": true,
        "is_active": true
      },
      "required_skills": [
        {
          "id": 1,
          "name": "Laravel",
          "importance": 5,
          "required_level": "senior"
        },
        {
          "id": 2,
          "name": "MySQL",
          "importance": 4,
          "required_level": "senior"
        }
      ],
      "preferred_skills": [
        {
          "id": 5,
          "name": "Redis",
          "importance": 3,
          "required_level": "mid-level"
        }
      ]
    }
  ],
  "links": {
    "first": "http://localhost:8000/api/jobs?page=1",
    "last": "http://localhost:8000/api/jobs?page=10",
    "prev": null,
    "next": "http://localhost:8000/api/jobs?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 10,
    "per_page": 15,
    "to": 15,
    "total": 150
  }
}
```

---

### `POST /api/jobs/{jobPost}/save`
* **Access**: Candidate (`auth:api`, active candidate)
* **Description**: Saves/bookmarks a job post for the candidate.

#### Response (`201 Created` or `200 OK`)
```json
{
  "message": "Job saved successfully.",
  "data": {
    "job_id": 101,
    "is_saved": true
  }
}
```

---

### `DELETE /api/jobs/{jobPost}/save`
* **Access**: Candidate (`auth:api`, active candidate)
* **Description**: Removes the saved bookmark for the job post.

#### Response (`200 OK`)
```json
{
  "message": "Job removed from saved jobs.",
  "data": {
    "job_id": 101,
    "is_saved": false
  }
}
```

---

### `GET /api/saved-jobs`
* **Access**: Candidate (`auth:api`, active candidate)
* **Description**: Returns all saved job posts for the candidate ordered by newest saved date. Supports pagination (`per_page`).

#### Response (`200 OK`)
*Returns paginated collection of jobs matching `GET /api/jobs` format.*

---

## 7. Job Applications & Status Tracking

### Feature Overview
Handles internal job applications, duplicate application prevention, application timeline/history tracking, and candidate self-withdrawal.

---

### `GET /api/applications`
* **Access**: Candidate / Admin (`auth:api`)
* **Query Parameters**:
  - `status` (*string, optional*): e.g. `submitted`, `under_review`, `shortlisted`, `rejected`, `withdrawn`.
  - `search` (*string, optional*): Search by job title.
  - `page` (*int, default: 1*).

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": 15,
      "status": "submitted",
      "cover_letter": "I have extensive experience building scalable APIs in Laravel...",
      "applied_at": "2026-10-07T11:00:00.000000Z",
      "created_at": "2026-10-07T11:00:00.000000Z",
      "updated_at": "2026-10-07T11:00:00.000000Z",
      "job": {
        "id": 101,
        "title": "Senior Laravel Developer",
        "company": {
          "id": 4,
          "name": "PayMob"
        }
      },
      "histories": [
        {
          "id": 22,
          "status": "submitted",
          "notes": "Application submitted by candidate",
          "created_at": "2026-10-07T11:00:00.000000Z"
        }
      ]
    }
  ]
}
```

---

### `POST /api/applications`
* **Access**: Candidate (`auth:api`, active candidate)
* **Description**: Submits an application for a specific job post. Rejects duplicates with `422`.

#### Request JSON
```json
{
  "job_id": 101,
  "cover_letter": "I have 5+ years of experience in backend development and would love to contribute to PayMob."
}
```

#### Response (`201 Created`)
```json
{
  "status": "success",
  "message": "Job application submitted successfully.",
  "data": {
    "id": 15,
    "status": "submitted",
    "cover_letter": "I have 5+ years of experience...",
    "applied_at": "2026-10-07T11:00:00.000000Z"
  }
}
```

---

### `GET /api/applications/{application}`
* **Access**: Candidate (owner) or Admin

#### Response (`200 OK`)
*Returns single application resource including timeline histories and changer details.*

---

### `PATCH /api/applications/{application}/status`
* **Access**: Admin or Company Manager
* **Description**: Updates application status with audit trail.

#### Request JSON
```json
{
  "status": "shortlisted",
  "notes": "Candidate passed the initial technical screening."
}
```

#### Response (`200 OK`)
```json
{
  "status": "success",
  "message": "Application status updated successfully.",
  "data": {
    "id": 15,
    "status": "shortlisted"
  }
}
```

---

### `POST /api/applications/{application}/withdraw`
* **Access**: Candidate (application owner)
* **Description**: Withdraws the candidate's own application.

#### Response (`200 OK`)
```json
{
  "status": "success",
  "message": "Application withdrawn successfully.",
  "data": {
    "id": 15,
    "status": "withdrawn"
  }
}
```

---

## 8. AI Career Roadmaps & Progress Tracking

### Feature Overview
Generates personalized, phased AI career learning roadmaps targeting a desired role or a specific job opening. Calculates skill gaps, provides milestones and tasks, supports refreshing when candidate profile evolves, and tracks task completion.

---

### `POST /api/roadmaps`
* **Access**: Candidate (`auth:api`, active candidate, Throttle: 5 req/min)
* **Description**: Generates an AI career roadmap.

#### Request JSON (Targeting a Role)
```json
{
  "target_type": "role",
  "target_role": "Cloud Solutions Architect"
}
```

#### Request JSON (Targeting a Specific Job)
```json
{
  "target_type": "job",
  "target_job_id": 101
}
```

#### Response (`201 Created`)
```json
{
  "status": "success",
  "message": "Career roadmap generated successfully.",
  "data": {
    "id": 2,
    "title": "Roadmap to Cloud Solutions Architect",
    "description": "Structured path to transition from backend engineer to Cloud Architect.",
    "rationale": "Identified skill gaps: Kubernetes orchestration, Terraform IaC, AWS Networking.",
    "status": "in_progress",
    "progress": 0.0,
    "target": {
      "type": "role",
      "role": "Cloud Solutions Architect"
    },
    "generation_version": 1,
    "phases": [
      {
        "id": 1,
        "title": "Phase 1: Cloud Infrastructure Foundations",
        "description": "Master AWS core compute, VPC, and storage.",
        "order": 1,
        "status": "in_progress",
        "milestones": [
          {
            "id": 1,
            "title": "VPC & Multi-tier Network Design",
            "order": 1,
            "tasks": [
              {
                "id": 10,
                "title": "Deploy a high-availability VPC across 3 Availability Zones",
                "description": "Create public and private subnets with NAT gateways.",
                "status": "pending",
                "order": 1
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

### `GET /api/roadmaps/{roadmap}`
* **Access**: Candidate (roadmap owner)
* **Description**: Retrieves roadmap details with full phase, milestone, and task hierarchy.

#### Response (`200 OK`)
*Returns full roadmap resource matching schema above.*

---

### `POST /api/roadmaps/{roadmap}/refresh`
* **Access**: Candidate (owner, Throttle: 5 req/min)
* **Description**: Re-evaluates candidate skills against the roadmap goal and regenerates tasks if profile changed.

#### Request JSON (Optional Parameter Overrides)
```json
{
  "target_type": "role",
  "target_role": "Cloud Solutions Architect"
}
```

#### Response (`200 OK`)
```json
{
  "status": "success",
  "message": "Roadmap refreshed successfully.",
  "data": {
    "id": 3,
    "previous_roadmap_id": 2,
    "title": "Roadmap to Cloud Solutions Architect",
    "status": "in_progress",
    "generation_version": 2
  },
  "meta": {
    "refreshed": true,
    "reasons": ["Detected new candidate skill: Docker", "Re-aligned milestone 2 priorities"]
  }
}
```

---

### `PATCH /api/roadmap-tasks/{roadmapTask}/complete`
* **Access**: Candidate (task owner)
* **Description**: Marks a learning task as completed with optional learning notes or project evidence link.

#### Request JSON
```json
{
  "evidence": "https://github.com/ahmedwael/aws-vpc-terraform-lab",
  "notes": "Configured multi-AZ VPC with public and private subnets successfully."
}
```

#### Response (`200 OK`)
```json
{
  "status": "success",
  "message": "Roadmap task marked as completed.",
  "data": {
    "id": 2,
    "progress": 15.5
  }
}
```

---

## 9. In-App Notifications

### Feature Overview
Delivers notifications for application updates, CV extraction progress, and roadmap alerts.

---

### `GET /api/notifications`
* **Access**: Candidate (`auth:api`)
* **Query Parameters**:
  - `unread_only` (*bool, optional*): Filter only unread notifications (`true` or `false`).
  - `page` (*int, default: 1*), `per_page` (*int, default: 15*).

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": 88,
      "title": "CV Parsing Completed",
      "body": "Your CV 'Ahmed_Wael_Resume.pdf' has been parsed successfully.",
      "type": "cv_parsed",
      "data": {
        "document_id": 3,
        "extraction_id": 5
      },
      "read_at": null,
      "created_at": "2026-10-07T12:35:00.000000Z"
    }
  ],
  "links": { ... },
  "meta": { ... }
}
```

---

### `GET /api/notifications/unread-count`
* **Access**: Candidate (`auth:api`)

#### Response (`200 OK`)
```json
{
  "data": {
    "count": 4
  }
}
```

---

### `PATCH /api/notifications/{notification}/read`
* **Access**: Candidate (`auth:api`)
* **Description**: Marks a single notification as read.

#### Response (`200 OK`)
```json
{
  "data": {
    "id": 88,
    "read_at": "2026-10-07T13:00:00.000000Z"
  }
}
```

---

### `PATCH /api/notifications/read-all`
* **Access**: Candidate (`auth:api`)
* **Description**: Marks all unread notifications for the user as read.

#### Response (`200 OK`)
```json
{
  "data": {
    "updated_count": 4
  }
}
```

---

## 10. Admin: Companies Management & Merging

### Feature Overview
Admin tools to register and curate company profiles, manage verification status, and merge duplicate companies with automatic alias preservation.

---

### `GET /api/admin/companies`
* **Access**: Admin (`auth:api`, active admin)
* **Query Parameters**: `search`, `is_verified` (`true`/`false`), `is_active` (`true`/`false`), `industry`, `country`, `page`, `per_page`.

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": 4,
      "name": "PayMob",
      "normalized_name": "paymob",
      "industry": "Fintech",
      "country": "Egypt",
      "city": "Cairo",
      "website_url": "https://paymob.com",
      "logo_url": "https://example.com/logo.png",
      "is_verified": true,
      "is_active": true,
      "job_posts_count": 12
    }
  ],
  "meta": { ... }
}
```

---

### `POST /api/admin/companies`
* **Access**: Admin (`auth:api`, active admin)

#### Request JSON
```json
{
  "name": "Fawry Banking & Payment",
  "website_url": "https://fawry.com",
  "linkedin_url": "https://linkedin.com/company/fawry",
  "logo_url": "https://example.com/fawry-logo.png",
  "industry": "Fintech",
  "country": "Egypt",
  "city": "Smart Village, Giza",
  "description": "Leading digital transformation and e-payment platform in Egypt.",
  "is_verified": true,
  "is_active": true
}
```

#### Response (`201 Created`)
*Returns created company object.*

---

### `GET /api/admin/companies/{company}`
* **Access**: Admin (`auth:api`, active admin)

#### Response (`200 OK`)
*Returns single company object with aliases and job posts count.*

---

### `PATCH /api/admin/companies/{company}`
* **Access**: Admin (`auth:api`, active admin)

#### Request JSON
```json
{
  "is_verified": true,
  "industry": "Financial Technology & Banking"
}
```

#### Response (`200 OK`)
*Returns updated company object.*

---

### `POST /api/admin/companies/{sourceCompany}/merge`
* **Access**: Admin (`auth:api`, active admin)
* **Description**: Merges `sourceCompany` into `target_company_id`. Re-links all job posts, adds source company name as alias, and soft-deletes/archives source company.

#### Request JSON
```json
{
  "target_company_id": 4
}
```

#### Response (`200 OK`)
```json
{
  "data": {
    "id": 4,
    "name": "PayMob",
    "aliases": [
      {
        "id": 1,
        "alias": "Paymob Solutions",
        "normalized_alias": "paymob solutions"
      }
    ]
  },
  "meta": {
    "reassigned_jobs_count": 3,
    "merged_source_id": 12
  }
}
```

---

## 11. Admin: Job Sources, Runs & Raw Ingestion

### Feature Overview
Manages external job sources (scrapers, APIs, ATS feeds), cron schedules, inspection of ingestion execution runs, and raw un-normalized job dumps.

---

### `GET /api/admin/job-sources`
* **Access**: Admin (`auth:api`, active admin)
* **Query Parameters**: `search`, `source_type` (`api`, `scraper`, `rss`, `manual`), `collection_method`, `is_active`, `schedule_enabled`, `page`, `per_page`.

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": 1,
      "name": "LinkedIn Scraper - Egypt Tech",
      "slug": "linkedin-egypt-tech",
      "source_type": "scraper",
      "collection_method": "playwright",
      "base_url": "https://www.linkedin.com/jobs",
      "is_active": true,
      "schedule_enabled": true,
      "schedule_expression": "0 */4 * * *"
    }
  ]
}
```

---

### `POST /api/admin/job-sources`
* **Access**: Admin (`auth:api`, active admin)

#### Request JSON
```json
{
  "name": "Wuzzuf Software Engineering API",
  "slug": "wuzzuf-software-api",
  "source_type": "api",
  "collection_method": "rest_json",
  "base_url": "https://wuzzuf.net/api/v1/jobs",
  "is_active": true,
  "schedule_enabled": true,
  "schedule_expression": "0 2 * * *",
  "notes": "Daily 2 AM sync."
}
```

#### Response (`201 Created`)
*Returns created JobSource resource.*

---

### `GET /api/admin/job-sources/{jobSource}`
* **Access**: Admin (`auth:api`, active admin)
* **Description**: Returns job source configuration alongside health diagnostics (`last_run_status`, `error_rate_24h`, `jobs_collected_last_7d`).

---

### `PATCH /api/admin/job-sources/{jobSource}`
* **Access**: Admin (`auth:api`, active admin)

---

### `GET /api/admin/job-sources/{jobSource}/runs`
* **Access**: Admin (`auth:api`, active admin)
* **Query Parameters**: `status` (`completed`, `failed`, `in_progress`), `trigger_type` (`scheduled`, `manual`), `page`, `per_page`.

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": 55,
      "trigger_type": "scheduled",
      "status": "completed",
      "jobs_found": 120,
      "jobs_imported": 85,
      "duplicates_count": 35,
      "errors_count": 0,
      "started_at": "2026-10-07T02:00:00.000000Z",
      "finished_at": "2026-10-07T02:08:15.000000Z"
    }
  ]
}
```

---

### `GET /api/admin/job-sources/{jobSource}/raw-jobs`
* **Access**: Admin (`auth:api`, active admin)
* **Query Parameters**: `ingestion_run_id`, `extraction_status`, `deduplication_status`, `page`, `per_page`.

---

### `GET /api/admin/job-sources/{jobSource}/raw-jobs/{rawJob}`
* **Access**: Admin (`auth:api`, active admin)
* **Description**: Returns exact raw JSON/HTML payload captured during ingestion.

---

## 12. Admin: Job Posts Management

### Feature Overview
Admin interface to create, update, and manage official job postings, required/preferred skills with weighting (1-5), and application method.

---

### `POST /api/admin/jobs`
* **Access**: Admin (`auth:api`, active admin)

#### Request JSON
```json
{
  "company_id": 4,
  "title": "Principal Backend Architect",
  "description": "Lead our backend architectural strategy and distributed infrastructure.",
  "canonical_role": "Software Architect",
  "job_type": "job",
  "employment_type": "full-time",
  "work_mode": "hybrid",
  "experience_level": "lead",
  "country": "Egypt",
  "city": "Cairo",
  "min_years_experience": 8,
  "max_years_experience": 12,
  "salary_min": 80000,
  "salary_max": 120000,
  "salary_currency": "EGP",
  "published_at": "2026-10-07T12:00:00Z",
  "expires_at": "2026-11-07T12:00:00Z",
  "is_active": true,
  "application_method": "internal",
  "required_skills": [
    {
      "skill_id": 1,
      "importance": 5,
      "required_level": "expert"
    },
    {
      "skill_id": 9,
      "importance": 4,
      "required_level": "senior"
    }
  ],
  "preferred_skills": [
    {
      "skill_id": 15,
      "importance": 3,
      "required_level": "intermediate"
    }
  ]
}
```

#### Response (`201 Created`)
*Returns the created job post resource with relations.*

---

### `GET /api/admin/jobs/{jobPost}`
* **Access**: Admin (`auth:api`, active admin)

---

### `PATCH /api/admin/jobs/{jobPost}`
* **Access**: Admin (`auth:api`, active admin)
* **Description**: Updates fields on a job post.

---

## 13. Admin: Skill Taxonomy & Aliases

### Feature Overview
Manages the platform's standardized skill dictionary, categories, alias synonyms (e.g. `k8s` -> `Kubernetes`), and taxonomy deduplication merges.

---

### `POST /api/admin/skills`
* **Access**: Admin (`auth:api`, active admin)

#### Request JSON
```json
{
  "name": "Kubernetes",
  "skill_category_id": 3,
  "category": "DevOps & Cloud"
}
```

#### Response (`201 Created`)
```json
{
  "data": {
    "id": 50,
    "name": "Kubernetes",
    "normalized_name": "kubernetes",
    "category": "DevOps & Cloud"
  }
}
```

---

### `PATCH /api/admin/skills/{skill}`
* **Access**: Admin (`auth:api`, active admin)

---

### `POST /api/admin/skills/{sourceSkill}/merge`
* **Access**: Admin (`auth:api`, active admin)
* **Description**: Merges `sourceSkill` into `target_skill_id`. Re-links candidate skills and job skill requirements, creates an alias from the source skill name, and deletes the source skill.

#### Request JSON
```json
{
  "target_skill_id": 50
}
```

#### Response (`200 OK`)
```json
{
  "data": {
    "id": 50,
    "name": "Kubernetes"
  },
  "meta": {
    "reassigned_candidate_skills": 14,
    "reassigned_job_skills": 8
  }
}
```

---

### Skill Aliases Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/skills/{skill}/aliases` | List all aliases for a skill |
| `POST` | `/api/admin/skills/{skill}/aliases` | Add an alias (e.g. `k8s` for `Kubernetes`) |
| `PATCH` | `/api/admin/skills/{skill}/aliases/{alias}` | Update an alias |
| `DELETE` | `/api/admin/skills/{skill}/aliases/{alias}` | Delete an alias (`204 No Content`) |

#### `POST /api/admin/skills/{skill}/aliases` Request JSON
```json
{
  "alias": "k8s"
}
```

#### Response (`201 Created`)
```json
{
  "data": {
    "id": 12,
    "skill_id": 50,
    "alias": "k8s",
    "normalized_alias": "k8s"
  }
}
```

---

## 14. Admin: AI Review Queue (Human-in-the-Loop)

### Feature Overview
When CV parsing or automated job extraction produces items below confidence thresholds, items are routed to an AI Review Queue for human admin inspection, approval, correction, or rejection.

---

### `GET /api/admin/ai-review-items`
* **Access**: Admin (`auth:api`, active admin)
* **Query Parameters**:
  - `status` (`pending`, `approved`, `corrected`, `rejected`)
  - `entity_type` (`cv_extraction`, `job_post`, `skill`)
  - `source`
  - `reason` (trigger reason)
  - `confidence_min` / `confidence_max`
  - `created_from` / `created_to`
  - `page`, `per_page`

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": 105,
      "entity_type": "cv_extraction",
      "entity_id": 5,
      "source": "cv_parser_gemini",
      "status": "pending",
      "trigger_reason": "low_confidence_score",
      "confidence": 0.58,
      "proposed_payload": {
        "extracted_skills": ["vue.js", "nextjs"],
        "unrecognized_skills": ["vitepress"]
      },
      "reviewer": null,
      "created_at": "2026-10-07T12:30:10.000000Z"
    }
  ]
}
```

---

### `GET /api/admin/ai-review-items/{aiReviewItem}`
* **Access**: Admin (`auth:api`, active admin)
* **Description**: Returns single item with full proposed payload and audit history.

---

### `POST /api/admin/ai-review-items/{aiReviewItem}/approve`
* **Access**: Admin (`auth:api`, active admin)

#### Request JSON
```json
{
  "decision_reason": "Verified proposed extraction against original CV text.",
  "reviewer_notes": "All extracted skills are valid."
}
```

#### Response (`200 OK`)
```json
{
  "data": {
    "id": 105,
    "status": "approved",
    "decision_reason": "Verified proposed extraction against original CV text."
  }
}
```

---

### `POST /api/admin/ai-review-items/{aiReviewItem}/correct`
* **Access**: Admin (`auth:api`, active admin)
* **Description**: Approves the item with human-supplied corrected payload.

#### Request JSON
```json
{
  "corrected_value": {
    "skills": [
      {
        "name": "Vue.js",
        "category": "Frontend",
        "proficiency_level": "intermediate"
      }
    ]
  },
  "decision_reason": "Removed VitePress and retained Vue.js.",
  "reviewer_notes": "VitePress was a documentation tool, not candidate primary skill."
}
```

#### Response (`200 OK`)
```json
{
  "data": {
    "id": 105,
    "status": "corrected",
    "decision_reason": "Removed VitePress and retained Vue.js."
  }
}
```

---

### `POST /api/admin/ai-review-items/{aiReviewItem}/reject`
* **Access**: Admin (`auth:api`, active admin)

#### Request JSON
```json
{
  "decision_reason": "Extracted text was gibberish from a corrupted font file.",
  "reviewer_notes": "User notified to re-upload PDF."
}
```

#### Response (`200 OK`)
```json
{
  "data": {
    "id": 105,
    "status": "rejected",
    "decision_reason": "Extracted text was gibberish from a corrupted font file."
  }
}
```

---

## 15. Admin: Audit Logs

### Feature Overview
Cross-domain audit logging tracking admin actions (merges, deletions, AI review decisions, status overrides).

---

### `GET /api/admin/audit-logs`
* **Access**: Admin (`auth:api`, active admin)
* **Query Parameters**:
  - `actor_id` (*int, optional*): Filter by the admin user ID.
  - `action` (*string, optional*): e.g. `company.merge`, `skill.create`, `ai_review.approve`.
  - `entity_type` (*string, optional*): e.g. `Company`, `Skill`, `JobPost`.
  - `entity_id` (*int, optional*).
  - `source` (*string, optional*).
  - `date_from`, `date_to` (*ISO-8601 strings*).
  - `search` (*string, optional*).
  - `page`, `per_page` (*max 100*).

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": 210,
      "action": "company.merge",
      "entity_type": "Company",
      "entity_id": 4,
      "source": "admin_portal",
      "actor": {
        "id": 1,
        "name": "Super Admin"
      },
      "old_values": {
        "source_company_id": 12,
        "source_name": "Paymob Solutions"
      },
      "new_values": {
        "target_company_id": 4,
        "reassigned_jobs_count": 3
      },
      "ip_address": "127.0.0.1",
      "created_at": "2026-10-07T13:45:00.000000Z"
    }
  ],
  "links": { ... },
  "meta": {
    "current_page": 1,
    "total": 210
  }
}
```

---

## ⚡ Quick Testing Cheatsheet

### 1. Register & Verify Candidate
```bash
# 1. Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Tester","email":"test@example.com","password":"Password123!","password_confirmation":"Password123!"}'

# 2. Verify OTP (find OTP in database or logs when MAIL_MAILER=log)
curl -X POST http://localhost:8000/api/auth/verify-email-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'

# 3. Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'
```

### 2. Calling Protected Endpoints
```bash
curl -X GET http://localhost:8000/api/candidate/profile \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <access_token>"
```
