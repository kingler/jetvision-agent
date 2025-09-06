/**
 * Database Migration Script
 * Run this to apply migrations to the database
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Use direct URL for migrations (bypasses pgbouncer)
const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error(
        'Missing database connection URL. Please set either ' +
            'DIRECT_DATABASE_URL or DATABASE_URL environment variable.'
    );
}

// Type assertion after validation
const validatedDatabaseUrl: string = databaseUrl;

async function runMigrations(): Promise<void> {
    console.log('🔄 Starting database migration...');

    let migrationClient: ReturnType<typeof postgres> | null = null;

    try {
        migrationClient = postgres(validatedDatabaseUrl, {
            max: 1,
            connect_timeout: 30,
            idle_timeout: 30,
        });

        const db = drizzle(migrationClient);

        // Validate migrations folder exists
        const migrationsFolder = path.join(process.cwd(), 'lib/database/migrations');
        console.log(`📁 Looking for migrations in: ${migrationsFolder}`);

        await migrate(db, {
            migrationsFolder,
        });

        console.log('✅ Migrations completed successfully!');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ Migration failed:', errorMessage);

        // Provide helpful error context
        if (errorMessage.includes('ENOENT')) {
            console.error('💡 Migrations folder not found. Please ensure migrations exist.');
        } else if (errorMessage.includes('connect')) {
            console.error('💡 Database connection failed. Please check your DATABASE_URL.');
        }

        process.exit(1);
    } finally {
        if (migrationClient) {
            await migrationClient.end();
        }
    }
}

// Run if called directly
if (require.main === module) {
    runMigrations();
}

export default runMigrations;
