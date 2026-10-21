import { getRequiredAdminSession } from '@/lib/security/serverAuth';
import { checkCacheHealth } from '@/lib/cache/sharedCache';

// Admin check that the shared Redis cache is configured and reachable.
export async function GET() {
    const { error } = await getRequiredAdminSession();
    if (error) return error;
    return Response.json(await checkCacheHealth(), { headers: { 'Cache-Control': 'no-store' } });
}
