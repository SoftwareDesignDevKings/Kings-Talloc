/**
 * Simple HTML Sanitizer for Server-Side use.
 * Strips dangerous tags (script, iframe, object, etc.) and event handlers.
 * This is used because external sanitization libraries cannot be installed in the current environment.
 *
 * @param {string} html - The unsanitized HTML string
 * @returns {string} - The sanitized HTML string
 */
export const sanitizeHtml = (html) => {
    if (!html || typeof html !== 'string') return '';

    let sanitized = html;
    let previous;

    // Repeatedly apply sanitization to handle nested payloads until no more changes occur
    do {
        previous = sanitized;
        sanitized = sanitized
            // 1. Remove comments
            .replace(/<!--[\s\S]*?-->/g, '')

            // 2. Remove dangerous tags and their content
            .replace(/<(script|iframe|object|embed|applet|meta|link|base|style|form|frameset|frame|noscript)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')

            // 3. Remove self-closing dangerous tags
            .replace(/<(script|iframe|object|embed|applet|meta|link|base|style|form|frameset|frame|noscript)\b[^>]*>/gi, '')

            // 4. Remove event handlers (e.g., onclick, onerror)
            // Handles both <tag onclick=...> and <tag/onclick=...>
            .replace(/([\s\/\\])on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '$1')

            // 5. Remove dangerous URI schemes in attributes
            .replace(/(href|src|action|formaction|background|content|url)\s*=\s*("[^"]*(javascript|data):[^"]*"|'[^']*(javascript|data):[^']*'|(javascript|data):[^\s>]+)/gi, '$1="#"')

            // 6. Remove CSS expressions (old IE)
            .replace(/expression\s*\((?:(?!\)).)*\)/gi, '')

            // 7. Remove style attribute (can be used for XSS via background-image, etc.)
            .replace(/([\s\/\\])style\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '$1')

            // 8. Clean up extra spaces left by sanitization within tags
            .replace(/<([^>]+?)\s+\s*(?=>)/g, '<$1')
            .replace(/<([^>]+?)\s+(?=\/>)/g, '<$1');

    } while (sanitized !== previous);

    return sanitized;
};
