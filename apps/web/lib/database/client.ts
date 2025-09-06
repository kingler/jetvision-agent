/**
 * Supabase Client Configuration
 * Provides both browser and server clients for database operations
 */

import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Load environment variables in development/test
if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
    require('dotenv').config({ path: '.env.local' });
}

// Environment variables with validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Use direct URL for Drizzle to bypass pgbouncer
const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing required Supabase environment variables: ' +
            `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl ? '✓' : '✗'}, ` +
            `NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey ? '✓' : '✗'}`
    );
}

// Type assertions after validation
const validatedSupabaseUrl: string = supabaseUrl;
const validatedSupabaseAnonKey: string = supabaseAnonKey;

// ========================
// Browser Client (for client-side operations)
// ========================
export function createSupabaseBrowserClient() {
    return createBrowserClient(validatedSupabaseUrl, validatedSupabaseAnonKey);
}

// ========================
// Service Client (for server-side operations with elevated privileges)
// ========================
export function createSupabaseServiceClient() {
    if (!supabaseServiceKey) {
        throw new Error(
            'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
                'This is required for server-side operations with elevated privileges.'
        );
    }

    // Type assertion after validation
    const validatedServiceKey: string = supabaseServiceKey;

    return createClient(validatedSupabaseUrl, validatedServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

// ========================
// Anon Client (for server-side operations with user context)
// ========================
export function createSupabaseAnonClient() {
    return createClient(validatedSupabaseUrl, validatedSupabaseAnonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

// ========================
// Drizzle ORM Client
// ========================
let drizzleClient: ReturnType<typeof drizzle> | null = null;

export function getDrizzleClient() {
    if (!drizzleClient) {
        if (!databaseUrl) {
            throw new Error(
                'Missing database connection URL. Please set either ' +
                    'DIRECT_DATABASE_URL or DATABASE_URL environment variable.'
            );
        }

        // Type assertion after validation
        const validatedDatabaseUrl: string = databaseUrl;

        try {
            const client = postgres(validatedDatabaseUrl, {
                max: 10, // Maximum number of connections
                idle_timeout: 20,
                connect_timeout: 10,
            });

            drizzleClient = drizzle(client, { schema });
        } catch (error) {
            throw new Error(
                `Failed to initialize Drizzle client: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    return drizzleClient;
}

// ========================
// Helper Types
// ========================
export type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;
export type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;
export type SupabaseAnonClient = ReturnType<typeof createSupabaseAnonClient>;
export type DrizzleClient = ReturnType<typeof getDrizzleClient>;

// ========================
// Singleton instances for server-side usage
// ========================
let serviceClient: SupabaseServiceClient | null = null;
let anonClient: SupabaseAnonClient | null = null;

export function getSupabaseServiceClient(): SupabaseServiceClient {
    if (!serviceClient) {
        serviceClient = createSupabaseServiceClient();
    }
    return serviceClient;
}

export function getSupabaseAnonClient(): SupabaseAnonClient {
    if (!anonClient) {
        anonClient = createSupabaseAnonClient();
    }
    return anonClient;
}

// ========================
// Database Health Check
// ========================
export async function checkDatabaseConnection(): Promise<{
    isHealthy: boolean;
    error?: string;
    timestamp: string;
}> {
    const timestamp = new Date().toISOString();

    try {
        const client = getSupabaseAnonClient();
        const { error } = await client.from('users').select('id').limit(1);

        if (error) {
            return {
                isHealthy: false,
                error: `Supabase query failed: ${error.message}`,
                timestamp,
            };
        }

        return {
            isHealthy: true,
            timestamp,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Database connection check failed:', errorMessage);

        return {
            isHealthy: false,
            error: `Connection check failed: ${errorMessage}`,
            timestamp,
        };
    }
}

// ========================
// Environment Validation Utility
// ========================
export function validateEnvironment(): {
    isValid: boolean;
    missingVars: string[];
    warnings: string[];
} {
    const missingVars: string[] = [];
    const warnings: string[] = [];

    // Required variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    // Optional but recommended variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        warnings.push(
            'SUPABASE_SERVICE_ROLE_KEY not set - service operations will not be available'
        );
    }

    if (!process.env.DATABASE_URL && !process.env.DIRECT_DATABASE_URL) {
        warnings.push('DATABASE_URL not set - Drizzle ORM operations will not be available');
    }

    return {
        isValid: missingVars.length === 0,
        missingVars,
        warnings,
    };
}

// ========================
// Safe Client Creation (with fallbacks)
// ========================
export function createSupabaseBrowserClientSafe() {
    try {
        return createSupabaseBrowserClient();
    } catch (error) {
        console.error('Failed to create Supabase browser client:', error);
        throw new Error(
            'Unable to initialize Supabase browser client. Please check your environment configuration.'
        );
    }
}

export function createSupabaseServiceClientSafe() {
    try {
        return createSupabaseServiceClient();
    } catch (error) {
        console.error('Failed to create Supabase service client:', error);
        throw new Error(
            'Unable to initialize Supabase service client. Please ensure SUPABASE_SERVICE_ROLE_KEY is set.'
        );
    }
}

export function getDrizzleClientSafe() {
    try {
        return getDrizzleClient();
    } catch (error) {
        console.error('Failed to create Drizzle client:', error);
        throw new Error(
            'Unable to initialize Drizzle client. Please check your database connection URL.'
        );
    }
}

// Export everything for easy access
export { schema };
