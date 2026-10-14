const { updateProfileSchema } = require('../../src/validators/candidateProfile.validator');
const CandidateProfileResource = require('../../src/resources/candidateProfile.resource');

describe('Candidate Profile Unit Tests (full_name Schema & Resource)', () => {
  describe('1. updateProfileSchema Validation', () => {
    it('accepts valid full_name and profile fields', () => {
      const payload = {
        full_name: 'Ahmed Wael Mohamed',
        job_title: 'Senior Node.js Developer',
        country: 'Egypt',
        city: 'Cairo'
      };

      const result = updateProfileSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect(result.data.full_name).toBe('Ahmed Wael Mohamed');
      expect(result.data.first_name).toBeUndefined();
      expect(result.data.last_name).toBeUndefined();
    });

    it('accepts payload when full_name is omitted (optional field)', () => {
      const payload = {
        job_title: 'Frontend Engineer'
      };

      const result = updateProfileSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect(result.data.full_name).toBeUndefined();
    });

    it('rejects empty string full_name with validation error', () => {
      const payload = {
        full_name: '   '
      };

      const result = updateProfileSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const errors = result.error.flatten().fieldErrors;
      expect(errors).toHaveProperty('full_name');
    });

    it('strips legacy first_name and last_name fields from validated output', () => {
      const payload = {
        first_name: 'Ahmed',
        last_name: 'Wael',
        full_name: 'Ahmed Wael',
        job_title: 'Full Stack Engineer'
      };

      const result = updateProfileSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect(result.data.full_name).toBe('Ahmed Wael');
      expect(result.data).not.toHaveProperty('first_name');
      expect(result.data).not.toHaveProperty('last_name');
    });
  });

  describe('2. CandidateProfileResource Representation', () => {
    it('returns full_name in root data and profile object, without first_name or last_name', () => {
      const user = {
        id: 1,
        name: 'Ahmed Wael',
        email: 'ahmed@example.com',
        role: 'candidate',
        is_active: true
      };

      const profile = {
        id: 10,
        full_name: 'Ahmed Wael Mohamed',
        job_title: 'Senior Cloud Engineer',
        country: 'Egypt',
        city: 'Alexandria',
        years_of_experience: 5
      };

      const resource = CandidateProfileResource.toArray({ user, profile });

      // Inside root data object
      expect(resource.profile_exists).toBe(true);
      expect(resource.full_name).toBe('Ahmed Wael Mohamed');
      expect(resource).not.toHaveProperty('first_name');
      expect(resource).not.toHaveProperty('last_name');

      // Inside profile object
      expect(resource.profile.id).toBe(10);
      expect(resource.profile.full_name).toBe('Ahmed Wael Mohamed');
      expect(resource.profile).not.toHaveProperty('first_name');
      expect(resource.profile).not.toHaveProperty('last_name');
    });

    it('falls back to user.name if profile.full_name is not yet populated', () => {
      const user = {
        id: 2,
        name: 'Sarah Connor',
        email: 'sarah@example.com',
        role: 'candidate',
        is_active: true
      };

      const profile = {
        id: 20,
        full_name: null,
        job_title: 'Cybersecurity Analyst'
      };

      const resource = CandidateProfileResource.toArray({ user, profile });

      expect(resource.full_name).toBe('Sarah Connor');
      expect(resource.profile.full_name).toBe('Sarah Connor');
    });

    it('handles profile_exists = false gracefully with full_name from user', () => {
      const user = {
        id: 3,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'candidate',
        is_active: true
      };

      const resource = CandidateProfileResource.toArray({ user, profile: null });

      expect(resource.profile_exists).toBe(false);
      expect(resource.full_name).toBe('John Doe');
      expect(resource.profile).toBeNull();
    });
  });
});
