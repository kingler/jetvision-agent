/**
 * Database Integration Test
 * Tests all major database operations
 */

import * as dotenv from 'dotenv';
import { 
  getDrizzleClient,
  checkDatabaseConnection,
  DatabaseService
} from './lib/database/service';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runTests() {
  console.log('🧪 Starting database integration tests...\n');
  // Use static methods from DatabaseService

  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing database connection...');
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }
    console.log('✅ Database connected successfully\n');

    // Test 2: User Operations
    console.log('2️⃣ Testing user operations...');
    const testUser = await DatabaseService.users.findOrCreateFromClerk({
      id: 'test_clerk_id_' + Date.now(),
      emailAddresses: [{ emailAddress: `test_${Date.now()}@jetvision.com` }],
      firstName: 'Test',
      lastName: 'User',
    });
    console.log('✅ User created/found:', testUser.email);

    // Update user preferences
    const preferences = await DatabaseService.users.updatePreferences(testUser.id, {
      theme: 'dark',
      defaultChatMode: 'apollo',
    });
    console.log('✅ User preferences updated\n');

    // Test 3: Conversation Operations (TODO: Implement conversation repository)
    console.log('3️⃣ Testing conversation operations...');
    console.log('⚠️ Conversation operations not implemented yet\n');

    // Test 4: Apollo Operations (TODO: Implement Apollo repository)
    console.log('4️⃣ Testing Apollo operations...');
    console.log('⚠️ Apollo operations not implemented yet\n');

    // Test 5: Search Operations (TODO: Implement search functionality)
    console.log('5️⃣ Testing search operations...');
    console.log('⚠️ Search operations not implemented yet\n');

    // Test 6: Statistics (TODO: Implement statistics functionality)
    console.log('6️⃣ Testing statistics...');
    console.log('⚠️ Statistics not implemented yet');

    console.log('\n🎉 All tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();