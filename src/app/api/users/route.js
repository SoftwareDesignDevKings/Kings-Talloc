import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, adminDbAuth } from '@/firestore/firestoreAdmin';
import { getRequiredAdminSession } from '@/lib/security/serverAuth';
import { accountRoles, accountVersion, findAccountProfile, validAccountEmail } from '@/lib/security/accountState';
import { rebuildStudentTutorEligibility } from '@/lib/canvas/tutorEligibility';

const roles = new Set(['admin', 'teacher', 'tutor', 'coach', 'student']);
const sameOrigin = request => !request.headers.get('origin') || request.headers.get('origin') === new URL(request.url).origin;
const roleKey = profile => JSON.stringify([profile.defaultRole, [...profile.userRoles].sort()]);
const errorResponse = error => Response.json({ message: error.status ? error.message : 'Account change could not be completed. Please retry.' }, { status: error.status || 500 });
const fail = (condition, message, status) => { if (condition) throw Object.assign(new Error(message), { status }); };
async function rebuild() {
    try { await rebuildStudentTutorEligibility(); return undefined; }
    catch { return 'Account saved, but student tutor eligibility could not be refreshed. Please retry the Canvas eligibility rebuild.'; }
}

export async function POST(request) {
    const { session, error } = await getRequiredAdminSession();
    if (error) return error;
    if (!sameOrigin(request)) return Response.json({ message: 'Forbidden' }, { status: 403 });
    try {
        const input = await request.json();
        const { mode, name, defaultRole, userRoles = [], requestNotificationsEnabled = false, tutorCoverage = [] } = input;
        const email = typeof input.email === 'string' ? input.email.trim() : '';
        fail(!validAccountEmail(email) || !['create', 'update'].includes(mode), 'Choose a valid email and account action.', 400);
        fail(typeof name !== 'string' || name.length > 200 || !roles.has(defaultRole)
            || !Array.isArray(userRoles) || userRoles.length > 5 || userRoles.some(role => !roles.has(role))
            || typeof requestNotificationsEnabled !== 'boolean' || !Array.isArray(tutorCoverage) || tutorCoverage.length > 500,
        'Invalid account details.', 400);
        const coverage = tutorCoverage.map(item => {
            fail(!item || typeof item.key !== 'string' || item.key.length > 200, 'Invalid tutor subject coverage.', 400);
            return Object.fromEntries(['key', 'type', 'id', 'label', 'courseCode'].filter(key => typeof item[key] === 'string').map(key => [key, item[key].slice(0, 200)]));
        });
        const profile = await findAccountProfile(email);
        const ref = profile?.ref || adminDb.collection('users').doc(email.toLowerCase());
        const securityChanged = await adminDb.runTransaction(async transaction => {
            const current = await transaction.get(ref);
            fail(mode === 'create' && current.exists, 'A user with this email already exists.', 409);
            fail(mode === 'update' && !current.exists, 'This account no longer exists.', 404);
            const previous = current.data() || {};
            const nextRoles = { defaultRole, userRoles: [...new Set(userRoles)] };
            const changed = !current.exists || roleKey(accountRoles(previous)) !== roleKey(nextRoles);
            transaction.set(ref, {
                email: ref.id, name: name.trim(), role: defaultRole, ...nextRoles,
                authVersion: changed ? crypto.randomUUID() : accountVersion(previous),
                disabled: mode === 'create' ? false : previous.disabled === true,
                requestNotificationsEnabled, tutorCoverage: coverage, tutorCoverageKeys: coverage.map(item => item.key),
                calendarFeedToken: FieldValue.delete(),
            }, { merge: true });
            if (mode === 'create') transaction.delete(adminDb.collection('revokedAccounts').doc(ref.id.toLowerCase()));
            if (changed) transaction.delete(adminDb.collection('calendarFeedSecrets').doc(ref.id));
            return changed;
        });
        let warning;
        try {
            const authUser = await adminDbAuth.getUser(ref.id.toLowerCase()).catch(error => {
                if (error.code === 'auth/user-not-found') return null;
                throw error;
            });
            if (authUser) {
                if (mode === 'create') await adminDbAuth.updateUser(authUser.uid, { disabled: false });
                if (securityChanged) await adminDbAuth.revokeRefreshTokens(authUser.uid);
            }
        } catch {
            // The live profile/version check already invalidates old privileges.
            warning = 'Account saved and old app access invalidated, but Firebase session cleanup needs a retry.';
        }
        const rebuildWarning = await rebuild();
        warning = warning || rebuildWarning;
        return Response.json({ message: 'Account saved.', warning, requiresReauthentication: securityChanged && session.user.email.toLowerCase() === ref.id.toLowerCase() }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) { return errorResponse(error); }
}

export async function DELETE(request) {
    const { session, error } = await getRequiredAdminSession();
    if (error) return error;
    if (!sameOrigin(request)) return Response.json({ message: 'Forbidden' }, { status: 403 });
    try {
        const { email } = await request.json();
        fail(!validAccountEmail(email), 'A valid email is required.', 400);
        const profile = await findAccountProfile(email);
        const id = profile?.id || email;
        // Commit revocation first: even Firebase cleanup failure cannot restore access.
        const batch = adminDb.batch();
        batch.set(adminDb.collection('revokedAccounts').doc(email.toLowerCase()), { revokedAt: FieldValue.serverTimestamp() });
        batch.delete(profile?.ref || adminDb.collection('users').doc(id));
        batch.delete(adminDb.collection('calendarFeedSecrets').doc(id));
        await batch.commit();
        let warning;
        try {
            const authUser = await adminDbAuth.getUserByEmail(email);
            await adminDbAuth.revokeRefreshTokens(authUser.uid);
            await adminDbAuth.deleteUser(authUser.uid);
        } catch (error) {
            if (error.code !== 'auth/user-not-found') warning = 'App access was revoked, but Firebase account cleanup needs a retry.';
        }
        return Response.json({ message: 'Account deleted and access revoked.', warning, requiresReauthentication: session.user.email.toLowerCase() === email.toLowerCase() }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) { return errorResponse(error); }
}
