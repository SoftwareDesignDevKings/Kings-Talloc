import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/firestore/firestoreClient';
import { fbAuthLoginSync } from '@/lib/security/clientAuth';

jest.mock('firebase/auth', () => ({
    signInWithCustomToken: jest.fn(),
    signOut: jest.fn(),
}));

jest.mock('@/firestore/firestoreClient', () => ({
    auth: {
        currentUser: {
            getIdToken: jest.fn(),
        },
    },
}));

describe('clientAuth', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('signs in with the fresh custom token even when a Firebase user already exists', async () => {
        await fbAuthLoginSync('fresh-token');

        expect(signInWithCustomToken).toHaveBeenCalledWith(auth, 'fresh-token');
        expect(auth.currentUser.getIdToken).not.toHaveBeenCalled();
    });

    test('does not sign in when no token is provided', async () => {
        await fbAuthLoginSync('');

        expect(signInWithCustomToken).not.toHaveBeenCalled();
    });
});
