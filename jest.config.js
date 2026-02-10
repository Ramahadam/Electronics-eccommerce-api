module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  clearMocks: true,
  // Force Jest to exit after tests complete
  forceExit: true,
  // Increase test timeout significantly
  testTimeout: 120000,
};
