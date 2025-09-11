#!/usr/bin/env node
/**
 * Test Apollo.io MCP Server Integration
 */

async function testApolloMCP() {
    console.log('🎯 Testing Apollo.io MCP Server');
    console.log('==============================');

    try {
        // Test health endpoint
        console.log('\n1. Health Check...');
        const healthResponse = await fetch('http://localhost:8123/health');
        const healthData = await healthResponse.json();
        console.log('Health Status:', healthData.status);
        console.log('Apollo API Mode:', healthData.apollo_api);

        // Test search-leads functionality
        console.log('\n2. Testing search-leads...');
        const searchPayload = {
            method: 'search-leads',
            params: {
                job_titles: ['Executive Assistant', 'Chief of Staff'],
                location: 'New York, NY',
                company_size: '100-1000',
                limit: 5
            }
        };

        const searchResponse = await fetch('http://localhost:8123/tools/call', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(searchPayload)
        });

        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            console.log('✅ Search Leads Response:');
            console.log(JSON.stringify(searchData, null, 2));
        } else {
            console.log('❌ Search failed:', await searchResponse.text());
        }

        // Test the tools list
        console.log('\n3. Available Tools...');
        const toolsResponse = await fetch('http://localhost:8123/tools/list', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (toolsResponse.ok) {
            const toolsData = await toolsResponse.json();
            console.log('Available tools:', toolsData.tools?.map(t => t.name) || 'None');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testApolloMCP().catch(console.error);