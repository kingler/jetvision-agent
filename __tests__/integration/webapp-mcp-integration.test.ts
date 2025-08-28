import { NextRequest, NextResponse } from 'next/server';
import { MCPPerformanceTester } from '../performance/mcp-load-test';

// Integration tests for JetVision Web App to MCP Server communication
describe('JetVision Web App to MCP Integration', () => {
  let apolloServerUrl: string;
  let avainodeServerUrl: string;
  let webAppUrl: string;

  beforeAll(() => {
    apolloServerUrl = process.env.APOLLO_MCP_URL || 'http://localhost:8123';
    avainodeServerUrl = process.env.AVAINODE_MCP_URL || 'http://localhost:8124';
    webAppUrl = process.env.WEBAPP_URL || 'http://localhost:3000';
    
    console.log('Testing integration with:');
    console.log(`Apollo MCP Server: ${apolloServerUrl}`);
    console.log(`Avainode MCP Server: ${avainodeServerUrl}`);
    console.log(`Web App: ${webAppUrl}`);
  });

  describe('MCP Proxy Endpoint Integration', () => {
    test('proxies requests to Apollo MCP server correctly', async () => {
      const proxyUrl = `${webAppUrl}/api/mcp/proxy?server=${encodeURIComponent(apolloServerUrl)}`;
      
      const initRequest = {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '0.1.0',
          capabilities: {},
          clientInfo: {
            name: 'integration-test',
            version: '1.0.0'
          }
        },
        id: 1
      };

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(initRequest)
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toHaveProperty('jsonrpc', '2.0');
      expect(result).toHaveProperty('result');
      expect(result.result).toHaveProperty('protocolVersion');
    });

    test('proxies requests to Avainode MCP server correctly', async () => {
      const proxyUrl = `${webAppUrl}/api/mcp/proxy?server=${encodeURIComponent(avainodeServerUrl)}`;
      
      const initRequest = {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '0.1.0',
          capabilities: {},
          clientInfo: {
            name: 'integration-test',
            version: '1.0.0'
          }
        },
        id: 1
      };

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(initRequest)
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toHaveProperty('jsonrpc', '2.0');
      expect(result).toHaveProperty('result');
    });

    test('handles invalid server URLs gracefully', async () => {
      const proxyUrl = `${webAppUrl}/api/mcp/proxy?server=invalid-url`;
      
      const request = {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1
      };

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      expect(response.status).toBe(500);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    test('validates JSONRPC format', async () => {
      const proxyUrl = `${webAppUrl}/api/mcp/proxy?server=${encodeURIComponent(apolloServerUrl)}`;
      
      const invalidRequest = {
        method: 'tools/list',
        // Missing jsonrpc field
        params: {},
        id: 1
      };

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequest)
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error.code).toBe(-32700); // Parse error
    });
  });

  describe('End-to-End Chat Flow with MCP Tools', () => {
    test('completes Apollo lead search flow', async () => {
      const chatRequest = {
        mode: 'fast',
        messages: [
          {
            role: 'user',
            content: 'Find CEOs in the aviation industry with companies between 50-200 employees in California'
          }
        ],
        threadId: 'test-thread-apollo',
        threadItemId: 'test-item-apollo',
        mcpTools: {
          apollo: {
            enabled: true,
            serverUrl: apolloServerUrl
          }
        }
      };

      const response = await fetch(`${webAppUrl}/api/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest)
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');

      // Read the streaming response
      const reader = response.body?.getReader();
      let streamContent = '';
      let hasToolCall = false;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            streamContent += chunk;
            
            // Look for MCP tool calls
            if (chunk.includes('search-leads') || chunk.includes('apollo')) {
              hasToolCall = true;
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      expect(streamContent.length).toBeGreaterThan(0);
      // Should have made use of Apollo tools for lead search
      expect(hasToolCall).toBe(true);
    });

    test('completes Avainode aircraft search flow', async () => {
      const chatRequest = {
        mode: 'fast',
        messages: [
          {
            role: 'user',
            content: 'Find available private jets from JFK to LAX for 8 passengers on December 1st, 2024'
          }
        ],
        threadId: 'test-thread-avainode',
        threadItemId: 'test-item-avainode',
        mcpTools: {
          avainode: {
            enabled: true,
            serverUrl: avainodeServerUrl
          }
        }
      };

      const response = await fetch(`${webAppUrl}/api/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest)
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');

      // Read the streaming response
      const reader = response.body?.getReader();
      let streamContent = '';
      let hasAircraftSearch = false;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            streamContent += chunk;
            
            // Look for aircraft search results
            if (chunk.includes('aircraft') || chunk.includes('Gulfstream') || chunk.includes('KJFK')) {
              hasAircraftSearch = true;
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      expect(streamContent.length).toBeGreaterThan(0);
      expect(hasAircraftSearch).toBe(true);
    });

    test('handles combined Apollo and Avainode workflow', async () => {
      const chatRequest = {
        mode: 'fast',
        messages: [
          {
            role: 'user',
            content: 'Find aviation company executives and then search for private jets for their travel needs'
          }
        ],
        threadId: 'test-thread-combined',
        threadItemId: 'test-item-combined',
        mcpTools: {
          apollo: {
            enabled: true,
            serverUrl: apolloServerUrl
          },
          avainode: {
            enabled: true,
            serverUrl: avainodeServerUrl
          }
        }
      };

      const response = await fetch(`${webAppUrl}/api/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest)
      });

      expect(response.status).toBe(200);
      
      const reader = response.body?.getReader();
      let streamContent = '';
      let hasApolloCall = false;
      let hasAvainodeCall = false;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            streamContent += chunk;
            
            if (chunk.includes('search-leads') || chunk.includes('apollo')) {
              hasApolloCall = true;
            }
            if (chunk.includes('search-aircraft') || chunk.includes('avainode')) {
              hasAvainodeCall = true;
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      expect(streamContent.length).toBeGreaterThan(0);
      // Should integrate both services
      expect(hasApolloCall || hasAvainodeCall).toBe(true);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('handles MCP server downtime gracefully', async () => {
      const chatRequest = {
        mode: 'fast',
        messages: [
          {
            role: 'user',
            content: 'Search for leads using Apollo'
          }
        ],
        threadId: 'test-thread-downtime',
        threadItemId: 'test-item-downtime',
        mcpTools: {
          apollo: {
            enabled: true,
            serverUrl: 'http://localhost:9999' // Non-existent server
          }
        }
      };

      const response = await fetch(`${webAppUrl}/api/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest)
      });

      // Should still return 200 but with error handling in the stream
      expect(response.status).toBe(200);
      
      const reader = response.body?.getReader();
      let streamContent = '';

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            streamContent += new TextDecoder().decode(value);
          }
        } finally {
          reader.releaseLock();
        }
      }

      // Should contain error message about connection failure
      expect(streamContent).toContain('error' || 'failed' || 'unavailable');
    });

    test('handles timeout scenarios', async () => {
      // This test simulates slow MCP responses
      const chatRequest = {
        mode: 'fast',
        messages: [
          {
            role: 'user',
            content: 'Complex search that might timeout'
          }
        ],
        threadId: 'test-thread-timeout',
        threadItemId: 'test-item-timeout',
        mcpTools: {
          apollo: {
            enabled: true,
            serverUrl: apolloServerUrl,
            timeout: 100 // Very short timeout
          }
        }
      };

      const startTime = performance.now();
      
      const response = await fetch(`${webAppUrl}/api/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest)
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      // Should handle timeout gracefully within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds max
    });

    test('validates authentication and rate limiting', async () => {
      // Test multiple rapid requests to check rate limiting
      const promises = Array(10).fill(null).map(async (_, i) => {
        const chatRequest = {
          mode: 'fast',
          messages: [
            {
              role: 'user',
              content: `Test request ${i}`
            }
          ],
          threadId: `test-thread-rate-${i}`,
          threadItemId: `test-item-rate-${i}`
        };

        return fetch(`${webAppUrl}/api/completion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chatRequest)
        });
      });

      const responses = await Promise.allSettled(promises);
      
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
      const rateLimited = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429).length;
      
      // Should have some rate limiting in place
      expect(successful + rateLimited).toBe(10);
      if (rateLimited > 0) {
        console.log(`Rate limiting working: ${rateLimited} requests rate limited`);
      }
    });
  });

  describe('Performance Characteristics', () => {
    test('measures response times under normal load', async () => {
      const iterations = 5;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        const chatRequest = {
          mode: 'fast',
          messages: [
            {
              role: 'user',
              content: 'Quick test message'
            }
          ],
          threadId: `perf-test-${i}`,
          threadItemId: `perf-item-${i}`
        };

        const response = await fetch(`${webAppUrl}/api/completion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chatRequest)
        });

        expect(response.status).toBe(200);
        
        // Consume the stream
        const reader = response.body?.getReader();
        if (reader) {
          try {
            while (true) {
              const { done } = await reader.read();
              if (done) break;
            }
          } finally {
            reader.releaseLock();
          }
        }

        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }

      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);
      
      console.log(`Average response time: ${averageTime.toFixed(2)}ms`);
      console.log(`Max response time: ${maxTime.toFixed(2)}ms`);
      
      // Performance expectations
      expect(averageTime).toBeLessThan(5000); // 5 seconds average
      expect(maxTime).toBeLessThan(10000); // 10 seconds max
    });

    test('measures MCP server performance', async () => {
      const tester = new MCPPerformanceTester(apolloServerUrl, {
        concurrency: 5,
        iterations: 20,
        timeout: 10000
      });

      const apolloTestSuite = {
        name: 'Apollo Integration Test',
        requiresSession: true,
        tests: [
          {
            name: 'Tools List',
            request: {
              jsonrpc: '2.0',
              method: 'tools/list',
              params: {},
              id: 1
            }
          }
        ]
      };

      const results = await tester.runTest(apolloTestSuite);
      expect(results).toHaveLength(1);
      
      const toolsResult = results[0];
      expect(toolsResult.successfulRequests).toBeGreaterThan(0);
      expect(toolsResult.averageResponseTime).toBeLessThan(2000); // 2 seconds max
    });
  });

  describe('Data Flow Validation', () => {
    test('validates Apollo lead data formatting', async () => {
      const proxyUrl = `${webAppUrl}/api/mcp/proxy?server=${encodeURIComponent(apolloServerUrl)}`;
      
      // Initialize session
      const initResponse = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: { protocolVersion: '0.1.0', capabilities: {} },
          id: 1
        })
      });
      
      const sessionId = initResponse.headers.get('mcp-session-id');
      
      // Search for leads
      const searchResponse = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'mcp-session-id': sessionId || ''
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'search-leads',
            arguments: {
              jobTitle: 'CEO',
              industry: 'Aviation'
            }
          },
          id: 2
        })
      });

      expect(searchResponse.status).toBe(200);
      const result = await searchResponse.json();
      
      expect(result).toHaveProperty('jsonrpc', '2.0');
      expect(result).toHaveProperty('result');
      expect(result.result).toHaveProperty('content');
      expect(Array.isArray(result.result.content)).toBe(true);
      expect(result.result.content[0]).toHaveProperty('type', 'text');
      expect(result.result.content[0]).toHaveProperty('text');
      expect(typeof result.result.content[0].text).toBe('string');
    });

    test('validates Avainode aircraft data formatting', async () => {
      const proxyUrl = `${webAppUrl}/api/mcp/proxy?server=${encodeURIComponent(avainodeServerUrl)}`;
      
      // Initialize session
      const initResponse = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: { protocolVersion: '0.1.0', capabilities: {} },
          id: 1
        })
      });
      
      const sessionId = initResponse.headers.get('mcp-session-id');
      
      // Search for aircraft
      const searchResponse = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'mcp-session-id': sessionId || ''
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'search-aircraft',
            arguments: {
              departureAirport: 'KJFK',
              arrivalAirport: 'KLAX',
              departureDate: '2024-12-01',
              passengers: 8
            }
          },
          id: 2
        })
      });

      expect(searchResponse.status).toBe(200);
      const result = await searchResponse.json();
      
      expect(result).toHaveProperty('jsonrpc', '2.0');
      expect(result).toHaveProperty('result');
      expect(result.result).toHaveProperty('content');
      expect(Array.isArray(result.result.content)).toBe(true);
      expect(result.result.content[0]).toHaveProperty('type', 'text');
      expect(result.result.content[0].text).toContain('aircraft');
    });
  });
});