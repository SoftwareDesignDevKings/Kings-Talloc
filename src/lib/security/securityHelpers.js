import 'server-only';
import DOMPurify from 'isomorphic-dompurify';

export const sanitiseHtml = (html) => DOMPurify.sanitize(html);
