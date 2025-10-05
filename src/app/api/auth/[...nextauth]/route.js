import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { adminAuth, adminDb } from '@/firebase/adminFirebase';

/**
 * Server-side: Create or fetch user role from Firestore on sign in
 */
async function handleSignIn({ user, account, profile }) {
    try {
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
 * Add user role to JWT token
 */
async function handleJwt({ token, user }) {
	if (!user) {
		return token;
	}

	token.role = user.role;
	const userUid = user.email.toLowerCase();

	// ensure that userUid exists on the firebase record, so when they mint token they arent rejected
	try {
		await adminAuth.updateUser(userUid, {
			email: user.email,
			displayName: user.name,
		})
	} catch (error) {
		if (error.code === "auth/user-not-found") {
			await adminAuth.createUser({
				uid: userUid,
				email: user.email,
				displayName: user.name,
			})
		} else {
			console.log("Error updating user:", error)
		}
	}

	const role = user.role

	// one-time login token to Firestore
	const firebaseToken = await adminAuth.createCustomToken(userUid, { role });
	token.firebaseToken = firebaseToken;
    return token;
}

/**
 * Add role from JWT to session object
 */
async function handleSession({ session, token }) {
    session.user.role = token.role;
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
