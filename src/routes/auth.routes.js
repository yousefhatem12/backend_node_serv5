const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  registerLimiter,
  loginLimiter,
  resendOtpLimiter
} = require('../middlewares/rateLimiter.middleware');

const {
  registerSchema,
  loginSchema,
  verifyEmailOtpSchema,
  resendEmailOtpSchema,
  forgotPasswordSchema,
  verifyPasswordResetOtpSchema,
  resetPasswordSchema
} = require('../validators/auth.validator');

// Public Authentication Endpoints
router.post('/register', registerLimiter, validate(registerSchema), AuthController.register);
router.post('/login', loginLimiter, validate(loginSchema), AuthController.login);

// Email Verification
router.post('/verify-email-otp', validate(verifyEmailOtpSchema), AuthController.verifyEmailOtp);
router.post('/resend-email-otp', resendOtpLimiter, validate(resendEmailOtpSchema), AuthController.resendEmailOtp);

// Password Recovery Flow
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/forgot-password/verify-otp', validate(verifyPasswordResetOtpSchema), AuthController.verifyPasswordResetOtp);
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

// Authenticated Session Endpoints
router.get('/me', authMiddleware, AuthController.me);
router.post('/refresh', authMiddleware.refresh, AuthController.refresh);
router.post('/logout', authMiddleware, AuthController.logout);

module.exports = router;
