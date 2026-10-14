const crypto = require('crypto');
const { Op } = require('sequelize');
const db = require('../models');
const config = require('../config/env');
const mailService = require('./mail.service');

class OtpService {
  /**
   * Generate and send an OTP code
   * @param {string} email
   * @param {'verification' | 'password_reset'} type
   * @param {number} expiryMinutes
   */
  async generateAndSend(email, type = 'verification', expiryMinutes = 10) {
    // Generate real 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Invalidate existing active OTPs of same type for this email
    await db.EmailOtp.destroy({
      where: { email, type }
    });

    // Create new OTP record
    await db.EmailOtp.create({
      email,
      otp,
      type,
      expires_at: expiresAt
    });

    // Dispatch email
    await mailService.sendOtp(email, otp, type);

    return { email, otp, expiresAt };
  }

  /**
   * Verify an OTP code
   * @param {string} email
   * @param {string} otp
   * @param {'verification' | 'password_reset'} type
   * @returns {Promise<boolean>}
   */
  async verify(email, otp, type = 'verification') {
    // If static OTP is enabled and code matches
    if (config.otp.staticEnabled && otp === config.otp.staticCode) {
      await db.EmailOtp.destroy({ where: { email, type } });
      return true;
    }

    const record = await db.EmailOtp.findOne({
      where: {
        email,
        otp,
        type,
        expires_at: { [Op.gte]: new Date() }
      }
    });

    if (!record) {
      return false;
    }

    // Delete verified OTP
    await record.destroy();
    return true;
  }
}

module.exports = new OtpService();
