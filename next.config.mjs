const nextConfig = {
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
    // Improve hot reload performance
    experimental: {
        optimizePackageImports: [
            'react-big-calendar',
            'react-select',
        ],
    },
    // Speed up Fast Refresh
    reactStrictMode: false,
    compiler: {
        removeConsole:
            process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
    },
    // Empty turbopack config to silence the warning (Turbopack is the default in Next.js 16)
    turbopack: {},
};

export default nextConfig;
