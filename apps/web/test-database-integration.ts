/**
 * Database Integration Test
 * Tests all major database operations
 */

import * as dotenv from 'dotenv';
import { 
  initializeDatabase, 
  db,
  createConversation,
  addMessage,
  saveApolloLead,
  saveApolloCampaign
} from './lib/database/service';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runTests() {
  console.log('🧪 Starting database integration tests...\n');

  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing database connection...');
    const isConnected = await initializeDatabase();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }
    console.log('✅ Database connected successfully\n');

    // Test 2: User Operations
    console.log('2️⃣ Testing user operations...');
    const testUser = await db.users.findOrCreateFromClerk({
      id: 'test_clerk_id_' + Date.now(),
      emailAddresses: [{ emailAddress: `test_${Date.now()}@jetvision.com` }],
      firstName: 'Test',
      lastName: 'User',
    });
    console.log('✅ User created/found:', testUser.email);

    // Update user preferences
    const preferences = await db.users.updatePreferences(testUser.id, {
      theme: 'dark',
      defaultChatMode: 'apollo',
    });
    console.log('✅ User preferences updated\n');

    // Test 3: Conversation Operations
    console.log('3️⃣ Testing conversation operations...');
    const conversation = await createConversation(testUser.id, 'Test Conversation');
    console.log('✅ Conversation created:', conversation.id);

    // Add messages
    const userMessage = await addMessage(
      conversation.id,
      'user',
      'Hello, this is a test message!'
    );
    console.log('✅ User message added');

    const assistantMessage = await addMessage(
      conversation.id,
      'assistant',
      'Hello! This is a response from the assistant.'
    );
    console.log('✅ Assistant message added');

    // Get messages
    const messages = await db.conversations.getMessages(conversation.id);
    console.log(`✅ Retrieved ${messages.length} messages\n`);

    // Test 4: Apollo Operations
    console.log('4️⃣ Testing Apollo operations...');
    
    // Save a lead
    const lead = await saveApolloLead(testUser.id, {
      id: 'apollo_lead_' + Date.now(),
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      title: 'CEO',
      organization_name: 'Example Corp',
      organization: { industry: 'Aviation' },
      city: 'San Francisco',
      linkedin_url: 'https://linkedin.com/in/johndoe',
      account_score: 85,
    });
    console.log('✅ Apollo lead saved:', lead.email);

    // Create a campaign
    const campaign = await saveApolloCampaign(testUser.id, {
      id: 'apollo_campaign_' + Date.now(),
      name: 'Test Campaign',
      description: 'This is a test campaign',
      status: 'active',
      email_templates: ['template1', 'template2'],
      step_delays: [1, 3, 7],
    });
    console.log('✅ Apollo campaign created:', campaign.name);

    // Add lead to campaign
    await db.apollo.addLeadsToCampaign(campaign.id, [lead.id]);
    console.log('✅ Lead added to campaign\n');

    // Test 5: Search Operations
    console.log('5️⃣ Testing search operations...');
    
    // Search conversations
    const searchResults = await db.conversations.search(testUser.id, 'test');
    console.log(`✅ Found ${searchResults.length} conversations matching "test"`);

    // Search leads
    const leadSearchResults = await db.apollo.searchLeads(testUser.id, 'john');
    console.log(`✅ Found ${leadSearchResults.length} leads matching "john"\n`);

    // Test 6: Statistics
    console.log('6️⃣ Testing statistics...');
    
    // Get conversation stats
    const convStats = await db.conversations.getStats(testUser.id);
    console.log('✅ Conversation stats:', convStats);

    // Get Apollo stats
    const apolloStats = await db.apollo.getCampaignStats(testUser.id);
    console.log('✅ Apollo stats:', apolloStats);

    console.log('\n🎉 All tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();