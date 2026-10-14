'use strict';

class CvImprovementResource {
  static toArray(record) {
    if (!record) return null;

    return {
      id: Number(record.id),
      user_id: Number(record.user_id),
      cv_document_id: record.cv_document_id ? Number(record.cv_document_id) : null,
      job_post_id: record.job_post_id ? Number(record.job_post_id) : null,
      target_role: record.target_role,
      overall_score: Number(record.overall_score || 0),
      critical_issues: Array.isArray(record.critical_issues) ? record.critical_issues : [],
      missing_keywords: Array.isArray(record.missing_keywords) ? record.missing_keywords : [],
      bullet_improvements: Array.isArray(record.bullet_improvements) ? record.bullet_improvements : [],
      structural_tips: Array.isArray(record.structural_tips) ? record.structural_tips : [],
      job: record.jobPost ? {
        id: Number(record.jobPost.id),
        title: record.jobPost.title
      } : null,
      created_at: record.created_at || record.createdAt
    };
  }

  static collection(records) {
    if (!Array.isArray(records)) return [];
    return records.map(r => this.toArray(r));
  }
}

module.exports = CvImprovementResource;
