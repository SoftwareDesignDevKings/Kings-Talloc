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
        optimizePackageImports: [
            'react-big-calendar',
            'react-select',
            'react-icons',
            'date-fns',
            'luxon',
            'react-datepicker',
            'react-calendar',
        ],
    },
    reactStrictMode: false,
    compiler: {
        removeConsole:
            process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
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
