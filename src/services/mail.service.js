const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');

class MailService {
  constructor() {
    this.transporter = null;
    this._initTransporter();
  }

  /**
   * Initialize nodemailer transport based on environment configuration
   */
  _initTransporter() {
    try {
      if (config.mail.mailer === 'smtp') {
        const transportOptions = {
          host: config.mail.host,
          port: config.mail.port,
          secure: config.mail.secure, // true for 465, false for other ports
          tls: {
            rejectUnauthorized: false
          }
        };

        if (config.mail.username && config.mail.password) {
          transportOptions.auth = {
            user: config.mail.username,
            pass: config.mail.password
          };
        }

        this.transporter = nodemailer.createTransport(transportOptions);
        logger.info(`[MAIL] Nodemailer SMTP transport initialized for host ${config.mail.host}:${config.mail.port}`);
      } else {
        this.transporter = null;
        logger.info(`[MAIL] Mailer set to '${config.mail.mailer}'. Real SMTP sending is disabled; codes will be logged to console.`);
      }
    } catch (err) {
      logger.error(`[MAIL] Failed to initialize mail transport: ${err.message}`);
      this.transporter = null;
    }
  }

  /**
   * Re-initialize transporter (e.g. after config changes)
   */
  reconnect() {
    this._initTransporter();
  }

  /**
   * Send an OTP code to an email address
   * @param {string} to - Recipient email
   * @param {string} code - 6-digit numeric OTP
   * @param {'verification' | 'password_reset'} type - 'verification' or 'password_reset'
   */
  async sendOtp(to, code, type = 'verification') {
    const isReset = type === 'password_reset';
    const subject = isReset
      ? `SkillMatch Password Reset Code: ${code}`
      : `SkillMatch Verification Code: ${code}`;

    const heading = isReset ? 'Password Reset Verification' : 'Verify Your Email Address';
    const instructions = isReset
      ? 'You recently requested to reset your password for your SkillMatch account. Use the verification code below to complete the process:'
      : 'Thank you for registering with SkillMatch. Use the verification code below to verify your email address and activate your account:';

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                <!-- Header -->
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 32px 24px;">
                    <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">SkillMatch</h1>
                    <p style="margin: 6px 0 0; font-size: 14px; color: #e2e8f0; opacity: 0.9;">Career Intelligence & Job Matching</p>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 36px 28px; text-align: center;">
                    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #ffffff;">${heading}</h2>
                    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #94a3b8; text-align: center;">${instructions}</p>
                    
                    <!-- Code Display Box -->
                    <div style="background-color: #0f172a; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; margin: 24px 0;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #60a5fa; display: inline-block;">${code}</span>
                    </div>

                    <p style="margin: 20px 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                      ⏱ This verification code is valid for <strong>10 minutes</strong>.<br>
                      If you did not request this code, you can safely ignore this email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #090d16; padding: 20px 24px; text-align: center; border-top: 1px solid #1e293b;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">
                      &copy; ${new Date().getFullYear()} SkillMatch Inc. All rights reserved.<br>
                      Sent to <span style="color: #94a3b8;">${to}</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const textBody = `${heading}\n\n${instructions}\n\nVERIFICATION CODE: ${code}\n\nThis code is valid for 10 minutes.\nIf you did not request this, please ignore this message.`;

    // Always log code clearly in server logs for development visibility
    logger.info(`[MAIL] To: ${to} | Subject: ${subject} | Code: [${code}]`);

    let sent = false;
    let messageId = null;

    if (this.transporter && config.mail.mailer === 'smtp') {
      try {
        const info = await this.transporter.sendMail({
          from: `"${config.mail.fromName}" <${config.mail.fromAddress}>`,
          to,
          subject,
          text: textBody,
          html: htmlBody
        });
        sent = true;
        messageId = info.messageId;
        logger.info(`[MAIL] Sent successfully via SMTP to ${to} (MessageId: ${messageId})`);
      } catch (err) {
        logger.error(`[MAIL] SMTP sending error to ${to}: ${err.message}`);
      }
    } else {
      // Log transport mode
      sent = true;
    }

    return {
      to,
      subject,
      code,
      sent,
      messageId
    };
  }
}

module.exports = new MailService();
