import { Ratelimit } from '@upstash/ratelimit';                                                                         
import { Redis } from '@upstash/redis';

/**
 * Rate-limiter
 * @description implement a Sliding Window strategy (10 req / 10s) via Vercel KV
 */
export const rateLimitConfig = new Ratelimit({
    redis: new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
    }),

    limiter: Ratelimit.slidingWindow(10, "10 s"),
    analytics: true,
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

