const nextJest = require('next/jest');

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files
    dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jsdom',
    testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
    moduleNameMapper: {
        // Handle module aliases (same as in your jsconfig.json paths)
        '^@/(.*)$': '<rootDir>/$1',
        '^@components/(.*)$': '<rootDir>/components/$1',
        '^@hooks/(.*)$': '<rootDir>/hooks/$1',
        '^@providers/(.*)$': '<rootDir>/providers/$1',
        '^@contexts/(.*)$': '<rootDir>/contexts/$1',
        '^@middleware/(.*)$': '<rootDir>/middleware/$1',
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
        '<rootDir>/__tests__/**/*.(test|spec).{js,jsx}',
        '<rootDir>/**/*.(test|spec).{js,jsx}',
    ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
