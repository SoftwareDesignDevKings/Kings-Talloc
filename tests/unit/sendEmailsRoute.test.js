jest.mock('@/firestore/firestoreAdmin', () => ({
    adminDb: {
        collection: jest.fn(),
        batch: jest.fn(),
    },
}));

jest.mock('next-auth/next', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/lib/security/authConfig', () => ({
    authOptions: {},
}));

jest.mock('@/lib/microsoft/tokenUtils', () => ({
    getMicrosoftAccessToken: jest.fn(),
}));

jest.mock('@/app/api/microsoft/msGraphFunctions', () => ({
    msSendEmail: jest.fn(),
}));

jest.mock('@/lib/security/securityWrappers', () => ({
    sanitiseHtml: (value) => String(value || ''),
}));

if (!global.Response.json) {
    global.Response.json = (body, init = {}) => new global.Response(JSON.stringify(body), init);
}

const { adminDb } = require('@/firestore/firestoreAdmin');
const { getServerSession } = require('next-auth/next');
const { getMicrosoftAccessToken } = require('@/lib/microsoft/tokenUtils');
const { msSendEmail } = require('@/app/api/microsoft/msGraphFunctions');
const {
    POST,
    buildTutorEmailEntries,
    sendEmailWithRetry,
} = require('@/app/api/send-emails/route');

const notificationDoc = (id, data) => ({
    id,
    data: () => data,
});

const graphError = (message, overrides = {}) => Object.assign(new Error(message), overrides);

const mockEmailNotificationSnapshot = (docs) => {
    const get = jest.fn().mockResolvedValue({ empty: docs.length === 0, docs });
    const where = jest.fn().mockReturnValue({ get });
    const doc = jest.fn((id) => ({ id }));
    adminDb.collection.mockReturnValue({ where, doc });

    return { where, get, doc };
};

const mockBatch = () => {
    const batch = {
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
    };
    adminDb.batch.mockReturnValue(batch);
    return batch;
};

describe('send email route helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('retries transient Graph mailbox concurrency failures', async () => {
        const transientError = graphError('Application is over its MailboxConcurrency limit.', {
            status: 429,
            code: 'ApplicationThrottled',
        });
        const sendEmail = jest.fn()
            .mockRejectedValueOnce(transientError)
            .mockResolvedValueOnce(true);
        const sleep = jest.fn().mockResolvedValue(undefined);

        await expect(sendEmailWithRetry(
            'token',
            { targetEmail: 'tutor@kings.edu.au' },
            { sendEmail, sleep },
        )).resolves.toBe(true);

        expect(sendEmail).toHaveBeenCalledTimes(2);
        expect(sleep).toHaveBeenCalledWith(0);
    });

    it('normalises recipient shapes and skips invalid addresses', () => {
        const notifications = [
            {
                id: 'shift-1',
                staff: [
                    { value: ' Tutor@Kings.edu.au ' },
                    { email: 'coach@kings.edu.au' },
                    'tutor@kings.edu.au',
                    'not-an-email',
                    { label: 'Missing Email' },
                ],
            },
        ];

        const { tutorEntries, invalidRecipients } = buildTutorEmailEntries(notifications);

        expect(tutorEntries).toEqual([
            ['tutor@kings.edu.au', [notifications[0]]],
            ['coach@kings.edu.au', [notifications[0]]],
        ]);
        expect(invalidRecipients).toHaveLength(2);
    });
});

describe('POST /api/send-emails', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
        getServerSession.mockResolvedValue({
            user: {
                email: 'admin@kings.edu.au',
                defaultRole: 'admin',
                userRoles: [],
            },
        });
        getMicrosoftAccessToken.mockResolvedValue('ms-token');
        mockBatch();
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    it('sends sequential test emails and leaves notification docs queued', async () => {
        const docs = [
            notificationDoc('shift-1', {
                title: 'Shared shift',
                action: 'allocated',
                start: new Date('2026-05-25T01:00:00Z'),
                end: new Date('2026-05-25T02:00:00Z'),
                staff: [
                    { value: 'success@kings.edu.au' },
                    { value: 'failure@kings.edu.au' },
                ],
                createdByEmail: 'admin@kings.edu.au',
            }),
            notificationDoc('shift-2', {
                title: 'Success shift',
                action: 'allocated',
                start: new Date('2026-05-25T03:00:00Z'),
                end: new Date('2026-05-25T04:00:00Z'),
                staff: [{ value: 'success@kings.edu.au' }],
                createdByEmail: 'admin@kings.edu.au',
            }),
        ];
        mockEmailNotificationSnapshot(docs);
        const batch = mockBatch();
        msSendEmail.mockImplementation((token, { subject }) => {
            if (subject.includes('failure@kings.edu.au')) {
                return Promise.reject(graphError('No mailbox', {
                    status: 400,
                    code: 'ErrorInvalidRecipients',
                }));
            }
            return Promise.resolve(true);
        });

        const response = await POST({});
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.message).toContain('1 of 2 test emails sent to lhamillmamo@kings.edu.au');
        expect(body.message).toContain('Notifications were left queued');
        expect(body.failures).toEqual([
            expect.objectContaining({
                recipient: 'f******@kings.edu.au',
                code: 'ErrorInvalidRecipients',
            }),
        ]);
        expect(msSendEmail.mock.calls.map(([, emailData]) => emailData.targetEmail)).toEqual([
            'lhamillmamo@kings.edu.au',
            'lhamillmamo@kings.edu.au',
        ]);
        expect(msSendEmail.mock.calls.map(([, emailData]) => emailData.subject)).toEqual([
            'Talloc Shift Notification (TEST for success@kings.edu.au)',
            'Talloc Shift Notification (TEST for failure@kings.edu.au)',
        ]);
        expect(batch.delete).not.toHaveBeenCalled();
        expect(batch.commit).not.toHaveBeenCalled();
    });

    it('reports invalid recipients without calling Microsoft Graph', async () => {
        const docs = [
            notificationDoc('shift-1', {
                title: 'Invalid recipient shift',
                action: 'allocated',
                start: new Date('2026-05-25T01:00:00Z'),
                end: new Date('2026-05-25T02:00:00Z'),
                staff: [{ value: 'not-an-email' }],
                createdByEmail: 'admin@kings.edu.au',
            }),
        ];
        mockEmailNotificationSnapshot(docs);
        const batch = mockBatch();

        const response = await POST({});
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.message).toContain('0 of 1 test emails sent to lhamillmamo@kings.edu.au');
        expect(body.failures).toEqual([
            expect.objectContaining({
                code: 'INVALID_RECIPIENT',
                reason: 'Invalid or missing tutor email address',
            }),
        ]);
        expect(msSendEmail).not.toHaveBeenCalled();
        expect(batch.delete).not.toHaveBeenCalled();
        expect(batch.commit).not.toHaveBeenCalled();
    });
});
