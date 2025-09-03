import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Lower sample rate for edge runtime to reduce overhead
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Configure environment and release tracking
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'local',

  // Edge-specific error filtering
  beforeSend(event) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEVELOPMENT) {
      return null;
    }

    // Add edge runtime context
    event.tags = {
      ...event.tags,
      runtime: 'edge',
      component: 'middleware',
    };

    return event;
  },
});