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
        optimizePackageImports: ['react-bootstrap', 'react-big-calendar', 'firebase/firestore', 'firebase/auth', 'react-select'],
    },
    // Speed up Fast Refresh
    reactStrictMode: false,
    swcMinify: true,
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
    },
    modularizeImports: {
        'react-bootstrap': {
            transform: 'react-bootstrap/{{member}}',
        },
    },
    webpack: (config, { dev, isServer, webpack }) => {
        if (dev) {
            config.watchOptions = {
                poll: 1000,
                aggregateTimeout: 300,
            }
        }

        // Optimize moment.js - exclude all locales except en (reduces bundle by ~400KB)
        config.plugins.push(
            new webpack.IgnorePlugin({
                resourceRegExp: /^\.\/locale$/,
                contextRegExp: /moment$/,
            })
        );

        return config
    },
};

export default nextConfig;
