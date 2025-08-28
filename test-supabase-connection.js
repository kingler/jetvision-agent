// Test Supabase database connection
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fshvzvxqgwgoujtcevyy.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzaHZ6dnhxZ3dnb3VqdGNldnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDY0MjIsImV4cCI6MjA3MTg4MjQyMn0.fkxY4p6Qatd4ZZS8tsuujcEXzQRbW30nA08rTq3vRC0';

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection by checking if we can access the auth service
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error && error.message !== 'Auth session missing!') {
      console.error('Connection error:', error);
      return;
    }
    
    console.log('✅ Successfully connected to Supabase!');
    console.log('Project URL:', supabaseUrl);
    
    // Try to query a simple table (this might fail if no tables exist yet)
    const { data, error: queryError, count } = await supabase
      .from('_prisma_migrations')
      .select('*', { count: 'exact', head: true });
    
    if (!queryError) {
      console.log('✅ Database query successful!');
    } else if (queryError.code === '42P01') {
      console.log('⚠️  No tables exist yet (this is normal for a new database)');
    } else {
      console.log('⚠️  Query error (might be normal):', queryError.message);
    }
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

testConnection();