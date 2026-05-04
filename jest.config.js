const nextJest = require('next/jest');

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files
    dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jsdom',
    testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/tests/e2e/'],
    moduleNameMapper: {
        // Handle module aliases (same as in your jsconfig.json paths)
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@providers/(.*)$': '<rootDir>/src/providers/$1',
        '^@contexts/(.*)$': '<rootDir>/src/contexts/$1',
        '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
        '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    },
    transformIgnorePatterns: ['node_modules/(?!(@firebase/rules-unit-testing)/)'],
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
    },
    collectCoverageFrom: [
        'components/**/*.{js,jsx}',
        'hooks/**/*.{js,jsx}',
        'providers/**/*.{js,jsx}',
        'app/**/*.{js,jsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
    ],
    testMatch: [
        '<rootDir>/tests/**/*.(test|spec).{js,jsx}',
        '<rootDir>/**/*.(test|spec).{js,jsx}',
    ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
