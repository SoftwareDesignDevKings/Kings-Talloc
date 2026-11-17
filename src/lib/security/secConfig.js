import { Ratelimit } from '@upstash/ratelimit';                                                                         
import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

/**
 * Rate-limiters (sliding window via Vercel KV)
 *
 * Signed-in requests are counted per account. The whole school reaches the app from
 * a handful of shared addresses, so a per-address limit made a class opening the app
 * together use up one allowance. One page load is several requests (the page, its
 * route prefetches and API calls), so the allowance covers a few loads in a row.
 */
export const accountRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "10 s"),
    prefix: "talloc:ratelimit:account",
    // Analytics only feeds the Upstash dashboard and costs extra commands per request.
    analytics: false,
});

/**
 * Requests without a valid session are only ever redirected to sign-in. They are
 * counted per address, with room for a school network sharing one.
 */
export const ipRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "10 s"),
    prefix: "talloc:ratelimit:ip",
    analytics: false,
});

/**
 * App Content Security Policy (CSP)
 */
export const contentSecurityPolicyConfig = {
    "default-src": ["'self'"],

    "script-src": [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://apis.google.com"
    ],

    "style-src": [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://fonts.googleapis.com"
    ],

    "font-src": [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net"
    ],

    "img-src": [
        "'self'",
        "data:",
        "blob:",
        "https://lh3.googleusercontent.com",
        "https://avatars.githubusercontent.com",
        "https://via.placeholder.com"
    ],

    "connect-src": [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://graph.microsoft.com",
        "https://login.microsoftonline.com",
        "https://firestore.googleapis.com",
        "https://securetoken.googleapis.com",
        "https://identitytoolkit.googleapis.com",
        "https://firebaseinstallations.googleapis.com",
        "https://firebase.googleapis.com",
        "https://firebasestorage.googleapis.com",
        "https://*.firebaseapp.com",
        "https://*.googleapis.com"
    ],

    "frame-src": [
        "https://www.google.com",
        "https://login.microsoftonline.com",
        "https://*.firebaseapp.com"
    ],

    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": []
};

