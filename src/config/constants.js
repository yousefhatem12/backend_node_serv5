module.exports = {
  ROLES: {
    CANDIDATE: 'candidate',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
  },

  APPLICATION_STATUSES: {
    APPLIED: 'applied',
    IN_REVIEW: 'in_review',
    INTERVIEW: 'interview',
    OFFER: 'offer',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn'
  },

  // Legacy Laravel mappings for backward compatibility
  STATUS_ALIASES: {
    submitted: 'applied',
    under_review: 'in_review',
    shortlisted: 'interview'
  },

  CV_STATUSES: {
    UPLOADED: 'uploaded',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed'
  },

  QUEUE_JOB_STATUSES: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed'
  },

  RATE_LIMITS: {
    LOGIN: { windowMs: 60 * 1000, max: 5 },
    REGISTER: { windowMs: 60 * 1000, max: 10 },
    RESEND_OTP: { windowMs: 60 * 1000, max: 1 },
    ROADMAP_GENERATE: { windowMs: 60 * 1000, max: 5 }
  }
};
