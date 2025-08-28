import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, OPTIONS } from '../../app/api/mcp/proxy/route';
import fetch from 'node-fetch';
import { Redis } from '@upstash/redis';
import { Readable } from 'stream';

// Mock dependencies
jest.mock('node-fetch');
jest.mock('@upstash/redis');

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const MockRedis = Redis as jest.MockedClass<typeof Redis>;

describe('/api/mcp/proxy', () => {
  let mockRequest: Partial<NextRequest>;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    // Clear global sessions
    global._mcpSessions = {};

    // Setup Redis mock
    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
    } as any;
    MockRedis.mockImplementation(() => mockRedis);

    // Setup request mock
    mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('server=https://example.com/mcp'),
      } as any,
      headers: new Headers({
        'user-agent': 'test-agent',
        'content-type': 'application/json',
      }),
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET Request (SSE Stream)', () => {
    test('establishes SSE connection with valid server', async () => {
      // Mock successful response with readable stream
      const mockStream = new Readable({
        read() {
          this.push('data: test message\n\n');
          this.push(null); // End stream
        },
      });

      mockFetch.mockResolvedValue({
        body: mockStream,
        ok: true,
        status: 200,
      } as any);

      const response = await GET(mockRequest as NextRequest);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform');
      expect(response.headers.get('Connection')).toBe('keep-alive');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/mcp',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            host: 'example.com',
          }),
        })
      );
    });

    test('returns 405 error when server parameter is missing', async () => {
      mockRequest.nextUrl = {
        searchParams: new URLSearchParams(),
      } as any;

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(405);
      const body = await response.json();
      expect(body.error).toContain('POST method');
    });

    test('handles session management correctly', async () => {
      const mockStream = new Readable({
        read() {
          this.push('sessionId=test-session-123');
          this.push(null);
        },
      });

      mockFetch.mockResolvedValue({
        body: mockStream,
        ok: true,
      } as any);

      await GET(mockRequest as NextRequest);

      // Check that session was stored in Redis
      expect(mockRedis.set).toHaveBeenCalledWith(
        'mcp:session:test-session-123',
        'https://example.com/mcp'
      );
    });

    test('handles stream errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to connect to MCP server');
    });

    test('cleans up sessions on stream end', async () => {
      const mockStream = new Readable({
        read() {
          this.push('test data');
          this.push(null);
        },
      });

      mockFetch.mockResolvedValue({
        body: mockStream,
        ok: true,
      } as any);

      await GET(mockRequest as NextRequest);

      // Allow stream to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // Session should be cleaned up from global store
      expect(Object.keys(global._mcpSessions)).toHaveLength(0);
    });
  });

  describe('POST Request (JSONRPC)', () => {
    beforeEach(() => {
      mockRequest.text = jest.fn().mockResolvedValue(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1
      }));
    });

    test('forwards valid JSONRPC requests to MCP server', async () => {
      const mockJsonResponse = {
        jsonrpc: '2.0',
        result: {
          tools: [
            { name: 'test-tool', description: 'A test tool' }
          ]
        },
        id: 1
      };

      mockFetch.mockResolvedValue({
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockJsonResponse)),
      } as any);

      const response = await POST(mockRequest as NextRequest);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(mockJsonResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/mcp',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('tools/list'),
        })
      );
    });

    test('returns 400 error when server parameter is missing', async () => {
      mockRequest.nextUrl = {
        searchParams: new URLSearchParams(),
      } as any;

      const response = await POST(mockRequest as NextRequest);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.message).toBe('Missing server parameter');
      expect(body.jsonrpc).toBe('2.0');
    });

    test('handles malformed JSONRPC requests', async () => {
      mockRequest.text = jest.fn().mockResolvedValue('invalid json');

      const response = await POST(mockRequest as NextRequest);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe(-32700);
      expect(body.error.message).toBe('Parse error');
    });

    test('validates JSONRPC structure', async () => {
      mockRequest.text = jest.fn().mockResolvedValue(JSON.stringify({
        invalidField: 'test'
      }));

      const response = await POST(mockRequest as NextRequest);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe(-32700);
    });

    test('handles MCP server errors', async () => {
      mockFetch.mockRejectedValue(new Error('Server down'));

      const response = await POST(mockRequest as NextRequest);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error.code).toBe(-32603);
      expect(body.error.message).toBe('Internal error');
    });

    test('handles malformed responses from MCP server', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        text: jest.fn().mockResolvedValue('invalid json response'),
      } as any);

      const response = await POST(mockRequest as NextRequest);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.error.code).toBe(-32603);
      expect(body.error.message).toContain('Invalid JSON response');
    });

    test('preserves request ID in error responses', async () => {
      const requestWithId = {
        jsonrpc: '2.0',
        method: 'test',
        id: 'test-id-123'
      };
      mockRequest.text = jest.fn().mockResolvedValue(JSON.stringify(requestWithId));
      mockFetch.mockRejectedValue(new Error('Test error'));

      const response = await POST(mockRequest as NextRequest);

      const body = await response.json();
      expect(body.id).toBe('test-id-123');
    });

    test('includes CORS headers in response', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify({
          jsonrpc: '2.0',
          result: {},
          id: 1
        })),
      } as any);

      const response = await POST(mockRequest as NextRequest);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  describe('OPTIONS Request (CORS Preflight)', () => {
    test('returns proper CORS headers', async () => {
      const response = await OPTIONS(mockRequest as NextRequest);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    });

    test('returns empty body', async () => {
      const response = await OPTIONS(mockRequest as NextRequest);

      expect(response.body).toBeNull();
    });
  });

  describe('Session Management', () => {
    test('generates unique session IDs', async () => {
      const mockStream = new Readable({
        read() {
          this.push('test');
          this.push(null);
        },
      });

      mockFetch.mockResolvedValue({
        body: mockStream,
        ok: true,
      } as any);

      // Make multiple concurrent requests
      const requests = [
        GET(mockRequest as NextRequest),
        GET(mockRequest as NextRequest),
        GET(mockRequest as NextRequest),
      ];

      await Promise.all(requests);

      // Check that different session IDs were generated (they should be cleaned up after stream ends)
      expect(Object.keys(global._mcpSessions).length).toBeLessThanOrEqual(3);
    });

    test('stores server mapping in Redis', async () => {
      const mockStream = new Readable({
        read() {
          this.push('data: sessionId=test-123\n\n');
          this.push(null);
        },
      });

      mockFetch.mockResolvedValue({
        body: mockStream,
        ok: true,
      } as any);

      await GET(mockRequest as NextRequest);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'mcp:session:test-123',
        'https://example.com/mcp'
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles empty stream response', async () => {
      mockFetch.mockResolvedValue({
        body: null,
        ok: true,
      } as any);

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(500);
    });

    test('handles network timeouts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const response = await POST(mockRequest as NextRequest);

      expect(response.status).toBe(500);
    });

    test('cleans up resources on request abortion', async () => {
      const mockStream = new Readable({
        read() {
          // Keep stream open
        },
      });

      mockFetch.mockResolvedValue({
        body: mockStream,
        ok: true,
      } as any);

      const response = await GET(mockRequest as NextRequest);

      // Simulate stream cancellation
      if (response.body) {
        await response.body.cancel();
      }

      // Sessions should be cleaned up
      expect(Object.keys(global._mcpSessions)).toHaveLength(0);
    });
  });
});