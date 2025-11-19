// Global test setup
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

// Check if we're in a browser-like environment (jsdom)
const isBrowserEnv = typeof window !== 'undefined';

// Only setup browser-specific mocks and imports in jsdom environment
if (isBrowserEnv) {
    require('@testing-library/jest-dom');

    // Mock Next.js Image component
    jest.mock('next/image', () => ({
        __esModule: true,
        default: (props) => {
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            return <img {...props} />;
        },
    }));

    // Mock Next.js router
    jest.mock('next/router', () => ({
        useRouter() {
            return {
                route: '/',
                pathname: '/',
                query: {},
                asPath: '/',
                push: jest.fn(),
                pop: jest.fn(),
                reload: jest.fn(),
                back: jest.fn(),
                prefetch: jest.fn().mockResolvedValue(undefined),
                beforePopState: jest.fn(),
                events: {
                    on: jest.fn(),
                    off: jest.fn(),
                    emit: jest.fn(),
                },
                isFallback: false,
            };
        },
    }));

    // Mock NextAuth
    jest.mock('next-auth/react', () => ({
        useSession: jest.fn(() => ({
            data: null,
            status: 'unauthenticated',
        })),
        signIn: jest.fn(),
        signOut: jest.fn(),
        SessionProvider: ({ children }) => children,
    }));

    // Mock Firebase
    jest.mock('./src/firestore/clientFirestore', () => ({
        db: {},
    }));

    jest.mock('firebase/firestore', () => ({
        collection: jest.fn(),
        doc: jest.fn(),
        getDocs: jest.fn(),
        getDoc: jest.fn(),
        addDoc: jest.fn(),
        updateDoc: jest.fn(),
        deleteDoc: jest.fn(),
        onSnapshot: jest.fn(),
        setDoc: jest.fn(),
        deleteDoc: jest.fn(),
    }));

    global.matchMedia =
        global.matchMedia ||
        function (query) {
            return {
                matches: false,
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            };
        };
}
