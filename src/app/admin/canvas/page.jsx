import CanvasWhitelistManager from '@/components/canvas/CanvasWhitelistManager';

export const metadata = { title: 'Canvas Admin' };

export default function CanvasAdminPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <CanvasWhitelistManager />
        </div>
    );
}
