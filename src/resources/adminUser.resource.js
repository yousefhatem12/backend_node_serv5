'use strict';

class AdminUserResource {
  static toArray(user) {
    if (!user) return null;

    const res = {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      avatar: user.avatar || null,
      role: user.role,
      is_active: Boolean(user.is_active),
      email_verified_at: user.email_verified_at ? new Date(user.email_verified_at).toISOString() : null,
      created_at: user.created_at || user.createdAt,
      updated_at: user.updated_at || user.updatedAt
    };

    if (user.candidateProfile) {
      res.candidate_profile = {
        id: Number(user.candidateProfile.id),
        job_title: user.candidateProfile.job_title || null,
        country: user.candidateProfile.country || null,
        city: user.candidateProfile.city || null,
        years_of_experience: Number(user.candidateProfile.years_of_experience || 0),
        profile_completed_at: user.candidateProfile.profile_completed_at ? new Date(user.candidateProfile.profile_completed_at).toISOString() : null
      };
    }

    return res;
  }

  static collection(users) {
    if (!Array.isArray(users)) return [];
    return users.map(u => this.toArray(u));
  }
}

module.exports = AdminUserResource;
