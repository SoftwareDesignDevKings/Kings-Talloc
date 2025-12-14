/**
 * Main E2E Test Suite
 * Imports and runs all endpoint tests
 */
const { testDashboard } = require('./endpoints/testDashboard');
const { testCalendar } = require('./endpoints/testCalendar');

// Run all tests
testDashboard();
testCalendar();
