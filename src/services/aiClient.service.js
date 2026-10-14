'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const logger = require('../utils/logger');

class AiClientService {
  constructor() {
    this.baseUrl = (config.ai && config.ai.baseUrl)
      || process.env.AI_SERVICE_BASE_URL
      || process.env.AI_SERVICE_URL
      || 'https://ai-serv5.fastapicloud.dev';
    
    // Normalize base URL (strip trailing slash)
    this.baseUrl = this.baseUrl.replace(/\/+$/, '');

    this.secretKey = (config.ai && config.ai.secretKey)
      || process.env.AI_SERVICE_SECRET_KEY
      || process.env.AI_SERVICE_API_KEY
      || '';

    this.timeout = (config.ai && config.ai.timeoutMs) || 30000;

    const headers = {
      'Accept': 'application/json'
    };

    if (this.secretKey) {
      headers['X-API-Key'] = this.secretKey;
      headers['Authorization'] = `Bearer ${this.secretKey}`;
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers
    });

    // Request interceptor ensuring current API key and headers are always attached
    this.client.interceptors.request.use((reqConfig) => {
      const activeKey = this.secretKey
        || (config.ai && config.ai.secretKey)
        || process.env.AI_SERVICE_SECRET_KEY
        || process.env.AI_SERVICE_API_KEY;

      if (activeKey) {
        reqConfig.headers = reqConfig.headers || {};
        reqConfig.headers['X-API-Key'] = activeKey;
        if (!reqConfig.headers['Authorization']) {
          reqConfig.headers['Authorization'] = `Bearer ${activeKey}`;
        }
      }
      logger.info(`[AI Client] Outgoing ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`);
      return reqConfig;
    }, (error) => {
      return Promise.reject(error);
    });

    // Response interceptor for consistent error sanitization
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        return Promise.reject(this._sanitizeError(error));
      }
    );
  }

  /**
   * Sanitize errors to prevent logging or exposing secret credentials
   */
  _sanitizeError(error) {
    const safeError = new Error();

    if (error.response) {
      safeError.name = 'AiServiceResponseError';
      safeError.status = error.response.status;
      safeError.data = error.response.data;
      const detail = error.response.data?.detail || error.response.data?.message || JSON.stringify(error.response.data);
      safeError.message = `AI service returned error HTTP ${error.response.status}: ${detail}`;
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      safeError.name = 'AiServiceTimeoutError';
      safeError.status = 504;
      safeError.message = `AI service request timed out after ${this.timeout}ms.`;
    } else {
      safeError.name = 'AiServiceNetworkError';
      safeError.status = 502;
      safeError.message = `AI service connection failed: ${error.message}`;
    }

    logger.warn(`[AI Client] Request failed: ${safeError.message}`);
    return safeError;
  }

  /**
   * Check AI service operational health
   */
  async checkHealth() {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Extract candidate profile from raw CV text
   * POST /api/v1/cv/extract-text
   */
  async extractCvText(text, candidateId = null) {
    if (!text || typeof text !== 'string') {
      throw new Error('CV text must be a non-empty string.');
    }
    const payload = {
      text: text.trim(),
      candidate_id: candidateId ? String(candidateId) : null
    };
    const response = await this.client.post('/api/v1/cv/extract-text', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  /**
   * Build FormData object for file upload to FastAPI
   */
  _buildCvFormData(fileInput, filename = 'resume.pdf', candidateId = null) {
    if (!fileInput) {
      throw new Error('fileInput is required for CV extraction.');
    }

    const formData = new FormData();
    let fileBuffer;
    let effectiveFilename = filename;
    let mimeType = 'application/pdf';

    if (typeof fileInput === 'string') {
      fileBuffer = fs.readFileSync(fileInput);
      effectiveFilename = filename || path.basename(fileInput);
    } else if (Buffer.isBuffer(fileInput)) {
      fileBuffer = fileInput;
      effectiveFilename = filename || 'resume.pdf';
    } else if (fileInput && typeof fileInput === 'object') {
      if (fileInput.path && fs.existsSync(fileInput.path)) {
        fileBuffer = fs.readFileSync(fileInput.path);
      } else if (fileInput.buffer) {
        fileBuffer = fileInput.buffer;
      }
      effectiveFilename = fileInput.originalname || filename || 'resume.pdf';
      mimeType = fileInput.mimetype || mimeType;
    }

    if (!fileBuffer) {
      throw new Error('Unable to read CV file buffer from input.');
    }

    const ext = path.extname(effectiveFilename).toLowerCase();
    if (ext === '.pdf') {
      mimeType = 'application/pdf';
    } else if (ext === '.docx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (ext === '.doc') {
      mimeType = 'application/msword';
    } else if (ext === '.txt') {
      mimeType = 'text/plain';
    }

    const fileBlob = new Blob([fileBuffer], { type: mimeType });
    // Append 'file' as required by FastAPI Cloud /api/v1/cv/extract-file
    formData.append('file', fileBlob, effectiveFilename);
    // Also append 'cv' and 'cv_file' for multi-field endpoint compatibility
    formData.append('cv', fileBlob, effectiveFilename);
    formData.append('cv_file', fileBlob, effectiveFilename);

    if (candidateId) {
      formData.append('candidate_id', String(candidateId));
    }

    return formData;
  }

  /**
   * Extract candidate profile from CV document file upload
   * POST /api/v1/cv/extract-file
   * Accepts local file path, Buffer, or multer file object.
   * Note: Let Axios set Content-Type with automatic boundary string to prevent payload corruption.
   */
  async extractCvFile(fileInput, filename = 'resume.pdf', candidateId = null) {
    const formData = this._buildCvFormData(fileInput, filename, candidateId);
    const response = await this.client.post('/api/v1/cv/extract-file', formData);
    return response.data;
  }

  /**
   * Queue CV file extraction as background job
   * POST /api/v1/cv/extract-file-async
   */
  async extractCvFileAsync(fileInput, filename = 'resume.pdf', candidateId = null) {
    const formData = this._buildCvFormData(fileInput, filename, candidateId);
    const response = await this.client.post('/api/v1/cv/extract-file-async', formData);
    return response.data;
  }

  /**
   * Poll background CV extraction job status
   * GET /api/v1/cv/jobs/{job_id}
   */
  async getCvJobStatus(jobId) {
    if (!jobId) {
      throw new Error('jobId is required.');
    }
    const response = await this.client.get(`/api/v1/cv/jobs/${jobId}`);
    return response.data;
  }

  /**
   * Analyze CV improvement against target job or role
   * POST /api/v1/cv-improvement/analyze
   */
  async analyzeCvImprovement({ candidateId, jobId = null, jobDescription = null }) {
    if (!candidateId) {
      throw new Error('candidateId is required for CV improvement analysis.');
    }
    const payload = {
      candidate_id: String(candidateId),
      job_id: jobId ? String(jobId) : null,
      job_description: jobDescription || null
    };
    const response = await this.client.post('/api/v1/cv-improvement/analyze', payload);
    return response.data;
  }

  /**
   * Analyze job description
   * POST /api/v1/jobs/analyze
   */
  async analyzeJobDescription({ jobDescription, jobId = null }) {
    if (!jobDescription || jobDescription.length < 50) {
      throw new Error('jobDescription must be at least 50 characters.');
    }
    const payload = {
      job_description: jobDescription,
      job_id: jobId ? String(jobId) : null
    };
    const response = await this.client.post('/api/v1/jobs/analyze', payload);
    return response.data;
  }

  /**
   * Analyze skill gap and calculate explainable match
   * POST /api/v1/matches/analyze
   */
  async analyzeMatch({
    jobId,
    candidateId,
    jobRequirements,
    candidateProfile,
    preferredSkills = [],
    jobTitle = null,
    canonicalRole = null,
    minYearsExperience = null,
    workMode = null,
    location = null,
    employmentType = null
  }) {
    if (!jobId || !candidateId) {
      throw new Error('jobId and candidateId are required for match analysis.');
    }
    const payload = {
      job_id: String(jobId),
      candidate_id: String(candidateId),
      job_requirements: jobRequirements || [],
      candidate_profile: candidateProfile || {},
      preferred_skills: preferredSkills || [],
      job_title: jobTitle || null,
      canonical_role: canonicalRole || null,
      min_years_experience: minYearsExperience !== null ? Number(minYearsExperience) : null,
      work_mode: workMode || null,
      location: location || null,
      employment_type: employmentType || null
    };
    const response = await this.client.post('/api/v1/matches/analyze', payload);
    return response.data;
  }

  /**
   * Generate dynamic career roadmap
   * POST /api/v1/roadmap/generate
   */
  async generateRoadmap({
    candidateId,
    targetRole,
    roleFamily = 'Engineering',
    skillGaps = []
  }) {
    if (!candidateId || !targetRole) {
      throw new Error('candidateId and targetRole are required for roadmap generation.');
    }
    const gaps = Array.isArray(skillGaps) && skillGaps.length > 0
      ? skillGaps
      : ['Core Fundamentals'];

    const payload = {
      candidate_id: String(candidateId),
      target_role: String(targetRole),
      role_family: roleFamily || 'Engineering',
      skill_gaps: gaps
    };
    const response = await this.client.post('/api/v1/roadmap/generate', payload);
    return response.data;
  }

  /**
   * Refresh dynamic career roadmap
   * POST /api/v1/roadmap/refresh
   */
  async refreshRoadmap({
    candidateId,
    targetRole = null,
    roleFamily = null,
    newSkillGaps = null
  }) {
    if (!candidateId) {
      throw new Error('candidateId is required for roadmap refresh.');
    }
    const payload = {
      candidate_id: String(candidateId),
      target_role: targetRole || null,
      role_family: roleFamily || null,
      new_skill_gaps: newSkillGaps || null
    };
    const response = await this.client.post('/api/v1/roadmap/refresh', payload);
    return response.data;
  }

  /**
   * Update roadmap task progress
   * POST /api/v1/roadmap/tasks/{task_id}/complete
   */
  async completeRoadmapTask({ candidateId, taskId, status = 'completed' }) {
    if (!candidateId || !taskId) {
      throw new Error('candidateId and taskId are required.');
    }
    const payload = {
      candidate_id: String(candidateId),
      task_id: String(taskId),
      status
    };
    const response = await this.client.post(`/api/v1/roadmap/tasks/${taskId}/complete`, payload);
    return response.data;
  }

  /**
   * Generate interview questions
   * POST /api/v1/interview/generate
   */
  async generateInterviewQuestions({
    jobId,
    targetRole,
    candidateId,
    focusSkills = [],
    jobSummary = null,
    includeEssay = true
  }) {
    const payload = {
      job_id: String(jobId || 'job_generic'),
      target_role: String(targetRole || 'Software Engineer'),
      candidate_id: String(candidateId || 'cand_generic'),
      focus_skills: focusSkills || [],
      job_summary: jobSummary || null,
      include_essay: includeEssay !== false
    };
    const response = await this.client.post('/api/v1/interview/generate', payload);
    return response.data;
  }

  /**
   * Evaluate interview answer
   * POST /api/v1/interview/evaluate
   */
  async evaluateInterviewAnswer({
    questionId,
    questionText,
    questionType = 'technical',
    skillId = null,
    userAnswer
  }) {
    if (!questionId || !questionText || !userAnswer) {
      throw new Error('questionId, questionText, and userAnswer are required.');
    }
    const payload = {
      question_id: String(questionId),
      question_text: String(questionText),
      question_type: questionType || 'technical',
      skill_id: skillId ? String(skillId) : null,
      user_answer: String(userAnswer)
    };
    const response = await this.client.post('/api/v1/interview/evaluate', payload);
    return response.data;
  }

  /**
   * Mentor conversational chat
   * POST /api/v1/mentor/chat/stream
   */
  async mentorChat({
    message,
    conversationId,
    userId,
    jobId = null,
    targetRole = null,
    careerPreferences = null,
    savedJobs = null,
    appliedJobs = null,
    applicationStatuses = null,
    matchReports = null,
    userNotes = null,
    currentMilestones = null
  }) {
    if (!message || !conversationId || !userId) {
      throw new Error('message, conversationId, and userId are required.');
    }
    const payload = {
      message: String(message),
      conversation_id: String(conversationId),
      user_id: String(userId),
      job_id: jobId ? String(jobId) : null,
      target_role: targetRole || null,
      career_preferences: careerPreferences || null,
      saved_jobs: savedJobs || null,
      applied_jobs: appliedJobs || null,
      application_statuses: applicationStatuses || null,
      matchReports: matchReports || null,
      user_notes: userNotes || null,
      current_milestones: currentMilestones || null
    };

    const response = await this.client.post('/api/v1/mentor/chat/stream', payload, {
      responseType: 'text'
    });

    let fullReply = '';
    const suggestedActions = [];

    if (typeof response.data === 'string') {
      const lines = response.data.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payloadStr = line.slice(6).trim();
          if (payloadStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payloadStr);
            if (parsed.type === 'token' && parsed.content) {
              fullReply += parsed.content;
            } else if (parsed.type === 'suggested_prompts' && Array.isArray(parsed.prompts)) {
              for (const p of parsed.prompts) {
                suggestedActions.push({
                  type: 'suggested_prompt',
                  label: p
                });
              }
            } else if (parsed.reply) {
              fullReply += parsed.reply;
            }
          } catch (_) {}
        }
      }
    } else if (response.data && typeof response.data === 'object') {
      fullReply = response.data.reply || response.data.message || '';
    }

    return {
      reply: fullReply.trim() || 'I am here to guide your career progression.',
      suggested_actions: suggestedActions
    };
  }

  /**
   * Evaluate application strategy
   * POST /api/v1/strategy/evaluate
   */
  async evaluateStrategy({
    userId,
    jobId,
    targetRole = null,
    userNotes = null
  }) {
    if (!userId || !jobId) {
      throw new Error('userId and jobId are required.');
    }
    const payload = {
      user_id: String(userId),
      job_id: String(jobId),
      target_role: targetRole || null,
      user_notes: userNotes || null
    };
    const response = await this.client.post('/api/v1/strategy/evaluate', payload);
    return response.data;
  }
}

// Export singleton instance
module.exports = new AiClientService();
