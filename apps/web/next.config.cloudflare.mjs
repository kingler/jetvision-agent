// Cloudflare Pages compatible configuration
// This config works with Pages Functions for dynamic features

const nextConfig = {
    // Use standalone output for better compatibility
    output: 'standalone',
    
    // Optimize images for static serving
    images: {
        unoptimized: true,
        remotePatterns: [
            { hostname: 'www.google.com' },
            { hostname: 'img.clerk.com' },
            { hostname: 'zyqdiwxgffuy8ymd.public.blob.vercel-storage.com' },
        ],
    },
    
    transpilePackages: ['next-mdx-remote'],
    
    experimental: {
        externalDir: true,
    },
    
    // Disable features that don't work with Cloudflare Pages
    typescript: {
        ignoreBuildErrors: true, // We'll handle types separately
    },
    
    eslint: {
        ignoreDuringBuilds: true, // Skip linting during build
    },
    
    webpack: (config, options) => {
        if (!options.isServer) {
            // Client-side fallbacks for Node.js modules
            config.resolve.fallback = {
                fs: false,
                module: false,
                path: false,
                crypto: false,
                stream: false,
                buffer: false,
                util: false,
            };
        }
        
        // Enable experimental features
        config.experiments = {
            ...config.experiments,
            topLevelAwait: true,
            layers: true,
        };
        
        return config;
    },
    
    // Handle redirects client-side for static export
    async rewrites() {
        return [
            {
                source: '/',
                destination: '/chat',
            },
        ];
    },
    
    // Environment variables to expose to the client
    env: {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://jetvision-agent.pages.dev',
    },
};

export default nextConfig;