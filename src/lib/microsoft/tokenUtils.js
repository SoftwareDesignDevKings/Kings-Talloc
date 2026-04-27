import { getToken } from 'next-auth/jwt';

const TOKEN_BUFFER_MS = 60 * 1000;

/**
 * Decode JWT from request and resolve a valid MS access token.
 * Use this in route handlers that don't already have the decoded token.
 */
export async function getMicrosoftAccessToken(req) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    return resolveMsAccessToken(token);
}

/**
 * Resolve a valid MS access token from an already-decoded NextAuth JWT.
 * Use this when the token is already available to avoid decoding twice.
 */
export async function resolveMsAccessToken(token) {
    if (!token?.msRefreshToken) return null;

    const expiry = token.msAccessTokenExpiry ?? 0;
    if (token.msAccessToken && Date.now() < expiry - TOKEN_BUFFER_MS) {
        return token.msAccessToken;
    }

    return refreshMicrosoftToken(token.msRefreshToken);
}

async function refreshMicrosoftToken(msRefreshToken) {
    const response = await fetch(
        `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.AZURE_AD_CLIENT_ID,
                client_secret: process.env.AZURE_AD_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: msRefreshToken,
                scope: 'openid profile email offline_access User.Read Calendars.ReadWrite Mail.Send',
            }),
        }
    );

    if (!response.ok) {
        console.error('[MS] Token refresh failed:', await response.text());
        return null;
    }

    const tokenData = await response.json();
    return tokenData.access_token;
}
