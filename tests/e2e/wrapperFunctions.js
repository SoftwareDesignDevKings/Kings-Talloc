import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const DEFAULT_EMULATOR_HOST = '127.0.0.1:8080';
const getEmulatorHost = () => process.env.FIRESTORE_EMULATOR_HOST || DEFAULT_EMULATOR_HOST;

if (!PROJECT_ID) {
    throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID must be set for e2e emulator helpers.');
}

export async function clearFirestoreEmulator() {
    const host = getEmulatorHost();

    const res = await fetch(
        `http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
        { method: 'DELETE' }
    );

    if (!res.ok) {
        throw new Error(`Failed to clear Firestore emulator: ${res.status}`);
    }
}

const toFirestoreValue = (value) => {
    if (value === null || value === undefined) return { nullValue: null };
    if (value instanceof Date) return { timestampValue: value.toISOString() };
    if (Array.isArray(value)) {
        return { arrayValue: { values: value.map(toFirestoreValue) } };
    }
    if (typeof value === 'object') {
        return {
            mapValue: {
                fields: Object.fromEntries(
                    Object.entries(value).map(([key, nestedValue]) => [key, toFirestoreValue(nestedValue)])
                ),
            },
        };
    }
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') {
        return Number.isInteger(value) ? { integerValue: value } : { doubleValue: value };
    }
    return { stringValue: String(value) };
};

export async function seedShiftInEmulator(id, shift) {
    return seedDocumentInEmulator('shifts', id, shift);
}

export async function seedStudentRequestInEmulator(id, request) {
    return seedDocumentInEmulator('studentEventRequests', id, request);
}

export async function seedUserInEmulator(email, user) {
    return seedDocumentInEmulator('users', email, user);
}

async function seedDocumentInEmulator(collectionName, id, document) {
    const host = getEmulatorHost();
    const res = await fetch(
        `http://${host}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}/${id}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: Object.fromEntries(
                    Object.entries(document).map(([key, value]) => [key, toFirestoreValue(value)])
                ),
            }),
        }
    );

    if (!res.ok) {
        throw new Error(`Failed to seed ${collectionName}/${id}: ${res.status}`);
    }
}
