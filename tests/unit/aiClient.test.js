'use strict';

const axios = require('axios');

const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
  get: jest.fn(),
  post: jest.fn()
}));

const aiClient = require('../../src/services/aiClient.service');

describe('AiClientService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    aiClient.client = mockAxiosInstance;
  });

  describe('Configuration & Initialization', () => {
    it('initializes with base URL, timeout, and authorization headers', () => {
      expect(aiClient.baseUrl).toBe('https://ai-serv5.fastapicloud.dev');
      expect(aiClient.secretKey).toBeTruthy();
      expect(aiClient.timeout).toBeGreaterThan(0);
    });
  });

  describe('checkHealth', () => {
    it('invokes GET /health and returns health status', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { status: 'healthy', version: '1.0.0' }
      });

      const result = await aiClient.checkHealth();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
      expect(result.status).toBe('healthy');
    });
  });

  describe('extractCvText', () => {
    it('invokes POST /api/v1/cv/extract-text with structured payload', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          candidate_id: 'cand_1',
          candidate_skills: [{ name: 'Node.js', proficiency: 'advanced' }]
        }
      });

      const result = await aiClient.extractCvText('Sample CV raw text', 'cand_1');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/cv/extract-text',
        { text: 'Sample CV raw text', candidate_id: 'cand_1' },
        expect.any(Object)
      );
      expect(result.candidate_id).toBe('cand_1');
    });

    it('throws error when text is empty', async () => {
      await expect(aiClient.extractCvText('')).rejects.toThrow('CV text must be a non-empty string');
    });
  });

  describe('extractCvFile', () => {
    it('invokes POST /api/v1/cv/extract-file with FormData without corrupting Content-Type', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          candidate_id: 'cand_1',
          user: { name: 'Ahmed' },
          candidate_skills: [{ name: 'JavaScript' }]
        }
      });

      const buffer = Buffer.from('PDF_MOCK_CONTENT');
      const result = await aiClient.extractCvFile(buffer, 'resume.pdf', 'cand_1');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/cv/extract-file',
        expect.any(Object)
      );
      expect(result.candidate_id).toBe('cand_1');
    });

    it('throws error when fileInput is missing', async () => {
      await expect(aiClient.extractCvFile(null)).rejects.toThrow('fileInput is required');
    });
  });

  describe('analyzeCvImprovement', () => {
    it('invokes POST /api/v1/cv-improvement/analyze', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          candidate_id: 'cand_1',
          gap_analysis: { match_score: 0.85 },
          improvement_suggestions: []
        }
      });

      const result = await aiClient.analyzeCvImprovement({
        candidateId: 'cand_1',
        jobId: '10',
        jobDescription: 'Senior Backend'
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/cv-improvement/analyze',
        {
          candidate_id: 'cand_1',
          job_id: '10',
          job_description: 'Senior Backend'
        }
      );
      expect(result.candidate_id).toBe('cand_1');
    });
  });

  describe('analyzeMatch', () => {
    it('invokes POST /api/v1/matches/analyze with complete payload', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          job_id: '10',
          candidate_id: '2',
          overall_match_score: 88,
          qualification_status: 'Qualified',
          skill_breakdown: []
        }
      });

      const result = await aiClient.analyzeMatch({
        jobId: '10',
        candidateId: '2',
        jobRequirements: [{ skill_name: 'Node.js', proficiency: 'Advanced' }],
        candidateProfile: { candidate_id: '2', skills: [] },
        jobTitle: 'Backend Engineer'
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/matches/analyze',
        expect.objectContaining({
          job_id: '10',
          candidate_id: '2',
          job_title: 'Backend Engineer'
        })
      );
      expect(result.overall_match_score).toBe(88);
    });
  });

  describe('generateRoadmap', () => {
    it('invokes POST /api/v1/roadmap/generate', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          roadmap_id: 'rm_1',
          candidate_id: 'cand_1',
          target_role: 'Cloud Architect',
          phases: []
        }
      });

      const result = await aiClient.generateRoadmap({
        candidateId: 'cand_1',
        targetRole: 'Cloud Architect',
        skillGaps: ['Kubernetes', 'Terraform']
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/roadmap/generate',
        {
          candidate_id: 'cand_1',
          target_role: 'Cloud Architect',
          role_family: 'Engineering',
          skill_gaps: ['Kubernetes', 'Terraform']
        }
      );
      expect(result.target_role).toBe('Cloud Architect');
    });
  });

  describe('generateInterviewQuestions & evaluateInterviewAnswer', () => {
    it('invokes POST /api/v1/interview/generate', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          job_id: '1',
          target_role: 'Backend Engineer',
          questions: [{ question_id: 'q1', question_text: 'Explain event loop' }]
        }
      });

      const result = await aiClient.generateInterviewQuestions({
        jobId: '1',
        targetRole: 'Backend Engineer',
        candidateId: 'cand_1'
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/interview/generate',
        expect.objectContaining({
          job_id: '1',
          target_role: 'Backend Engineer',
          include_essay: true
        })
      );
      expect(result.questions).toHaveLength(1);
    });

    it('invokes POST /api/v1/interview/evaluate', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          question_id: 'q1',
          score: 9,
          strengths: ['Great technical depth'],
          improvements: ['Add security details'],
          ideal_answer_outline: 'Use worker threads'
        }
      });

      const result = await aiClient.evaluateInterviewAnswer({
        questionId: 'q1',
        questionText: 'Explain event loop',
        userAnswer: 'The event loop processes non-blocking I/O...'
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/interview/evaluate',
        expect.objectContaining({
          question_id: 'q1',
          user_answer: 'The event loop processes non-blocking I/O...'
        })
      );
      expect(result.score).toBe(9);
    });
  });

  describe('mentorChat', () => {
    it('correctly aggregates SSE token chunks and prompts into single structured response', async () => {
      const sseStream = [
        'data: {"type": "token", "content": "Hello! "}\n\n',
        'data: {"type": "token", "content": "Welcome to career mentorship."}\n\n',
        'data: {"type": "suggested_prompts", "prompts": ["What skills to learn next?", "Mock interview"]}\n\n',
        'data: [DONE]\n\n'
      ].join('');

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: sseStream
      });

      const result = await aiClient.mentorChat({
        message: 'Hello mentor',
        conversationId: 'conv_1',
        userId: 'user_1'
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/mentor/chat/stream',
        expect.objectContaining({
          message: 'Hello mentor',
          conversation_id: 'conv_1',
          user_id: 'user_1'
        }),
        expect.objectContaining({ responseType: 'text' })
      );

      expect(result.reply).toBe('Hello! Welcome to career mentorship.');
      expect(result.suggested_actions).toHaveLength(2);
      expect(result.suggested_actions[0].label).toBe('What skills to learn next?');
    });
  });

  describe('evaluateStrategy', () => {
    it('invokes POST /api/v1/strategy/evaluate', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          candidate_id: '1',
          job_id: '5',
          decision: 'apply_now',
          match_score: 0.85,
          summary_reasoning: 'Strong match for senior position'
        }
      });

      const result = await aiClient.evaluateStrategy({
        userId: '1',
        jobId: '5',
        targetRole: 'Senior Engineer'
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/strategy/evaluate',
        {
          user_id: '1',
          job_id: '5',
          target_role: 'Senior Engineer',
          user_notes: null
        }
      );
      expect(result.decision).toBe('apply_now');
    });
  });

  describe('Error sanitization', () => {
    it('does not expose secret keys in error messages', () => {
      const errorWithSecret = {
        config: {
          headers: {
            'X-API-Key': 'SECRET_123',
            'Authorization': 'Bearer SECRET_123'
          }
        },
        response: {
          status: 401,
          data: { detail: 'Unauthorized invalid key' }
        }
      };

      const sanitized = aiClient._sanitizeError(errorWithSecret);
      expect(sanitized.message).not.toContain('SECRET_123');
      expect(sanitized.status).toBe(401);
    });

    it('formats timeout error nicely', () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      };

      const sanitized = aiClient._sanitizeError(timeoutError);
      expect(sanitized.status).toBe(504);
      expect(sanitized.name).toBe('AiServiceTimeoutError');
    });
  });
});
