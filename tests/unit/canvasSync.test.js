jest.mock('server-only', () => ({}), { virtual: true });

let syncStateData;
let transaction;
const syncStateRef = { set: jest.fn(() => Promise.resolve()) };
const logRef = { set: jest.fn(() => Promise.resolve()) };

const getCollection = (name) => {
    if (name === 'canvasSyncState') {
        return { doc: jest.fn(() => syncStateRef) };
    }
    if (name === 'canvasSyncLog') {
        return {
            doc: jest.fn(() => logRef),
            orderBy: jest.fn(() => ({
                limit: jest.fn(() => ({
                    get: jest.fn(() => Promise.resolve({ docs: [] })),
                })),
            })),
        };
    }
    return {
        get: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
        doc: jest.fn(() => ({ set: jest.fn(() => Promise.resolve()) })),
        where: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ docs: [] })),
        })),
    };
};

const adminDb = {
    collection: jest.fn(getCollection),
    runTransaction: jest.fn((callback) => callback(transaction)),
    batch: jest.fn(() => ({
        set: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn(() => Promise.resolve()),
    })),
};

jest.mock('@/firestore/firestoreAdmin', () => ({ adminDb }));
jest.mock('@/lib/canvas/canvasClient', () => ({
    createCanvasClient: jest.fn(() => ({
        listCourses: jest.fn(() => Promise.resolve([])),
    })),
}));

const {
    CanvasSyncAlreadyRunningError,
    isSyncLockStale,
    runFullCanvasSync,
} = require('@/lib/canvas/canvasSync');

describe('canvasSync locking', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        syncStateRef.set.mockResolvedValue(undefined);
        logRef.set.mockResolvedValue(undefined);
        syncStateData = null;
        transaction = {
            get: jest.fn(() => Promise.resolve({
                exists: Boolean(syncStateData),
                data: () => syncStateData,
            })),
            set: jest.fn(),
        };
    });

    test('detects active and stale locks', () => {
        const currentTime = new Date('2026-05-19T12:00:00Z');

        expect(isSyncLockStale({
            isRunning: true,
            updatedAt: new Date('2026-05-19T11:45:00Z'),
        }, currentTime)).toBe(false);

        expect(isSyncLockStale({
            isRunning: true,
            updatedAt: new Date('2026-05-19T11:00:00Z'),
        }, currentTime)).toBe(true);
    });

    test('rejects an active sync lock', async () => {
        syncStateData = {
            isRunning: true,
            updatedAt: new Date(),
        };

        await expect(runFullCanvasSync({
            client: { listCourses: jest.fn() },
        })).rejects.toBeInstanceOf(CanvasSyncAlreadyRunningError);

        expect(transaction.set).not.toHaveBeenCalled();
        expect(syncStateRef.set).not.toHaveBeenCalled();
    });

    test('replaces a stale sync lock and finishes successfully', async () => {
        syncStateData = {
            isRunning: true,
            updatedAt: new Date(Date.now() - (31 * 60 * 1000)),
        };

        await expect(runFullCanvasSync({
            client: {
                listCourses: jest.fn(() => Promise.resolve([])),
                listBlueprintSubscriptions: jest.fn(),
                listStudentEnrollments: jest.fn(),
            },
        })).resolves.toEqual({
            status: 'success',
            recordsSynced: 0,
            archiveCounts: { classesArchived: 0, subjectsArchived: 0 },
            eligibilityCounts: { studentCount: 0, writeCount: 0 },
        });

        expect(transaction.set).toHaveBeenCalledWith(
            syncStateRef,
            expect.objectContaining({
                isRunning: true,
                lockAcquiredAt: expect.any(Date),
            }),
            { merge: true },
        );
        expect(syncStateRef.set).toHaveBeenCalledWith(
            expect.objectContaining({
                isRunning: false,
                lockAcquiredAt: null,
                lastStatus: 'success',
            }),
            { merge: true },
        );
    });
});
