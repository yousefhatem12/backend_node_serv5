'use strict';

const aiClient = require('../../src/services/aiClient.service');
const AiCvImproverService = require('../../src/services/aiCvImprover.service');
const AiInterviewCoachService = require('../../src/services/aiInterviewCoach.service');
const AiRoadmapService = require('../../src/services/aiRoadmap.service');
const AiMentorService = require('../../src/services/aiMentor.service');
const AiApplicationStrategyService = require('../../src/services/aiApplicationStrategy.service');
const TemplateRoadmapGenerator = require('../../src/services/templateRoadmapGenerator');

describe('AI Integrated Services Unit Tests', () => {
  beforeAll(() => {
    process.env.AI_ROADMAP_SERVICE_ENABLED = 'true';
    process.env.AI_INTERVIEW_SERVICE_ENABLED = 'true';
    process.env.AI_STRATEGY_SERVICE_ENABLED = 'true';
    process.env.AI_MATCH_SERVICE_ENABLED = 'true';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('AiCvImproverService', () => {
    it('integrates with aiClient and formats response correctly', async () => {
      jest.spyOn(aiClient, 'analyzeCvImprovement').mockResolvedValueOnce({
        candidate_id: 'cand_1',
        gap_analysis: { match_score: 0.85, overall_match_score: 85 },
        missing_required_skills: [{ skill_name: 'Docker' }],
        missing_preferred_skills: [{ skill_name: 'Kubernetes' }],
        improvement_suggestions: [
          {
            suggestion_type: 'bullet_point',
            target_section: 'Experience',
            current_text: 'Wrote code',
            suggested_text: 'Engineered high-throughput microservices',
            reason: 'Add quantifiable technical ownership'
          }
        ],
        safe_rewrites: [],
        limitations: []
      });

      const res = await AiCvImproverService.analyze({
        profile: { user_id: 1, id: 1 },
        targetRole: 'Backend Engineer',
        skills: [{ name: 'Node.js' }]
      });

      expect(res.overall_score).toBe(85);
      expect(res.missing_keywords).toEqual(['Docker', 'Kubernetes']);
      expect(res.bullet_improvements).toHaveLength(1);
      expect(res.bullet_improvements[0].suggested_rewrite).toBe('Engineered high-throughput microservices');
    });

    it('falls back to RuleBasedCvImproverEngine on AI error', async () => {
      jest.spyOn(aiClient, 'analyzeCvImprovement').mockRejectedValueOnce(new Error('AI timeout'));

      const res = await AiCvImproverService.analyze({
        profile: { user_id: 1, id: 1 },
        targetRole: 'Software Engineer',
        experiences: []
      });

      expect(res).toHaveProperty('overall_score');
      expect(res).toHaveProperty('bullet_improvements');
    });
  });

  describe('AiInterviewCoachService', () => {
    it('integrates question generation with aiClient', async () => {
      jest.spyOn(aiClient, 'generateInterviewQuestions').mockResolvedValueOnce({
        job_id: '1',
        target_role: 'Backend Engineer',
        questions: [
          {
            question_id: 'q_remote_1',
            question_text: 'How do you handle memory leaks in Node.js?',
            question_type: 'technical',
            difficulty: 'senior',
            rubric: { ideal_answer_outline: 'Heap dumps, memory profiling, heap snapshots' }
          }
        ]
      });

      const questions = await AiInterviewCoachService.generateQuestions({
        targetRole: 'Backend Engineer',
        difficulty: 'senior',
        skills: ['Node.js']
      });

      expect(questions).toHaveLength(1);
      expect(questions[0].id).toBe('q_remote_1');
      expect(questions[0].question).toBe('How do you handle memory leaks in Node.js?');
      expect(questions[0].model_answer_guidance).toBe('Heap dumps, memory profiling, heap snapshots');
    });

    it('integrates answer evaluation with aiClient', async () => {
      jest.spyOn(aiClient, 'evaluateInterviewAnswer').mockResolvedValueOnce({
        question_id: 'q1',
        score: 9,
        strengths: ['Identified heap inspection tools'],
        improvements: ['Explain garbage collector algorithms'],
        ideal_answer_outline: 'Outline v8 generational GC',
        recommended_action: 'Proceed to next question'
      });

      const evaluation = await AiInterviewCoachService.evaluateAnswer({
        question: { id: 'q1', question: 'How do you handle memory leaks?' },
        userAnswer: 'I take a heap snapshot and inspect detached DOM or unbounded arrays.'
      });

      expect(evaluation.score).toBe(9);
      expect(evaluation.strengths).toEqual(['Identified heap inspection tools']);
      expect(evaluation.model_answer).toBe('Outline v8 generational GC');
    });

    it('falls back to rule engine on error', async () => {
      jest.spyOn(aiClient, 'generateInterviewQuestions').mockRejectedValueOnce(new Error('Network error'));

      const questions = await AiInterviewCoachService.generateQuestions({
        targetRole: 'Backend Engineer'
      });

      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0]).toHaveProperty('question');
    });
  });

  describe('AiRoadmapService', () => {
    it('integrates roadmap generation with aiClient', async () => {
      jest.spyOn(aiClient, 'generateRoadmap').mockResolvedValueOnce({
        roadmap_id: 'rm_remote_1',
        candidate_id: 'cand_1',
        target_role: 'DevOps Engineer',
        total_weeks: 6,
        phases: [
          {
            phase_id: 'p1',
            title: 'Containerization Fundamentals',
            order: 1,
            rationale: 'Master container isolation and registries',
            milestones: [
              {
                milestone_id: 'm1',
                title: 'Docker Production Builds',
                target_week: 1,
                tasks: [
                  {
                    task_id: 't1',
                    title: 'Multi-stage Dockerfiles',
                    description: 'Optimize image size',
                    estimated_hours: 3
                  }
                ]
              }
            ]
          }
        ]
      });

      const roadmap = await AiRoadmapService.generate({
        candidateId: 'cand_1',
        target_role: 'DevOps Engineer',
        missingSkills: ['Docker']
      });

      expect(roadmap.title).toBe('Career Roadmap: DevOps Engineer');
      expect(roadmap.phases).toHaveLength(1);
      expect(roadmap.phases[0].milestones).toHaveLength(1);
      expect(roadmap.phases[0].milestones[0].tasks[0].title).toBe('Multi-stage Dockerfiles');
    });

    it('falls back to TemplateRoadmapGenerator on error', async () => {
      jest.spyOn(aiClient, 'generateRoadmap').mockRejectedValueOnce(new Error('Roadmap AI down'));
      jest.spyOn(TemplateRoadmapGenerator, 'generate').mockResolvedValueOnce({
        title: 'Career Roadmap: Backend Developer',
        phases: [{ title: 'Phase 1', milestones: [] }]
      });

      const roadmap = await AiRoadmapService.generate({
        target_role: 'Backend Developer'
      });

      expect(roadmap).toHaveProperty('phases');
      expect(roadmap.phases.length).toBeGreaterThan(0);
    });
  });

  describe('AiMentorService', () => {
    it('integrates mentor chat with aiClient', async () => {
      jest.spyOn(aiClient, 'mentorChat').mockResolvedValueOnce({
        reply: 'Focus on mastering system design and distributed caching.',
        suggested_actions: [{ type: 'suggested_prompt', label: 'Practice Redis queries' }]
      });

      const response = await AiMentorService.reply(
        'What should I study?',
        { candidate: { id: 1, name: 'Alice' } }
      );

      expect(response.reply).toBe('Focus on mastering system design and distributed caching.');
      expect(response.suggested_actions).toHaveLength(1);
    });

    it('falls back to RuleBasedMentorEngine on error', async () => {
      jest.spyOn(aiClient, 'mentorChat').mockRejectedValueOnce(new Error('Mentor AI down'));

      const response = await AiMentorService.reply(
        'what should i do about my roadmap?',
        { candidate: { id: 1, name: 'Alice' } }
      );

      expect(response).toHaveProperty('reply');
    });
  });

  describe('AiApplicationStrategyService', () => {
    it('integrates application strategy assessment with aiClient', async () => {
      jest.spyOn(aiClient, 'evaluateStrategy').mockResolvedValueOnce({
        candidate_id: '1',
        job_id: '10',
        decision: 'apply_now',
        match_score: 0.9,
        summary_reasoning: 'Candidate exceeds senior requirements',
        strengths: ['5+ years Node.js experience'],
        blocker_gaps: [],
        action_plan: [{ timeframe: 'Day 1', task: 'Polish portfolio README' }],
        alternative_roles: [{ role_title: 'Lead Architect' }]
      });

      const strategy = await AiApplicationStrategyService.assess({
        profile: { user_id: 1, years_of_experience: 5 },
        job: { id: 10, title: 'Senior Backend Engineer' },
        candidateSkills: [{ name: 'Node.js' }]
      });

      expect(strategy.recommendation).toBe('apply_now');
      expect(strategy.readiness_score).toBe(90);
      expect(strategy.fit_level).toBe('strong_fit');
      expect(strategy.alternative_roles).toEqual(['Lead Architect']);
    });

    it('falls back to RuleBasedStrategyEngine on error', async () => {
      jest.spyOn(aiClient, 'evaluateStrategy').mockRejectedValueOnce(new Error('Strategy AI down'));

      const strategy = await AiApplicationStrategyService.assess({
        profile: { years_of_experience: 2 },
        job: { id: 10, title: 'Junior Engineer', min_years_experience: 1, jobSkills: [] },
        candidateSkills: []
      });

      expect(strategy).toHaveProperty('recommendation');
      expect(strategy).toHaveProperty('readiness_score');
    });
  });
});
