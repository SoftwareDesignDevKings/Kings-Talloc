import sanitizeHtmlLibrary from 'sanitize-html';

export const sanitiseHtml = (html) =>
    sanitizeHtmlLibrary(html, {
        allowedTags: sanitizeHtmlLibrary.defaults.allowedTags,
        allowedAttributes: sanitizeHtmlLibrary.defaults.allowedAttributes,
});