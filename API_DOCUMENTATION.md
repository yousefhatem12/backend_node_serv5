# 📮 SkillMatch API Testing Manual & Postman Guide

Welcome to the comprehensive SkillMatch API manual testing reference. This document is organized into **progressive levels** to allow smooth, step-by-step testing in **Postman**.

---

## 🧭 Overview & Setup

### 1. Base URL
```
http://localhost:8000/api
```

### 2. Standard Headers
| Header | Value | Notes |
|---|---|---|
| `Content-Type` | `application/json` | Required for all `POST`, `PATCH`, `PUT` requests |
| `Accept` | `application/json` | Ensures JSON error and response envelopes |
| `Accept-Language` | `en` or `ar` | Language preference for system messages |
| `Authorization` | `Bearer {{token}}` | Required for all protected endpoints |

### 3. Recommended Postman Environment Variables
Create a Postman Environment (e.g. `SkillMatch Local`) with these keys:
- `base_url` : `http://localhost:8000/api`
- `candidate_token` : *(Leave empty; will be populated after candidate login)*
- `admin_token` : *(Leave empty; will be populated after admin login)*

---

# 🟢 LEVEL 0: System Baseline & Health Check

### 0.1 Health Check (English)
- **Method**: `GET`
- **URL**: `{{base_url}}/health`
- **Headers**:
  - `Accept-Language`: `en`
- **Expected Status**: `200 OK`
- **Expected Response**:
```json
{
  "data": {
    "status": "healthy",
    "message": "SkillMatch API is healthy and operational.",
    "database": "connected",
    "timestamp": "2026-10-10T12:00:00.000Z",
    "uptime": 120.45
  }
}
```

### 0.2 Health Check (Arabic Localization)
- **Method**: `GET`
- **URL**: `{{base_url}}/health`
- **Headers**:
  - `Accept-Language`: `ar`
- **Expected Status**: `200 OK`
- **Expected Response**:
```json
{
  "data": {
    "status": "healthy",
    "message": "واجهة برمجة تطبيقات SkillMatch سليمة وتعمل بنجاح.",
    "database": "connected"
  }
}
```

---

# 🟡 LEVEL 1: Authentication & User Lifecycle

### 1.1 Candidate Login (Get `candidate_token`)
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/login`
- **Body** (raw JSON):
```json
{
  "email": "ahmed.wael@example.com",
  "password": "Password123!"
}
```
- **Postman Tests Tab Script** (Automatically saves tokens to Postman environment):
```javascript
if (pm.response.code === 200) {
    var body = pm.response.json();
    pm.environment.set("candidate_token", body.access_token);
    pm.environment.set("refresh_token", body.refresh_token);
    console.log("Saved candidate_token and refresh_token");
}
```
- **Expected Status**: `200 OK`
- **Expected Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 3,
    "name": "Ahmed Wael",
    "email": "ahmed.wael@example.com",
    "role": "candidate"
  }
}
```

---

### 1.2 Admin Login (Get `admin_token` & `admin_refresh_token`)
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/login`
- **Body** (raw JSON):
```json
{
  "email": "admin@skillmatch.com",
  "password": "Password123!"
}
```
- **Postman Tests Tab Script**:
```javascript
if (pm.response.code === 200) {
    var body = pm.response.json();
    pm.environment.set("admin_token", body.access_token);
    pm.environment.set("admin_refresh_token", body.refresh_token);
    console.log("Saved admin_token and admin_refresh_token");
}
```
- **Expected Status**: `200 OK`

---

### 1.3 Super Admin Login
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/login`
- **Body** (raw JSON):
```json
{
  "email": "superadmin@skillmatch.com",
  "password": "Password123!"
}
```

---

### 1.4 Get Current User Profile (`/auth/me`)
- **Method**: `GET`
- **URL**: `{{base_url}}/auth/me`
- **Headers**:
  - `Authorization`: `Bearer {{candidate_token}}`
- **Expected Status**: `200 OK`

---

### 1.5 Register New Candidate
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/register`
- **Body** (raw JSON):
```json
{
  "name": "Mostafa Mahmoud",
  "email": "mostafa.test@example.com",
  "password": "Password123!",
  "password_confirmation": "Password123!",
  "role": "candidate"
}
```
- **Expected Status**: `201 Created`

---

### 1.6 Verify Email with OTP
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/verify-email-otp`
- **Body** (raw JSON):
```json
{
  "email": "mostafa.test@example.com",
  "otp": "123456"
}
```

---

### 1.7 Resend Email Verification OTP
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/resend-email-otp`
- **Body** (raw JSON):
```json
{
  "email": "mostafa.test@example.com"
}
```

---

### 1.8 Refresh Access Token using `refresh_token`
*Used by frontend clients when `access_token` expires without requiring candidate to log in again.*
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/refresh`
- **Option A (Body)**:
  - Headers: `Content-Type: application/json`
  - Body:
    ```json
    {
      "refresh_token": "{{refresh_token}}"
    }
    ```
- **Option B (Authorization Header)**:
  - Headers: `Authorization: Bearer {{refresh_token}}`
- **Expected Status**: `200 OK`
- **Expected Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 3,
    "name": "Ahmed Wael",
    "email": "ahmed.wael@example.com",
    "role": "candidate"
  }
}
```

---

### 1.9 Password Reset Flow
1. **Request Reset OTP**:
   - `POST {{base_url}}/auth/forgot-password`
   - Body: `{ "email": "ahmed.wael@example.com" }`
2. **Verify Reset OTP**:
   - `POST {{base_url}}/auth/forgot-password/verify-otp`
   - Body: `{ "email": "ahmed.wael@example.com", "otp": "123456" }`
   - *Returns*: `{ "data": { "reset_token": "..." } }`
3. **Reset Password**:
   - `POST {{base_url}}/auth/reset-password`
   - Body:
     ```json
     {
       "email": "ahmed.wael@example.com",
       "token": "reset_token_from_step_2",
       "password": "NewPassword123!",
       "password_confirmation": "NewPassword123!"
     }
     ```

---

# 🔵 LEVEL 2: Candidate Profile & Portfolio

*All requests in Level 2 require:*
`Authorization: Bearer {{candidate_token}}`

### 2.1 View Full Profile
- **Method**: `GET`
- **URL**: `{{base_url}}/candidate/profile`
- **Expected Status**: `200 OK`

### 2.2 Update Profile Information
- **Method**: `PATCH`
- **URL**: `{{base_url}}/candidate/profile`
- **Body** (raw JSON):
```json
{
  "job_title": "Senior Full-Stack Node.js Engineer",
  "country": "Egypt",
  "city": "Cairo",
  "years_of_experience": 4,
  "github_url": "https://github.com/ahmedwael",
  "linkedin_url": "https://linkedin.com/in/ahmedwael",
  "professional_summary": "Seasoned backend engineer with 4 years building high-throughput payment APIs and event-driven architectures."
}
```
- **Expected Status**: `200 OK`

---

### 2.3 View Career Preferences
- **Method**: `GET`
- **URL**: `{{base_url}}/candidate/career-preferences`

### 2.4 Update Career Preferences
- **Method**: `PATCH`
- **URL**: `{{base_url}}/candidate/career-preferences`
- **Body** (raw JSON):
```json
{
  "target_role": "Backend Technical Lead",
  "target_roles": ["Backend Technical Lead", "Principal Engineer"],
  "job_type": "full-time",
  "work_mode": "remote",
  "experience_level": "senior",
  "career_goal": "Lead resilient cloud-native microservices.",
  "open_to_relocation": false
}
```

---

### 2.5 Educations CRUD
- **List**: `GET {{base_url}}/candidate/educations`
- **Create**:
  - `POST {{base_url}}/candidate/educations`
  - Body:
    ```json
    {
      "institution": "Ain Shams University",
      "degree": "Bachelor of Engineering",
      "field_of_study": "Computer & Systems Engineering",
      "start_date": "2018-09-01",
      "end_date": "2023-07-01",
      "grade": "Excellent with Honours"
    }
    ```
- **Show Single**: `GET {{base_url}}/candidate/educations/1`
- **Update**: `PATCH {{base_url}}/candidate/educations/1`
- **Delete**: `DELETE {{base_url}}/candidate/educations/1`

---

### 2.6 Work Experiences CRUD
- **List**: `GET {{base_url}}/candidate/experiences`
- **Create**:
  - `POST {{base_url}}/candidate/experiences`
  - Body:
    ```json
    {
      "company_name": "PayMob",
      "job_title": "Senior Backend Developer",
      "employment_type": "full-time",
      "start_date": "2023-01-01",
      "is_current": true,
      "description": "Architected payment reconciliation services with Express and MySQL."
    }
    ```
- **Show Single**: `GET {{base_url}}/candidate/experiences/1`
- **Update**: `PATCH {{base_url}}/candidate/experiences/1`
- **Delete**: `DELETE {{base_url}}/candidate/experiences/1`

---

### 2.7 Projects CRUD
- **List**: `GET {{base_url}}/candidate/projects`
- **Create**:
  - `POST {{base_url}}/candidate/projects`
  - Body:
    ```json
    {
      "name": "High-Throughput Order Ingestion Engine",
      "description": "Distributed queue processing engine handling 10k orders per minute.",
      "project_url": "https://orders.skillmatch.dev",
      "github_url": "https://github.com/ahmedwael/order-engine"
    }
    ```
- **Show Single**: `GET {{base_url}}/candidate/projects/1`
- **Update**: `PATCH {{base_url}}/candidate/projects/1`
- **Delete**: `DELETE {{base_url}}/candidate/projects/1`

---

### 2.8 Skills Taxonomy & Candidate Skills
- **Search Skills**:
  - `GET {{base_url}}/skills/search?q=Node`
- **List Candidate Skills**:
  - `GET {{base_url}}/candidate/skills`
- **Attach Skill to Candidate**:
  - `POST {{base_url}}/candidate/skills`
  - Body:
    ```json
    {
      "name": "Docker",
      "proficiency_level": "intermediate",
      "years_of_experience": 2
    }
    ```
- **Remove Skill**:
  - `DELETE {{base_url}}/candidate/skills/:id`

---

# 🟣 LEVEL 3: CV Lifecycle & Background Parsing

*Headers: `Authorization: Bearer {{candidate_token}}`*

### 3.1 Upload CV (`multipart/form-data`)
- **Method**: `POST`
- **URL**: `{{base_url}}/cv/upload`
- **Body** (`form-data` in Postman):
  - Key: `cv` (Select type **File**)
  - Value: *(Choose any sample `.pdf` or `.docx` file)*
- **Expected Status**: `201 Created`
- **Expected Response**:
```json
{
  "message": "CV uploaded successfully and scheduled for background parsing.",
  "data": {
    "id": 2,
    "version": 2,
    "status": "processing"
  }
}
```

---

### 3.2 Check Parsing Status & Extracted Payload
- **Method**: `GET`
- **URL**: `{{base_url}}/cv/status/1`
- **Expected Status**: `200 OK`
- **Expected Response**:
```json
{
  "data": {
    "id": 1,
    "status": "completed",
    "extraction": {
      "confidence_score": 0.94,
      "extracted_data": {
        "skills": ["Node.js", "Express", "MySQL", "TypeScript"],
        "experience_years": 3
      }
    }
  }
}
```

---

### 3.3 Candidate Verification of Extracted CV Data
- **Method**: `POST`
- **URL**: `{{base_url}}/cv/extractions/1/verify`
- **Body** (raw JSON):
```json
{
  "skills": [
    { "name": "Node.js", "proficiency_level": "advanced", "years_of_experience": 3 },
    { "name": "MySQL", "proficiency_level": "advanced", "years_of_experience": 3 }
  ],
  "experiences": [
    {
      "company_name": "Fawry",
      "job_title": "Backend Engineer",
      "start_date": "2023-01-01",
      "is_current": true
    }
  ]
}
```
- **Expected Status**: `200 OK`

---

# 🟠 LEVEL 4: Jobs Discovery, Bookmarks & Applications

### 4.1 Browse Public Jobs Feed (with Filters)
- **Method**: `GET`
- **URL**: `{{base_url}}/jobs?search=Node&work_mode=remote&page=1&per_page=10`
- **Headers**: *(Optional: include `Bearer {{candidate_token}}` to show `is_saved: true/false`)*
- **Expected Status**: `200 OK` (Returns standard `{ data, links, meta }`)

---

### 4.2 View Single Job Details
- **Method**: `GET`
- **URL**: `{{base_url}}/jobs/1`
- **Expected Status**: `200 OK`

---

### 4.3 Bookmark / Save a Job
- **Method**: `POST`
- **URL**: `{{base_url}}/jobs/1/save`
- **Headers**: `Authorization: Bearer {{candidate_token}}`
- **Expected Status**: `200 OK`

---

### 4.4 List Saved Jobs
- **Method**: `GET`
- **URL**: `{{base_url}}/saved-jobs`
- **Headers**: `Authorization: Bearer {{candidate_token}}`

---

### 4.5 Unsave / Remove Bookmark
- **Method**: `DELETE`
- **URL**: `{{base_url}}/jobs/1/save`
- **Headers**: `Authorization: Bearer {{candidate_token}}`

---

### 4.6 Submit Job Application
- **Method**: `POST`
- **URL**: `{{base_url}}/applications`
- **Headers**: `Authorization: Bearer {{candidate_token}}`
- **Body** (raw JSON):
```json
{
  "job_post_id": 1,
  "cv_document_id": 1,
  "cover_letter": "I am passionate about building resilient payment backends with Node.js.",
  "notes": "Applied after reviewing PayMob engineering tech stack."
}
```
- **Expected Status**: `201 Created`

---

### 4.7 View Candidate Applications History
- **Method**: `GET`
- **URL**: `{{base_url}}/applications`
- **Headers**: `Authorization: Bearer {{candidate_token}}`

---

### 4.8 View Application Details & Status Timeline
- **Method**: `GET`
- **URL**: `{{base_url}}/applications/1`
- **Headers**: `Authorization: Bearer {{candidate_token}}`

---

### 4.9 Withdraw Application
- **Method**: `POST`
- **URL**: `{{base_url}}/applications/1/withdraw`
- **Headers**: `Authorization: Bearer {{candidate_token}}`
- **Body** (raw JSON):
```json
{
  "reason": "Accepted an offer at another company."
}
```

---

# 🔴 LEVEL 5: AI-Driven Career Growth & Intelligence

*Headers: `Authorization: Bearer {{candidate_token}}`*

### 5.1 Explainable Vacancy Fit Score
- **Method**: `GET`
- **URL**: `{{base_url}}/jobs/1/match`
- **Expected Status**: `200 OK`
- **Response Highlights**:
  - `match_score`: e.g. `87.5`
  - `match_level`: `"strong"`
  - `matched_skills`: `["Node.js", "TypeScript", "PostgreSQL"]`
  - `missing_skills`: `["Docker"]`
  - `gap_analysis`: must-have vs nice-to-have gaps

---

### 5.2 Recalculate Vacancy Match
- **Method**: `POST`
- **URL**: `{{base_url}}/jobs/1/match/recalculate`

---

### 5.3 Personalized Recommendations Feed
- **Method**: `GET`
- **URL**: `{{base_url}}/jobs/recommendations?min_score=70`

---

### 5.4 Candidate Skill Gaps Aggregation
- **Method**: `GET`
- **URL**: `{{base_url}}/candidate/skill-gaps`
- **Description**: Identifies missing skills across all bookmarked and target roles, sorted by market frequency.

---

### 5.5 Generate Dynamic Career Roadmap
- **Method**: `POST`
- **URL**: `{{base_url}}/roadmaps`
- **Body** (raw JSON):
```json
{
  "target_type": "role",
  "target_role": "Senior Backend Architect"
}
```
- **Expected Status**: `201 Created` (Generates 4-phase hierarchy with weighted tasks)

---

### 5.6 View Roadmap Hierarchy & Milestones
- **Method**: `GET`
- **URL**: `{{base_url}}/roadmaps/1`

---

### 5.7 Complete Learning Task (Progress Recalculation)
- **Method**: `PATCH`
- **URL**: `{{base_url}}/roadmap-tasks/2/complete`
- **Body** (raw JSON):
```json
{
  "evidence": "https://github.com/ahmedwael/docker-compose-microservice",
  "notes": "Configured multi-container Express cluster with Redis pub/sub."
}
```
- **Expected Status**: `200 OK` (Recalculates weighted percentage across entire roadmap)

---

### 5.8 Refresh Roadmap
- **Method**: `POST`
- **URL**: `{{base_url}}/roadmaps/1/refresh`
- **Expected Status**: `200 OK` (Increments generation version)

---

### 5.9 Preview Grounded AI Mentor Context
- **Method**: `GET`
- **URL**: `{{base_url}}/mentor/context-preview`

---

### 5.10 Start AI Mentor Conversation
- **Method**: `POST`
- **URL**: `{{base_url}}/mentor/conversations`
- **Body** (raw JSON):
```json
{
  "title": "Interview Preparation for PayMob",
  "context_mode": "job_specific",
  "message": "What architecture topics should I focus on for a Senior Backend interview?"
}
```
- **Expected Status**: `201 Created` (Returns mentor response with interactive action chips)

---

### 5.11 Chat with AI Mentor (Send Message)
- **Method**: `POST`
- **URL**: `{{base_url}}/mentor/conversations/1/messages`
- **Body** (raw JSON):
```json
{
  "message": "Can you give me an example of handling idempotent payment webhooks?"
}
```

---

### 5.12 CV Improver Analysis (Phase-2 AI)
- **Method**: `POST`
- **URL**: `{{base_url}}/candidate/cv-improvements/analyze`
- **Body** (raw JSON):
```json
{
  "target_role": "Senior Backend Engineer",
  "job_post_id": 1
}
```
- **Expected Response**: Overall ATS score, missing keywords, STAR-format bullet rewrites with rationale, and structural ATS tips.

---

### 5.13 Get Latest CV Improvement
- **Method**: `GET`
- **URL**: `{{base_url}}/candidate/cv-improvements/latest`

---

### 5.14 Start 5-Question Mock Interview Prep Session
- **Method**: `POST`
- **URL**: `{{base_url}}/interview-prep/sessions`
- **Body** (raw JSON):
```json
{
  "target_role": "Backend Node.js Engineer",
  "difficulty": "mid-level",
  "job_post_id": 1
}
```
- **Expected Status**: `201 Created` (Generates 5 questions across technical deep-dives, architecture, STAR behavioral).

---

### 5.15 Submit & Evaluate Interview Answer
- **Method**: `POST`
- **URL**: `{{base_url}}/interview-prep/sessions/1/evaluate`
- **Body** (raw JSON):
```json
{
  "question_id": "q1",
  "user_answer": "In Node.js, the event loop offloads file system and DNS calls to the libuv thread pool while network I/O is handled non-blockingly via OS epoll."
}
```
- **Expected Response**: Score (0-100), key strengths, improvements, model answer guidance, and updated session average score.

---

### 5.16 Assess Application Readiness Strategy
- **Method**: `POST`
- **URL**: `{{base_url}}/application-strategy/assess`
- **Body** (raw JSON):
```json
{
  "job_post_id": 1
}
```
- **Expected Response**: Readiness score, fit level (`strong_fit`/`moderate_fit`/`stretch`), tactical recommendation (`apply_now`/`improve_gaps_first`), quick wins (<48h), and blocker gaps.

---

# 🟣 LEVEL 6: Notifications & Inbox

*Headers: `Authorization: Bearer {{candidate_token}}`*

### 6.1 View Notifications Inbox
- **Method**: `GET`
- **URL**: `{{base_url}}/notifications?unread_only=false`

### 6.2 Get Real-Time Unread Count Badge
- **Method**: `GET`
- **URL**: `{{base_url}}/notifications/unread-count`
- **Expected Response**: `{ "data": { "count": 1 } }`

### 6.3 Mark Single Notification Read
- **Method**: `PATCH`
- **URL**: `{{base_url}}/notifications/1/read`

### 6.4 Mark All Notifications Read
- **Method**: `PATCH`
- **URL**: `{{base_url}}/notifications/read-all`

---

# 🔴 LEVEL 7: Admin Operations, Moderation & AI Review Queue

*All Level 7 requests require:*
`Authorization: Bearer {{admin_token}}`

### 7.1 Platform Statistics & Telemetry Dashboard
- **Method**: `GET`
- **URL**: `{{base_url}}/admin/statistics`
- **Description**: Returns live telemetry on total users by role, profile completion rates, active job inventory, application status breakdown, and AI review queue health.

---

### 7.2 Admin User Directory & Search
- **Method**: `GET`
- **URL**: `{{base_url}}/admin/users?role=candidate&search=Ahmed`

---

### 7.3 Moderate User Account Status (Suspend / Activate)
- **Method**: `PATCH`
- **URL**: `{{base_url}}/admin/users/4/status`
- **Body** (raw JSON):
```json
{
  "is_active": false
}
```

---

### 7.4 Promote / Change User Role
- **Method**: `PATCH`
- **URL**: `{{base_url}}/admin/users/4/role`
- **Body** (raw JSON):
```json
{
  "role": "admin"
}
```

---

### 7.5 Inspect AI Review Queue Items
- **Method**: `GET`
- **URL**: `{{base_url}}/admin/ai-review-items?status=approved`

---

### 7.6 View Single AI Review Item (3-Way Comparison)
- **Method**: `GET`
- **URL**: `{{base_url}}/admin/ai-review-items/1`
- **Description**: Displays `raw_input`, `proposed_payload`, and `corrected_payload` side-by-side with confidence score and complete audit trail.

---

### 7.7 Approve AI Review Item
- **Method**: `POST`
- **URL**: `{{base_url}}/admin/ai-review-items/1/approve`
- **Body** (raw JSON):
```json
{
  "decision_reason": "Verified skill matches CV resume text."
}
```

---

### 7.8 Human Correction of AI Item
- **Method**: `POST`
- **URL**: `{{base_url}}/admin/ai-review-items/1/correct`
- **Body** (raw JSON):
```json
{
  "corrected_value": {
    "skills": ["Node.js", "Express", "TypeScript"]
  },
  "decision_reason": "Corrected framework alias."
}
```

---

### 7.9 Reject AI Item
- **Method**: `POST`
- **URL**: `{{base_url}}/admin/ai-review-items/1/reject`
- **Body** (raw JSON):
```json
{
  "decision_reason": "Extracted text contains unverified credentials."
}
```

---

### 7.10 View Platform Global Audit Trail
- **Method**: `GET`
- **URL**: `{{base_url}}/admin/audit-logs?page=1&per_page=20`

---

### 7.11 Progress Application Hiring Stage (Admin State Machine)
- **Method**: `PATCH`
- **URL**: `{{base_url}}/applications/1/status`
- **Body** (raw JSON):
```json
{
  "status": "shortlisted",
  "notes": "Candidate passed automated technical criteria screening."
}
```

---

### 7.12 Trigger External Job Aggregation Ingestion Run
- **Method**: `POST`
- **URL**: `{{base_url}}/admin/job-sources/1/run`
- **Body** (raw JSON):
```json
{
  "batch_size": 15
}
```
- **Expected Status**: `200 OK` (Runs deduplication, company alias resolution, and creates jobs)

---

### 7.13 Broadcast In-App Notification (Admin Composer)
- **Method**: `POST`
- **URL**: `{{base_url}}/admin/notifications/compose`
- **Body** (raw JSON):
```json
{
  "recipient_type": "all_candidates",
  "title": "New Payment Engineering Roles Open",
  "body": "Explore newly aggregated FinTech roles in Cairo with explainable fit scores!",
  "type": "announcement"
}
```
- **Expected Status**: `200 OK`
