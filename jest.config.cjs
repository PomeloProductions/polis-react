/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/src/test-utils/jest-dom.d.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '\\.s?css$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg|webp|woff2?|ttf|eot)$': '<rootDir>/src/test-utils/fileMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': '<rootDir>/jest-transform.cjs',
  },
  transformIgnorePatterns: ['/node_modules/(?!(.*\\.mjs$))'],

  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/test-utils/**',
    '!src/index.ts',
    '!src/**/index.ts',
    '!src/assets/**',
    '!src/data/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
  // Thresholds are set to (current coverage - 2) at PR-merge time so future
  // changes can't silently drop coverage. Bump these whenever you raise the
  // floor for new code.
  coverageThreshold: {
    global: {
      branches: 26,
      functions: 38,
      lines: 45,
      statements: 43,
    },
  },
};
