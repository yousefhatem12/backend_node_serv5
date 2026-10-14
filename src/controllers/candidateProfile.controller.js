const candidateProfileService = require('../services/candidateProfile.service');
const CandidateProfileResource = require('../resources/candidateProfile.resource');
const CareerPreferenceResource = require('../resources/careerPreference.resource');
const { success, actionSuccess } = require('../utils/response');

class CandidateProfileController {
  /**
   * GET /api/candidate/profile
   */
  static async getProfile(req, res, next) {
    try {
      const result = await candidateProfileService.getFullProfile(req.user);
      return success(res, CandidateProfileResource.toArray(result));
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/candidate/profile
   */
  static async updateProfile(req, res, next) {
    try {
      const result = await candidateProfileService.updateProfile(req.user, req.body);
      return success(res, CandidateProfileResource.toArray(result));
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/candidate/profile/avatar
   */
  static async deleteAvatar(req, res, next) {
    try {
      const result = await candidateProfileService.deleteAvatar(req.user);
      return actionSuccess(res, 'Avatar photo deleted successfully.', CandidateProfileResource.toArray(result));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/candidate/career-preferences
   */
  static async getCareerPreferences(req, res, next) {
    try {
      const preference = await candidateProfileService.getCareerPreferences(req.user);
      return success(res, CareerPreferenceResource.toArray(preference));
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/candidate/career-preferences
   */
  static async updateCareerPreferences(req, res, next) {
    try {
      const preference = await candidateProfileService.updateCareerPreferences(req.user, req.body);
      return success(res, CareerPreferenceResource.toArray(preference));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CandidateProfileController;
