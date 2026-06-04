/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/src/test-utils/jest-dom.d.ts',
    ],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    moduleNameMapper: {
        '\\.s?css$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|svg|webp|woff2?|ttf|eot)$':
            '<rootDir>/src/test-utils/fileMock.js',
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    transform: {
        '^.+\\.(ts|tsx)$': '<rootDir>/jest-transform.cjs',
    },
    transformIgnorePatterns: ['/node_modules/(?!(.*\\.mjs$))'],
};
