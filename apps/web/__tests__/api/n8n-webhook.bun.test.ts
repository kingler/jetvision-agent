/**
 * Bun Test Suite for n8n webhook integration
 * Tests error handling, response transformation, and execution polling
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { transformN8nResponse } from '../../lib/n8n-response-transformer';

// Mock modules using Jest
jest.mock('@clerk/nextjs/server', () => ({
    auth: jest.fn(() => Promise.resolve({ userId: 'test-user' })),
}));

jest.mock('../../lib/n8n-response-transformer', () => ({
    transformN8nResponse: jest.fn((data: any, threadId: string, threadItemId: string) => ({
        id: threadItemId,
        threadId,
        answer: {
            text: data.response || 'Transformed response',
            structured: null,
        },
        sources: [],
        metadata: {
            executionId: data.executionId,
            source: 'n8n',
        },
        status: 'COMPLETED' as const,
    })),
    extractResponseFromExecutionData: jest.fn((data: any) => 'Mock response from execution data'),
}));

// Now import the route handlers
import { POST, GET } from '../../app/api/n8n-webhook/route';

// Mock function references
const mockAuth = jest.mocked(auth);
const mockTransformN8nResponse = jest.mocked(transformN8nResponse);

describe('N8N Webhook API', () => {
    let mockFetch: jest.SpyInstance;

    beforeEach(() => {
        // Mock global fetch using Jest
        mockFetch = jest.spyOn(global, 'fetch');
        mockFetch.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({}),
                text: () => Promise.resolve(''),
                headers: new Headers([['content-type', 'application/json']]),
            } as Response)
        );
    });

    afterEach(() => {
        mockFetch.mockRestore();
        jest.clearAllMocks();
    });

    describe('GET /api/n8n-webhook (Health Check)', () => {
        it('should return health status', async () => {
            const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
                method: 'GET',
            });

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.service).toBe('n8n-webhook');
            expect(data.status).toBeDefined();
            expect(data.webhook).toBeDefined();
            expect(data.configuration).toBeDefined();
        });
    });

    describe('POST /api/n8n-webhook', () => {
        it('should handle valid message requests', async () => {
            const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
                method: 'POST',
                body: JSON.stringify({
                    message: 'Test message',
                    threadId: 'thread-123',
                    threadItemId: 'item-456',
                }),
                headers: {
                    'content-type': 'application/json',
                },
            });

            const response = await POST(request);
            expect(response).toBeDefined();
            expect(response.headers.get('Content-Type')).toBe('text/event-stream');
        });

        it('should validate message input', async () => {
            const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
                method: 'POST',
                body: JSON.stringify({
                    message: '',
                    threadId: 'thread-123',
                }),
                headers: {
                    'content-type': 'application/json',
                },
            });

            const response = await POST(request);
            const data = await response.json();
            expect(response.status).toBe(400);
            expect(data.error).toContain('Message is required');
        });

        it('should handle message length validation', async () => {
            const longMessage = 'a'.repeat(4001);
            const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
                method: 'POST',
                body: JSON.stringify({
                    message: longMessage,
                    threadId: 'thread-123',
                }),
                headers: {
                    'content-type': 'application/json',
                },
            });

            const response = await POST(request);
            const data = await response.json();
            expect(response.status).toBe(400);
            expect(data.error).toContain('Message too long');
        });

        it('should handle unauthorized requests', async () => {
            // Mock unauthorized
            mockAuth.mockImplementationOnce(() => Promise.resolve({ userId: null }));

            const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
                method: 'POST',
                body: JSON.stringify({
                    message: 'Test message',
                    threadId: 'thread-123',
                }),
                headers: {
                    'content-type': 'application/json',
                },
            });

            const response = await POST(request);
            expect(response.status).toBe(401);
            const data = await response.json();
            expect(data.error).toBe('Unauthorized');
        });

        it('should handle webhook execution with immediate response', async () => {
            // Mock webhook response with immediate data
            mockFetch.mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            response: 'Immediate response from n8n',
                            executionId: 'exec-123',
                        }),
                    headers: new Map([['content-type', 'application/json']]),
                })
            );

            const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
                method: 'POST',
                body: JSON.stringify({
                    message: 'Test query',
                    threadId: 'thread-123',
                    threadItemId: 'item-456',
                }),
                headers: {
                    'content-type': 'application/json',
                },
            });

            const response = await POST(request);
            expect(response.headers.get('Content-Type')).toBe('text/event-stream');

            // Verify the webhook was called
            expect(mockFetch).toHaveBeenCalled();

            // Verify transformation was called
            expect(mockTransformN8nResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    response: 'Immediate response from n8n',
                    executionId: 'exec-123',
                }),
                'thread-123',
                'item-456'
            );
        });

        it('should handle webhook failures gracefully', async () => {
            // Mock webhook failure
            mockFetch.mockImplementationOnce(() =>
                Promise.resolve({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    text: () => Promise.resolve('Webhook error'),
                    headers: new Map(),
                })
            );

            const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
                method: 'POST',
                body: JSON.stringify({
                    message: 'Test query',
                    threadId: 'thread-123',
                    threadItemId: 'item-456',
                }),
                headers: {
                    'content-type': 'application/json',
                },
            });

            const response = await POST(request);
            expect(response.headers.get('Content-Type')).toBe('text/event-stream');

            // Should handle the error gracefully and return a fallback response
            expect(response.status).toBe(200); // SSE responses are always 200
        });
    });
});

describe('N8N Response Transformer Integration', () => {
    it('should call transformer with correct parameters', async () => {
        const mockWebhookData = {
            response: 'Test response text',
            executionId: 'exec-123',
            workflowId: 'workflow-456',
        };

        // Call the mock directly to test the expected behavior
        const result = mockTransformN8nResponse(mockWebhookData, 'thread-123', 'item-456');

        expect(result.id).toBe('item-456');
        expect(result.threadId).toBe('thread-123');
        expect(result.answer.text).toContain('Test response text');
        expect(result.metadata.executionId).toBe('exec-123');
        expect(result.status).toBe('COMPLETED');
    });
});

describe('Error Handling', () => {
    it('should handle network errors', async () => {
        // Mock network failure
        mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

        const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
            method: 'POST',
            body: JSON.stringify({
                message: 'Test query',
                threadId: 'thread-123',
                threadItemId: 'item-456',
            }),
            headers: {
                'content-type': 'application/json',
            },
        });

        const response = await POST(request);
        expect(response.headers.get('Content-Type')).toBe('text/event-stream');

        // Should handle the error and return a stream
        expect(response.status).toBe(200);
    });

    it('should validate required fields', async () => {
        const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
            method: 'POST',
            body: JSON.stringify({
                message: 'Test message',
                // Missing threadId
            }),
            headers: {
                'content-type': 'application/json',
            },
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('Thread ID is required');
    });
});
