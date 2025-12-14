# E2E Testing Guide

This directory contains end-to-end (E2E) tests for the Kings Talloc application using Playwright and Firebase Emulators.

## Overview

The E2E test suite verifies critical functionality across different user roles (Teacher, Tutor, Student) without touching production data. All tests run against Firebase emulators for both Firestore and Authentication.

## Setup

### Prerequisites

1. Firebase CLI installed globally: `npm install -g firebase-tools`
2. All project dependencies installed: `npm install`

### Running Tests

**Single command to run all E2E tests:**

```bash
npm run e2e
```

This command:
1. Starts Firebase emulators (Firestore + Auth)
2. Starts the Next.js dev server with E2E environment variables
3. Runs all Playwright tests
4. Automatically shuts down emulators when done

**Additional commands:**

```bash
# Run with UI mode for debugging
npm run e2e:ui

# Run in debug mode with inspector
npm run e2e:debug
```

## Architecture

### File Structure

```
__tests__/
├── e2e/                      # E2E tests with Playwright
│   ├── .auth/               # Saved authentication states (git-ignored)
│   │   ├── teacher.json
│   │   ├── tutor.json
│   │   └── student.json
│   ├── endpoints/           # Test definitions by feature
│   │   ├── testDashboard.js
│   │   └── testCalendar.js
│   ├── helpers/             # Utility functions
│   │   └── clearFirestore.js
│   ├── auth.setup.js        # Authentication setup (runs before all tests)
│   ├── e2e.spec.js          # Main test runner
│   └── README.md            # This file
└── firebase/                 # Firebase/Firestore tests with Jest
    ├── firebase.*.test.js   # Firebase rules tests
    ├── firebaseTestSetup.js # Firebase test setup
    └── jest.firebase.config.js # Jest configuration for Firebase tests
```

### Configuration Files

- **playwright.config.js** - Playwright configuration with 3 projects (teacher, tutor, student)
- **.env.e2e** - E2E environment variables (Firebase emulator settings)
- **firebase/firebase.json** - Firebase emulator configuration

## How It Works

### 1. Authentication

The `auth.setup.js` script runs before all tests and:

1. Clears Firestore emulator data
2. Creates three test users via `/api/e2e-login`:
   - `teacher@example.test`
   - `tutor@example.test`
   - `student@example.test`
3. Saves authentication state for each user in `__tests__/e2e/.auth/`

### 2. Test-Only Login Endpoint

The `/api/e2e-login` endpoint (`src/app/api/e2e-login/route.js`):

- **ONLY available when E2E_TEST_ENABLED=1** (disabled in production)
- Creates users in Firebase Auth emulator
- Creates user documents in Firestore emulator
- Generates NextAuth session tokens
- Validates password matches E2E_TEST_PASSWORD environment variable

### 3. Firebase Emulators

Tests use local Firebase emulators:

- **Firestore Emulator**: Port 8080
- **Auth Emulator**: Port 9099

The app automatically connects to emulators when `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=1`.

### 4. Test Projects

Playwright runs three separate projects in parallel:

- **teacher** - Uses `__tests__/e2e/.auth/teacher.json` storage state
- **tutor** - Uses `__tests__/e2e/.auth/tutor.json` storage state
- **student** - Uses `__tests__/e2e/.auth/student.json` storage state

Each project runs the same tests but with different authentication contexts.

## Writing Tests

### Adding a New Test File

1. Create a file in `__tests__/e2e/endpoints/` (e.g., `testNewFeature.js`)
2. Export a function that defines your tests:

```javascript
const { test, expect } = require('@playwright/test');

function testNewFeature() {
  test.describe('New Feature - Teacher', () => {
    test.use({ storageState: '__tests__/e2e/.auth/teacher.json' });

    test('should do something', async ({ page }) => {
      await page.goto('/new-feature');
      // Your test logic
    });
  });
}

module.exports = { testNewFeature };
```

3. Import and call your function in `__tests__/e2e/e2e.spec.js`:

```javascript
const { testNewFeature } = require('./endpoints/testNewFeature');

testNewFeature();
```

### Test Patterns

**Testing all three roles:**

```javascript
function testFeature() {
  for (const role of ['teacher', 'tutor', 'student']) {
    test.describe(\`Feature - \${role}\`, () => {
      test.use({ storageState: \`__tests__/e2e/.auth/\${role}.json\` });

      test('should work', async ({ page }) => {
        // Test logic
      });
    });
  }
}
```

**Testing with fresh data:**

```javascript
const { clearFirestore } = require('../helpers/clearFirestore');

test.beforeEach(async () => {
  await clearFirestore();
});
```

**Testing cross-role interactions:**

```javascript
test('teacher creates event, student sees it', async ({ browser }) => {
  // Teacher context
  const teacherContext = await browser.newContext({
    storageState: '__tests__/e2e/.auth/teacher.json',
  });
  const teacherPage = await teacherContext.newPage();

  // Create event as teacher
  await teacherPage.goto('/calendar');
  // ... create event logic

  await teacherContext.close();

  // Student context
  const studentContext = await browser.newContext({
    storageState: '__tests__/e2e/.auth/student.json',
  });
  const studentPage = await studentContext.newPage();

  // Verify student sees the event
  await studentPage.goto('/calendar');
  // ... verification logic

  await studentContext.close();
});
```

## Current Test Coverage

### Dashboard (`__tests__/e2e/endpoints/testDashboard.js`)

- ✅ All roles can access dashboard
- ✅ Role-based content visibility
- ⚠️ Specific UI checks need implementation based on your actual dashboard

### Calendar (`__tests__/e2e/endpoints/testCalendar.js`)

- ✅ All roles can access calendar
- ✅ Framework for event creation and visibility
- ⚠️ Event creation flow needs implementation (TODO: add selectors based on your UI)
- ⚠️ Event editing/deletion tests need implementation

## Troubleshooting

### Tests fail to start

1. Check Firebase emulators are not already running:
   ```bash
   lsof -i :8080
   lsof -i :9099
   ```

2. Kill any existing processes:
   ```bash
   kill -9 <PID>
   ```

### Authentication fails

1. Check `.env.e2e` has correct values
2. Verify E2E_TEST_ENABLED=1 is set
3. Check that `/api/e2e-login` returns success

### Emulator data persists between runs

The test suite automatically clears Firestore emulator data. If you need to manually clear:

```bash
curl -X DELETE "http://127.0.0.1:8080/emulator/v1/projects/kings-talloc-e2e/databases/(default)/documents"
```

## Security Notes

- The `/api/e2e-login` endpoint is **ONLY** available when `E2E_TEST_ENABLED=1`
- In production, this endpoint returns a 404
- Test users only exist in the local emulator, never in production
- Firebase emulators use fake project IDs and don't connect to real Firebase

## Next Steps

1. Add specific UI selectors to calendar tests for event creation/editing
2. Add more role-specific permission tests
3. Add tests for other features (tutor hours, user management, etc.)
4. Configure CI/CD pipeline to run E2E tests
