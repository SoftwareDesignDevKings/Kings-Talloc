import 'server-only';
import { bumpCacheGroup, cached } from '@/lib/cache/sharedCache';

// Every schedule or tutor change bumps the group, so a saved booking is never
// shown as free. TTLs only bound changes made outside the app (e.g. the console).
export const availabilityCache = (key, ttlSeconds, load) => cached(key, ttlSeconds, load, { group: 'availability' });
export const invalidateAvailability = () => bumpCacheGroup('availability');
