/**
 * App's CSP
 */
const contentSecurityPolicy = {
    "default-src": ["'self'"],

    "script-src": [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://www.google.com",
        "https://www.gstatic.com"
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
        "https://login.microsoftonline.com"
    ],

    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": []
};


/**
 * Build CSP string with nonce
 */
export const buildCsp = (nonce) => {
    const isDev = process.env.NODE_ENV === 'development';
    let cspString = "";

    for (const directive in contentSecurityPolicy) {
        // skip upgrade-insecure-requests in dev (breaks localhost in Safari)
        if (directive === "upgrade-insecure-requests" && isDev) {
            continue;
        }

        const values = [...contentSecurityPolicy[directive]];

        // scripts - add a nonce
        if (directive === "script-src") {
            values.push(`'nonce-${nonce}'`);
            // Dev: Next.js HMR needs unsafe-eval
            if (isDev) {
                values.push("'unsafe-eval'");
            }
        }

        // development: add localhost/websocket for Next.js HMR & Firebase emulators
        if (isDev && directive === "connect-src") {
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

export default buildCsp;