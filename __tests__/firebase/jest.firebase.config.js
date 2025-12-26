// Simple Jest config for Firebase rules tests (Node environment only)
module.exports = {
    testEnvironment: 'node',
    rootDir: '../..',
    testMatch: ['<rootDir>/__tests__/firebase/*.test.js'],
    // Suppress expected Firebase permission denied warnings during tests
    setupFilesAfterEnv: ['<rootDir>/__tests__/firebase/firebaseTestSetup.js'],
};
