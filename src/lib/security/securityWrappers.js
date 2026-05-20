import sanitizeHtmlLibrary from 'sanitize-html';
import { rateLimitConfig, contentSecurityPolicyConfig} from './secConfig';
import { NextResponse } from 'next/server';


export const implementCspWrapper = async (req) => {
    const nonce = btoa(crypto.randomUUID());

    // forward nonce on the request so server components can read it via headers()
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-nonce', nonce);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", buildCsp(nonce));
    response.headers.set("x-nonce", nonce);

    return response
}

export const implementRateLimiterWrapper = async (req, pathname) => {
    if (isRateLimitExemptPath(pathname)) {
        return null;
    }

    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return null;
    }

    const identifier = getClientIp(req); 
    const { success, limit, reset, remaining } = await rateLimitConfig.limit(identifier);

    if (success) return null;

    if (pathname.startsWith('/api')) {
        return NextResponse.json(
            { error: 'Too Many Requests' },
            { 
                status: 429,
                headers: {
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': remaining.toString(),
                    'X-RateLimit-Reset': reset.toString(),
                }
            }
        );
    }
    return NextResponse.rewrite(new URL('/429', req.url));
};

/**
 * Wrapper for sanitizeHtmlLibrary to implement input sanitisation
 * @param {String} html - string html
 * @returns {String} Sanitized HTML string.
 */
export const sanitiseHtml = (html) =>
    sanitizeHtmlLibrary(html, {
        allowedTags: sanitizeHtmlLibrary.defaults.allowedTags,
        allowedAttributes: sanitizeHtmlLibrary.defaults.allowedAttributes,
});

// HELPER FUNCTIONS
/**
 * Helper to extract the best possible identifier for rate limiting.
 */
const getClientIp = (req) => {
    // check for forwarded headers (standard for production proxies), we take the first IP in the list
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',').at(0).trim();
    }

    if (req.ip) {
        return req.ip;
    }

    // check for real IP header
    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // default for Localhost / Development
    return '127.0.0.1';
}

const isRateLimitExemptPath = (pathname) =>
    pathname === '/api/auth' || pathname.startsWith('/api/auth/');

/**
 * Build CSP string with nonce
 */
const buildCsp = (nonce) => {
    let cspString = "";

    for (const directive in contentSecurityPolicyConfig) {
        // skip upgrade-insecure-requests in dev (breaks localhost in Safari)
        if (directive === "upgrade-insecure-requests" && process.env.NODE_ENV === 'development') {
            continue;
        }

        const values = [...contentSecurityPolicyConfig[directive]];

        // scripts - add a nonce
        if (directive === "script-src") {
            values.push(`'nonce-${nonce}'`);
            // Dev: Next.js HMR needs unsafe-eval
            if (process.env.NODE_ENV === 'development') {
                values.push("'unsafe-eval'");
            }
        }

        // development: add localhost/websocket for Next.js HMR & Firebase emulators
        if (process.env.NODE_ENV === 'development' && directive === "connect-src") {
            values.push(
                "ws://localhost:*",
                "wss://localhost:*",
                "http://localhost:*",
                "http://127.0.0.1:*",
                "ws://127.0.0.1:*"
            );
        }

        cspString += `${directive} ${values.join(" ")}; `;
    }

    return cspString.trim();
};
