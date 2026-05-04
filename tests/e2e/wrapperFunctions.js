const PROJECT_ID = 'demo-talloc';

export async function clearFirestoreEmulator() {
    const host = process.env.FIRESTORE_EMULATOR_HOST;

    if (!host) {
        throw new Error('FIRESTORE_EMULATOR_HOST not set — is the emulator running?');
    }

    const res = await fetch(
        `http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
        { method: 'DELETE' }
    );

    if (!res.ok) {
        throw new Error(`Failed to clear Firestore emulator: ${res.status}`);
    }
}