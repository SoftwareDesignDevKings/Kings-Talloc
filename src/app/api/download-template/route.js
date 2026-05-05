import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/security/authConfig';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(req) {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.defaultRole || session?.user?.role;
    const userRoles = session?.user?.userRoles || [];
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');

    if (!session || !isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorised' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const fileName = 'timesheetTemplate.docx';
        const downloadName = 'Timesheet_Template.docx';

        const filePath = path.join(process.cwd(), 'docs', fileName);
        const fileBuffer = await readFile(filePath);

        return new Response(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${downloadName}"`,
            },
        });
    } catch (error) {
        console.error('Error downloading template:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
