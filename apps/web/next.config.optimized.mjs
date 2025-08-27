import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
    transpilePackages: ['next-mdx-remote'],
    
    // Performance optimizations
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,
    swcMinify: true,
    
    images: {
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 60,
        remotePatterns: [
            { hostname: 'www.google.com' },
            { hostname: 'img.clerk.com' },
            { hostname: 'zyqdiwxgffuy8ymd.public.blob.vercel-storage.com' },
        ],
    },
    
    // Modularize imports for tree shaking
    modularizeImports: {
        '@tabler/icons-react': {
            transform: '@tabler/icons-react/dist/esm/icons/{{member}}',
        },
        'lucide-react': {
            transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
        },
        'react-icons': {
            transform: 'react-icons/{{dirname}}/index.js',
        },
        '@phosphor-icons/react': {
            transform: '@phosphor-icons/react/dist/ssr/{{member}}',
        },
    },

    experimental: {
        externalDir: true,
        // Enable React compiler for better optimization
        forceSwcTransforms: true,
        // Optimize CSS
        optimizeCss: true,
        // Partial Prerendering (experimental)
        ppr: true,
        // Server Components optimizations
        serverComponentsExternalPackages: [
            'langchain',
            '@langchain/core',
            '@langchain/openai',
            '@langchain/anthropic',
            '@langchain/google-genai',
            '@langchain/groq',
            '@langchain/community',
            '@langchain/ollama',
            'pdf-parse',
            'pdfjs-dist',
            '@electric-sql/pglite',
        ],
    },
    
    webpack: (config, options) => {
        if (!options.isServer) {
            // Client-side optimizations
            config.resolve.fallback = { 
                fs: false, 
                module: false, 
                path: false,
                crypto: false,
                stream: false,
                buffer: false,
            };
            
            // Split chunks optimization
            config.optimization = {
                ...config.optimization,
                splitChunks: {
                    chunks: 'all',
                    cacheGroups: {
                        default: false,
                        vendors: false,
                        // Framework chunk
                        framework: {
                            name: 'framework',
                            chunks: 'all',
                            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
                            priority: 40,
                            enforce: true,
                        },
                        // Libraries chunk
                        lib: {
                            test(module) {
                                return module.size() > 160000 &&
                                    /node_modules[\\/]/.test(module.identifier());
                            },
                            name(module) {
                                const hash = require('crypto').createHash('sha1');
                                hash.update(module.identifier());
                                return 'lib-' + hash.digest('hex').substring(0, 8);
                            },
                            priority: 30,
                            minChunks: 1,
                            reuseExistingChunk: true,
                        },
                        // Commons chunk
                        commons: {
                            name: 'commons',
                            chunks: 'all',
                            minChunks: 2,
                            priority: 20,
                        },
                        // Shared modules
                        shared: {
                            name(module, chunks) {
                                const hash = require('crypto')
                                    .createHash('sha1')
                                    .update(chunks.reduce((acc, chunk) => acc + chunk.name, ''))
                                    .digest('hex');
                                return 'shared-' + hash.substring(0, 8);
                            },
                            priority: 10,
                            minChunks: 2,
                            reuseExistingChunk: true,
                        },
                    },
                    maxAsyncRequests: 30,
                    maxInitialRequests: 25,
                },
                runtimeChunk: {
                    name: 'runtime',
                },
            };
        }
        
        // Experimental features
        config.experiments = {
            ...config.experiments,
            topLevelAwait: true,
            layers: true,
        };

        // Add bundle analyzer
        if (process.env.ANALYZE === 'true') {
            const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
            config.plugins.push(
                new BundleAnalyzerPlugin({
                    analyzerMode: 'static',
                    reportFilename: './analyze.html',
                    openAnalyzer: true,
                })
            );
        }

        return config;
    },
    
    async redirects() {
        return [{ source: '/', destination: '/chat', permanent: true }];
    },
    
    // Headers for better caching
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin',
                    },
                ],
            },
            {
                source: '/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
};

// Conditionally apply Sentry (disable in dev for better performance)
const finalConfig = process.env.NODE_ENV === 'production' 
    ? withSentryConfig(nextConfig, {
        org: 'saascollect',
        project: 'javascript-nextjs',
        silent: !process.env.CI,
        widenClientFileUpload: true,
        hideSourceMaps: true,
        disableLogger: true,
        automaticVercelMonitors: true,
        tunnelRoute: '/monitoring',
        hideSourcemaps: true,
    })
    : nextConfig;

export default finalConfig;