const authService = require('../services/auth.service');
const UserResource = require('../resources/user.resource');
const AuthTokenResource = require('../resources/authToken.resource');

class AuthController {
  /**
   * POST /api/auth/register
   */
  static async register(req, res, next) {
    try {
      const result = await authService.register(req.body, req.locale);
      return res.status(201).json({
        message: result.message,
        email: result.email,
        user: UserResource.toArray(result.user)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/login
   */
  static async login(req, res, next) {
    try {
      const result = await authService.login(req.body, req.locale);
      return res.status(200).json(AuthTokenResource.toArray(result));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   */
  static async me(req, res, next) {
    try {
      return res.status(200).json({
        user: UserResource.toArray(req.user)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/refresh
   */
  static async refresh(req, res, next) {
    try {
      const result = await authService.refreshToken(req.user);
      return res.status(200).json(AuthTokenResource.toArray(result));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout
   */
  static async logout(req, res, next) {
    try {
      return res.status(200).json({
        message: 'Successfully logged out.'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/verify-email-otp
   */
  static async verifyEmailOtp(req, res, next) {
    try {
      const result = await authService.verifyEmailOtp(req.body, req.locale);
      return res.status(200).json({
        message: result.message,
        user: {
          id: result.user.id,
          email: result.user.email,
          email_verified_at: result.user.email_verified_at ? result.user.email_verified_at.toISOString() : null
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/resend-email-otp
   */
  static async resendEmailOtp(req, res, next) {
    try {
      const result = await authService.resendEmailOtp(req.body, req.locale);
      return res.status(200).json({
        message: result.message
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req, res, next) {
    try {
      const result = await authService.forgotPassword(req.body, req.locale);
      return res.status(200).json({
        message: result.message
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/forgot-password/verify-otp
   */
  static async verifyPasswordResetOtp(req, res, next) {
    try {
      const result = await authService.verifyPasswordResetOtp(req.body, req.locale);
      return res.status(200).json({
        message: result.message,
        reset_token: result.reset_token,
        expires_in: result.expires_in
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/reset-password
   */
  static async resetPassword(req, res, next) {
    try {
      const result = await authService.resetPassword(req.body, req.locale);
      return res.status(200).json({
        message: result.message
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
