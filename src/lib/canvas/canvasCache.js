import 'server-only';
import { bumpCacheGroup, cached } from '@/lib/cache/sharedCache';

// Canvas data only changes through a sync, a whitelist removal or an eligibility
// rebuild. Each of those bumps the group, so entries can safely live for a day.
const CANVAS_CACHE_SECONDS = 86400;
export const canvasCache = (key, load) => cached(key, CANVAS_CACHE_SECONDS, load, { group: 'canvas' });
export const invalidateCanvas = () => bumpCacheGroup('canvas');
