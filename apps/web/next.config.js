const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['@prisma/client'],
    },

    // Production-safe configuration - removed error ignoring
    // typescript and eslint errors will now be caught during build

    // Production security headers
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    // Content Security Policy for additional security
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self' data:",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: *.sentry.io *.clerk.accounts.dev *.clerk.dev *.clerk.com",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: blob: *.sentry.io *.clerk.com *.clerk.dev img.clerk.com",
                            "font-src 'self' data:",
                            "connect-src 'self' *.sentry.io *.supabase.co wss://*.supabase.co *.clerk.accounts.dev *.clerk.dev *.clerk.com clerk-telemetry.com",
                            "worker-src 'self' blob:",
                            "object-src 'self' data:",
                            "frame-ancestors 'none'",
                        ].join('; '),
                    },
                ],
            },
        ];
    },

    // Environment validation (excluding NODE_ENV as it's managed by Next.js)
    env: {
        VERCEL_ENV: process.env.VERCEL_ENV || 'development',
        BUILD_TIME: new Date().toISOString(),
    },

    // Bundle analysis in CI/production builds
    ...(process.env.ANALYZE === 'true' && {
        webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
            if (!dev && !isServer) {
                const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
                config.plugins.push(
                    new BundleAnalyzerPlugin({
                        analyzerMode: 'static',
                        reportFilename: './analyze/client.html',
                        generateStatsFile: true,
                        openAnalyzer: false,
                    })
                );
            }
            return config;
        },
    }),
};

// Enhanced Sentry configuration for production monitoring
const sentryWebpackPluginOptions = {
    // Additional config options for the Sentry Webpack plugin
    silent: true, // Suppresses source map uploading logs during build
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT || 'jetvision-agent',

    // Upload source maps in production only
    widenClientFileUpload: true,
    tunnelRoute: '/api/sentry-tunnel',
    hideSourceMaps: true,
    disableLogger: process.env.NODE_ENV === 'production',
};

// Wrap with Sentry config only if DSN is provided
module.exports =
    process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
        ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
        : nextConfig;
