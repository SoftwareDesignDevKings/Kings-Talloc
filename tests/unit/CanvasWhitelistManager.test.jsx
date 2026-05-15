import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CanvasWhitelistManager from '@/components/canvas/CanvasWhitelistManager';

jest.mock('@/hooks/useAlert', () => ({
    __esModule: true,
    default: () => ({ addAlert: jest.fn() }),
}));

const jsonResponse = (body) => ({
    ok: true,
    json: async () => body,
});

describe('CanvasWhitelistManager', () => {
    beforeEach(() => {
        global.fetch = jest.fn((url) => {
            if (url === '/api/canvas/whitelist') {
                return Promise.resolve(jsonResponse([]));
            }
            if (url === '/api/canvas/whitelist/available') {
                return Promise.resolve(jsonResponse([
                    {
                        id: 101,
                        name: 'Mathematics Year 10',
                        course_code: 'MATH10',
                        workflow_state: 'available',
                        term_name: '2026 Term 2',
                        term_start_at: '2026-04-20T00:00:00Z',
                        term_end_at: '2026-06-26T23:59:59Z',
                    },
                ]));
            }
            if (url === '/api/canvas/sync/status') {
                return Promise.resolve(jsonResponse({
                    is_running: false,
                    last_status: 'success',
                    last_full_sync_at: null,
                }));
            }
            return Promise.resolve(jsonResponse({}));
        });
    });

    test('renders term details for current-year Canvas courses only', async () => {
        render(<CanvasWhitelistManager />);

        await userEvent.click(screen.getByRole('button', { name: /all canvas courses/i }));

        expect(await screen.findByText('Term')).toBeInTheDocument();
        expect(screen.getByText('Mathematics Year 10')).toBeInTheDocument();
        expect(screen.getByText('2026 Term 2')).toBeInTheDocument();
        expect(screen.getByText((content) =>
            content.includes('2026') && content.includes('-')
        )).toBeInTheDocument();
        expect(screen.queryByText('Ancient History 2025')).not.toBeInTheDocument();
    });

    test('searches available courses by term name', async () => {
        render(<CanvasWhitelistManager />);

        await userEvent.click(screen.getByRole('button', { name: /all canvas courses/i }));
        await screen.findByText('Mathematics Year 10');
        await userEvent.type(screen.getByPlaceholderText(/search by name, code, or term/i), 'term 2');

        await waitFor(() => {
            const table = screen.getByRole('table');
            expect(within(table).getByText('Mathematics Year 10')).toBeInTheDocument();
        });
    });
});
