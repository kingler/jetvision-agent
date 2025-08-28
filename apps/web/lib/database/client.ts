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
  throw new Error('Missing Supabase environment variables');
}

// ========================
// Browser Client (for client-side operations)
// ========================
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
}

// ========================
// Service Client (for server-side operations with elevated privileges)
// ========================
export function createSupabaseServiceClient() {
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// ========================
// Anon Client (for server-side operations with user context)
// ========================
export function createSupabaseAnonClient() {
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// ========================
// Drizzle ORM Client
// ========================
let drizzleClient: ReturnType<typeof drizzle> | null = null;

export function getDrizzleClient() {
  if (!drizzleClient) {
    if (!databaseUrl) {
      throw new Error('Missing DATABASE_URL environment variable');
    }

    const client = postgres(databaseUrl, {
      max: 10, // Maximum number of connections
      idle_timeout: 20,
      connect_timeout: 10,
    });

    drizzleClient = drizzle(client, { schema });
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
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseAnonClient();
    const { error } = await client.from('users').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

// Export everything for easy access
export { schema };