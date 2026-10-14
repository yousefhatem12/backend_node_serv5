module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  testTimeout: 20000,
  forceExit: true,
  clearMocks: true,
  setupFiles: ['<rootDir>/tests/setup.js']
};
