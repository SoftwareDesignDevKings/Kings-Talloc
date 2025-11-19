import Google from "next-auth/providers/google";
import AzureAD from "next-auth/providers/azure-ad";
import { handleFirebaseSignIn, handleFirebaseToken } from "./firebaseAuth";
import { storeMicrosoftTokens, refreshMicrosoftToken } from "./msAuth";

/**
 * Server-side: Create or fetch user role from Firestore on sign in
 */
async function handleSignIn({ user, account, profile }) {
	return handleFirebaseSignIn({ user });
}

/**
 * Add user role to JWT token and refresh Firebase token periodically
 */
async function handleJwt({ token, user, account, profile }) {
	// Initial sign in - user object is available
	if (user) {
		token.role = user.role;
		token.email = user.email;
		token.name = user.name;

		// Store profile information if available
		if (profile) {
			token.profile = profile;
		}

		// Store user image/picture (works for Google)
		if (user.image) {
			token.picture = user.image;
		}

		// Store Microsoft tokens if available
		storeMicrosoftTokens(token, account);
	}

	// Refresh Microsoft access token if needed
	token = await refreshMicrosoftToken(token);

	// Refresh Firebase token if needed
	token = await handleFirebaseToken(token, user);

	return token;
}

/**
 * Add role, firebaseToken, profile, and image from JWT to session object
 */
async function handleSession({ session, token }) {
	session.user.role = token.role;
	session.user.firebaseToken = token.firebaseToken;

	// Add profile information if available
	if (token.profile) {
		session.user.profile = token.profile;
	}

	// Add profile picture if available
	if (token.picture) {
		session.user.image = token.picture;
	}

	// Add Microsoft access token if available
	if (token.microsoftAccessToken) {
		session.user.microsoftAccessToken = token.microsoftAccessToken;
	}

	return session;
}

/**
 * Authentication options for Google, Azure login for NextAuth
 */
export const authOptions = {
	providers: [
		Google({
			clientId: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		}),
		AzureAD({
			clientId: process.env.AZURE_AD_CLIENT_ID,
			clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
			tenantId: process.env.AZURE_AD_TENANT_ID,
			authorization: {
				params: {
					scope:
						"openid profile email offline_access User.Read Calendars.ReadWrite Mail.Send",
				},
			},
		}),
	],
	secret: process.env.NEXTAUTH_SECRET,
	pages: {
		signIn: "/login",
		error: "/login",
	},
	callbacks: {
		signIn: handleSignIn,
		jwt: handleJwt,
		session: handleSession,
	},
};
