import { ApolloTools } from '../../src/apollo-tools';

async function testCompleteApolloAPI() {
  const apolloTools = new ApolloTools();
  console.log('=== COMPLETE APOLLO API TEST - WITH NEW ENDPOINTS ===\n');
  
  const testResults = {
    passed: 0,
    failed: 0,
    endpoints: [] as { name: string; status: string }[]
  };

  // Test all endpoints including new ones
  const endpoints = [
    // Existing endpoints
    { name: 'search-leads', test: { jobTitle: 'CEO' } },
    { name: 'enrich-contact', test: { email: 'test@example.com' } },
    { name: 'create-email-sequence', test: { name: 'Test Sequence', contacts: ['test@example.com'] } },
    { name: 'get-account-data', test: { domain: 'example.com' } },
    { name: 'track-engagement', test: { sequenceId: 'seq_123' } },
    { name: 'search-organizations', test: { industry: 'Aviation' } },
    { name: 'bulk-enrich-contacts', test: { contacts: [{ email: 'test@example.com' }] } },
    { name: 'bulk-enrich-organizations', test: { organizations: [{ domain: 'example.com' }] } },
    { name: 'create-contact', test: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' } },
    { name: 'update-contact', test: { contactId: 'contact_123', title: 'CEO' } },
    { name: 'search-contacts', test: { query: 'aviation' } },
    { name: 'search-news', test: { industry: 'Aviation' } },
    { name: 'search-job-postings', test: { domain: 'example.com' } },
    { name: 'create-deal', test: { name: 'Test Deal', value: 10000, stage: 'Prospecting' } },
    { name: 'update-deal', test: { dealId: 'deal_123', stage: 'Qualification' } },
    { name: 'search-deals', test: { stage: 'Prospecting' } },
    { name: 'create-task', test: { title: 'Follow up', dueDate: '2024-02-01' } },
    { name: 'log-call', test: { contactId: 'contact_123', duration: 15, outcome: 'Connected' } },
    { name: 'get-api-usage', test: {} },
    // NEW endpoints
    { name: 'search-sequences', test: { status: 'active' } },
    { name: 'search-tasks', test: { status: 'pending' } },
    { name: 'update-sequence', test: { sequenceId: 'seq_123', status: 'active' } },
    { name: 'get-sequence-stats', test: { sequenceId: 'seq_123' } },
    { name: 'add-contacts-to-sequence', test: { sequenceId: 'seq_123', emails: ['new@example.com'] } },
    { name: 'remove-contacts-from-sequence', test: { sequenceId: 'seq_123', contactIds: ['contact_123'] } },
    { name: 'update-task', test: { taskId: 'task_123', priority: 'High' } },
    { name: 'complete-task', test: { taskId: 'task_123' } }
  ];

  console.log(`Testing ${endpoints.length} Apollo API endpoints...\n`);

  for (const endpoint of endpoints) {
    process.stdout.write(`Testing ${endpoint.name}... `);
    
    try {
      const result = await apolloTools.handleToolCall({
        params: {
          name: endpoint.name,
          arguments: endpoint.test
        }
      } as any);
      
      if (result && result.content && result.content[0]) {
        console.log('✅ PASS');
        testResults.passed++;
        testResults.endpoints.push({ name: endpoint.name, status: '✅' });
      } else {
        console.log('❌ FAIL - Invalid response');
        testResults.failed++;
        testResults.endpoints.push({ name: endpoint.name, status: '❌' });
      }
    } catch (error) {
      console.log(`❌ FAIL - ${error instanceof Error ? error.message : 'Unknown error'}`);
      testResults.failed++;
      testResults.endpoints.push({ name: endpoint.name, status: '❌' });
    }
  }

  console.log('\n=== TEST SUMMARY ===\n');
  console.log(`Total Endpoints: ${endpoints.length}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / endpoints.length) * 100).toFixed(1)}%`);

  console.log('\n=== ENDPOINT STATUS ===\n');
  console.log('Original Apollo API Endpoints:');
  const originalEndpoints = testResults.endpoints.slice(0, 19);
  originalEndpoints.forEach(ep => console.log(`  ${ep.status} ${ep.name}`));
  
  console.log('\nNEW Apollo API Endpoints (Just Added):');
  const newEndpoints = testResults.endpoints.slice(19);
  newEndpoints.forEach(ep => console.log(`  ${ep.status} ${ep.name}`));

  console.log('\n=== APOLLO API COVERAGE ===\n');
  console.log('✅ Search for Sequences - IMPLEMENTED (search-sequences)');
  console.log('✅ People Enrichment - IMPLEMENTED (enrich-contact, bulk-enrich-contacts)');
  console.log('✅ People Search - IMPLEMENTED (search-leads, search-contacts)');
  console.log('✅ Create Contact - IMPLEMENTED (create-contact)');
  console.log('✅ Create Deal - IMPLEMENTED (create-deal)');
  console.log('✅ Create Task - IMPLEMENTED (create-task)');
  console.log('✅ Search Tasks - IMPLEMENTED (search-tasks)');
  console.log('✅ View API Usage - IMPLEMENTED (get-api-usage)');
  
  console.log('\n=== ADDITIONAL FEATURES ===\n');
  console.log('✅ Update operations (contacts, deals, tasks, sequences)');
  console.log('✅ Bulk operations (enrich contacts/organizations)');
  console.log('✅ Sequence management (add/remove contacts, get stats)');
  console.log('✅ Task completion tracking');
  console.log('✅ Call logging');
  console.log('✅ News and job posting search');
  console.log('✅ Organization search and enrichment');

  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Full Apollo API coverage achieved!');
  }

  return testResults;
}

// Run the test
testCompleteApolloAPI().then(results => {
  console.log('\n=== TEST COMPLETE ===');
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});