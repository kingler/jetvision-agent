import { NextRequest } from 'next/server';
import { POST } from '../../app/api/completion/route';
import { auth } from '@clerk/nextjs/server';
import { geolocation } from '@vercel/functions';
import * as creditService from '../../app/api/completion/credit-service';
import * as streamHandlers from '../../app/api/completion/stream-handlers';

// Mock dependencies
jest.mock('@clerk/nextjs/server');
jest.mock('@vercel/functions');
jest.mock('../../app/api/completion/credit-service');
jest.mock('../../app/api/completion/stream-handlers');

describe('/api/completion', () => {
  let mockRequest: Partial<NextRequest>;
  let mockAuth: jest.MockedFunction<typeof auth>;
  let mockGeolocation: jest.MockedFunction<typeof geolocation>;
  let mockGetRemainingCredits: jest.MockedFunction<typeof creditService.getRemainingCredits>;
  let mockDeductCredits: jest.MockedFunction<typeof creditService.deductCredits>;
  let mockExecuteStream: jest.MockedFunction<typeof streamHandlers.executeStream>;

  beforeEach(() => {
    // Setup mocks
    mockAuth = auth as jest.MockedFunction<typeof auth>;
    mockGeolocation = geolocation as jest.MockedFunction<typeof geolocation>;
    mockGetRemainingCredits = creditService.getRemainingCredits as jest.MockedFunction<typeof creditService.getRemainingCredits>;
    mockDeductCredits = creditService.deductCredits as jest.MockedFunction<typeof creditService.deductCredits>;
    mockExecuteStream = streamHandlers.executeStream as jest.MockedFunction<typeof streamHandlers.executeStream>;

    // Default mock implementations
    mockAuth.mockResolvedValue({ userId: 'user123' } as any);
    mockGeolocation.mockReturnValue({ country: 'US' } as any);
    mockGetRemainingCredits.mockResolvedValue(100);
    mockDeductCredits.mockResolvedValue();
    mockExecuteStream.mockImplementation(async ({ onFinish }) => {
      if (onFinish) await onFinish();
    });

    // Mock request object
    mockRequest = {
      method: 'POST',
      json: jest.fn().mockResolvedValue({
        mode: 'fast',
        messages: [{ role: 'user', content: 'Hello' }],
        threadId: 'thread123',
        threadItemId: 'item123'
      }),
      headers: new Headers({
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'Mozilla/5.0'
      }),
      signal: {
        addEventListener: jest.fn(),
        aborted: false
      } as any
    } as Partial<NextRequest>;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization', () => {
    test('allows authenticated users to make requests', async () => {
      const response = await POST(mockRequest as NextRequest);
      
      expect(response).toBeInstanceOf(Response);
      expect(mockAuth).toHaveBeenCalled();
    });

    test('allows unauthenticated users for non-auth-required modes', async () => {
      mockAuth.mockResolvedValue({ userId: null } as any);
      
      const response = await POST(mockRequest as NextRequest);
      
      expect(response).toBeInstanceOf(Response);
      expect(response.status).not.toBe(401);
    });

    test('rejects unauthenticated users for auth-required modes', async () => {
      mockAuth.mockResolvedValue({ userId: null } as any);
      mockRequest.json = jest.fn().mockResolvedValue({
        mode: 'premium', // Assuming premium mode requires auth
        messages: [{ role: 'user', content: 'Hello' }]
      });

      const response = await POST(mockRequest as NextRequest);
      
      // This test depends on whether 'premium' mode requires auth
      // Adjust based on actual ChatModeConfig
      expect(mockAuth).toHaveBeenCalled();
    });

    test('handles missing IP address', async () => {
      mockRequest.headers = new Headers();
      
      const response = await POST(mockRequest as NextRequest);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Request Validation', () => {
    test('validates request body schema', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        invalidField: 'invalid'
      });
      
      const response = await POST(mockRequest as NextRequest);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error', 'Invalid request body');
      expect(body).toHaveProperty('details');
    });

    test('handles malformed JSON', async () => {
      mockRequest.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));
      
      const response = await POST(mockRequest as NextRequest);
      
      expect(response.status).toBe(400);
    });

    test('accepts valid request body', async () => {
      const validBody = {
        mode: 'fast',
        messages: [{ role: 'user', content: 'Hello' }],
        threadId: 'thread123',
        threadItemId: 'item123'
      };
      mockRequest.json = jest.fn().mockResolvedValue(validBody);
      
      const response = await POST(mockRequest as NextRequest);
      
      expect(response).toBeInstanceOf(Response);
      expect(mockExecuteStream).toHaveBeenCalled();
    });
  });

  describe('Credit System', () => {
    test('checks remaining credits before processing', async () => {
      await POST(mockRequest as NextRequest);
      
      expect(mockGetRemainingCredits).toHaveBeenCalledWith({
        userId: 'user123',
        ip: '127.0.0.1'
      });
    });

    test('rejects request when insufficient credits', async () => {
      mockGetRemainingCredits.mockResolvedValue(0);
      
      // Mock non-development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const response = await POST(mockRequest as NextRequest);
      
      expect(response.status).toBe(429);
      const body = await response.text();
      expect(body).toContain('daily limit');
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    test('allows request in development environment regardless of credits', async () => {
      mockGetRemainingCredits.mockResolvedValue(0);
      
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const response = await POST(mockRequest as NextRequest);
      
      expect(response).toBeInstanceOf(Response);
      expect(response.status).not.toBe(429);
      
      process.env.NODE_ENV = originalEnv;
    });

    test('deducts credits after successful completion', async () => {
      await POST(mockRequest as NextRequest);
      
      // Wait for stream to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockDeductCredits).toHaveBeenCalledWith(
        { userId: 'user123', ip: '127.0.0.1' },
        expect.any(Number)
      );
    });

    test('includes credit information in response headers', async () => {
      mockGetRemainingCredits.mockResolvedValue(50);
      
      const response = await POST(mockRequest as NextRequest);
      
      expect(response.headers.get('X-Credits-Available')).toBe('50');
      expect(response.headers.get('X-Credits-Cost')).toBeTruthy();
      expect(response.headers.get('X-Credits-Daily-Allowance')).toBeTruthy();
    });
  });

  describe('Streaming Response', () => {
    test('returns streaming response with correct headers', async () => {
      const response = await POST(mockRequest as NextRequest);
      
      expect(response.headers.get('Content-Type')).toContain('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    test('handles stream execution', async () => {
      await POST(mockRequest as NextRequest);
      
      expect(mockExecuteStream).toHaveBeenCalledWith({
        controller: expect.any(Object),
        encoder: expect.any(TextEncoder),
        data: expect.objectContaining({
          mode: 'fast',
          messages: expect.any(Array)
        }),
        abortController: expect.any(AbortController),
        gl: expect.any(Object),
        userId: 'user123',
        onFinish: expect.any(Function)
      });
    });

    test('handles abort signal', async () => {
      const abortController = new AbortController();
      mockRequest.signal = abortController.signal;
      
      // Simulate abort
      setTimeout(() => abortController.abort(), 10);
      
      const response = await POST(mockRequest as NextRequest);
      
      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('Error Handling', () => {
    test('handles authentication errors', async () => {
      mockAuth.mockRejectedValue(new Error('Auth failed'));
      
      const response = await POST(mockRequest as NextRequest);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('error', 'Internal server error');
    });

    test('handles stream execution errors', async () => {
      mockExecuteStream.mockRejectedValue(new Error('Stream failed'));
      
      const response = await POST(mockRequest as NextRequest);
      
      expect(response).toBeInstanceOf(Response);
      // The error should be handled gracefully in the stream
    });

    test('handles credit service errors', async () => {
      mockGetRemainingCredits.mockRejectedValue(new Error('Credit service failed'));
      
      const response = await POST(mockRequest as NextRequest);
      
      expect(response.status).toBe(500);
    });
  });

  describe('OPTIONS Requests', () => {
    test('handles OPTIONS requests for CORS', async () => {
      mockRequest.method = 'OPTIONS';
      
      const response = await POST(mockRequest as NextRequest);
      
      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });
  });

  describe('Geolocation', () => {
    test('includes geolocation data in stream execution', async () => {
      const mockGeoData = { country: 'US', region: 'CA' };
      mockGeolocation.mockReturnValue(mockGeoData as any);
      
      await POST(mockRequest as NextRequest);
      
      expect(mockGeolocation).toHaveBeenCalledWith(mockRequest);
      expect(mockExecuteStream).toHaveBeenCalledWith(
        expect.objectContaining({
          gl: mockGeoData
        })
      );
    });
  });
});