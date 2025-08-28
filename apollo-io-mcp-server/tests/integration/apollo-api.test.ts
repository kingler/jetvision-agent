import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ApolloAPIClient } from '../../src/apollo-api-client';

describe('Apollo API Integration', () => {
  let apiClient: ApolloAPIClient;

  beforeEach(() => {
    apiClient = new ApolloAPIClient(process.env.APOLLO_API_KEY || 'test-api-key');
  });

  describe('API Authentication', () => {
    test('handles invalid API key', async () => {
      const invalidClient = new ApolloAPIClient('invalid-key');
      
      // Mock 401 response
      jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' })
        } as Response)
      );
      
      await expect(invalidClient.searchPeople({ job_titles: ['CEO'] }))
        .rejects
        .toThrow('Authentication failed: Invalid API key');
    });

    test('includes proper headers', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ people: [] })
        } as Response)
      );
      
      await apiClient.searchPeople({ 
        job_titles: ['CEO'] 
      }).catch(() => {});

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Api-Key': process.env.APOLLO_API_KEY || 'test-api-key',
            'Content-Type': 'application/json',
            'User-Agent': 'jetvision-apollo-mcp/1.0'
          })
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    test('implements exponential backoff on rate limit', async () => {
      const startTime = Date.now();
      
      // Simulate rate limit response
      jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '2' }),
          json: () => Promise.resolve({ error: 'Rate limited' })
        } as Response)
      ).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ people: [] })
        } as Response)
      );

      await apiClient.searchPeople({ job_titles: ['CEO'] });
      
      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeGreaterThanOrEqual(2000);
    });

    test('respects concurrent request limits', async () => {
      const requests = Array(20).fill(null).map((_, i) =>
        apiClient.searchPeople({ 
          job_titles: [`Title${i}`] 
        })
      );

      const results = await Promise.allSettled(requests);
      const successful = results.filter(r => r.status === 'fulfilled');
      
      // Should throttle concurrent requests
      expect(successful.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Response Validation', () => {
    test('validates people search response schema', async () => {
      jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            people: [
              {
                id: '123',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com',
                title: 'CEO',
                company: { name: 'Example Corp' }
              }
            ],
            pagination: {
              page: 1,
              per_page: 25,
              total_entries: 1
            }
          })
        } as Response)
      );

      const result = await apiClient.searchPeople({ job_titles: ['CEO'] });
      
      expect(result).toHaveProperty('people');
      expect(result.people).toBeInstanceOf(Array);
      if (result.people && result.people.length > 0) {
        expect(result.people[0]).toHaveProperty('id');
        expect(result.people[0]).toHaveProperty('email');
      }
    });

    test('handles malformed responses', async () => {
      jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ invalid: 'response' })
        } as Response)
      );

      await expect(apiClient.searchPeople({ job_titles: ['CEO'] }))
        .rejects
        .toThrow('Invalid response format');
    });
  });

  describe('Error Handling', () => {
    test('handles network errors', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(apiClient.searchPeople({ job_titles: ['CEO'] }))
        .rejects
        .toThrow('Network error');
    });

    test('handles API errors with details', async () => {
      jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({
            error: 'Bad Request',
            details: 'Invalid job title format'
          })
        } as Response)
      );

      await expect(apiClient.searchPeople({ job_titles: [''] }))
        .rejects
        .toThrow('Invalid job title format');
    });
  });
});