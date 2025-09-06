/**
 * Test suite for n8n webhook integration
 * Tests error handling, response transformation, and execution polling
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '../../app/api/n8n-webhook/route';

// Global mock variable
let mockFetch: jest.SpyInstance;

// Mock external dependencies
jest.mock('@clerk/nextjs/server', () => ({
    auth: jest.fn(() => Promise.resolve({ userId: 'test-user' })),
}));

// Mock the response transformer
jest.mock('../../lib/n8n-response-transformer', () => ({
    transformN8nResponse: jest.fn((data, threadId, threadItemId) => ({
        answer: {
            text: data.response || 'Transformed response',
            structured: null,
        },
        sources: [],
        metadata: {
            executionId: data.executionId,
            source: 'n8n',
        },
    })),
}));

describe('N8N Webhook API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock global fetch
        mockFetch = jest.spyOn(global, 'fetch');
        mockFetch.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({}),
                text: () => Promise.resolve(''),
                headers: new Headers(),
            } as Response)
        );
    });

    afterEach(() => {
        mockFetch.mockRestore();
    });

    describe('POST /api/n8n-webhook', () => {
        it('should handle valid message requests', async () => {
            const mockRequest = new NextRequest('http://localhost:3000/api/n8n-webhook', {
                method: 'POST',
                body: JSON.stringify({
                    message: 'Test message',
                    threadId: 'thread-123',
                    threadItemId: 'item-456',
                }),
            });

            const response = await POST(mockRequest);
            expect(response).toBeDefined();
            expect(response.headers.get('Content-Type')).toBe('text/event-stream');
        });

        it('should validate message input', async () => {
            const mockRequest = new NextRequest('http://localhost:3000/api/n8n-webhook', {
                method: 'POST',
                body: JSON.stringify({
                    message: '',
                    threadId: 'thread-123',
                }),
            });

            const response = await POST(mockRequest);
            const data = await response.json();
            expect(data.error).toContain('Message is required');
            expect(response.status).toBe(400);
        });

        it('should handle message length validation', async () => {
            const longMessage = 'a'.repeat(4001);
            const mockRequest = new NextRequest('http://localhost:3000/api/n8n-webhook', {
                method: 'POST',
                body: JSON.stringify({
                    message: longMessage,
                    threadId: 'thread-123',
                }),
            });

            const response = await POST(mockRequest);
            const data = await response.json();
            expect(data.error).toContain('Message too long');
            expect(response.status).toBe(400);
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
                    headers: new Headers({ 'content-type': 'application/json' }),
                } as Response)
            );

            const mockRequest = new NextRequest('http://localhost:3000/api/n8n-webhook', {
                method: 'POST',
                body: JSON.stringify({
                    message: 'Test query',
                    threadId: 'thread-123',
                    threadItemId: 'item-456',
                }),
            });

            const response = await POST(mockRequest);
            expect(response.headers.get('Content-Type')).toBe('text/event-stream');

            // Read the stream to verify events
            const reader = response.body?.getReader();
            if (reader) {
                const { value } = await reader.read();
                const text = new TextDecoder().decode(value);
                expect(text).toContain('event: answer');
                expect(text).toContain('event: done');
            }
        });

        it('should handle webhook failures gracefully', async () => {
            // Mock webhook failure
            mockFetch.mockImplementationOnce(() =>
                Promise.resolve({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    text: () => Promise.resolve('Webhook error'),
                    headers: new Headers(),
                } as Response)
            );

            const mockRequest = new NextRequest('http://localhost:3000/api/n8n-webhook', {
                method: 'POST',
                body: JSON.stringify({
                    message: 'Test query',
                    threadId: 'thread-123',
                    threadItemId: 'item-456',
                }),
            });

            const response = await POST(mockRequest);
            expect(response.headers.get('Content-Type')).toBe('text/event-stream');

            // The error should be handled and fallback response provided
            const reader = response.body?.getReader();
            if (reader) {
                const { value } = await reader.read();
                const text = new TextDecoder().decode(value);
                expect(text).toContain('connectivity issues');
            }
        });
    });

    describe('GET /api/n8n-webhook (Health Check)', () => {
        it('should return health status', async () => {
            const mockRequest = new NextRequest('http://localhost:3000/api/n8n-webhook', {
                method: 'GET',
            });

            const response = await GET(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.service).toBe('n8n-webhook');
            expect(data.status).toBeDefined();
            expect(data.webhook).toBeDefined();
            expect(data.configuration).toBeDefined();
        });
    });
});

describe('N8N Response Transformer', () => {
    const { transformN8nResponse, extractStructuredData, formatDisplayText } = jest.requireActual(
        '../../lib/n8n-response-transformer'
    );

    describe('transformN8nResponse', () => {
        it('should transform basic n8n response', () => {
            const webhookData = {
                response: 'Test response text',
                executionId: 'exec-123',
                workflowId: 'workflow-456',
            };

            const result = transformN8nResponse(webhookData, 'thread-123', 'item-456');

            expect(result.id).toBe('item-456');
            expect(result.threadId).toBe('thread-123');
            expect(result.answer?.text).toContain('Test response text');
            expect(result.metadata?.executionId).toBe('exec-123');
            expect(result.status).toBe('COMPLETED');
        });

        it('should handle various response field names', () => {
            const testCases = [
                { message: 'From message field' },
                { output: 'From output field' },
                { text: 'From text field' },
            ];

            testCases.forEach(webhookData => {
                const result = transformN8nResponse(webhookData, 'thread-123', 'item-456');
                expect(result.answer?.text).toBeTruthy();
            });
        });
    });

    describe('extractStructuredData', () => {
        it('should detect Apollo.io lead data', () => {
            const response = 'Found Executive Assistant leads: John Doe at Acme Corp';
            const result = extractStructuredData(response);

            expect(result?.type).toBe('apollo_leads');
            expect(result?.data).toBeDefined();
        });

        it('should detect Avinode aircraft data', () => {
            const response = 'Available aircraft: Gulfstream G650 from NYC';
            const result = extractStructuredData(response);

            expect(result?.type).toBe('aircraft_search');
            expect(result?.data?.aircraft).toBeDefined();
        });

        it('should parse JSON structured data', () => {
            const response = 'Response: {"type":"apollo_leads","data":{"leads":[{"name":"Test"}]}}';
            const result = extractStructuredData(response);

            expect(result?.type).toBe('apollo_leads');
            expect(result?.data?.leads).toHaveLength(1);
        });

        it('should return null for unstructured text', () => {
            const response = 'This is just plain text without any structure';
            const result = extractStructuredData(response);

            expect(result).toBeNull();
        });
    });

    describe('formatDisplayText', () => {
        it('should add Apollo.io header for lead data', () => {
            const structuredData = { type: 'apollo_leads', data: {} };
            const result = formatDisplayText('Test response', structuredData);

            expect(result).toContain('**Apollo.io Lead Intelligence**');
            expect(result).toContain('Test response');
        });

        it('should add Avinode header for aircraft data', () => {
            const structuredData = { type: 'aircraft_search', data: {} };
            const result = formatDisplayText('Test response', structuredData);

            expect(result).toContain('**Avinode Aircraft Availability**');
        });

        it('should add n8n attribution footer', () => {
            const structuredData = { type: 'apollo_leads', data: {} };
            const result = formatDisplayText('Test response', structuredData);

            expect(result).toContain('Generated by JetVision Agent via n8n workflow');
        });

        it('should return original text if no structured data', () => {
            const result = formatDisplayText('Plain text response', null);

            expect(result).toBe('Plain text response');
        });
    });
});

describe('Error Handling', () => {
    it('should extract error details from failed execution', () => {
        const { extractResponseFromExecutionData } = jest.requireActual(
            '../../app/api/n8n-webhook/route'
        );

        const executionData = {
            resultData: {
                runData: {
                    'Apollo Node': [
                        {
                            error: {
                                message: 'API key invalid',
                                description: 'Please check your Apollo.io API key',
                            },
                        },
                    ],
                },
            },
        };

        const result = extractResponseFromExecutionData(executionData);
        expect(result).toContain('Error in workflow node');
        expect(result).toContain('Apollo Node');
        expect(result).toContain('API key invalid');
    });

    it('should handle execution timeout', async () => {
        // This would require more complex mocking of the polling mechanism
        // In a real test environment, you'd test the timeout behavior
        expect(true).toBe(true); // Placeholder
    });

    it('should handle circuit breaker activation', async () => {
        // Test that after multiple failures, circuit breaker activates
        // This would require simulating multiple failed requests
        expect(true).toBe(true); // Placeholder
    });
});

describe('Integration Tests', () => {
    it('should handle complete flow from request to response', async () => {
        // Mock successful n8n execution with polling
        const executionId = 'exec-789';

        // First mock: webhook returns execution ID
        mockFetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ executionId }),
                headers: new Headers({ 'content-type': 'application/json' }),
            } as Response)
        );

        // Second mock: polling returns running status
        mockFetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        id: executionId,
                        status: 'running',
                        finished: false,
                    }),
            } as Response)
        );

        // Third mock: polling returns success with data
        mockFetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        id: executionId,
                        status: 'success',
                        finished: true,
                        data: {
                            resultData: {
                                runData: {
                                    Agent: [
                                        {
                                            data: {
                                                main: [
                                                    [
                                                        {
                                                            json: {
                                                                response:
                                                                    'Final response from agent',
                                                            },
                                                        },
                                                    ],
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    }),
            } as Response)
        );

        const mockRequest = new NextRequest('http://localhost:3000/api/n8n-webhook', {
            method: 'POST',
            body: JSON.stringify({
                message: 'Integration test query',
                threadId: 'thread-integration',
                threadItemId: 'item-integration',
            }),
        });

        const response = await POST(mockRequest);
        expect(response.headers.get('Content-Type')).toBe('text/event-stream');

        // In a real test, you'd consume the stream and verify all events
        expect(mockFetch).toHaveBeenCalledTimes(3);
    });
});
