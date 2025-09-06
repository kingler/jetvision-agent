/**
 * Integration Tests for JetVision Resilient Provider
 *
 * Tests all fallback scenarios, circuit breaker behavior, and service recovery.
 * Ensures zero-downtime operation under various failure conditions.
 */

import { jest } from '@jest/globals';
import {
    JetVisionResilientProvider,
    createJetVisionResilient,
} from '../jetvision-resilient-provider';
import { CircuitBreaker, CircuitState } from '../circuit-breaker';
import { multiTierCacheManager } from '../cache-manager';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock AbortSignal.timeout
global.AbortSignal = {
    ...global.AbortSignal,
    timeout: jest.fn((ms: number) => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), ms);
        return controller.signal;
    }),
} as any;

describe('JetVision Resilient Provider Integration Tests', () => {
    let provider: JetVisionResilientProvider;
    let mockOptions: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset cache
        multiTierCacheManager.clearAll();

        // Create provider with test configuration
        const factory = createJetVisionResilient({
            n8nWebhookUrl: 'http://test-n8n.com/webhook/test',
            n8nApiKey: 'test-n8n-key',
            n8nTimeout: 5000,
            apolloApiKey: 'test-apollo-key',
            avinodeApiKey: 'test-avinode-key',
            llmApiKey: 'test-llm-key',
            enableFallback: true,
            enableCaching: true,
            enableServiceMonitoring: false, // Disable for tests
        });

        provider = factory.jetVisionAgent('test-model');

        // Standard test options
        mockOptions = {
            prompt: {
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Find executive assistants in tech companies' },
                        ],
                    },
                ],
            },
            mode: { type: 'regular' },
        };
    });

    afterEach(() => {
        if (provider) {
            provider.destroy();
        }
    });

    describe('Primary N8N Integration', () => {
        it('should successfully process request through N8N when healthy', async () => {
            // Mock successful N8N response
            mockFetch.mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        message: 'Found 5 executive assistants in tech companies',
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    }
                )
            );

            const result = await provider.doGenerate(mockOptions);

            expect(result.text).toContain('Found 5 executive assistants');
            expect(result.finishReason).toBe('stop');
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(
                'http://test-n8n.com/webhook/test',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer test-n8n-key',
                    }),
                })
            );
        });

        it('should handle N8N timeout gracefully', async () => {
            // Mock N8N timeout
            mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

            // Mock Apollo fallback success
            mockFetch.mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        people: [
                            {
                                id: '1',
                                first_name: 'Jane',
                                last_name: 'Smith',
                                title: 'Executive Assistant',
                                organization: { name: 'Tech Corp' },
                                email: 'jane@techcorp.com',
                            },
                        ],
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    }
                )
            );

            const result = await provider.doGenerate(mockOptions);

            expect(result.text).toContain('Apollo.io Lead Intelligence');
            expect(result.text).toContain('Jane Smith');
            expect(mockFetch).toHaveBeenCalledTimes(2); // N8N failed, Apollo succeeded
        });

        it('should handle N8N HTTP errors and fallback', async () => {
            // Mock N8N 500 error
            mockFetch.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }));

            // Mock Apollo fallback success
            mockFetch.mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        people: [],
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    }
                )
            );

            const result = await provider.doGenerate(mockOptions);

            expect(result.text).toContain('No leads found');
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('Direct API Fallback', () => {
        beforeEach(() => {
            // Always fail N8N for these tests
            mockFetch.mockRejectedValueOnce(new Error('N8N unavailable'));
        });

        it('should fallback to Apollo.io direct API for lead queries', async () => {
            // Mock Apollo API success
            mockFetch.mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        people: [
                            {
                                id: '1',
                                first_name: 'John',
                                last_name: 'Doe',
                                title: 'Chief of Staff',
                                organization: {
                                    name: 'Big Tech Inc',
                                    estimated_num_employees: 1000,
                                },
                                email: 'john@bigtech.com',
                                city: 'San Francisco',
                            },
                        ],
                        pagination: { total_entries: 1, page: 1, total_pages: 1 },
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    }
                )
            );

            const result = await provider.doGenerate(mockOptions);

            expect(result.text).toContain('Apollo.io Lead Intelligence');
            expect(result.text).toContain('John Doe');
            expect(result.text).toContain('Chief of Staff');
            expect(result.text).toContain('direct Apollo.io API integration');
        });

        it('should fallback to Avinode direct API for aircraft queries', async () => {
            const avinodeOptions = {
                ...mockOptions,
                prompt: {
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: 'Show me available aircraft from JFK to LAX',
                                },
                            ],
                        },
                    ],
                },
            };

            const result = await provider.doGenerate(avinodeOptions);

            // Since we don't have full Avinode mock data, it should return a basic response
            expect(result.text).toContain('Avinode');
            expect(result.text).toContain('aircraft');
        });

        it('should handle Apollo API errors and continue fallback chain', async () => {
            // Mock Apollo API error
            mockFetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

            const result = await provider.doGenerate(mockOptions);

            // Should reach cache fallback or error response
            expect(result.text).toContain('Service Status');
            expect(result.text).toContain('connectivity issues');
        });
    });

    describe('Cache Fallback', () => {
        beforeEach(() => {
            // Fail N8N
            mockFetch.mockRejectedValueOnce(new Error('N8N unavailable'));
            // Fail Apollo
            mockFetch.mockRejectedValueOnce(new Error('Apollo unavailable'));
        });

        it('should serve cached responses when all APIs are down', async () => {
            // Pre-populate cache
            const cache = multiTierCacheManager.getCache('apollo-leads');
            const cacheKey =
                'fallback:' +
                Buffer.from('Find executive assistants in tech companies').toString('base64url');

            if (cache) {
                cache.set(cacheKey, 'Cached response: Found 3 executive assistants', 'test-source');
            }

            const result = await provider.doGenerate(mockOptions);

            expect(result.text).toContain('Cached response');
            expect(result.text).toContain('served from cache');
        });

        it('should provide error response when no cache available', async () => {
            const result = await provider.doGenerate(mockOptions);

            expect(result.text).toContain('Service Status');
            expect(result.text).toContain('connectivity issues');
            expect(result.text).toContain('N8N Primary Integration');
            expect(result.text).toContain('Apollo.io Direct');
        });
    });

    describe('Circuit Breaker Integration', () => {
        it('should track failures and open circuit breaker', async () => {
            // Create multiple failures to trigger circuit breaker
            const failurePromises = [];

            for (let i = 0; i < 6; i++) {
                // Exceed failure threshold
                mockFetch.mockRejectedValueOnce(new Error('Service unavailable'));
                failurePromises.push(
                    provider.doGenerate(mockOptions).catch(() => {}) // Catch errors to continue test
                );
            }

            await Promise.all(failurePromises);

            // Circuit breaker should be open now
            const healthReport = provider.getHealthReport();
            const n8nCircuitBreaker = healthReport.circuitBreakerStatus.find(cb =>
                cb.serviceName.includes('n8n')
            );

            // Circuit breaker may be open or half-open depending on timing
            expect(['OPEN', 'HALF_OPEN']).toContain(n8nCircuitBreaker?.state);
        });

        it('should allow requests in half-open state and close circuit on success', async () => {
            // First, trigger circuit breaker to open
            for (let i = 0; i < 6; i++) {
                mockFetch.mockRejectedValueOnce(new Error('Service unavailable'));
                await provider.doGenerate(mockOptions).catch(() => {});
            }

            // Wait for circuit breaker to enter half-open state
            await new Promise(resolve => setTimeout(resolve, 100));

            // Mock successful response for half-open test
            mockFetch.mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        message: 'Service recovered successfully',
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    }
                )
            );

            const result = await provider.doGenerate(mockOptions);

            expect(result.text).toContain('Service recovered');
        });
    });

    describe('Streaming Support', () => {
        it('should stream N8N responses successfully', async () => {
            mockFetch.mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        message:
                            'Streaming response from N8N workflow with detailed lead information',
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    }
                )
            );

            const streamResult = await provider.doStream(mockOptions);
            const chunks: string[] = [];

            const reader = streamResult.stream.getReader();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    if (value.type === 'text-delta') {
                        chunks.push(value.textDelta);
                    }
                }
            } finally {
                reader.releaseLock();
            }

            const fullResponse = chunks.join('');
            expect(fullResponse).toContain('Streaming response from N8N');
            expect(chunks.length).toBeGreaterThan(1); // Should be chunked
        });

        it('should stream fallback responses when N8N fails', async () => {
            // Mock N8N failure
            mockFetch.mockRejectedValueOnce(new Error('N8N unavailable'));

            // Mock Apollo success
            mockFetch.mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        people: [
                            {
                                id: '1',
                                first_name: 'Test',
                                last_name: 'User',
                                title: 'Assistant',
                                organization: { name: 'Test Co' },
                            },
                        ],
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    }
                )
            );

            const streamResult = await provider.doStream(mockOptions);
            const chunks: string[] = [];

            const reader = streamResult.stream.getReader();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    if (value.type === 'text-delta') {
                        chunks.push(value.textDelta);
                    }
                }
            } finally {
                reader.releaseLock();
            }

            const fullResponse = chunks.join('');
            expect(fullResponse).toContain('Test User');
        });
    });

    describe('Service Health Monitoring', () => {
        it('should provide accurate service status', () => {
            const status = provider.getServiceStatus();

            expect(status).toHaveProperty('n8nPrimary');
            expect(status).toHaveProperty('apolloDirect');
            expect(status).toHaveProperty('avinodeDirect');
            expect(status).toHaveProperty('overallHealth');
            expect(['healthy', 'degraded', 'critical']).toContain(status.overallHealth);
        });

        it('should provide comprehensive health report', () => {
            const healthReport = provider.getHealthReport();

            expect(healthReport).toHaveProperty('serviceStatus');
            expect(healthReport).toHaveProperty('metrics');
            expect(healthReport).toHaveProperty('circuitBreakerStatus');
            expect(healthReport).toHaveProperty('cacheStats');

            expect(healthReport.metrics).toHaveProperty('totalRequests');
            expect(healthReport.metrics).toHaveProperty('successRate');
            expect(healthReport.metrics).toHaveProperty('averageResponseTime');
        });

        it('should track metrics correctly', async () => {
            // Mock successful response
            mockFetch.mockResolvedValueOnce(
                new Response(JSON.stringify({ message: 'Success' }), { status: 200 })
            );

            const initialMetrics = provider.getMetrics();
            await provider.doGenerate(mockOptions);
            const updatedMetrics = provider.getMetrics();

            expect(updatedMetrics.totalRequests).toBe(initialMetrics.totalRequests + 1);
            expect(updatedMetrics.n8nRequests).toBe(initialMetrics.n8nRequests + 1);
        });
    });

    describe('Query Routing Intelligence', () => {
        it('should route Apollo queries to Apollo API when N8N fails', async () => {
            const apolloQuery = {
                ...mockOptions,
                prompt: {
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: 'Find executive assistants using Apollo campaign data',
                                },
                            ],
                        },
                    ],
                },
            };

            // Mock N8N failure
            mockFetch.mockRejectedValueOnce(new Error('N8N down'));

            // Mock Apollo success
            mockFetch.mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        people: [
                            {
                                id: '1',
                                name: 'Apollo User',
                                title: 'Executive Assistant',
                            },
                        ],
                    }),
                    { status: 200 }
                )
            );

            const result = await provider.doGenerate(apolloQuery);

            expect(result.text).toContain('Apollo.io Lead Intelligence');
            expect(result.text).toContain('direct Apollo.io API');
        });

        it('should route Avinode queries to Avinode API when N8N fails', async () => {
            const avinodeQuery = {
                ...mockOptions,
                prompt: {
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: 'Show fleet status and aircraft availability',
                                },
                            ],
                        },
                    ],
                },
            };

            // Mock N8N failure
            mockFetch.mockRejectedValueOnce(new Error('N8N down'));

            const result = await provider.doGenerate(avinodeQuery);

            expect(result.text).toContain('Avinode');
            expect(result.text).toContain('fleet');
        });

        it('should provide appropriate response for general queries when APIs fail', async () => {
            const generalQuery = {
                ...mockOptions,
                prompt: {
                    messages: [
                        {
                            role: 'user',
                            content: [{ type: 'text', text: 'What services do you provide?' }],
                        },
                    ],
                },
            };

            // Mock N8N failure
            mockFetch.mockRejectedValueOnce(new Error('N8N down'));

            const result = await provider.doGenerate(generalQuery);

            expect(result.text).toContain('JetVision Agent');
            expect(result.text).toContain('private aviation');
            expect(result.text).toContain('Service Status');
        });
    });

    describe('Caching Behavior', () => {
        it('should cache successful responses', async () => {
            mockFetch.mockResolvedValueOnce(
                new Response(JSON.stringify({ message: 'Cached response test' }), { status: 200 })
            );

            // First request - should hit API
            await provider.doGenerate(mockOptions);

            // Verify API was called
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Cache should have the response for fallback scenarios
            const cache = multiTierCacheManager.getCache('apollo-leads');
            expect(cache).toBeTruthy();
        });

        it('should handle cache misses gracefully', async () => {
            // Clear cache
            multiTierCacheManager.clearAll();

            // Mock all API failures
            mockFetch.mockRejectedValue(new Error('All APIs down'));

            const result = await provider.doGenerate(mockOptions);

            expect(result.text).toContain('connectivity issues');
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should provide detailed error information when all services fail', async () => {
            // Mock all failures
            mockFetch.mockRejectedValue(new Error('Complete system failure'));

            const result = await provider.doGenerate(mockOptions);

            expect(result.text).toContain('Service Status');
            expect(result.text).toContain('N8N Primary Integration');
            expect(result.text).toContain('Apollo.io Direct');
            expect(result.text).toContain('Next steps');
        });

        it('should maintain service metrics during failures', async () => {
            mockFetch.mockRejectedValue(new Error('Service failure'));

            const initialMetrics = provider.getMetrics();
            await provider.doGenerate(mockOptions);
            const updatedMetrics = provider.getMetrics();

            expect(updatedMetrics.totalRequests).toBe(initialMetrics.totalRequests + 1);
            expect(updatedMetrics.fallbackActivations).toBeGreaterThanOrEqual(
                initialMetrics.fallbackActivations
            );
        });

        it('should handle network timeouts appropriately', async () => {
            // Mock timeout
            mockFetch.mockImplementation(
                () =>
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Network timeout')), 100)
                    )
            );

            const result = await provider.doGenerate(mockOptions);

            expect(result.text).toContain('connectivity issues');
        });
    });

    describe('Resource Cleanup', () => {
        it('should cleanup resources on destroy', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            provider.destroy();

            expect(consoleSpy).toHaveBeenCalledWith('🧹 JetVision Resilient Provider destroyed');

            consoleSpy.mockRestore();
        });
    });
});

describe('Circuit Breaker Isolation Tests', () => {
    describe('CircuitBreaker', () => {
        let circuitBreaker: CircuitBreaker;

        beforeEach(() => {
            circuitBreaker = new CircuitBreaker('test-service', {
                failureThreshold: 3,
                recoveryTimeout: 1000,
                requestTimeout: 500,
                halfOpenMaxCalls: 2,
                successThreshold: 1,
                monitoringWindow: 5000,
            });
        });

        it('should start in CLOSED state', () => {
            const health = circuitBreaker.getHealth();
            expect(health.state).toBe(CircuitState.CLOSED);
        });

        it('should open circuit after failure threshold is reached', async () => {
            // Trigger failures
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(async () => {
                        throw new Error('Service failure');
                    });
                } catch (error) {
                    // Expected failures
                }
            }

            const health = circuitBreaker.getHealth();
            expect(health.state).toBe(CircuitState.OPEN);
        });

        it('should transition to HALF_OPEN after recovery timeout', async () => {
            // Open the circuit
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(async () => {
                        throw new Error('Service failure');
                    });
                } catch (error) {
                    // Expected failures
                }
            }

            expect(circuitBreaker.getHealth().state).toBe(CircuitState.OPEN);

            // Wait for recovery timeout
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Next execution should enter HALF_OPEN state
            try {
                await circuitBreaker.execute(async () => {
                    throw new Error('Still failing');
                });
            } catch (error) {
                // Expected
            }

            // Circuit should still be open due to failure in half-open
            expect(circuitBreaker.getHealth().state).toBe(CircuitState.OPEN);
        });

        it('should close circuit on successful execution in HALF_OPEN state', async () => {
            // Open the circuit
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(async () => {
                        throw new Error('Service failure');
                    });
                } catch (error) {
                    // Expected failures
                }
            }

            // Wait for recovery timeout
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Execute successful operation
            const result = await circuitBreaker.execute(async () => {
                return 'Success';
            });

            expect(result).toBe('Success');
            expect(circuitBreaker.getHealth().state).toBe(CircuitState.CLOSED);
        });

        it('should handle request timeouts', async () => {
            await expect(
                circuitBreaker.execute(async () => {
                    return new Promise(resolve => setTimeout(resolve, 1000)); // Longer than timeout
                })
            ).rejects.toThrow('Request timeout');
        });
    });
});
