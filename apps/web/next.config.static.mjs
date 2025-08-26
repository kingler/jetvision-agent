const nextConfig = {
    output: 'export',
    distDir: 'out',
    images: {
        unoptimized: true,
    },
    transpilePackages: ['next-mdx-remote'],
    experimental: {
        externalDir: true,
    },
    webpack: (config, options) => {
        if (!options.isServer) {
            config.resolve.fallback = { fs: false, module: false, path: false };
        }
        config.experiments = {
            ...config.experiments,
            topLevelAwait: true,
            layers: true,
        };
        return config;
    },
    // Skip problematic pages during static export
    exportPathMap: async function (defaultPathMap) {
        // Remove pages that require auth during build
        const paths = {
            '/': { page: '/' },
            '/chat': { page: '/chat' },
            '/jetvision': { page: '/jetvision' },
        };
        return paths;
    },
    async redirects() {
        return [{ source: '/', destination: '/chat', permanent: true }];
    },
};

export default nextConfig;