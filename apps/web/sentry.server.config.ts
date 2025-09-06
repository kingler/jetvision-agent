import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // Adjust this value in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Configure environment and release tracking
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'local',

    // Enhanced error filtering for production
    beforeSend(event) {
        // Don't send events in development unless explicitly enabled
        if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEVELOPMENT) {
            return null;
        }

        // Add business context tags
        event.tags = {
            ...event.tags,
            component: 'server',
            business_critical: true,
        };

        // Filter sensitive data
        if (event.request?.data) {
            // Remove potential API keys, tokens, etc.
            delete event.request.data.api_key;
            delete event.request.data.token;
            delete event.request.data.password;
        }

        return event;
    },

    // Server-specific integrations
    integrations: [
        // Add custom integrations for monitoring N8N webhooks, database connections, etc.
    ],

    // Add additional context for business metrics
    initialScope: {
        tags: {
            platform: 'jetvision-agent',
            tier: 'production',
        },
        contexts: {
            business: {
                industry: 'private-aviation',
                client_tier: 'fortune-500',
            },
        },
    },
});
