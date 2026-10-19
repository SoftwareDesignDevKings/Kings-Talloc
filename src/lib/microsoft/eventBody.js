import { DomUtils, parseDocument } from 'htmlparser2';
import { sanitiseHtml } from '@/lib/security/sanitiseHtml';

const DESCRIPTION_ID = 'talloc-event-description';
const isTeamsBlock = (node) => /(?:^|\s)(?:x_)?me-email-text(?:\s|$)/i.test(node.attribs?.class || '');
const isTeamsLink = (node) => node.name === 'a'
    && /^https:\/\/teams\.(?:microsoft|live)\.com\//i.test(node.attribs?.href || '');

/**
 * Outlook adds its own Teams meeting blob to the body. Keep that HTML verbatim:
 * stripping it during a PATCH can disable online joining even if the app still
 * has the old join URL. Only sanitise the description supplied by our app.
 * https://learn.microsoft.com/en-us/graph/api/event-update
 */
export const buildTeamsEventBody = (description, existingBody = null) => {
    const descriptionHtml = `<div id="${DESCRIPTION_ID}">${sanitiseHtml(description || '')}</div>`;
    if (existingBody === null) return { contentType: 'HTML', content: descriptionHtml };

    if (existingBody?.contentType?.toLowerCase() !== 'html' || typeof existingBody.content !== 'string') {
        throw new Error('Microsoft did not return the HTML calendar body. The event was left unchanged to preserve its Teams join details.');
    }
    const content = existingBody.content;
    if (!content) return { contentType: 'HTML', content: descriptionHtml };

    const document = parseDocument(content, { withStartIndices: true, withEndIndices: true });
    const descriptionNode = DomUtils.findOne(
        (node) => [DESCRIPTION_ID, `x_${DESCRIPTION_ID}`].includes(node.attribs?.id),
        document.children,
    );

    // Exchange can normalise our HTML. Replace the whole app-owned wrapper,
    // but never remove it if Microsoft has placed Teams details inside it.
    if (descriptionNode && !DomUtils.findOne(
        (node) => isTeamsBlock(node) || isTeamsLink(node), descriptionNode.children,
    )) {
        return {
            contentType: 'HTML',
            content: content.slice(0, descriptionNode.startIndex)
                + descriptionHtml + content.slice(descriptionNode.endIndex + 1),
        };
    }

    const contentRoot = DomUtils.findOne((node) => node.name === 'body', document.children)
        || DomUtils.findOne((node) => node.name === 'html', document.children)
        || document;
    const firstContentNode = contentRoot.children.find((node) => node.name !== 'head' && node.type !== 'directive');
    const contentStart = firstContentNode?.startIndex
        ?? (contentRoot.type === 'root' ? 0 : content.indexOf('>', contentRoot.startIndex) + 1);

    // Legacy events have no app wrapper. The standard Teams block is a sibling
    // after the old description; retain it and everything following it exactly.
    const teamsBlock = contentRoot.children.find(isTeamsBlock);
    if (teamsBlock) {
        return {
            contentType: 'HTML',
            content: content.slice(0, contentStart) + descriptionHtml + content.slice(teamsBlock.startIndex),
        };
    }

    // For an unfamiliar Microsoft layout, retain the original body and prepend
    // managed notes. Keeping legacy notes once is safer than losing meeting data.
    return {
        contentType: 'HTML',
        content: content.slice(0, contentStart) + descriptionHtml + content.slice(contentStart),
    };
};
