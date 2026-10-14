require('dotenv').config();

// Configuration loader
module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 8000,
  appName: process.env.APP_NAME || 'SkillMatch',
  appUrl: process.env.APP_URL || 'http://localhost:8000',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.NODE_ENV === 'test'
      ? (process.env.DB_TEST_NAME || 'skillmatch_test')
      : (process.env.DB_NAME || 'skillmatch')
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default_jwt_secret_please_change_in_production',
    expiresIn: parseInt(process.env.JWT_EXPIRES_IN, 10) || 3600,
    refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN, 10) || 604800
  },

  otp: {
    staticEnabled: process.env.STATIC_OTP_ENABLED === 'true',
    staticCode: process.env.STATIC_OTP_CODE || '123456'
  },

  mail: {
    mailer: process.env.MAIL_MAILER || 'log',
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT, 10) || 587,
    secure: process.env.MAIL_SECURE === 'true',
    username: process.env.MAIL_USERNAME || '',
    password: process.env.MAIL_PASSWORD || '',
    fromAddress: process.env.MAIL_FROM_ADDRESS || 'no-reply@skillmatch.com',
    fromName: process.env.MAIL_FROM_NAME || 'SkillMatch'
  },

  storage: {
    uploadMaxMb: parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB, 10) || 5,
    path: process.env.STORAGE_PATH || './storage'
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'local',
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || 0.7,
    baseUrl: process.env.AI_SERVICE_BASE_URL || process.env.AI_SERVICE_URL || 'https://ai-serv5.fastapicloud.dev',
    secretKey: process.env.AI_SERVICE_SECRET_KEY || process.env.AI_SERVICE_API_KEY || '',
    matchServiceEnabled: process.env.AI_MATCH_SERVICE_ENABLED === 'true',
    strategyServiceEnabled: process.env.AI_STRATEGY_SERVICE_ENABLED === 'true',
    cvImproverServiceEnabled: process.env.AI_CV_IMPROVER_SERVICE_ENABLED === 'true',
    interviewCoachEnabled: process.env.AI_INTERVIEW_COACH_ENABLED === 'true',
    mentorServiceEnabled: process.env.AI_MENTOR_SERVICE_ENABLED === 'true',
    roadmapServiceEnabled: process.env.AI_ROADMAP_SERVICE_ENABLED === 'true',
    timeoutMs: parseInt(process.env.AI_SERVICE_TIMEOUT_MS, 10) || 30000
  },

  locale: {
    default: process.env.DEFAULT_LOCALE || 'en',
    fallback: process.env.FALLBACK_LOCALE || 'en'
  }
};
