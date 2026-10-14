const { z } = require('zod');

const registerSchema = z.object({
  name: z.string({ required_error: 'The name field is required.' })
    .trim()
    .min(2, 'The name must be at least 2 characters.')
    .max(150, 'The name may not be greater than 150 characters.'),
  email: z.string({ required_error: 'The email field is required.' })
    .trim()
    .email('The email must be a valid email address.')
    .max(150, 'The email may not be greater than 150 characters.'),
  password: z.string({ required_error: 'The password field is required.' })
    .min(8, 'The password must be at least 8 characters.'),
  password_confirmation: z.string({ required_error: 'The password confirmation field is required.' })
}).refine((data) => data.password === data.password_confirmation, {
  message: 'The password confirmation does not match.',
  path: ['password_confirmation']
});

const loginSchema = z.object({
  email: z.string({ required_error: 'The email field is required.' })
    .trim()
    .email('The email must be a valid email address.'),
  password: z.string({ required_error: 'The password field is required.' })
    .min(1, 'The password field is required.')
});

const verifyEmailOtpSchema = z.object({
  email: z.string({ required_error: 'The email field is required.' })
    .trim()
    .email('The email must be a valid email address.'),
  otp: z.string({ required_error: 'The otp field is required.' })
    .trim()
    .min(4, 'The otp must be at least 4 characters.')
    .max(10, 'The otp may not be greater than 10 characters.')
});

const resendEmailOtpSchema = z.object({
  email: z.string({ required_error: 'The email field is required.' })
    .trim()
    .email('The email must be a valid email address.')
});

const forgotPasswordSchema = z.object({
  email: z.string({ required_error: 'The email field is required.' })
    .trim()
    .email('The email must be a valid email address.')
});

const verifyPasswordResetOtpSchema = z.object({
  email: z.string({ required_error: 'The email field is required.' })
    .trim()
    .email('The email must be a valid email address.'),
  otp: z.string({ required_error: 'The otp field is required.' })
    .trim()
    .min(4, 'The otp must be at least 4 characters.')
});

const resetPasswordSchema = z.object({
  email: z.string({ required_error: 'The email field is required.' })
    .trim()
    .email('The email must be a valid email address.'),
  reset_token: z.string({ required_error: 'The reset token field is required.' })
    .trim()
    .min(10, 'The reset token is invalid.'),
  password: z.string({ required_error: 'The password field is required.' })
    .min(8, 'The password must be at least 8 characters.'),
  password_confirmation: z.string({ required_error: 'The password confirmation field is required.' })
}).refine((data) => data.password === data.password_confirmation, {
  message: 'The password confirmation does not match.',
  path: ['password_confirmation']
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailOtpSchema,
  resendEmailOtpSchema,
  forgotPasswordSchema,
  verifyPasswordResetOtpSchema,
  resetPasswordSchema
};
