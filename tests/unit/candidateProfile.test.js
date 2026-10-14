const express = require('express');
const request = require('supertest');
const { updateProfileSchema } = require('../../src/validators/candidateProfile.validator');
const CandidateProfileResource = require('../../src/resources/candidateProfile.resource');
const { uploadAvatarMiddleware } = require('../../src/middlewares/upload.middleware');

describe('Candidate Profile Unit Tests (full_name & avatar/avater photo)', () => {
  describe('1. updateProfileSchema Validation', () => {
    it('accepts valid full_name, avatar, and avater string fields', () => {
      const payload = {
        full_name: 'Ahmed Wael Mohamed',
        avatar: 'https://example.com/photo.jpg',
        avater: 'https://example.com/photo.jpg',
        job_title: 'Senior Node.js Developer',
        country: 'Egypt',
        city: 'Cairo'
      };

      const result = updateProfileSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect(result.data.full_name).toBe('Ahmed Wael Mohamed');
      expect(result.data.avatar).toBe('https://example.com/photo.jpg');
      expect(result.data.avater).toBe('https://example.com/photo.jpg');
      expect(result.data.first_name).toBeUndefined();
      expect(result.data.last_name).toBeUndefined();
    });

    it('accepts payload when full_name and avatar are omitted (optional fields)', () => {
      const payload = {
        job_title: 'Frontend Engineer'
      };

      const result = updateProfileSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect(result.data.full_name).toBeUndefined();
      expect(result.data.avatar).toBeUndefined();
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
    it('returns full_name, avatar, and avater in root data and profile object, without first_name or last_name', () => {
      const user = {
        id: 1,
        name: 'Ahmed Wael',
        email: 'ahmed@example.com',
        avatar: '/uploads/avatars/user-pic.png',
        role: 'candidate',
        is_active: true
      };

      const profile = {
        id: 10,
        full_name: 'Ahmed Wael Mohamed',
        avatar: '/uploads/avatars/profile-pic.png',
        job_title: 'Senior Cloud Engineer',
        country: 'Egypt',
        city: 'Alexandria',
        years_of_experience: 5
      };

      const resource = CandidateProfileResource.toArray({ user, profile });

      // Inside root data object
      expect(resource.profile_exists).toBe(true);
      expect(resource.full_name).toBe('Ahmed Wael Mohamed');
      expect(resource.avatar).toBe('/uploads/avatars/profile-pic.png');
      expect(resource.avater).toBe('/uploads/avatars/profile-pic.png');
      expect(resource).not.toHaveProperty('first_name');
      expect(resource).not.toHaveProperty('last_name');

      // Inside profile object
      expect(resource.profile.id).toBe(10);
      expect(resource.profile.full_name).toBe('Ahmed Wael Mohamed');
      expect(resource.profile.avatar).toBe('/uploads/avatars/profile-pic.png');
      expect(resource.profile.avater).toBe('/uploads/avatars/profile-pic.png');
      expect(resource.profile).not.toHaveProperty('first_name');
      expect(resource.profile).not.toHaveProperty('last_name');
    });

    it('falls back to user.name and user.avatar if profile fields are not yet populated', () => {
      const user = {
        id: 2,
        name: 'Sarah Connor',
        email: 'sarah@example.com',
        avatar: '/uploads/avatars/sarah.jpg',
        role: 'candidate',
        is_active: true
      };

      const profile = {
        id: 20,
        full_name: null,
        avatar: null,
        job_title: 'Cybersecurity Analyst'
      };

      const resource = CandidateProfileResource.toArray({ user, profile });

      expect(resource.full_name).toBe('Sarah Connor');
      expect(resource.avatar).toBe('/uploads/avatars/sarah.jpg');
      expect(resource.avater).toBe('/uploads/avatars/sarah.jpg');
      expect(resource.profile.full_name).toBe('Sarah Connor');
      expect(resource.profile.avatar).toBe('/uploads/avatars/sarah.jpg');
    });

    it('handles profile_exists = false gracefully with full_name and avatar from user', () => {
      const user = {
        id: 3,
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/john.png',
        role: 'candidate',
        is_active: true
      };

      const resource = CandidateProfileResource.toArray({ user, profile: null });

      expect(resource.profile_exists).toBe(false);
      expect(resource.full_name).toBe('John Doe');
      expect(resource.avatar).toBe('https://example.com/john.png');
      expect(resource.avater).toBe('https://example.com/john.png');
      expect(resource.profile).toBeNull();
    });
  });

  describe('3. uploadAvatarMiddleware (JPEG, PNG Photo Support)', () => {
    let testApp;

    beforeAll(() => {
      testApp = express();
      testApp.use(express.json());
      testApp.patch('/test-profile-avatar', uploadAvatarMiddleware, (req, res) => {
        res.status(200).json({
          status: 'success',
          body: req.body,
          file: req.file ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype
          } : null
        });
      });
    });

    it('accepts JPEG avatar file upload via "avatar" field', async () => {
      const dummyJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      const res = await request(testApp)
        .patch('/test-profile-avatar')
        .attach('avatar', dummyJpeg, { filename: 'my_photo.jpg', contentType: 'image/jpeg' })
        .field('job_title', 'Software Engineer');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.body.avatar).toMatch(/^\/uploads\/avatars\/avatar-/);
      expect(res.body.body.avater).toBe(res.body.body.avatar);
      expect(res.body.body.job_title).toBe('Software Engineer');
    });

    it('accepts PNG avatar file upload via "avater" field name', async () => {
      const dummyPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const res = await request(testApp)
        .patch('/test-profile-avatar')
        .attach('avater', dummyPng, { filename: 'photo.png', contentType: 'image/png' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.body.avatar).toMatch(/\.png$/);
      expect(res.body.body.avater).toBe(res.body.body.avatar);
    });

    it('rejects unsupported file formats (e.g. PDF) with 422', async () => {
      const dummyPdf = Buffer.from('%PDF-1.4 sample content');
      const res = await request(testApp)
        .patch('/test-profile-avatar')
        .attach('avatar', dummyPdf, { filename: 'document.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('jpeg, png, jpg');
      expect(res.body.errors).toHaveProperty('avatar');
      expect(res.body.errors).toHaveProperty('avater');
    });

    it('passes through JSON requests without files unaffected', async () => {
      const res = await request(testApp)
        .patch('/test-profile-avatar')
        .send({
          full_name: 'Ahmed Wael',
          avatar: 'https://cdn.example.com/pic.jpg',
          job_title: 'Full Stack'
        });

      expect(res.status).toBe(200);
      expect(res.body.body.full_name).toBe('Ahmed Wael');
      expect(res.body.body.avatar).toBe('https://cdn.example.com/pic.jpg');
      expect(res.body.file).toBeNull();
    });
  });

  describe('4. Delete Avatar Endpoints & Service', () => {
    let testCandidateApp;
    const candidateProfileService = require('../../src/services/candidateProfile.service');

    beforeAll(() => {
      testCandidateApp = express();
      testCandidateApp.use(express.json());

      // Mock user on req
      testCandidateApp.use((req, res, next) => {
        req.user = {
          id: 1,
          name: 'Ahmed Wael',
          email: 'ahmed@example.com',
          role: 'candidate',
          avatar: '/uploads/avatars/user-pic.png'
        };
        next();
      });

      const CandidateProfileController = require('../../src/controllers/candidateProfile.controller');
      testCandidateApp.delete('/api/candidate/profile/avatar', CandidateProfileController.deleteAvatar);
      testCandidateApp.delete('/api/candidate/profile/avater', CandidateProfileController.deleteAvatar);
      testCandidateApp.post('/api/candidate/profile/avatar/delete', CandidateProfileController.deleteAvatar);
      testCandidateApp.delete('/api/candidate/avatar', CandidateProfileController.deleteAvatar);
    });

    it('DELETE /api/candidate/profile/avatar clears avatar and returns updated resource', async () => {
      jest.spyOn(candidateProfileService, 'deleteAvatar').mockResolvedValueOnce({
        user: { id: 1, name: 'Ahmed Wael', email: 'ahmed@example.com', avatar: null },
        profile: { id: 10, full_name: 'Ahmed Wael', avatar: null, job_title: 'Developer' }
      });

      const res = await request(testCandidateApp).delete('/api/candidate/profile/avatar');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('deleted');
      expect(res.body.data.avatar).toBeNull();
      expect(res.body.data.avater).toBeNull();
      expect(res.body.data.profile.avatar).toBeNull();
      expect(candidateProfileService.deleteAvatar).toHaveBeenCalled();
    });

    it('DELETE /api/candidate/profile/avater clears avatar via avater alias', async () => {
      jest.spyOn(candidateProfileService, 'deleteAvatar').mockResolvedValueOnce({
        user: { id: 1, name: 'Ahmed Wael', email: 'ahmed@example.com', avatar: null },
        profile: { id: 10, full_name: 'Ahmed Wael', avatar: null, job_title: 'Developer' }
      });

      const res = await request(testCandidateApp).delete('/api/candidate/profile/avater');
      expect(res.status).toBe(200);
      expect(res.body.data.avatar).toBeNull();
      expect(res.body.data.avater).toBeNull();
    });

    it('POST /api/candidate/profile/avatar/delete works as POST alias', async () => {
      jest.spyOn(candidateProfileService, 'deleteAvatar').mockResolvedValueOnce({
        user: { id: 1, name: 'Ahmed Wael', email: 'ahmed@example.com', avatar: null },
        profile: { id: 10, full_name: 'Ahmed Wael', avatar: null, job_title: 'Developer' }
      });

      const res = await request(testCandidateApp).post('/api/candidate/profile/avatar/delete');
      expect(res.status).toBe(200);
      expect(res.body.data.avatar).toBeNull();
    });

    it('DELETE /api/candidate/avatar works via top-level route alias', async () => {
      jest.spyOn(candidateProfileService, 'deleteAvatar').mockResolvedValueOnce({
        user: { id: 1, name: 'Ahmed Wael', email: 'ahmed@example.com', avatar: null },
        profile: { id: 10, full_name: 'Ahmed Wael', avatar: null, job_title: 'Developer' }
      });

      const res = await request(testCandidateApp).delete('/api/candidate/avatar');
      expect(res.status).toBe(200);
      expect(res.body.data.avatar).toBeNull();
    });
  });
});
