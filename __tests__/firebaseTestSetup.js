// Suppress expected Firebase warnings during rules testing
const { assertFails: originalAssertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

const originalWarn = console.warn;
const originalError = console.error;

// Track whether we're in an assertFails context
global.__expectingFirebaseFailure = false;

beforeAll(() => {
  console.warn = (...args) => {
    const msg = args[0];
    // Only suppress Firebase warnings when we're expecting a failure (assertFails)
    if (global.__expectingFirebaseFailure && typeof msg === 'string' && msg.includes('@firebase/firestore')) {
      return;
    }
    originalWarn(...args);
  };

  console.error = (...args) => {
    const msg = args[0];
    // Only suppress Firebase errors when we're expecting a failure (assertFails)
    if (global.__expectingFirebaseFailure && typeof msg === 'string' && msg.includes('@firebase/firestore')) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Wrap assertFails to suppress expected warnings
global.assertFails = async (promise) => {
  global.__expectingFirebaseFailure = true;
  try {
    return await originalAssertFails(promise);
  } finally {
    global.__expectingFirebaseFailure = false;
  }
};

// Re-export assertSucceeds for consistency
global.assertSucceeds = assertSucceeds;
