# SkillMatch — Project Features & Delivery Scope

Smart job discovery, skill-gap guidance, AI mentorship, and career-roadmap platform.

---

## 📌 Document Purpose
- Define what each project area must build and what is expected to be delivered.
- Focus on product features and team responsibilities only (no technology stack decisions).
- Keep AI features useful, explainable, and directly connected to user actions and career outcomes.

---

## 🎯 Core Product Idea
- Students and developers create a structured career profile from their CV and preferences.
- The platform aggregates jobs and internships, then normalizes and enriches the listings.
- AI explains fit, identifies missing skills, recommends relevant opportunities, and builds a practical development roadmap.
- An AI mentor turns those insights into weekly actions, application guidance, and interview preparation.

---

## 01. Product Definition

### Project Summary
SkillMatch is a candidate-focused platform that helps students and developers discover relevant jobs and internships, understand why a role matches them, identify the skills they are missing, and follow a practical plan to become more competitive for their target role.

### Primary User Journey
$$\text{Create Account} \longrightarrow \text{Complete Profile} \longrightarrow \text{Upload CV} \longrightarrow \text{AI Extracts Skills} \longrightarrow \text{Browse Opportunities} \longrightarrow \text{Open Job} \longrightarrow \text{Review Match \& Gaps} \longrightarrow \text{Save/Apply} \longrightarrow \text{Track Application} \longrightarrow \text{Follow Roadmap} \longrightarrow \text{Use AI Mentor} \longrightarrow \text{Receive Notifications}$$

### User Roles
1. **Candidate:** Student or developer using the mobile app to manage profile, CV, job discovery, applications, recommendations, roadmap, and mentorship.
2. **Admin:** Operations role using the web dashboard to manage users, companies, jobs, sources, skills, data quality, moderation, and system statistics.
3. **Company / Job Publisher:** Optional managed role for creating or maintaining company and job records when opportunities are entered directly into the platform.

### Feature Ownership Snapshot

| Area | Primary Ownership | Expected Final Output |
| :--- | :--- | :--- |
| **Flutter** | Candidate mobile experience | Complete candidate journey from onboarding to AI mentor and roadmap. |
| **Frontend Web** | Admin and operations experience | Operational dashboard for managing platform data and monitoring quality. |
| **Backend** | Business rules, data contracts & integrations | Reliable APIs, workflows, job ingestion, search, application tracking, and notification logic. |
| **AI** | Career intelligence & decision support | CV understanding, matching, skill gaps, recommendations, mentorship, and adaptive roadmap. |

---

## 02. Candidate Application (Flutter Mobile)

1. **Authentication & Account:** Register, login, logout, password recovery, session handling, and secure account state.
2. **Career Onboarding:** Collect target role, preferred job type, work mode, location preferences, experience level, and optional career goals.
3. **Profile & Skills:** View and edit personal information, education, experience, projects, and skills; show which skills came from the CV vs. manually added.
4. **CV Management:** Upload, replace, and preview CV; show processing status and extracted skills after analysis.
5. **Jobs & Internships Feed:** Browse recent and recommended opportunities with clear source, company, location, work mode, job type, and freshness information.
6. **Search & Filters:** Search by title, company, skill, or keyword and filter by location, work mode, type, experience level, and freshness.
7. **Job Details:** Show full normalized job listing, required/preferred skills, responsibilities, source link, publication/freshness status, and application method.
8. **AI Match Insight:** Show match level, matched requirements, missing skills, important gaps, and concise explanation of why the job is or is not a good fit.
9. **Apply Flow:** Support internal application when available and external apply handoff when the source owns the flow. Includes duplicate-application prevention.
10. **Saved Jobs:** Save, unsave, and organize opportunities for later review with persistent state updates.
11. **Application Tracker:** Track status (`Applied`, `In Review`, `Interview`, `Rejected`, `Offer`, `Withdrawn`) and allow user notes.
12. **AI Mentor Chat:** Context-aware assistant using candidate profile, CV, target role, saved/applied jobs, and roadmap to answer career questions and recommend next actions.
13. **Career Roadmap:** Personalized roadmap with priority skills, phases, milestones, weekly tasks, and progress toward a target role.
14. **Interview Preparation:** Generate role-specific practice questions and allow user to review model guidance/feedback linked to target skills.
15. **Notifications:** Notify users about new relevant jobs, application changes, roadmap reminders, CV processing results, and platform actions.

---

## 03. Operations Portal (Frontend Web)

1. **Admin Authentication & Access:** Protected admin experience with role/permission-based rules.
2. **Admin Dashboard:** Overview of users, companies, active jobs, sources, applications, source health, stale listings, and recent system activity.
3. **User Management:** Search, inspect, activate/deactivate, and review user account state safely.
4. **Company Management:** Create, edit, verify, merge, or deactivate company records and connect jobs to the correct company.
5. **Jobs & Internships Management:** Create/edit direct listings, review imported listings, deactivate expired jobs, and inspect metadata.
6. **Job Source Management:** Register approved sources, enable/disable collection, configure metadata, and inspect last successful run.
7. **Scraping / Import Monitor:** Show collection runs, new/updated/duplicate/failed counts, parser errors, stale sources, and retry actions.
8. **Applications Monitoring:** Searchable operational view of platform-recorded applications and status transitions.
9. **Skills & Taxonomy Management:** Manage canonical skills, aliases, and categories used by CV parsing, job enrichment, and matching.
10. **AI Data Quality Review:** Human-review queue for low-confidence CV/job extractions and ambiguous skill mappings requiring human confirmation.
11. **Moderation & Data Cleanup:** Merge duplicates, correct malformed job/company data, deactivate suspicious listings, and maintain audit logs.
12. **Statistics:** Simple usage/operations metrics (active users, active jobs, application volume, most requested skills, source freshness, recommendation engagement).
13. **Notification Management:** Controlled notification composer for system announcements or targeted operational alerts.

---

## 04. Platform Services (Backend)

1. **Authentication & Authorization:** Account creation, login, password flows, session/token validation, roles, and permission checks.
2. **User & Candidate Profile:** Store and update candidate profile, career preferences, target role, skills, education, experience, projects, and progress.
3. **CV Lifecycle:** Upload metadata, file ownership, processing state, extracted structured data, replacement/version handling, and failure recovery.
4. **Company Management:** Canonical company records, aliases, verification state, and job relationships.
5. **Jobs & Internships:** Create, read, update, deactivate, and query normalized job records with source, freshness, and application method.
6. **Search & Filtering:** Keyword search, filters, sorting, pagination, and relevance fields.
7. **Applications:** Create and prevent duplicate applications, maintain status history, notes, and source/application methods.
8. **Saved Jobs:** Save/unsave/list candidate opportunities.
9. **Skills & Taxonomy:** Canonical skills, aliases, categories, and mapping support to prevent inconsistent naming.
10. **Notifications:** Create, store, mark read, target users, and support deep-link metadata.
11. **AI Integration Contracts:** Provide structured data to AI functions and persist outputs (extracted skills, match explanations, recommendations, roadmap state).
12. **Audit & Operational Logs:** Queryable audit trail for operationally significant actions and status transitions.

---

## 05. Job Data Collection (Scraping & Aggregation)

1. **Approved Source Registry:** Admin-manageable registry maintaining public/authorized job sources, base URLs, collection methods, and active states.
2. **Scheduled Collection:** Repeatable ingestion runs on a defined schedule per source with full run history.
3. **Listing Discovery:** Find job detail URLs/records handling pagination and result navigation.
4. **Job Detail Extraction:** Extract title, company, description, location, work mode, job type, experience level, posting date, deadline, and application URL.
5. **Normalization:** Convert inconsistent source values into platform-standard categories.
6. **Skill & Requirement Enrichment:** Send descriptions through job-understanding AI to extract required/preferred skills, seniority cues, and role category.
7. **Duplicate Detection:** Detect identical jobs via source URL, company/title similarity, and content fingerprints; retain the best canonical record.
8. **Update Detection:** Recognize changes in description, deadline, or status and update existing records (version-aware).
9. **Freshness & Expiration:** Track last-seen time and expire/flag listings that disappear or pass deadlines.
10. **Source Health Monitoring:** Measure success/failure rate, parser errors, unexpected page changes, and empty runs.
11. **Retry & Failure Isolation:** Retry transient failures without duplicating records; isolate broken sources.
12. **Responsible Collection Rules:** Respect source terms, robots directives, rate limits, and request pacing (no bypass of paywalls, CAPTCHAs, or auth).
13. **Manual / File Import Fallback:** Allow authorized manual entry or structured file imports for sources that cannot be scraped.

---

## 06. Career Intelligence (AI Features)

1. **CV Profile Extraction:** Convert uploaded CVs into structured candidate profiles with evidence/source text preservation and confidence metrics.
2. **Job Description Understanding:** Transform raw descriptions into structured requirement profiles (required/preferred skills, seniority, responsibilities).
3. **Explainable Job Match:** Compare candidate evidence against job requirements and produce fit reports with matched strengths, important gaps, and concise reasoning.
4. **Skill Gap Analysis:** Identify missing or weak skills, classify by importance (must-have vs. nice-to-have), and feed directly to the roadmap/mentor.
5. **Personalized Job Recommendations:** Rank jobs using skills, target role, preferences, match quality, freshness, and previous user behavior.
6. **AI Mentor Chatbot:** Context-aware career mentor grounded in user profile, CV, target role, selected jobs, application history, gaps, and roadmap.
7. **Dynamic Career Roadmap:** Build practical roadmaps from current profile to target role with prioritized gaps, phases, milestones, and weekly tasks.
8. **CV Improvement Assistant:** Suggest evidence-based improvements (clearer bullet points, missing keywords) without fabricating qualifications.
9. **Interview Preparation Coach:** Generate interview topics and practice questions based on selected job/matched skills; evaluate user answers.
10. **Application Strategy Guidance:** Advice on whether to apply now, improve specific gaps first, or prioritize alternative roles.
11. **Roadmap Progress Review:** Periodically recalculate roadmap priorities based on completed tasks, new skills, and application outcomes.
12. **AI Data Quality Assistant for Admin:** Flag low-confidence extractions, ambiguous job categories, and suspicious listings for human review.

---

## 07. AI Mentor & Roadmap Behavior

### Context Allowed
- Candidate profile and verified CV extraction
- Target role and career preferences
- Selected, saved, and applied jobs
- Match reports and prioritized skill gaps
- Current roadmap, completed milestones, and user notes
- Recorded application statuses

### Operational Rules
1. **Goal Clarification:** Turn broad goals (e.g., "I want a backend internship") into concrete target roles, timeframes, and milestones.
2. **Weekly Action Planning:** Convert skill gaps into practice tasks, portfolio improvements, CV updates, and targeted applications.
3. **Job-Specific Advice:** Base advice on actual job requirements and user profile data rather than generic statements.
4. **Roadmap Adjustment:** Reprioritize when users add skills, complete projects, change target roles, or repeatedly encounter specific job requirements.
5. **Application Debrief:** Capture lessons after rejection/interview stages without claiming knowledge of hidden employer decisions.
6. **Interview Readiness:** Identify specific topics requiring practice before an interview.
7. **Truthfulness & Boundaries:** Do not invent qualifications or claim guaranteed hiring probabilities.

### Roadmap Structure
- **Target:** Role the user is trying to reach.
- **Baseline:** Verified strengths, experience, and current skill level.
- **Priority Gaps:** Missing skills or evidence ordered by impact.
- **Phases:** Short stages (`Foundations`, `Build Evidence`, `Apply`, `Interview Readiness`).
- **Milestones:** Measurable outcomes (e.g., "complete 2 projects using X").
- **Weekly Actions:** Small executable tasks.
- **Progress:** Completion state plus evidence or user confirmation.
- **Adaptation:** Recalculate priorities when profile, target, or progress changes.

---

## 08. AI Delivery Requirements

### Deliverables & Contracts
1. **Structured CV Output:** Defined representation of candidate skills, experience, education, projects, and confidence fields.
2. **Structured Job Requirement Output:** Normalized representation of required/preferred skills, seniority, and constraints.
3. **Match Result Contract:** Score/level plus matched evidence, missing requirements, and concise explanation.
4. **Skill-Gap Result:** Prioritized gaps linked to roadmap actions.
5. **Recommendation Result:** Ranked opportunities with concise reasons.
6. **Mentor Context & Conversation Behavior:** Rules for context usage, conversation history, and suggested actions.
7. **Roadmap Model:** Structured phases, milestones, tasks, and refresh logic.
8. **CV Improvement Output:** Truthful, role-targeted recommendations.
9. **Interview Prep Output:** Job-specific practice questions, topic priorities, and feedback structure.
10. **Confidence & Human Review Rules:** Flag low-confidence outputs for review.
11. **Evaluation Test Set:** Representative CV/job pairs used to verify reasoning consistency.
12. **Failure & Fallback Handling:** Graceful outputs for unreadable CVs, short job descriptions, or missing contexts.

---

## 09. Cross-Team Integration Flows

1. **CV to Career Profile:** `Upload CV` $\rightarrow$ `Backend processes` $\rightarrow$ `AI extracts profile` $\rightarrow$ `User verifies/corrects` $\rightarrow$ `Verified profile used for matching`.
2. **Aggregated Job to Feed:** `Source collected` $\rightarrow$ `Raw job stored` $\rightarrow$ `Normalized/Deduplicated` $\rightarrow$ `AI extracts requirements` $\rightarrow$ `Appears in mobile feed`.
3. **Job Match:** `User opens job` $\rightarrow$ `Platform combines profile & job requirements` $\rightarrow$ `AI generates fit & gaps` $\rightarrow$ `Displays on job details`.
4. **Roadmap Creation:** `User selects target role/job` $\rightarrow$ `AI computes skill gaps` $\rightarrow$ `Roadmap generated` $\rightarrow$ `Flutter displays milestones`.
5. **Mentor Guidance:** `User asks question` $\rightarrow$ `Backend supplies context` $\rightarrow$ `AI Mentor answers` $\rightarrow$ `Response links to jobs/tasks`.
6. **Application Tracking:** `User applies` $\rightarrow$ `Status created` $\rightarrow$ `Status updates reflected in mobile/mentor/roadmap`.
7. **Admin Data Review:** `Low confidence alert` $\rightarrow$ `Admin reviews item` $\rightarrow$ `Admin approves/corrects` $\rightarrow$ `Canonical data updated for search/AI`.

---

## 10. Delivery Priorities

### MVP Checklist
- **Flutter MVP:** Auth & Onboarding, Profile & CV Upload, Jobs Feed & Search/Filters, Job Details, Explainable Match & Gaps, Saved Jobs, Application Tracker, AI Mentor Chat, Career Roadmap, Notifications.
- **Frontend Web MVP:** Admin Dashboard, Users & Companies Management, Jobs Management, Job Source Management, Scraping/Import Monitor, Skills/Taxonomy Management, AI Low-Confidence Review Queue, Basic Statistics.
- **Backend MVP:** Auth & Permissions, Profiles & CV Lifecycle, Companies & Normalized Jobs, Search/Filtering, Applications & Saved Jobs, Skills/Taxonomy, Notifications, Ingestion/Normalization/Deduplication, AI Integration Contracts.
- **AI MVP:** CV Profile Extraction, Job Requirement Extraction/Normalization, Explainable Job Matching, Skill-Gap Analysis, Personalized Recommendations, Context-Aware AI Mentor, Dynamic Career Roadmap, Fallback Handling.

### Recommended Phase 2
- Targeted CV Improvement Assistant
- Interview Preparation Coach with Answer Feedback
- Application Strategy Guidance
- Advanced Roadmap Progress Review
- Additional Job Sources & Source-Health Analytics
- Optional Company / Job-Publisher Portal

---

## 11. Final Demo & Product Guardrails

### Expected Demo Steps
1. **Candidate Onboarding:** Account creation and target role selection.
2. **CV Processing:** Upload CV, extract skills, and verify profile.
3. **Job Ingestion:** Scheduled collection runs, normalizes, deduplicates, and enriches listings.
4. **Job Discovery:** Candidate browses personalized job feed and opens a role.
5. **Match & Gap Analysis:** System presents explainable match report and skill gaps.
6. **Application Tracking:** Candidate saves/applies to the job and updates application status.
7. **Roadmap Generation:** AI creates a personalized roadmap based on actual gaps.
8. **Mentorship Interaction:** Candidate asks AI mentor for weekly focus areas based on roadmap and job.
9. **Admin Review:** Web admin checks source health, duplicates, and low-confidence AI items.

### Product Guardrails
- AI supports the candidate; it **never** makes automated hiring decisions for employers.
- **No** "guaranteed hire" or fabricated probability claims.
- CV improvement **must not** invent experience, projects, or skills.
- Scraping **must** respect public boundaries, rate limits, and directives (no bypassing CAPTCHAs or paywalls).
- Every aggregated job **must** retain source attribution and freshness metadata.
- Low-confidence AI extractions **must** remain reviewable/correctable by users or admins.