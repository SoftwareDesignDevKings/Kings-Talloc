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
        ],
    },
    // Improve hot reload performance
    experimental: {
        esmExternals: false,
    },
    webpack: (config, { dev }) => {
        if (dev) {
            config.watchOptions = {
                poll: 1000,
                aggregateTimeout: 300,
            }
        }
        return config
    },
};

export default nextConfig;
