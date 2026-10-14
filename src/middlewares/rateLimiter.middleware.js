const rateLimit = require('express-rate-limit');
const { RATE_LIMITS } = require('../config/constants');
const { t } = require('../utils/i18n');

function createLimiter(options) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    skip: () => process.env.NODE_ENV === 'test',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const locale = req.locale || 'en';
      const message = t('common.tooManyRequests', locale);
      return res.status(429).json({ message });
    }
  });
}

const loginLimiter = createLimiter(RATE_LIMITS.LOGIN);
const registerLimiter = createLimiter(RATE_LIMITS.REGISTER);
const resendOtpLimiter = createLimiter(RATE_LIMITS.RESEND_OTP);
const roadmapLimiter = createLimiter(RATE_LIMITS.ROADMAP_GENERATE);

module.exports = {
  createLimiter,
  loginLimiter,
  registerLimiter,
  resendOtpLimiter,
  roadmapLimiter
};
