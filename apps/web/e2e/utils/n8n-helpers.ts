import { Page, expect } from '@playwright/test';
import { N8NResponse, getResponseById, getStreamingChunks } from '../fixtures/n8n-responses';

export interface N8NMockConfig {
    webhookUrl: string;
    delayMs?: number;
    failureRate?: number;
    timeoutMs?: number;
}

export class N8NHelper {
    private mockConfig: N8NMockConfig;

    constructor(
        private page: Page,
        config?: Partial<N8NMockConfig>
    ) {
        this.mockConfig = {
            webhookUrl: 'https://n8n.vividwalls.blog/webhook/jetvision-agent',
            delayMs: 2000,
            failureRate: 0,
            timeoutMs: 30000,
            ...config,
        };
    }

    /**
     * Setup N8N webhook mocking
     */
    async setupMocks(): Promise<void> {
        await this.page.route('**/webhook/jetvision-agent**', async route => {
            const request = route.request();
            const method = request.method();
            const postData = request.postDataJSON();

            console.log(`N8N Mock: ${method} request to webhook`, postData);

            // Simulate network delay
            if (this.mockConfig.delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, this.mockConfig.delayMs));
            }

            // Simulate failure rate
            if (Math.random() < this.mockConfig.failureRate) {
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'N8N workflow execution failed',
                        code: 'WORKFLOW_ERROR',
                        timestamp: new Date().toISOString(),
                    }),
                });
                return;
            }

            // Generate mock response based on query
            const mockResponse = this.generateMockResponse(postData?.query || '');

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockResponse),
            });
        });
    }

    /**
     * Setup N8N streaming response mocks
     */
    async setupStreamingMocks(): Promise<void> {
        await this.page.route('**/webhook/jetvision-agent**', async route => {
            const request = route.request();
            const postData = request.postDataJSON();
            const query = postData?.query || '';

            // Determine response type
            let responseType: 'apollo' | 'avinode' | 'system' = 'apollo';
            if (
                query.toLowerCase().includes('aircraft') ||
                query.toLowerCase().includes('avinode')
            ) {
                responseType = 'avinode';
            } else if (
                query.toLowerCase().includes('health') ||
                query.toLowerCase().includes('system')
            ) {
                responseType = 'system';
            }

            const chunks = getStreamingChunks(responseType);

            // Create streaming response
            const stream = new ReadableStream({
                async start(controller) {
                    for (const chunk of chunks) {
                        controller.enqueue(
                            new TextEncoder().encode(
                                `data: ${JSON.stringify({ message: chunk })}\n\n`
                            )
                        );
                        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between chunks
                    }

                    // Send final response
                    const finalResponse = this.generateMockResponse(query);
                    controller.enqueue(
                        new TextEncoder().encode(`data: ${JSON.stringify(finalResponse)}\n\n`)
                    );
                    controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                    controller.close();
                },
            });

            await route.fulfill({
                status: 200,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    Connection: 'keep-alive',
                },
                body: stream,
            });
        });
    }

    /**
     * Generate mock response based on query content
     */
    private generateMockResponse(query: string): N8NResponse {
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('executive assistant') || lowerQuery.includes('apollo')) {
            return getResponseById('apollo-leads-success') || this.createGenericResponse('apollo');
        }

        if (
            lowerQuery.includes('aircraft') ||
            lowerQuery.includes('gulfstream') ||
            lowerQuery.includes('avinode')
        ) {
            return (
                getResponseById('avinode-aircraft-success') || this.createGenericResponse('avinode')
            );
        }

        if (lowerQuery.includes('health') || lowerQuery.includes('system')) {
            return getResponseById('system-health-success') || this.createGenericResponse('system');
        }

        // Default to Apollo response
        return this.createGenericResponse('apollo');
    }

    /**
     * Create generic response for testing
     */
    private createGenericResponse(type: 'apollo' | 'avinode' | 'system'): N8NResponse {
        return {
            id: `mock-${type}-${Date.now()}`,
            type,
            status: 'success',
            data: {
                message: `Mock ${type} response for testing`,
                query: 'Test query',
                results: [],
            },
            metadata: {
                executionTime: this.mockConfig.delayMs,
                workflowId: `mock-${type}-workflow`,
                correlationId: `corr-${Date.now()}`,
                version: '1.0.0',
            },
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Simulate N8N service failure
     */
    async simulateFailure(): Promise<void> {
        await this.page.route('**/webhook/jetvision-agent**', async route => {
            await route.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: 'Service temporarily unavailable',
                    code: 'SERVICE_UNAVAILABLE',
                    timestamp: new Date().toISOString(),
                }),
            });
        });
    }

    /**
     * Simulate N8N timeout
     */
    async simulateTimeout(): Promise<void> {
        await this.page.route('**/webhook/jetvision-agent**', async route => {
            // Don't respond - let it timeout
            setTimeout(async () => {
                await route.fulfill({
                    status: 504,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Gateway timeout',
                        code: 'TIMEOUT',
                        timestamp: new Date().toISOString(),
                    }),
                });
            }, this.mockConfig.timeoutMs);
        });
    }

    /**
     * Verify N8N webhook was called
     */
    async verifyWebhookCalled(expectedQuery?: string): Promise<void> {
        const requests = this.page.context().request;

        // Wait for webhook call
        await this.page.waitForFunction(
            () => {
                return window.fetch && window.fetch.toString().includes('jetvision-agent');
            },
            { timeout: 10000 }
        );

        if (expectedQuery) {
            // Verify the query was sent
            const webhookCalls = await this.page.evaluate(() => {
                return (window as any).__webhookCalls || [];
            });

            const matchingCall = webhookCalls.find((call: any) =>
                call.query?.toLowerCase().includes(expectedQuery.toLowerCase())
            );

            expect(matchingCall).toBeDefined();
        }
    }

    /**
     * Reset all mocks
     */
    async resetMocks(): Promise<void> {
        await this.page.unroute('**/webhook/jetvision-agent**');
        this.mockConfig.failureRate = 0;
    }

    /**
     * Set failure rate for testing error scenarios
     */
    setFailureRate(rate: number): void {
        this.mockConfig.failureRate = Math.max(0, Math.min(1, rate));
    }

    /**
     * Set response delay
     */
    setDelay(delayMs: number): void {
        this.mockConfig.delayMs = Math.max(0, delayMs);
    }

    /**
     * Monitor webhook calls for analytics
     */
    async startMonitoring(): Promise<void> {
        await this.page.addInitScript(() => {
            (window as any).__webhookCalls = [];

            const originalFetch = window.fetch;
            window.fetch = function (...args: any[]) {
                if (args[0]?.toString().includes('jetvision-agent')) {
                    (window as any).__webhookCalls.push({
                        url: args[0],
                        options: args[1],
                        timestamp: new Date().toISOString(),
                    });
                }
                return originalFetch.apply(this, args);
            };
        });
    }

    /**
     * Get webhook call history
     */
    async getWebhookCalls(): Promise<any[]> {
        return await this.page.evaluate(() => {
            return (window as any).__webhookCalls || [];
        });
    }
}

/**
 * Wait for N8N response in chat
 */
export async function waitForN8NResponse(page: Page, timeout: number = 30000): Promise<void> {
    await page.waitForSelector('[data-testid="chat-message"]', { timeout });

    // Wait for response to finish streaming
    await page.waitForFunction(
        () => {
            const messages = document.querySelectorAll('[data-testid="chat-message"]');
            const lastMessage = messages[messages.length - 1];
            return !lastMessage?.classList.contains('streaming');
        },
        { timeout }
    );
}

/**
 * Verify chat contains expected response pattern
 */
export async function verifyChatResponse(page: Page, pattern: RegExp): Promise<void> {
    const messages = await page.locator('[data-testid="chat-message"]').all();
    const lastMessage = messages[messages.length - 1];
    const messageText = await lastMessage.textContent();

    expect(messageText).toMatch(pattern);
}
