/**
 * Apply Row Level Security Policies to Supabase
 * This script applies RLS policies to protect user data
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

async function applyRLSPolicies() {
  console.log('🔒 Applying Row Level Security policies to Supabase...\n');

  try {
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Read the RLS policies SQL file
    const rlsSql = readFileSync(
      join(__dirname, 'lib/database/migrations/rls-policies.sql'),
      'utf8'
    );

    // Split SQL into individual statements
    const statements = rlsSql
      .split(';')
      .filter(stmt => stmt.trim())
      .map(stmt => stmt.trim() + ';');

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Extract a description from the statement
      let description = 'SQL statement';
      if (statement.includes('CREATE POLICY')) {
        const match = statement.match(/CREATE POLICY "([^"]+)"/);
        description = `Policy: ${match?.[1] || 'Unknown'}`;
      } else if (statement.includes('ALTER TABLE')) {
        const match = statement.match(/ALTER TABLE (\w+)/);
        description = `Enable RLS on: ${match?.[1] || 'Unknown'}`;
      }

      process.stdout.write(`[${i + 1}/${statements.length}] ${description}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        }).catch(async () => {
          // If exec_sql doesn't exist, try direct execution
          const { error } = await supabase.from('_sql').select(statement);
          return { error };
        });

        if (error) {
          // Try alternative method
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: statement }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
        }

        console.log(' ✅');
        successCount++;
      } catch (err: any) {
        console.log(` ❌ ${err.message}`);
        errorCount++;
        
        // Log the statement that failed for debugging
        if (process.env.DEBUG) {
          console.log('Failed statement:', statement.substring(0, 100) + '...');
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully applied: ${successCount} statements`);
    console.log(`❌ Failed: ${errorCount} statements`);

    if (errorCount === 0) {
      console.log('\n🎉 All RLS policies applied successfully!');
    } else {
      console.log('\n⚠️ Some policies failed to apply. This might be because:');
      console.log('   - Policies already exist (not an issue)');
      console.log('   - Tables don\'t exist yet (run migrations first)');
      console.log('   - Syntax differences between local and Supabase SQL');
      console.log('\nYou can apply policies manually in the Supabase dashboard.');
    }

  } catch (error) {
    console.error('❌ Failed to apply RLS policies:', error);
    process.exit(1);
  }
}

// Run the script
applyRLSPolicies();