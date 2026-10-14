const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const db = require('../../src/models');
const config = require('../../src/config/env');

describe('Phase 1 - Auth & Security Integration Tests', () => {
  beforeAll(async () => {
    await db.sequelize.authenticate();
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.EmailOtp.destroy({ where: {}, truncate: true });
    await db.PasswordResetToken.destroy({ where: {}, truncate: true });
    await db.User.destroy({ where: {}, truncate: true });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  const candidateData = {
    name: 'Ahmed Wael',
    email: 'ahmed.wael@example.com',
    password: 'Password123!',
    password_confirmation: 'Password123!'
  };

  let candidateUser;
  let candidateToken;
  let sentOtp;

  // 1. REGISTER
  describe('POST /api/auth/register', () => {
    test('successfully registers candidate and sends OTP (201 Created)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(candidateData)
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message');
      expect(res.body.email).toBe(candidateData.email);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('candidate');
      expect(res.body.user.is_active).toBe(true);
      expect(res.body.user.email_verified_at).toBeNull();

      candidateUser = res.body.user;

      // Check OTP created in DB
      const otpRecord = await db.EmailOtp.findOne({
        where: { email: candidateData.email, type: 'verification' }
      });
      expect(otpRecord).not.toBeNull();
      sentOtp = otpRecord.otp;
    });

    test('fails with 422 when email is missing or passwords do not match', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid User',
          email: 'not-an-email',
          password: 'Password123!',
          password_confirmation: 'Mismatched123!'
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toHaveProperty('email');
      expect(res.body.errors).toHaveProperty('password_confirmation');
    });

    test('fails with 422 when email is already registered', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(candidateData)
        .set('Accept', 'application/json');

      expect(res.status).toBe(422);
      expect(res.body.errors).toHaveProperty('email');
      expect(res.body.errors.email[0]).toContain('already been taken');
    });
  });

  // 2. UNVERIFIED LOGIN
  describe('POST /api/auth/login (Unverified Account)', () => {
    test('rejects login with 403 when email is unverified', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: candidateData.email,
          password: candidateData.password
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('verify your email');
    });

    test('rejects login with 401 for wrong credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: candidateData.email,
          password: 'WrongPassword999!'
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('do not match our records');
    });
  });

  // 3. VERIFY EMAIL OTP
  describe('POST /api/auth/verify-email-otp', () => {
    test('fails with 422 for invalid OTP', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: candidateData.email,
          otp: '000000'
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(422);
      expect(res.body.errors).toHaveProperty('otp');
    });

    test('successfully verifies email with valid OTP (200 OK)', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: candidateData.email,
          otp: sentOtp
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.user.email_verified_at).not.toBeNull();

      // Check DB user updated
      const updatedUser = await db.User.findByPk(candidateUser.id);
      expect(updatedUser.email_verified_at).not.toBeNull();
    });
  });

  // 4. RESEND OTP
  describe('POST /api/auth/resend-email-otp', () => {
    test('returns 422 when attempting to resend to already verified email', async () => {
      const res = await request(app)
        .post('/api/auth/resend-email-otp')
        .send({ email: candidateData.email })
        .set('Accept', 'application/json');

      expect(res.status).toBe(422);
      expect(res.body.errors).toHaveProperty('email');
    });
  });

  // 5. LOGIN (VERIFIED) & SESSION
  describe('POST /api/auth/login & Session Endpoints', () => {
    let candidateRefreshToken;

    test('logs in successfully and returns JWT Bearer token and refresh token (200 OK)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: candidateData.email,
          password: candidateData.password
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
      expect(res.body.refresh_token).toBeTruthy();
      expect(res.body.token_type).toBe('bearer');
      expect(res.body.expires_in).toBe(config.jwt.expiresIn);
      expect(res.body.user.email).toBe(candidateData.email);

      candidateToken = res.body.access_token;
      candidateRefreshToken = res.body.refresh_token;
    });

    test('GET /api/auth/me returns authenticated user details', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(candidateUser.id);
      expect(res.body.user.name).toBe(candidateData.name);
      expect(res.body.user.role).toBe('candidate');
    });

    test('GET /api/auth/me rejects unauthenticated request with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Accept', 'application/json');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthenticated.');
    });

    test('POST /api/auth/refresh issues a new Bearer token and refresh token via Authorization header', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
      expect(res.body.access_token).toBeDefined();
    });

    test('POST /api/auth/refresh issues new tokens when refresh_token is passed in body', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: candidateRefreshToken })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
      expect(res.body.access_token).toBeDefined();
    });

    test('POST /api/auth/logout logs out user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${candidateToken}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Successfully logged out');
    });
  });

  // 6. PASSWORD RESET PIPELINE
  describe('Password Reset Pipeline', () => {
    let resetOtp;
    let resetToken;

    test('POST /api/auth/forgot-password sends password reset OTP', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: candidateData.email })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password reset code sent');

      const otpRecord = await db.EmailOtp.findOne({
        where: { email: candidateData.email, type: 'password_reset' }
      });
      expect(otpRecord).not.toBeNull();
      resetOtp = otpRecord.otp;
    });

    test('POST /api/auth/forgot-password/verify-otp exchanges OTP for 10-minute reset token', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password/verify-otp')
        .send({
          email: candidateData.email,
          otp: resetOtp
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reset_token');
      expect(res.body.expires_in).toBe(600);
      expect(res.body.reset_token.length).toBe(64);

      resetToken = res.body.reset_token;
    });

    test('POST /api/auth/reset-password resets password using reset_token', async () => {
      const newPassword = 'BrandNewPassword99!';
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: candidateData.email,
          reset_token: resetToken,
          password: newPassword,
          password_confirmation: newPassword
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password has been reset successfully');

      // Verify login with new password succeeds
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: candidateData.email,
          password: newPassword
        })
        .set('Accept', 'application/json');

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.access_token).toBeDefined();
    });
  });

  // 7. LARAVEL $2y$ BCRYPT HASH COMPATIBILITY
  describe('Laravel Bcrypt $2y$ Prefix Compatibility', () => {
    test('successfully authenticates a user seeded with Laravel $2y$ hash prefix', async () => {
      // Create user with Laravel $2y$ hash
      const salt = await bcrypt.genSalt(10);
      const standardHash = await bcrypt.hash('LaravelPassword123!', salt);
      const laravelHash = standardHash.replace(/^\$2[ab]\$/, '$2y$');

      const laravelUser = await db.User.create({
        name: 'Laravel User',
        email: 'laravel.user@example.com',
        password: laravelHash,
        role: 'candidate',
        is_active: true,
        email_verified_at: new Date()
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'laravel.user@example.com',
          password: 'LaravelPassword123!'
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.access_token).toBeDefined();
    });
  });

  // 8. DEACTIVATED USER
  describe('Deactivated User Security', () => {
    test('blocks deactivated user from logging in with 403', async () => {
      await db.User.create({
        name: 'Deactivated User',
        email: 'deactivated@example.com',
        password: 'Password123!',
        role: 'candidate',
        is_active: false,
        email_verified_at: new Date()
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'deactivated@example.com',
          password: 'Password123!'
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('deactivated');
    });
  });
});
