const nextConfig = {
    poweredByHeader: false,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'via.placeholder.com',
                port: '',
                pathname: '/**',
            },
        ],
    },
    experimental: {
        // Every page is dynamic (the root layout reads the CSP nonce), so by default each tab
        // tap waits on a server round trip. Pages only hold a client shell (data comes from
        // Firestore), so reusing a visited page for a minute is safe and makes tabs instant.
        staleTimes: { dynamic: 60 },
        optimizePackageImports: [
            '@untitledui/icons',
            'react-big-calendar',
            'react-icons',
            'date-fns',
            'luxon',
            'react-datepicker',
            'react-calendar',
        ],
    },
    reactStrictMode: false,
    compiler: {
        // console.info is kept for deliberate operational logs (Firestore read tracking).
        removeConsole:
            process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn', 'info'] } : false,
    },
    async headers() {
        return [
            {
                source: '/(.*)\\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=86400, stale-while-revalidate=604800',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
