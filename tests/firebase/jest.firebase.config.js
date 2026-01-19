// Simple Jest config for Firebase rules tests (Node environment only)
module.exports = {
    testEnvironment: 'node',
    rootDir: '../..',
    testMatch: ['<rootDir>/tests/firebase/*.test.js'],
    // Suppress expected Firebase permission denied warnings during tests
    setupFilesAfterEnv: ['<rootDir>/tests/firebase/firebaseTestSetup.js'],
};
