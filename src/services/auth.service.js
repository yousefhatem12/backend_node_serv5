const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const db = require('../models');
const config = require('../config/env');
const otpService = require('./otp.service');
const { ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } = require('../utils/errors');
const { t } = require('../utils/i18n');

class AuthService {
  /**
   * Register a new candidate account
   */
  async register(data, locale = 'en') {
    const existing = await db.User.findOne({ where: { email: data.email } });
    if (existing) {
      throw new ValidationError('The email has already been taken.', {
        email: ['The email has already been taken.']
      });
    }

    const user = await db.User.create({
      name: data.name,
      email: data.email,
      password: data.password,
      role: 'candidate',
      is_active: true,
      email_verified_at: null
    });

    // Generate and dispatch verification OTP
    await otpService.generateAndSend(user.email, 'verification');

    return {
      message: t('auth.registerSuccess', locale),
      email: user.email,
      user
    };
  }

  /**
   * Authenticate user credentials and return JWT token
   */
  async login(data, locale = 'en') {
    const user = await db.User.findOne({ where: { email: data.email } });
    if (!user || !(await user.verifyPassword(data.password))) {
      throw new UnauthorizedError(t('auth.invalidCredentials', locale));
    }

    if (!user.is_active) {
      throw new ForbiddenError(t('auth.accountDeactivated', locale));
    }

    if (!user.email_verified_at) {
      throw new ForbiddenError(t('auth.unverifiedEmail', locale));
    }

    const accessToken = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: config.jwt.expiresIn,
      user
    };
  }

  /**
   * Verify email OTP and mark account verified
   */
  async verifyEmailOtp({ email, otp }, locale = 'en') {
    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundError(t('common.notFound', locale));
    }

    const isValid = await otpService.verify(email, otp, 'verification');
    if (!isValid) {
      throw new ValidationError(t('auth.otpInvalidOrExpired', locale), {
        otp: [t('auth.otpInvalidOrExpired', locale)]
      });
    }

    user.email_verified_at = new Date();
    await user.save();

    return {
      message: t('auth.emailVerified', locale),
      user
    };
  }

  /**
   * Resend email verification OTP
   */
  async resendEmailOtp({ email }, locale = 'en') {
    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundError(t('common.notFound', locale));
    }

    if (user.email_verified_at) {
      throw new ValidationError('Email is already verified.', {
        email: ['Email is already verified.']
      });
    }

    await otpService.generateAndSend(email, 'verification');

    return {
      message: t('auth.otpResent', locale)
    };
  }

  /**
   * Request password reset OTP
   */
  async forgotPassword({ email }, locale = 'en') {
    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundError(t('common.notFound', locale));
    }

    await otpService.generateAndSend(email, 'password_reset');

    return {
      message: t('auth.passwordResetOtpSent', locale)
    };
  }

  /**
   * Verify password reset OTP and generate temporary reset token
   */
  async verifyPasswordResetOtp({ email, otp }, locale = 'en') {
    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundError(t('common.notFound', locale));
    }

    const isValid = await otpService.verify(email, otp, 'password_reset');
    if (!isValid) {
      throw new ValidationError(t('auth.otpInvalidOrExpired', locale), {
        otp: [t('auth.otpInvalidOrExpired', locale)]
      });
    }

    // Generate 64-char temporary reset token valid for 10 minutes (600s)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate old tokens for this email
    await db.PasswordResetToken.destroy({ where: { email } });

    await db.PasswordResetToken.create({
      email,
      token: resetToken,
      expires_at: expiresAt
    });

    return {
      message: t('auth.passwordResetOtpVerified', locale),
      reset_token: resetToken,
      expires_in: 600
    };
  }

  /**
   * Reset password using temporary reset token
   */
  async resetPassword({ email, reset_token, password }, locale = 'en') {
    const resetRecord = await db.PasswordResetToken.findOne({
      where: {
        email,
        token: reset_token,
        expires_at: { [Op.gte]: new Date() }
      }
    });

    if (!resetRecord) {
      throw new ValidationError(t('auth.invalidResetToken', locale), {
        reset_token: [t('auth.invalidResetToken', locale)]
      });
    }

    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundError(t('common.notFound', locale));
    }

    user.password = password;
    await user.save();

    // Destroy used token
    await resetRecord.destroy();

    return {
      message: t('auth.passwordResetSuccess', locale)
    };
  }

  /**
   * Issue refreshed token for an authenticated user
   */
  /**
   * Issue refreshed token for an authenticated user
   */
  async refreshToken(user) {
    const accessToken = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: config.jwt.expiresIn,
      user
    };
  }

  /**
   * Helper to sign JWT access token
   */
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        token_type: 'access'
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn
      }
    );
  }

  /**
   * Helper to sign JWT refresh token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        token_type: 'refresh'
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.refreshExpiresIn || 604800
      }
    );
  }
}

module.exports = new AuthService();
