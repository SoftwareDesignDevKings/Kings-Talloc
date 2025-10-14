import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { adminAuth, adminDb } from '@/firestore/adminFirebase';

/**
 * Server-side: Create or fetch user role from Firestore on sign in
 */
async function handleSignIn({ user, account, profile }) {
    try {
		const email = user.email.toLowerCase();
		const emailRegex = /^[^@]+@(student\.)?kings\.edu\.au$/i;
		const isValidDomain = emailRegex.test(email);
        if (!isValidDomain) {
            return false;
        }

        const userRef = adminDb.collection('users').doc(user.email);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            // Create new user with default "student" role (server-side, secure)
            await userRef.set({email: user.email, name: user.name, role: "student"});
            user.role = "student";
        } else {
            // Fetch existing role from Firestore
            user.role = userDoc.data().role;
        }

        return true;
    } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
    }
}

/**
 * Add user role to JWT token and refresh Firebase token periodically
 */
async function handleJwt({ token, user }) {
	// Initial sign in - user object is available
	if (user) {
		token.role = user.role;
		token.email = user.email;
		token.name = user.name;
		token.firebaseTokenCreatedAt = Date.now();
	}

	// Check if we need to refresh the Firebase token (every 50 minutes to be safe)
	const FIFTY_MINUTES = 50 * 60 * 1000;
	const shouldRefreshToken = !token.firebaseTokenCreatedAt ||
		(Date.now() - token.firebaseTokenCreatedAt > FIFTY_MINUTES);

	// Generate new Firebase token if needed (initial login or refresh)
	if (user || shouldRefreshToken) {
		const userUid = (user?.email || token.email).toLowerCase();
		const userRole = user?.role || token.role;

		// Ensure Firebase Auth user exists
		try {
			await adminAuth.getUser(userUid);
		} catch (error) {
			if (error.code === "auth/user-not-found") {
				try {
					await adminAuth.createUser({
						uid: userUid,
						email: user?.email || token.email,
						displayName: user?.name || token.name,
					});
				} catch (createError) {
					console.log("Error creating user:", createError);
				}
			} else {
				console.log("Error getting user:", error);
			}
		}

		// Generate fresh Firebase custom token
		const firebaseToken = await adminAuth.createCustomToken(userUid, { role: userRole });
		token.firebaseToken = firebaseToken;
		token.firebaseTokenCreatedAt = Date.now();
	}

	return token;
}

/**
 * Add role and firebaseToken from JWT to session object
 */
async function handleSession({ session, token }) {
    session.user.role = token.role;
    session.user.firebaseToken = token.firebaseToken;
    return session;
}


const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: '/login',
        error: '/login',
    },
    callbacks: {
        signIn: handleSignIn,
        jwt: handleJwt,
        session: handleSession,
    },
});

export { handler as GET, handler as POST };
