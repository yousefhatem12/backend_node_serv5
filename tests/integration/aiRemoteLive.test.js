'use strict';

const aiClient = require('../../src/services/aiClient.service');

describe('Live Remote AI Service Integration Tests (https://ai-serv5.fastapicloud.dev)', () => {
  // 120s timeout for real remote LLM inference
  jest.setTimeout(120000);

  it('1. GET /health: verifies AI service is healthy and online', async () => {
    const health = await aiClient.checkHealth();
    expect(health).toHaveProperty('status', 'healthy');
    expect(health).toHaveProperty('service');
  });

  it('2. POST /api/v1/strategy/evaluate: evaluates application strategy', async () => {
    const strategy = await aiClient.evaluateStrategy({
      userId: 'test_candidate_live',
      jobId: 'test_job_live',
      targetRole: 'Full Stack Engineer',
      userNotes: '4 years of experience with Node.js and React.'
    });

    expect(strategy).toHaveProperty('decision');
    expect(['apply_now', 'apply_while_improving', 'prioritize_another_role']).toContain(strategy.decision);
    expect(strategy).toHaveProperty('match_score');
    expect(strategy).toHaveProperty('summary_reasoning');
  });

  it('3. POST /api/v1/roadmap/generate: generates dynamic career learning roadmap', async () => {
    const roadmap = await aiClient.generateRoadmap({
      candidateId: 'test_candidate_live',
      targetRole: 'Senior Backend Engineer',
      roleFamily: 'Engineering',
      skillGaps: ['Distributed Caching', 'Kubernetes']
    });

    expect(roadmap).toHaveProperty('roadmap_id');
    expect(roadmap).toHaveProperty('target_role', 'Senior Backend Engineer');
    expect(Array.isArray(roadmap.phases)).toBe(true);
    expect(roadmap.phases.length).toBeGreaterThan(0);
  });

  it('4. POST /api/v1/interview/generate: generates interview questions', async () => {
    const questionSet = await aiClient.generateInterviewQuestions({
      jobId: 'job_test_001',
      targetRole: 'Backend Engineer',
      candidateId: 'cand_test_001',
      focusSkills: ['Node.js', 'PostgreSQL'],
      includeEssay: true
    });

    expect(questionSet).toHaveProperty('questions');
    expect(Array.isArray(questionSet.questions)).toBe(true);
    expect(questionSet.questions.length).toBeGreaterThan(0);
    expect(questionSet.questions[0].question || questionSet.questions[0].question_text).toBeTruthy();
  });

  it('5. POST /api/v1/interview/evaluate: evaluates submitted interview answer', async () => {
    const evaluation = await aiClient.evaluateInterviewAnswer({
      questionId: 'q_eval_001',
      questionText: 'How do you structure database transactions and isolation levels to prevent deadlocks?',
      questionType: 'technical',
      userAnswer: 'I use appropriate isolation levels like Read Committed, acquire locks in a consistent global order, keep transactions brief, and employ retry logic on deadlock detection.'
    });

    expect(evaluation).toHaveProperty('score');
    expect(typeof evaluation.score).toBe('number');
    expect(Array.isArray(evaluation.strengths)).toBe(true);
    expect(Array.isArray(evaluation.improvements)).toBe(true);
    expect(evaluation).toHaveProperty('ideal_answer_outline');
  });

  it('6. POST /api/v1/mentor/chat/stream: streams and aggregates conversational mentor advice', async () => {
    const response = await aiClient.mentorChat({
      message: 'What key system design topics should I study for a Senior Backend Engineer role?',
      conversationId: 'conv_live_001',
      userId: 'user_live_001',
      targetRole: 'Senior Backend Engineer'
    });

    expect(response).toHaveProperty('reply');
    expect(typeof response.reply).toBe('string');
    expect(response.reply.length).toBeGreaterThan(20);
    expect(Array.isArray(response.suggested_actions)).toBe(true);
  });

  it('7. POST /api/v1/matches/analyze: executes multi-dimensional skill gap analysis', async () => {
    const match = await aiClient.analyzeMatch({
      jobId: 'job_live_001',
      candidateId: 'cand_live_001',
      jobRequirements: [
        { skill_name: 'Node.js', proficiency: 'Advanced', is_critical: true },
        { skill_name: 'PostgreSQL', proficiency: 'Intermediate', is_critical: true }
      ],
      candidateProfile: {
        candidate_id: 'cand_live_001',
        skills: [
          { skill_name: 'Node.js', proficiency: 'Advanced', years_of_experience: 4 }
        ],
        total_years_experience: 4
      },
      preferredSkills: [
        { skill_name: 'Docker', proficiency: 'Intermediate' }
      ],
      jobTitle: 'Senior Node.js Developer'
    });

    expect(match).toHaveProperty('overall_match_score');
    expect(typeof match.overall_match_score).toBe('number');
    expect(match).toHaveProperty('qualification_status');
    expect(Array.isArray(match.skill_breakdown)).toBe(true);
  });
});
