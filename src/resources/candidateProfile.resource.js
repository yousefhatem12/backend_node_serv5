const BaseResource = require('./base.resource');
const UserResource = require('./user.resource');
const CareerPreferenceResource = require('./careerPreference.resource');
const EducationResource = require('./education.resource');
const ExperienceResource = require('./experience.resource');
const ProjectResource = require('./project.resource');
const CandidateSkillResource = require('./candidateSkill.resource');

class CandidateProfileResource extends BaseResource {
  static toArray({ user, profile }) {
    const fullName = (profile && profile.full_name) || (user && user.name) || null;
    const avatarUrl = (profile && profile.avatar) || (user && user.avatar) || null;

    if (!profile) {
      return {
        profile_exists: false,
        full_name: fullName,
        avatar: avatarUrl,
        avater: avatarUrl,
        user: UserResource.toArray(user),
        profile: null
      };
    }

    return {
      profile_exists: true,
      full_name: fullName,
      avatar: avatarUrl,
      avater: avatarUrl,
      user: UserResource.toArray(user),
      profile: {
        id: profile.id,
        full_name: fullName,
        avatar: avatarUrl,
        avater: avatarUrl,
        date_of_birth: profile.date_of_birth || null,
        gender: profile.gender || null,
        job_title: profile.job_title || null,
        country: profile.country || null,
        state: profile.state || null,
        city: profile.city || null,
        github_url: profile.github_url || null,
        linkedin_url: profile.linkedin_url || null,
        portfolio_url: profile.portfolio_url || null,
        military_status: profile.military_status || null,
        years_of_experience: profile.years_of_experience !== null ? Number(profile.years_of_experience) : 0,
        looking_status: profile.looking_status || 'actively_looking',
        professional_summary: profile.professional_summary || null,
        profile_completed_at: profile.profile_completed_at ? profile.profile_completed_at.toISOString() : null,
        careerPreference: profile.careerPreference ? CareerPreferenceResource.toArray(profile.careerPreference) : null,
        educations: EducationResource.collection(profile.educations || []),
        experiences: ExperienceResource.collection(profile.experiences || []),
        projects: ProjectResource.collection(profile.projects || []),
        candidateSkills: CandidateSkillResource.collection(profile.candidateSkills || []),
        cvDocuments: profile.cvDocuments || []
      }
    };
  }
}

module.exports = CandidateProfileResource;
