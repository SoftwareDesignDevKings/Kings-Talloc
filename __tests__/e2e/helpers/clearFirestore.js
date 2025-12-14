/**
 * Clear all data from Firestore emulator using the REST API
 * This ensures each test starts with a clean state
 */
export async function clearFirestore() {
  const projectId = process.env.E2E_TEST_FIREBASE_PROJECT_ID || 'kings-talloc-e2e';
  const firestoreHost = process.env.E2E_TEST_FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

  try {
    await fetch(
      `http://${firestoreHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      {
        method: 'DELETE',
      }
    );
  } catch (error) {
    // Silently ignore errors - emulator might not be ready yet
  }
}

/**
 * Wait for Firestore emulator to be ready
 */
export async function waitForFirestore(maxAttempts = 30) {
  const firestoreHost = process.env.E2E_TEST_FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://${firestoreHost}/`);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Emulator not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error('Firestore emulator did not start in time');
}
