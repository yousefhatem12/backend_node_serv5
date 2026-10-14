'use strict';

class RuleBasedInterviewCoachEngine {
  /**
   * Generate 5 tailored interview questions
   */
  static generateQuestions({ targetRole = 'Software Engineer', difficulty = 'mid-level', skills = [], job = null }) {
    const roleName = targetRole || (job ? job.title : 'Software Engineer');
    const primarySkill = skills.length > 0 ? skills[0] : 'Backend Architecture';
    const secondarySkill = skills.length > 1 ? skills[1] : 'Relational Databases';

    return [
      {
        id: 'q1',
        question: `Explain how you design and optimize high-concurrency services using ${primarySkill}. How do you prevent event loop blocking and manage resource bottlenecks?`,
        topic: `${primarySkill} Internals & Performance`,
        type: 'technical',
        difficulty,
        model_answer_guidance: 'Discuss non-blocking asynchronous operations, thread pool utilization for heavy compute, worker threads, caching layers, and profile-guided bottleneck identification.'
      },
      {
        id: 'q2',
        question: `How do you structure database transactions, isolation levels, and indexing strategies in ${secondarySkill} to prevent deadlocks and maintain consistency under load?`,
        topic: `${secondarySkill} Scalability`,
        type: 'technical',
        difficulty,
        model_answer_guidance: 'Explain ACID compliance, indexing trade-offs (B-Tree composite indexes), optimistic vs pessimistic locking, and query execution plan analysis (EXPLAIN).'
      },
      {
        id: 'q3',
        question: `Walk me through your approach to designing a fault-tolerant REST API for ${roleName}. How do you handle idempotency, rate limiting, and centralized error handling?`,
        topic: 'System Design & REST Protocols',
        type: 'technical',
        difficulty,
        model_answer_guidance: 'Detail idempotency keys for mutation endpoints, token-bucket/leaky-bucket rate limiting algorithms, standardized HTTP status envelopes, and structured logging.'
      },
      {
        id: 'q4',
        question: 'Describe a situation where a critical production bug occurred or project requirements shifted right before a release. How did you diagnose, communicate, and resolve it (STAR)?',
        topic: 'Incident Response & Collaboration (STAR)',
        type: 'behavioral',
        difficulty,
        model_answer_guidance: 'Structure response using Situation, Task, Action, and Result. Highlight calm root-cause analysis, stakeholder communication, blameless post-mortem, and automated safeguards.'
      },
      {
        id: 'q5',
        question: 'If a teammate strongly advocated for a technical approach that you believed would introduce technical debt or scaling issues, how would you approach the discussion and reach alignment?',
        topic: 'Engineering Trade-offs & Alignment',
        type: 'situational',
        difficulty,
        model_answer_guidance: 'Focus on objective data-driven benchmarks, architectural trade-off matrices, active listening, prototypes/proof-of-concepts, and committing to team decisions.'
      }
    ];
  }

  /**
   * Evaluate candidate's practice answer
   */
  static evaluateAnswer({ question, userAnswer, difficulty = 'mid-level' }) {
    const text = (userAnswer || '').trim();
    const words = text.split(/\s+/).filter(Boolean);

    if (words.length < 15) {
      return {
        score: 35,
        strengths: ['Addressed the topic directly.'],
        improvements: [
          'Answer is too concise. Elaborate with concrete examples, architectural context, and technical specifics.',
          'Demonstrate technical depth by referencing real-world implementation nuances or measurable outcomes.'
        ],
        model_answer: question.model_answer_guidance
          ? `A strong candidate should cover: ${question.model_answer_guidance}`
          : 'A complete answer outlines the underlying principles, trade-offs, and practical operational steps.'
      };
    }

    // Determine strengths and improvements based on keyword coverage
    const hasTechnicalKeywords = /(async|event loop|worker|cache|index|transaction|acid|lock|schema|rest|idempotent|star|situation|result|benchmark|latency)/i.test(text);
    const hasMetricsOrExamples = /(\%|\bms\b|\bsec\b|\bproduction\b|\bteam\b|\bproject\b|\bscaled\b|\breduced\b|\bimplemented\b)/i.test(text);

    let score = 75;
    const strengths = [];
    const improvements = [];

    if (words.length >= 40) {
      score += 10;
      strengths.push('Provided a detailed, well-structured explanation with good conceptual depth.');
    } else {
      strengths.push('Clear and direct initial answer.');
      improvements.push('Consider expanding on edge cases or production failure modes.');
    }

    if (hasTechnicalKeywords) {
      score += 8;
      strengths.push('Used relevant industry terminology and accurate architectural concepts.');
    } else {
      improvements.push('Incorporate more precise engineering terminology and domain-specific mechanisms.');
    }

    if (hasMetricsOrExamples) {
      score += 5;
      strengths.push('Grounded response in practical production experience or measurable outcomes.');
    } else {
      improvements.push('Add a real-world story or quantify the result to make your answer more compelling.');
    }

    score = Math.min(98, score);

    return {
      score,
      strengths,
      improvements,
      model_answer: `Recommended comprehensive response structure:
1. Direct Definition & Principle: Explicitly state the core mechanism.
2. Practical Implementation: Walk through how you apply this in ${question.topic || 'production'}.
3. Trade-offs & Edge Cases: Explain when this approach breaks down and how you mitigate risks.`
    };
  }
}

module.exports = RuleBasedInterviewCoachEngine;
