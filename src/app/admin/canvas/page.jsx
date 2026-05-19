import CanvasWhitelistManager from '@/components/canvas/CanvasWhitelistManager';
import { getRequiredAdminSession } from '@/lib/security/serverAuth';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Canvas Admin' };

export default async function CanvasAdminPage() {
    const { error } = await getRequiredAdminSession();
    if (error) redirect('/dashboard');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <CanvasWhitelistManager />
        </div>
    );
}
