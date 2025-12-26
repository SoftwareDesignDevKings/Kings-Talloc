import { adminAuth, adminDb } from '@/firestore/firestoreAdmin';
import crypto from "crypto"
/**
 * Server-side: Create or fetch user role from Firestore on sign in
 */
export async function authFirebaseSignIn({ user }) {
    try {
        const userRef = adminDb.collection('users').doc(user.email);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            // Create new user with default "student" role
            const calendarFeedToken = crypto.randomBytes(32).toString("hex");
            await userRef.set({
                email: user.email,
                name: user.name,
                role: 'student',
                calendarFeedToken,
            });

            user.role = 'student';
            user.calendarFeedToken = calendarFeedToken;
        } else {
            // Fetch existing role from Firestore
            const userData = userDoc.data();
            user.role = userData.role;

            if (!userData.calendarFeedToken) {
                const calendarFeedToken = crypto.randomBytes(32).toString("hex");
                await userRef.update({ calendarFeedToken });
                user.calendarFeedToken = calendarFeedToken;
            } else {
                user.calendarFeedToken = userData.calendarFeedToken;
            }
        }

        return true;
    } catch (error) {
        console.error('Error in Firebase sign in:', error);
        return false;
    }
}

/**
 * Generate and refresh Firebase custom token
 */
export async function authFirebaseGenerateToken(token, user) {
    const FIFTY_MINUTES = 50 * 60 * 1000;
    const shouldRefreshToken =
        !token.firebaseTokenCreatedAt || Date.now() - token.firebaseTokenCreatedAt > FIFTY_MINUTES;

    // generate new Firebase token if needed (initial login or refresh)
    if (user || shouldRefreshToken) {
        const userUid = token.email.toLowerCase();
        const userRole = token.role;

        // ensure Firebase Auth user exists
        try {
            await adminAuth.getUser(userUid);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                try {
                    await adminAuth.createUser({
                        uid: userUid,
                        email: token.email,
                        displayName: token.name,
                    });
                } catch (createError) {
                    console.error('Error creating Firebase user:', createError);
                }
            } else {
                console.error('Error getting Firebase user:', error);
            }
        }

        // generate fresh Firebase custom token
        const firebaseToken = await adminAuth.createCustomToken(userUid, {
            role: userRole,
            email: token.email,
        });        
        
        token.firebaseToken = firebaseToken;
        token.firebaseTokenCreatedAt = Date.now();
    }

    return token;
}
