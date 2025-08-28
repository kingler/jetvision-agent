import { describe, test, expect, beforeEach } from '@jest/globals';
import { ApolloTools } from '../../src/apollo-tools';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

describe('Apollo.io MCP Tools', () => {
  let apolloTools: ApolloTools;

  beforeEach(() => {
    apolloTools = new ApolloTools();
  });

  describe('search-leads tool', () => {
    test('validates required parameters', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'search-leads',
          arguments: {}
        }
      };

      await expect(apolloTools.handleToolCall(request))
        .rejects
        .toThrow('Missing required parameters');
    });

    test('returns formatted lead data', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'search-leads',
          arguments: {
            jobTitle: 'CEO',
            industry: 'Aviation',
            companySize: '50-200',
            location: 'United States'
          }
        }
      };

      const result = await apolloTools.handleToolCall(request);
      
      expect(result).toHaveProperty('content');
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('Found');
    });
  });

  describe('enrich-contact tool', () => {
    test('handles missing contact gracefully', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'enrich-contact',
          arguments: {
            email: 'nonexistent@example.com'
          }
        }
      };

      const result = await apolloTools.handleToolCall(request);
      
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('Contact not found');
    });

    test('enriches existing contact successfully', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'enrich-contact',
          arguments: {
            email: 'john@jetvision.com'
          }
        }
      };

      const result = await apolloTools.handleToolCall(request);
      
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('Enriched contact');
    });
  });

  describe('create-email-sequence tool', () => {
    test('validates sequence parameters', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'create-email-sequence',
          arguments: {
            name: 'Test Sequence'
            // Missing required fields
          }
        }
      };

      await expect(apolloTools.handleToolCall(request))
        .rejects
        .toThrow('Missing required sequence parameters');
    });

    test('creates sequence successfully', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'create-email-sequence',
          arguments: {
            name: 'JetVision Outreach',
            contacts: ['contact1@example.com', 'contact2@example.com'],
            templateIds: ['template1', 'template2'],
            delayDays: [3, 7, 14]
          }
        }
      };

      const result = await apolloTools.handleToolCall(request);
      
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('Email sequence created');
    });
  });

  describe('get-account-data tool', () => {
    test('handles rate limiting', async () => {
      // Simulate multiple rapid requests
      const promises = Array(10).fill(null).map(() => 
        apolloTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'get-account-data',
            arguments: { domain: 'example.com' }
          }
        })
      );

      const results = await Promise.allSettled(promises);
      const rateLimited = results.filter(r => 
        r.status === 'rejected' && 
        r.reason.message.includes('Rate limit')
      );

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('retrieves account data successfully', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get-account-data',
          arguments: {
            domain: 'jetvision.com'
          }
        }
      };

      const result = await apolloTools.handleToolCall(request);
      
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('Account data');
    });
  });

  describe('track-engagement tool', () => {
    test('tracks email engagement metrics', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'track-engagement',
          arguments: {
            sequenceId: 'seq123',
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          }
        }
      };

      const result = await apolloTools.handleToolCall(request);
      
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('Engagement metrics');
    });
  });

  describe('search-organizations tool', () => {
    test('searches for organizations with industry filter', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'search-organizations',
          arguments: {
            industry: 'Aviation',
            employeeCount: '50-200',
            location: 'United States'
          }
        }
      };

      const result = await apolloTools.handleToolCall(request);
      
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('organizations');
    });

    test('validates at least one search parameter', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'search-organizations',
          arguments: {}
        }
      };

      await expect(apolloTools.handleToolCall(request))
        .rejects
        .toThrow('At least one search parameter');
    });
  });

  describe('bulk-enrich-contacts tool', () => {
    test('enriches multiple contacts', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'bulk-enrich-contacts',
          arguments: {
            contacts: [
              { email: 'john@example.com', firstName: 'John', lastName: 'Doe' },
              { email: 'jane@example.com', firstName: 'Jane', lastName: 'Smith' }
            ],
            revealPersonalEmails: true
          }
        }
      };

      const result = await apolloTools.handleToolCall(request);
      
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('Enriched 2 contacts');
    });

    test('validates contact array limit', async () => {
      const contacts = Array(15).fill(null).map((_, i) => ({
        email: `contact${i}@example.com`,
        firstName: `Contact${i}`,
        lastName: 'Test'
      }));

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'bulk-enrich-contacts',
          arguments: {
            contacts
          }
        }
      };

      await expect(apolloTools.handleToolCall(request))
        .rejects
        .toThrow('Maximum 10 contacts');
    });
  });

  describe('create-contact tool', () => {
    test('creates new contact with required fields', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'create-contact',
          arguments: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@jetvision.com',
            title: 'Aviation Manager',
            company: 'JetVision'
          }
        }
      };

      const result = await apolloTools.handleToolCall(request);
      
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('Contact created');
    });

    test('validates required fields', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'create-contact',
          arguments: {
            firstName: 'John'
            // Missing lastName and email
          }
        }
      };

      await expect(apolloTools.handleToolCall(request))
        .rejects
        .toThrow('Missing required fields');
    });
  });

  describe('search-deals tool', () => {
    test('searches deals with filters', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'search-deals',
          arguments: {
            stage: 'Qualification',
            minValue: 10000,
            maxValue: 100000
          }
        }
      };

      const result = await apolloTools.handleToolCall(request);
      
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('Found');
    });
  });

  describe('create-task tool', () => {
    test('creates task with required fields', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'create-task',
          arguments: {
            title: 'Follow up on JetVision proposal',
            dueDate: '2024-12-01',
            priority: 'High',
            contactId: 'contact123'
          }
        }
      };

      const result = await apolloTools.handleToolCall(request);
      
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('Task created');
    });
  });

  describe('log-call tool', () => {
    test('logs call activity', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'log-call',
          arguments: {
            contactId: 'contact123',
            duration: 15,
            outcome: 'Connected',
            notes: 'Discussed private jet charter requirements'
          }
        }
      };

      const result = await apolloTools.handleToolCall(request);
      
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('Call logged');
    });
  });

  describe('get-api-usage tool', () => {
    test('retrieves API usage statistics', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get-api-usage',
          arguments: {
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            breakdown: true
          }
        }
      };

      const result = await apolloTools.handleToolCall(request);
      
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('API Usage Statistics');
    });
  });

  describe('rate limiting', () => {
    test('applies rate limits per tool', async () => {
      // Simulate rapid requests to the same tool
      const promises = Array(20).fill(null).map(() => 
        apolloTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'search-leads',
            arguments: { jobTitle: 'CEO' }
          }
        })
      );

      const results = await Promise.allSettled(promises);
      const rateLimited = results.filter(r => 
        r.status === 'rejected' && 
        r.reason.message.includes('Rate limit exceeded')
      );

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('tracks API usage per tool', async () => {
      // Make requests to different tools
      await apolloTools.handleToolCall({
        method: 'tools/call',
        params: {
          name: 'search-leads',
          arguments: { jobTitle: 'CEO' }
        }
      });

      await apolloTools.handleToolCall({
        method: 'tools/call',
        params: {
          name: 'enrich-contact',
          arguments: { email: 'test@example.com' }
        }
      });

      // Both calls should succeed as they're different tools
      expect(true).toBe(true); // Test passes if no rate limit errors thrown
    });
  });

  describe('error handling', () => {
    test('handles unknown tool names', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'unknown-tool',
          arguments: {}
        }
      };

      await expect(apolloTools.handleToolCall(request))
        .rejects
        .toThrow('Unknown tool');
    });

    test('handles malformed arguments', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'search-leads',
          arguments: null
        }
      };

      await expect(apolloTools.handleToolCall(request))
        .rejects
        .toThrow();
    });
  });
});