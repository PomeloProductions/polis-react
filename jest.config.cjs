/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  // Mantine's Combobox-based widgets (e.g. CategoryAutocomplete) are slow to
  // drive under jsdom + userEvent — individual interactions can take ~14s on a
  // busy machine, which trips Jest's 10s default. Raise the per-test timeout so
  // these don't flake on slower runners.
  testTimeout: 30000,
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
    '^.+\\.(ts|tsx|js|jsx|mjs)$': '<rootDir>/jest-transform.cjs',
  },
  // @tanstack/react-table v9 (and its @tanstack/table-core / store deps) ship
  // as ESM-only `.js` files with no CommonJS build, so they must be transformed
  // rather than ignored. Everything else in node_modules stays ignored except
  // pre-existing `.mjs` files.
  transformIgnorePatterns: ['/node_modules/(?!(@tanstack)/)(?!(.*\\.mjs$))'],

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
