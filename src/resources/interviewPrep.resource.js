'use strict';

class InterviewPrepResource {
  static toArray(session) {
    if (!session) return null;

    const res = {
      id: Number(session.id),
      user_id: Number(session.user_id),
      job_post_id: session.job_post_id ? Number(session.job_post_id) : null,
      target_role: session.target_role,
      difficulty: session.difficulty,
      status: session.status,
      total_questions: Number(session.total_questions || 0),
      answered_questions: Number(session.answered_questions || 0),
      average_score: session.average_score !== null ? Number(parseFloat(session.average_score).toFixed(2)) : null,
      questions: Array.isArray(session.questions_payload) ? session.questions_payload : [],
      job: session.jobPost ? {
        id: Number(session.jobPost.id),
        title: session.jobPost.title
      } : null,
      created_at: session.created_at || session.createdAt,
      updated_at: session.updated_at || session.updatedAt
    };

    if (Array.isArray(session.answers)) {
      res.answers = session.answers.map(ans => this.answerToArray(ans));
    }

    return res;
  }

  static answerToArray(answer) {
    if (!answer) return null;

    return {
      id: Number(answer.id),
      session_id: Number(answer.session_id),
      question_id: answer.question_id,
      question_text: answer.question_text,
      user_answer: answer.user_answer,
      score: answer.score !== null ? Number(answer.score) : null,
      strengths: Array.isArray(answer.strengths) ? answer.strengths : [],
      improvements: Array.isArray(answer.improvements) ? answer.improvements : [],
      model_answer: answer.model_answer || null,
      evaluated_at: answer.evaluated_at ? new Date(answer.evaluated_at).toISOString() : null,
      created_at: answer.created_at || answer.createdAt
    };
  }

  static collection(sessions) {
    if (!Array.isArray(sessions)) return [];
    return sessions.map(s => this.toArray(s));
  }
}

module.exports = InterviewPrepResource;
