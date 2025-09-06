/**
 * Drizzle Configuration
 * Database migration and generation configuration for JetVision Agent
 */

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './lib/database/schema.ts',
    out: './lib/database/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!,
    },
    verbose: true,
    // Enable push warnings for production safety
    strict: true,
    migrations: {
        prefix: 'timestamp',
        table: '__drizzle_migrations__',
        schema: 'public',
    },
    introspect: {
        casing: 'camel',
    },
});
