import { CanvasApiError } from '@/lib/canvas/canvasClient';
import { CanvasSyncAlreadyRunningError, runFullCanvasSync } from '@/lib/canvas/canvasSync';
import { getRequiredAdminSession } from '@/lib/security/serverAuth';

export async function POST() {
    const { error } = await getRequiredAdminSession();
    if (error) return error;

    try {
        const result = await runFullCanvasSync();
        return Response.json({
            status: 'completed',
            message: 'Canvas sync completed',
            ...result,
        });
    } catch (err) {
        if (err instanceof CanvasSyncAlreadyRunningError || err.code === 'already_running') {
            return Response.json({
                status: 'already_running',
                message: 'A sync is already in progress',
            });
        }
        if (err instanceof CanvasApiError) {
            return Response.json({ status: 'failed', message: err.message }, { status: err.status || 500 });
        }
        return Response.json({ status: 'failed', message: err.message }, { status: 500 });
    }
}
