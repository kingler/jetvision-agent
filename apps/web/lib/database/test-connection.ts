/**
 * Database Connection Test
 * Simple test to verify database connectivity and schema validity
 */

import { getDrizzleClient } from './client';

export async function testDatabaseConnection(): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const db = getDrizzleClient();
    
    // Test basic query
    const result = await db.execute('SELECT 1 as test');
    
    if (result) {
      return {
        success: true,
        message: 'Database connection successful'
      };
    } else {
      return {
        success: false,
        message: 'Database query returned no result'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function testSchemaExports(): Promise<{
  success: boolean;
  message: string;
  exportedTables: string[];
}> {
  try {
    const schema = await import('./schema');
    
    const exportedTables = Object.keys(schema).filter(key => 
      typeof schema[key] === 'object' && 
      schema[key] !== null &&
      '_.baseName' in schema[key]
    );

    return {
      success: true,
      message: `Schema exports ${exportedTables.length} tables`,
      exportedTables
    };
  } catch (error) {
    return {
      success: false,
      message: 'Schema import failed',
      exportedTables: []
    };
  }
}

// Test runner function
const runTests = async () => {
  console.log('Testing database connection...');
  const connectionTest = await testDatabaseConnection();
  console.log(connectionTest);

  console.log('\nTesting schema exports...');
  const schemaTest = await testSchemaExports();
  console.log(schemaTest);
};

// If run directly, execute tests
if (require.main === module) {
  runTests().catch(console.error);
}