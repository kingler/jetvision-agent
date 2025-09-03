import { test, expect, Page, Request } from '@playwright/test';
import { N8NHelper, waitForN8NResponse, verifyChatResponse } from '../utils/n8n-helpers';

/**
 * Comprehensive N8N Webhook Communication Tests
 * Tests the core communication protocols between JetVision Agent and N8N workflows
 * 
 * Test Coverage:
 * 1. POST request structure and validation
 * 2. JSON payload format compliance
 * 3. SSE (Server-Sent Events) streaming responses
 * 4. Error handling for malformed requests
 * 5. Timeout and retry mechanisms
 * 6. Response format validation
 */

test.describe('N8N Webhook Communication Tests', () => {
  const WEBHOOK_URL = 'https://n8n.vividwalls.blog/webhook/jetvision-agent';
  const FRONTEND_URL = 'http://localhost:3000';
  let n8nHelper: N8NHelper;

  test.beforeEach(async ({ page }) => {
    n8nHelper = new N8NHelper(page, {
      webhookUrl: WEBHOOK_URL,
      delayMs: 1000,
      timeoutMs: 15000
    });
    
    await n8nHelper.startMonitoring();
    await page.goto(FRONTEND_URL);
    await expect(page.locator('[data-chat-input="true"]')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    await n8nHelper.resetMocks();
  });

  test.describe('POST Request Structure Tests', () => {
    test('should send properly structured POST request to N8N webhook', async ({ page }) => {
      let capturedRequest: Request | null = null;

      // Capture the webhook request
      await page.route(WEBHOOK_URL + '**', async (route, request) => {
        capturedRequest = request;
        
        // Respond with mock data
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Mock response',
            data: {},
            status: 'success'
          })
        });
      });

      // Send a test message
      const testQuery = 'Check aircraft availability for Miami to New York tomorrow';
      await page.fill('[contenteditable="true"]', testQuery);
      await page.click('button[type="submit"]');

      // Wait for request to be captured
      await page.waitForTimeout(2000);

      expect(capturedRequest).toBeTruthy();
      expect(capturedRequest?.method()).toBe('POST');
      expect(capturedRequest?.headers()['content-type']).toContain('application/json');

      const postData = capturedRequest?.postDataJSON();
      expect(postData).toBeDefined();
      
      // Validate required fields
      expect(postData).toHaveProperty('message');
      expect(postData).toHaveProperty('threadId');
      expect(postData).toHaveProperty('sessionId');
      expect(postData).toHaveProperty('timestamp');

      // Validate message content
      expect(postData.message).toBe(testQuery);
      expect(postData.threadId).toMatch(/^thread-\d{13}$/);
      expect(postData.sessionId).toMatch(/^session-[a-f0-9-]{36}$/);
    });

    test('should include proper authentication headers', async ({ page }) => {
      let capturedRequest: Request | null = null;

      await page.route(WEBHOOK_URL + '**', async (route, request) => {
        capturedRequest = request;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success' })
        });
      });

      await page.fill('[contenteditable="true"]', 'Test authentication');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);

      expect(capturedRequest).toBeTruthy();
      
      const headers = capturedRequest?.headers();
      expect(headers?.['user-agent']).toBeDefined();
      expect(headers?.['accept']).toContain('application/json');
      
      // Verify CORS headers are present if needed
      if (headers?.['origin']) {
        expect(headers['origin']).toContain('localhost:3000');
      }
    });

    test('should handle concurrent requests properly', async ({ page, context }) => {
      const requests: Request[] = [];

      await page.route(WEBHOOK_URL + '**', async (route, request) => {
        requests.push(request);
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: `Response to: ${request.postDataJSON()?.message}`,
            status: 'success'
          })
        });
      });

      // Send multiple concurrent requests
      const queries = [
        'Find executive assistants at NYC private equity firms',
        'Check aircraft availability for Miami to New York',
        'Analyze prospect to booking conversions this week'
      ];

      // Open multiple tabs and send concurrent requests
      const pages = await Promise.all([
        context.newPage(),
        context.newPage(),
        context.newPage()
      ]);

      await Promise.all(
        pages.map(async (testPage, index) => {
          await testPage.goto(FRONTEND_URL);
          await expect(testPage.locator('[data-chat-input="true"]')).toBeVisible();
          await testPage.fill('[contenteditable="true"]', queries[index]);
          await testPage.click('button[type="submit"]');
        })
      );

      // Wait for all requests to complete
      await page.waitForTimeout(2000);

      expect(requests.length).toBe(3);
      
      // Verify each request has unique identifiers
      const threadIds = requests.map(req => req.postDataJSON()?.threadId);
      const sessionIds = requests.map(req => req.postDataJSON()?.sessionId);
      
      expect(new Set(threadIds).size).toBe(3); // All unique thread IDs
      expect(new Set(sessionIds).size).toBe(3); // All unique session IDs

      // Cleanup
      await Promise.all(pages.map(p => p.close()));
    });
  });

  test.describe('JSON Payload Validation Tests', () => {
    test('should validate complete payload structure', async ({ page }) => {
      let capturedPayload: any = null;

      await page.route(WEBHOOK_URL + '**', async (route, request) => {
        capturedPayload = request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success' })
        });
      });

      await page.fill('[contenteditable="true"]', 'Analyze prospect to booking conversions this week');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);

      expect(capturedPayload).toBeDefined();

      // Validate top-level structure
      expect(capturedPayload).toHaveProperty('message');
      expect(capturedPayload).toHaveProperty('threadId');
      expect(capturedPayload).toHaveProperty('sessionId');
      expect(capturedPayload).toHaveProperty('timestamp');
      expect(capturedPayload).toHaveProperty('metadata');

      // Validate metadata structure
      const metadata = capturedPayload.metadata;
      expect(metadata).toHaveProperty('source');
      expect(metadata).toHaveProperty('version');
      expect(metadata).toHaveProperty('userAgent');
      expect(metadata).toHaveProperty('clientId');

      expect(metadata.source).toBe('jetvision-agent');
      expect(metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(metadata.clientId).toMatch(/^client-[a-f0-9-]{36}$/);

      // Validate timestamp format (ISO 8601)
      expect(capturedPayload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should validate prompt-based payload enrichment', async ({ page }) => {
      let capturedPayload: any = null;

      await page.route(WEBHOOK_URL + '**', async (route, request) => {
        capturedPayload = request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success' })
        });
      });

      // Test with a query that should match a specific prompt template
      const apolloQuery = 'Find executive assistants at NYC private equity firms';
      await page.fill('[contenteditable="true"]', apolloQuery);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);

      expect(capturedPayload).toBeDefined();

      // Should include prompt classification
      expect(capturedPayload).toHaveProperty('promptId');
      expect(capturedPayload).toHaveProperty('category');
      expect(capturedPayload).toHaveProperty('intent');

      // Validate intent structure for Apollo query
      const intent = capturedPayload.intent;
      expect(intent).toHaveProperty('primary');
      expect(intent).toHaveProperty('confidence');
      expect(intent).toHaveProperty('businessContext');
      expect(intent).toHaveProperty('entities');

      expect(intent.businessContext).toBe('apollo');
      expect(intent.confidence).toBeGreaterThan(0.5);
      expect(Array.isArray(intent.entities)).toBe(true);
    });

    test('should handle special characters and unicode in messages', async ({ page }) => {
      let capturedPayload: any = null;

      await page.route(WEBHOOK_URL + '**', async (route, request) => {
        capturedPayload = request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success' })
        });
      });

      const specialCharsMessage = 'Search for "Société Générale" executives with résumés containing €100M+ deals';
      await page.fill('[contenteditable="true"]', specialCharsMessage);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);

      expect(capturedPayload).toBeDefined();
      expect(capturedPayload.message).toBe(specialCharsMessage);
      
      // Verify the message is properly encoded
      const jsonString = JSON.stringify(capturedPayload);
      expect(jsonString).toContain('Société Générale');
      expect(jsonString).toContain('résumés');
      expect(jsonString).toContain('€100M+');
    });
  });

  test.describe('SSE Streaming Response Tests', () => {
    test('should handle Server-Sent Events streaming responses', async ({ page }) => {
      const streamingChunks: string[] = [];
      
      await page.route(WEBHOOK_URL + '**', async (route) => {
        const stream = new ReadableStream({
          start(controller) {
            const chunks = [
              'Searching Apollo.io database...',
              'Found 127 potential matches...',
              'Filtering by job title and company size...',
              'Processing complete. Found 15 qualified leads.'
            ];

            chunks.forEach((chunk, index) => {
              setTimeout(() => {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ message: chunk })}\n\n`));
                if (index === chunks.length - 1) {
                  controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                  controller.close();
                }
              }, index * 1000);
            });
          }
        });

        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
          },
          body: stream
        });
      });

      // Capture streaming messages on the client side
      await page.addInitScript(() => {
        (window as any).streamingMessages = [];
        const originalEventSource = window.EventSource;
        
        window.EventSource = class extends originalEventSource {
          constructor(url: string, options?: any) {
            super(url, options);
            
            this.addEventListener('message', (event) => {
              try {
                const data = JSON.parse(event.data);
                (window as any).streamingMessages.push(data.message);
              } catch (e) {
                // Handle non-JSON messages
              }
            });
          }
        };
      });

      await page.fill('[contenteditable="true"]', 'Find executive assistants at NYC private equity firms');
      await page.click('button[type="submit"]');

      // Wait for streaming to complete
      await page.waitForTimeout(6000);

      // Verify streaming messages were received
      const streamingMessages = await page.evaluate(() => (window as any).streamingMessages || []);
      expect(streamingMessages.length).toBeGreaterThan(0);
      expect(streamingMessages).toContain('Searching Apollo.io database...');
      expect(streamingMessages).toContain('Processing complete. Found 15 qualified leads.');
    });

    test('should handle streaming interruption and reconnection', async ({ page }) => {
      let connectionCount = 0;

      await page.route(WEBHOOK_URL + '**', async (route) => {
        connectionCount++;
        
        if (connectionCount === 1) {
          // First connection - interrupt after 2 chunks
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ message: 'Starting search...' })}\n\n`));
              
              setTimeout(() => {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ message: 'Found initial results...' })}\n\n`));
              }, 1000);
              
              // Simulate connection drop
              setTimeout(() => {
                controller.error(new Error('Connection lost'));
              }, 2000);
            }
          });

          await route.fulfill({
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            },
            body: stream
          });
        } else {
          // Reconnection - complete the stream
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ message: 'Reconnected. Continuing search...' })}\n\n`));
              
              setTimeout(() => {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ message: 'Search completed successfully.' })}\n\n`));
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                controller.close();
              }, 1000);
            }
          });

          await route.fulfill({
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            },
            body: stream
          });
        }
      });

      await page.fill('[contenteditable="true"]', 'Search for available aircraft');
      await page.click('button[type="submit"]');

      // Wait for reconnection and completion
      await page.waitForTimeout(8000);

      expect(connectionCount).toBeGreaterThanOrEqual(2);
    });

    test('should parse SSE data correctly with different event types', async ({ page }) => {
      let eventTypes: string[] = [];

      await page.route(WEBHOOK_URL + '**', async (route) => {
        const stream = new ReadableStream({
          start(controller) {
            // Send different SSE event types
            const events = [
              { event: 'start', data: { message: 'Starting workflow execution' } },
              { event: 'progress', data: { message: 'Processing step 1 of 3', progress: 33 } },
              { event: 'progress', data: { message: 'Processing step 2 of 3', progress: 66 } },
              { event: 'result', data: { message: 'Workflow completed', results: ['item1', 'item2'] } },
              { event: 'complete', data: { message: 'Done' } }
            ];

            events.forEach((event, index) => {
              setTimeout(() => {
                if (event.event !== 'message') {
                  controller.enqueue(new TextEncoder().encode(`event: ${event.event}\n`));
                }
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event.data)}\n\n`));
                
                if (index === events.length - 1) {
                  controller.close();
                }
              }, index * 500);
            });
          }
        });

        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
          body: stream
        });
      });

      // Setup event type capture
      await page.addInitScript(() => {
        (window as any).capturedEventTypes = [];
        const originalEventSource = window.EventSource;
        
        window.EventSource = class extends originalEventSource {
          constructor(url: string, options?: any) {
            super(url, options);
            
            ['start', 'progress', 'result', 'complete'].forEach(eventType => {
              this.addEventListener(eventType, (event) => {
                (window as any).capturedEventTypes.push(eventType);
              });
            });
          }
        };
      });

      await page.fill('[contenteditable="true"]', 'Test different SSE event types');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(4000);

      eventTypes = await page.evaluate(() => (window as any).capturedEventTypes || []);
      expect(eventTypes).toContain('start');
      expect(eventTypes).toContain('progress');
      expect(eventTypes).toContain('result');
      expect(eventTypes).toContain('complete');
    });
  });

  test.describe('Error Handling Tests', () => {
    test('should handle malformed JSON responses gracefully', async ({ page }) => {
      await page.route(WEBHOOK_URL + '**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json content{'
        });
      });

      await page.fill('[contenteditable="true"]', 'Test malformed response');
      await page.click('button[type="submit"]');

      // Should show error message in chat
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });
      
      const errorText = await page.locator('[data-testid="error-message"]').textContent();
      expect(errorText).toContain('Unable to process response');
    });

    test('should handle HTTP error status codes', async ({ page }) => {
      const errorCodes = [400, 401, 403, 404, 500, 502, 503, 504];

      for (const statusCode of errorCodes) {
        await page.route(WEBHOOK_URL + '**', async (route) => {
          await route.fulfill({
            status: statusCode,
            contentType: 'application/json',
            body: JSON.stringify({
              error: `HTTP ${statusCode} error`,
              code: `HTTP_${statusCode}`,
              message: `Server returned ${statusCode}`
            })
          });
        });

        await page.fill('[contenteditable="true"]', `Test HTTP ${statusCode} error`);
        await page.click('button[type="submit"]');

        // Verify error handling
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });
        
        const errorElement = page.locator('[data-testid="error-message"]');
        const errorText = await errorElement.textContent();
        expect(errorText).toContain('error');
        
        // Clear error before next test
        await page.reload();
        await expect(page.locator('[data-chat-input="true"]')).toBeVisible();
      }
    });

    test('should implement retry mechanism for temporary failures', async ({ page }) => {
      let requestCount = 0;

      await page.route(WEBHOOK_URL + '**', async (route) => {
        requestCount++;
        
        if (requestCount < 3) {
          // Fail first 2 attempts
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Service temporarily unavailable' })
          });
        } else {
          // Succeed on 3rd attempt
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              message: 'Request succeeded after retry',
              status: 'success'
            })
          });
        }
      });

      await page.fill('[contenteditable="true"]', 'Test retry mechanism');
      await page.click('button[type="submit"]');

      // Wait for retries to complete
      await page.waitForTimeout(10000);

      expect(requestCount).toBeGreaterThanOrEqual(3);
      
      // Should eventually show success message
      await expect(page.locator(':text("Request succeeded after retry")')).toBeVisible({ timeout: 15000 });
    });

    test('should validate request payload before sending', async ({ page }) => {
      let capturedRequest: Request | null = null;

      await page.route(WEBHOOK_URL + '**', async (route, request) => {
        capturedRequest = request;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success' })
        });
      });

      // Test empty message handling
      await page.fill('[contenteditable="true"]', '   '); // Only whitespace
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);

      // Should not send request for empty messages
      expect(capturedRequest).toBeNull();

      // Test valid message
      await page.fill('[contenteditable="true"]', 'Valid test message');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);

      expect(capturedRequest).toBeTruthy();
      expect(capturedRequest?.postDataJSON()?.message).toBe('Valid test message');
    });
  });

  test.describe('Performance and Timeout Tests', () => {
    test('should handle webhook timeout gracefully', async ({ page }) => {
      await page.route(WEBHOOK_URL + '**', async (route) => {
        // Don't respond - let it timeout
        await new Promise(resolve => {
          setTimeout(resolve, 60000); // Wait longer than expected timeout
        });
      });

      await page.fill('[contenteditable="true"]', 'Test timeout scenario');
      await page.click('button[type="submit"]');

      // Should show timeout error
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible({ timeout: 35000 });
    });

    test('should measure and log response times', async ({ page }) => {
      const responseTimes: number[] = [];

      await page.route(WEBHOOK_URL + '**', async (route) => {
        const delay = Math.random() * 2000 + 500; // Random delay 0.5-2.5s
        await new Promise(resolve => setTimeout(resolve, delay));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Response received',
            processingTime: delay
          })
        });
      });

      // Monitor response times on client side
      await page.addInitScript(() => {
        (window as any).responseTimes = [];
        
        // Override fetch to measure response times
        const originalFetch = window.fetch;
        window.fetch = async function(...args: any[]) {
          const startTime = Date.now();
          try {
            const response = await originalFetch.apply(this, args);
            const endTime = Date.now();
            (window as any).responseTimes.push(endTime - startTime);
            return response;
          } catch (error) {
            const endTime = Date.now();
            (window as any).responseTimes.push(endTime - startTime);
            throw error;
          }
        };
      });

      // Send multiple requests to measure performance
      for (let i = 0; i < 5; i++) {
        await page.fill('[contenteditable="true"]', `Performance test message ${i + 1}`);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000); // Wait for response
        
        // Clear input for next message
        await page.fill('[contenteditable="true"]', '');
      }

      const clientResponseTimes = await page.evaluate(() => (window as any).responseTimes || []);
      expect(clientResponseTimes.length).toBe(5);
      
      // Verify response times are reasonable (less than 10 seconds)
      clientResponseTimes.forEach((time: number) => {
        expect(time).toBeLessThan(10000);
        expect(time).toBeGreaterThan(0);
      });

      // Calculate average response time
      const averageTime = clientResponseTimes.reduce((a: number, b: number) => a + b, 0) / clientResponseTimes.length;
      expect(averageTime).toBeLessThan(5000); // Average should be under 5 seconds
    });
  });
});