import dotenv from 'dotenv';
import { expect } from '@playwright/test';
import { TEST_USERS } from '../../src/lib/security/testUsers';

dotenv.config({ path: '.env.local' });

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const DEFAULT_EMULATOR_HOST = '127.0.0.1:8080';
const getEmulatorHost = () => {
    const host = process.env.FIRESTORE_EMULATOR_HOST || DEFAULT_EMULATOR_HOST;
    if (!PROJECT_ID?.startsWith('demo-') || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) {
        throw new Error('E2E fixture writes require a demo project and local Firestore emulator.');
    }
    return host;
};

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
    // Keep role/eligibility fixtures present after clearing scheduling test data.
    await Promise.all(Object.entries(TEST_USERS).map(([email, user]) => seedUserInEmulator(email, { ...user, email, hasSeenWelcome: true, hasSeenCalendarHelp: true })));
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
            // Emulator-only fixture writes bypass the production client rules.
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
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

export async function seedStudentEligibilityInEmulator(email, tutors) { return seedDocumentInEmulator('studentTutorEligibility', email, { eligibleTutorEmails: tutors }); }

// Keep confirmation coverage explicit instead of silently dismissing destructive actions.
export async function confirmAction(page, message, action) {
    const confirmation = page.waitForEvent('dialog').then(async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toMatch(message);
        await dialog.accept();
    });
    await Promise.all([confirmation, action()]);
}
