import { getCanvasSyncStatus } from '@/lib/canvas/canvasSync';
import { getRequiredAdminOrTeacherSession } from '@/lib/security/serverAuth';

const serializeDates = (value) => {
    if (value?.toDate) return value.toDate().toISOString();
    if (Array.isArray(value)) return value.map(serializeDates);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, serializeDates(item)]),
        );
    }
    return value;
};

export async function GET() {
    const { error } = await getRequiredAdminOrTeacherSession();
    if (error) return error;

    const status = await getCanvasSyncStatus();
    return Response.json(serializeDates(status));
}
