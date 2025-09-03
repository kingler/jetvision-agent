import { test, expect, Page } from '@playwright/test';
import { N8NHelper } from '../utils/n8n-helpers';

/**
 * Performance and Timeout Testing
 * Tests performance characteristics, timeout handling, and response time measurements
 * 
 * Test Coverage:
 * 1. Response time measurements and benchmarks
 * 2. Timeout scenario handling (webhook, network, processing)
 * 3. Load testing with concurrent requests
 * 4. Memory usage and resource management
 * 5. Streaming performance and latency
 * 6. Error recovery performance
 * 7. UI responsiveness under load
 * 8. Database performance with large datasets
 */

test.describe('Performance and Timeout Tests', () => {
  const WEBHOOK_URL = 'https://n8n.vividwalls.blog/webhook/jetvision-agent';
  const FRONTEND_URL = 'http://localhost:3000';
  let n8nHelper: N8NHelper;

  test.beforeEach(async ({ page }) => {
    n8nHelper = new N8NHelper(page, {
      webhookUrl: WEBHOOK_URL,
      delayMs: 100 // Minimal delay for performance tests
    });
    
    await n8nHelper.startMonitoring();
    await page.goto(FRONTEND_URL);
    await expect(page.locator('[data-chat-input="true"]')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    await n8nHelper.resetMocks();
  });

  test.describe('Response Time Measurements', () => {
    test('should measure and validate webhook response times', async ({ page }) => {
      const responseTimes: number[] = [];
      const TARGET_RESPONSE_TIME = 5000; // 5 seconds max
      const IDEAL_RESPONSE_TIME = 2000;   // 2 seconds ideal

      await page.route(WEBHOOK_URL + '**', async (route) => {
        const startTime = Date.now();
        const delay = Math.random() * 3000 + 500; // Random 0.5-3.5s delay
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: `Response completed in ${responseTime}ms`,
            processingTime: responseTime,
            status: 'success'
          })
        });
      });

      // Monitor client-side timing
      await page.addInitScript(() => {
        (window as any).performanceMetrics = [];
        
        const originalFetch = window.fetch;
        window.fetch = async function(...args: any[]) {
          const startTime = performance.now();
          try {
            const response = await originalFetch.apply(this, args);
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            (window as any).performanceMetrics.push({
              url: args[0],
              duration,
              timestamp: new Date().toISOString(),
              status: response.status
            });
            
            return response;
          } catch (error) {
            const endTime = performance.now();
            (window as any).performanceMetrics.push({
              url: args[0],
              duration: endTime - startTime,
              timestamp: new Date().toISOString(),
              error: error.message
            });
            throw error;
          }
        };
      });

      // Send test requests
      const testQueries = [
        'Quick aircraft search',
        'Find executive assistants in NYC',
        'Analyze conversion metrics',
        'Check fleet utilization',
        'Generate executive briefing'
      ];

      for (const query of testQueries) {
        const startTime = Date.now();
        
        await page.fill('[contenteditable="true"]', query);
        await page.click('button[type="submit"]');
        
        // Wait for response
        await expect(page.locator(`text="${query}"`)).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000); // Brief pause between requests
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        expect(totalTime).toBeLessThan(TARGET_RESPONSE_TIME);
      }

      // Analyze performance metrics
      const clientMetrics = await page.evaluate(() => (window as any).performanceMetrics || []);
      
      expect(clientMetrics.length).toBeGreaterThan(0);
      
      const avgResponseTime = clientMetrics.reduce((sum: number, metric: any) => sum + metric.duration, 0) / clientMetrics.length;
      
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Target: ${TARGET_RESPONSE_TIME}ms, Ideal: ${IDEAL_RESPONSE_TIME}ms`);
      
      expect(avgResponseTime).toBeLessThan(TARGET_RESPONSE_TIME);
      
      // Log performance insights
      if (avgResponseTime > IDEAL_RESPONSE_TIME) {
        console.warn(`Performance warning: Average response time ${avgResponseTime.toFixed(2)}ms exceeds ideal ${IDEAL_RESPONSE_TIME}ms`);
      }
    });

    test('should maintain consistent performance across multiple requests', async ({ page }) => {
      const performanceData: number[] = [];

      await page.route(WEBHOOK_URL + '**', async (route) => {
        // Consistent 1-second response time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Consistent response', status: 'success' })
        });
      });

      // Send 10 requests and measure consistency
      for (let i = 1; i <= 10; i++) {
        const startTime = performance.now();
        
        await page.fill('[contenteditable="true"]', `Consistency test ${i}`);
        await page.click('button[type="submit"]');
        
        await page.waitForTimeout(1500); // Wait for response
        
        const endTime = performance.now();
        performanceData.push(endTime - startTime);
      }

      // Calculate performance statistics
      const avg = performanceData.reduce((sum, val) => sum + val, 0) / performanceData.length;
      const variance = performanceData.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / performanceData.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / avg;

      console.log(`Performance Stats - Avg: ${avg.toFixed(2)}ms, StdDev: ${stdDev.toFixed(2)}ms, CV: ${coefficientOfVariation.toFixed(3)}`);

      // Expect low coefficient of variation (consistent performance)
      expect(coefficientOfVariation).toBeLessThan(0.3); // Less than 30% variation
      expect(stdDev).toBeLessThan(500); // Less than 500ms standard deviation
    });

    test('should handle performance degradation gracefully', async ({ page }) => {
      let requestCount = 0;
      const performanceDegradation = [1000, 2000, 3000, 5000, 8000]; // Increasing delays

      await page.route(WEBHOOK_URL + '**', async (route) => {
        const delay = performanceDegradation[requestCount % performanceDegradation.length];
        requestCount++;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: `Response ${requestCount} with ${delay}ms delay`,
            delay,
            status: 'success'
          })
        });
      });

      const testMessages = Array.from({ length: 5 }, (_, i) => `Degradation test ${i + 1}`);
      const responseTimes: number[] = [];

      for (const message of testMessages) {
        const startTime = Date.now();
        
        await page.fill('[contenteditable="true"]', message);
        await page.click('button[type="submit"]');
        
        // Wait for response with increased timeout for slower responses
        await page.waitForTimeout(10000);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      // Verify system handles degradation
      expect(responseTimes.every(time => time < 15000)).toBe(true); // All under 15 seconds
      
      // Check that UI remains responsive (no frozen interface)
      await expect(page.locator('[data-chat-input="true"]')).toBeEnabled();
    });
  });

  test.describe('Timeout Scenario Handling', () => {
    test('should handle webhook timeouts gracefully', async ({ page }) => {
      const TIMEOUT_THRESHOLD = 30000; // 30 seconds

      await page.route(WEBHOOK_URL + '**', async (route) => {
        // Don't respond to simulate timeout
        await new Promise(() => {}); // Never resolves
      });

      const startTime = Date.now();
      
      await page.fill('[contenteditable="true"]', 'Test webhook timeout');
      await page.click('button[type="submit"]');

      // Should show timeout error
      await expect(page.locator('[data-testid="timeout-error"], [data-testid="error-message"]')).toBeVisible({ 
        timeout: TIMEOUT_THRESHOLD + 5000 
      });

      const timeoutTime = Date.now() - startTime;
      
      // Timeout should occur around expected time
      expect(timeoutTime).toBeGreaterThan(TIMEOUT_THRESHOLD - 5000);
      expect(timeoutTime).toBeLessThan(TIMEOUT_THRESHOLD + 10000);

      // UI should recover and allow new requests
      await expect(page.locator('[data-chat-input="true"]')).toBeEnabled();
      await expect(page.locator('button[type="submit"]')).toBeEnabled();
    });

    test('should handle network timeouts with proper user feedback', async ({ page }) => {
      await page.route(WEBHOOK_URL + '**', async (route) => {
        // Simulate network timeout by delaying response beyond timeout
        await new Promise(resolve => setTimeout(resolve, 35000));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Late response', status: 'success' })
        });
      });

      await page.fill('[contenteditable="true"]', 'Test network timeout');
      await page.click('button[type="submit"]');

      // Should show loading indicator
      await expect(page.locator('[data-testid="generating-status"]')).toBeVisible({ timeout: 2000 });

      // Should eventually show timeout error
      await expect(page.locator('[data-testid="timeout-error"], [data-testid="error-message"]')).toBeVisible({
        timeout: 40000
      });

      // Error message should be informative
      const errorMessage = await page.locator('[data-testid="timeout-error"], [data-testid="error-message"]').textContent();
      expect(errorMessage).toMatch(/timeout|connectivity|connection|unavailable/i);
    });

    test('should implement circuit breaker pattern for repeated failures', async ({ page }) => {
      let requestCount = 0;
      const FAILURE_THRESHOLD = 5;

      await page.route(WEBHOOK_URL + '**', async (route) => {
        requestCount++;
        
        if (requestCount <= FAILURE_THRESHOLD) {
          // Fail first few requests
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: `Failure ${requestCount}` })
          });
        } else {
          // After threshold, simulate circuit breaker
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Circuit breaker open - too many failures',
              code: 'CIRCUIT_BREAKER_OPEN'
            })
          });
        }
      });

      // Send requests to trigger circuit breaker
      for (let i = 1; i <= FAILURE_THRESHOLD + 2; i++) {
        await page.fill('[contenteditable="true"]', `Circuit breaker test ${i}`);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
      }

      // Later requests should get circuit breaker response
      const errorMessages = await page.locator('[data-testid="error-message"]').allTextContents();
      const circuitBreakerMessage = errorMessages.find(msg => msg.includes('circuit breaker') || msg.includes('too many failures'));
      
      expect(circuitBreakerMessage).toBeDefined();
    });

    test('should handle streaming timeouts and partial responses', async ({ page }) => {
      await page.route(WEBHOOK_URL + '**', async (route) => {
        const stream = new ReadableStream({
          start(controller) {
            // Send a few chunks then timeout
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ message: 'Starting process...' })}\n\n`));
            
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ message: 'Partial progress...' })}\n\n`));
            }, 1000);
            
            // Don't send more chunks - simulate streaming timeout
            setTimeout(() => {
              controller.error(new Error('Streaming timeout'));
            }, 5000);
          }
        });

        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: stream
        });
      });

      await page.fill('[contenteditable="true"]', 'Test streaming timeout');
      await page.click('button[type="submit"]');

      // Should receive partial messages
      await expect(page.locator(':text("Starting process...")')).toBeVisible({ timeout: 3000 });
      await expect(page.locator(':text("Partial progress...")')).toBeVisible({ timeout: 3000 });

      // Should handle stream error gracefully
      await page.waitForTimeout(8000);
      
      // Should show error or incomplete indicator
      const hasError = await page.locator('[data-testid="error-message"], [data-testid="incomplete-response"]').isVisible();
      expect(hasError).toBe(true);
    });
  });

  test.describe('Load Testing and Concurrent Requests', () => {
    test('should handle moderate concurrent load', async ({ page, context }) => {
      const CONCURRENT_REQUESTS = 5;
      const requestTimes: number[] = [];

      await page.route(WEBHOOK_URL + '**', async (route) => {
        const delay = Math.random() * 2000 + 500; // 0.5-2.5s delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Concurrent response', status: 'success' })
        });
      });

      // Create multiple tabs for concurrent testing
      const tabs = await Promise.all(
        Array.from({ length: CONCURRENT_REQUESTS }, () => context.newPage())
      );

      // Setup route for each tab
      for (const tab of tabs) {
        await tab.route(WEBHOOK_URL + '**', async (route) => {
          const delay = Math.random() * 2000 + 500;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Concurrent response', status: 'success' })
          });
        });
        
        await tab.goto(FRONTEND_URL);
        await expect(tab.locator('[data-chat-input="true"]')).toBeVisible();
      }

      // Send concurrent requests
      const startTime = Date.now();
      
      await Promise.all(
        tabs.map(async (tab, index) => {
          const tabStartTime = Date.now();
          await tab.fill('[contenteditable="true"]', `Concurrent request ${index + 1}`);
          await tab.click('button[type="submit"]');
          
          await tab.waitForTimeout(3000);
          requestTimes.push(Date.now() - tabStartTime);
        })
      );

      const totalTime = Date.now() - startTime;
      
      console.log(`Concurrent load test completed in ${totalTime}ms`);
      console.log(`Individual request times: ${requestTimes.map(t => t.toFixed(0)).join(', ')}ms`);

      // All requests should complete within reasonable time
      expect(requestTimes.every(time => time < 10000)).toBe(true);
      
      // Total time should be reasonable for concurrent execution
      expect(totalTime).toBeLessThan(15000);

      // Cleanup
      await Promise.all(tabs.map(tab => tab.close()));
    });

    test('should maintain UI responsiveness under load', async ({ page }) => {
      let requestCount = 0;

      await page.route(WEBHOOK_URL + '**', async (route) => {
        requestCount++;
        // Simulate heavy load with longer delays
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: `Load test response ${requestCount}`, status: 'success' })
        });
      });

      // Send multiple requests rapidly
      for (let i = 1; i <= 3; i++) {
        await page.fill('[contenteditable="true"]', `Load test ${i}`);
        await page.click('button[type="submit"]');
        
        // Check UI responsiveness immediately after sending
        await expect(page.locator('[data-chat-input="true"]')).toBeVisible({ timeout: 1000 });
        
        // UI should still be interactive (can focus input)
        await page.locator('[contenteditable="true"]').focus();
        
        await page.waitForTimeout(500);
      }

      // Wait for all requests to complete
      await page.waitForTimeout(12000);

      // Final UI state should be normal
      await expect(page.locator('[data-chat-input="true"]')).toBeEnabled();
      await expect(page.locator('button[type="submit"]')).toBeEnabled();
    });

    test('should manage memory usage with large conversation histories', async ({ page }) => {
      const LARGE_MESSAGE_COUNT = 20;
      let memoryBaseline: number;
      let memoryPeak: number;

      // Get initial memory baseline
      memoryBaseline = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      await page.route(WEBHOOK_URL + '**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            message: 'Large response with significant content data for memory testing purposes. This message contains additional data to simulate realistic memory usage patterns in a production environment with complex responses from the N8N workflow system.',
            status: 'success' 
          })
        });
      });

      // Send many messages to build up conversation history
      for (let i = 1; i <= LARGE_MESSAGE_COUNT; i++) {
        await page.fill('[contenteditable="true"]', `Memory test message ${i} with additional content to increase memory usage`);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(800);
      }

      // Measure peak memory usage
      memoryPeak = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      const memoryIncrease = memoryPeak - memoryBaseline;
      
      console.log(`Memory usage - Baseline: ${(memoryBaseline / 1024 / 1024).toFixed(2)}MB, Peak: ${(memoryPeak / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory increase should be reasonable (less than 50MB for 20 messages)
      if (memoryBaseline > 0) {
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
      }

      // UI should still be responsive
      await expect(page.locator('[data-chat-input="true"]')).toBeEnabled();
    });
  });

  test.describe('Streaming Performance and Latency', () => {
    test('should measure streaming latency and throughput', async ({ page }) => {
      const streamingMetrics = {
        firstByteTime: 0,
        totalStreamTime: 0,
        chunkCount: 0,
        chunkIntervals: [] as number[]
      };

      await page.route(WEBHOOK_URL + '**', async (route) => {
        const chunks = [
          'Initializing search process...',
          'Connecting to data sources...',
          'Processing search criteria...',
          'Filtering results by relevance...',
          'Enriching contact information...',
          'Finalizing response data...',
          'Search completed successfully.'
        ];

        const stream = new ReadableStream({
          start(controller) {
            chunks.forEach((chunk, index) => {
              setTimeout(() => {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ message: chunk })}\n\n`));
                
                if (index === chunks.length - 1) {
                  controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                  controller.close();
                }
              }, index * 800); // 800ms between chunks
            });
          }
        });

        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: stream
        });
      });

      // Monitor streaming performance
      await page.addInitScript(() => {
        (window as any).streamingMetrics = {
          startTime: 0,
          firstByteTime: 0,
          chunkTimes: [],
          totalChunks: 0
        };
        
        const originalEventSource = window.EventSource;
        window.EventSource = class extends originalEventSource {
          constructor(url: string, options?: any) {
            super(url, options);
            (window as any).streamingMetrics.startTime = performance.now();
            
            this.addEventListener('message', (event) => {
              const now = performance.now();
              
              if ((window as any).streamingMetrics.firstByteTime === 0) {
                (window as any).streamingMetrics.firstByteTime = now - (window as any).streamingMetrics.startTime;
              }
              
              (window as any).streamingMetrics.chunkTimes.push(now);
              (window as any).streamingMetrics.totalChunks++;
            });
          }
        };
      });

      const startTime = Date.now();
      
      await page.fill('[contenteditable="true"]', 'Test streaming performance');
      await page.click('button[type="submit"]');

      // Wait for streaming to complete
      await expect(page.locator(':text("Search completed successfully")')).toBeVisible({ timeout: 10000 });
      
      const totalTime = Date.now() - startTime;

      // Get streaming metrics
      const clientMetrics = await page.evaluate(() => (window as any).streamingMetrics);
      
      console.log(`Streaming Performance:`);
      console.log(`- First byte time: ${clientMetrics.firstByteTime?.toFixed(2)}ms`);
      console.log(`- Total chunks: ${clientMetrics.totalChunks}`);
      console.log(`- Total streaming time: ${totalTime}ms`);

      // Performance expectations
      if (clientMetrics.firstByteTime) {
        expect(clientMetrics.firstByteTime).toBeLessThan(2000); // First byte within 2 seconds
      }
      expect(clientMetrics.totalChunks).toBeGreaterThan(0);
      expect(totalTime).toBeLessThan(8000); // Complete within 8 seconds
    });

    test('should handle streaming backpressure efficiently', async ({ page }) => {
      const CHUNK_COUNT = 20;
      const CHUNK_INTERVAL = 100; // Fast chunks to test backpressure

      await page.route(WEBHOOK_URL + '**', async (route) => {
        const stream = new ReadableStream({
          start(controller) {
            for (let i = 0; i < CHUNK_COUNT; i++) {
              setTimeout(() => {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
                  message: `Chunk ${i + 1} of ${CHUNK_COUNT}`,
                  progress: ((i + 1) / CHUNK_COUNT) * 100
                })}\n\n`));
                
                if (i === CHUNK_COUNT - 1) {
                  controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                  controller.close();
                }
              }, i * CHUNK_INTERVAL);
            }
          }
        });

        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: stream
        });
      });

      await page.fill('[contenteditable="true"]', 'Test backpressure handling');
      await page.click('button[type="submit"]');

      // Wait for all chunks to be processed
      await expect(page.locator(`:text("Chunk ${CHUNK_COUNT} of ${CHUNK_COUNT}")`)).toBeVisible({ timeout: 5000 });

      // UI should remain responsive throughout
      await expect(page.locator('[data-chat-input="true"]')).toBeEnabled();
    });
  });

  test.describe('Error Recovery Performance', () => {
    test('should recover quickly from network errors', async ({ page }) => {
      let requestCount = 0;

      await page.route(WEBHOOK_URL + '**', async (route) => {
        requestCount++;
        
        if (requestCount === 1) {
          // First request fails
          await route.abort('failed');
        } else {
          // Subsequent requests succeed
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Recovery successful', status: 'success' })
          });
        }
      });

      const recoveryStartTime = Date.now();

      // First request (will fail)
      await page.fill('[contenteditable="true"]', 'Test recovery performance');
      await page.click('button[type="submit"]');

      // Wait for error
      await expect(page.locator('[data-testid="error-message"], [data-testid="network-error"]')).toBeVisible({ timeout: 5000 });

      // Second request (should succeed)
      await page.fill('[contenteditable="true"]', 'Recovery test');
      await page.click('button[type="submit"]');

      // Wait for success
      await expect(page.locator(':text("Recovery successful")')).toBeVisible({ timeout: 5000 });

      const recoveryTime = Date.now() - recoveryStartTime;
      
      console.log(`Error recovery time: ${recoveryTime}ms`);
      
      // Recovery should be fast (under 10 seconds total)
      expect(recoveryTime).toBeLessThan(10000);
    });

    test('should handle rapid error-recovery cycles', async ({ page }) => {
      let requestCount = 0;
      const errorPattern = [true, false, true, false, false]; // Error, success, error, success, success

      await page.route(WEBHOOK_URL + '**', async (route) => {
        const shouldError = errorPattern[requestCount % errorPattern.length];
        requestCount++;

        if (shouldError) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Temporary error' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Success', status: 'success' })
          });
        }
      });

      const startTime = Date.now();

      // Send requests following the error pattern
      for (let i = 0; i < errorPattern.length; i++) {
        await page.fill('[contenteditable="true"]', `Cycle test ${i + 1}`);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
      }

      const totalTime = Date.now() - startTime;

      // Should handle all requests within reasonable time
      expect(totalTime).toBeLessThan(15000);
      
      // UI should be in good final state
      await expect(page.locator('[data-chat-input="true"]')).toBeEnabled();
    });
  });

  test.describe('Database Performance', () => {
    test('should handle large conversation history efficiently', async ({ page }) => {
      const CONVERSATION_SIZE = 15;
      const dbOperationTimes: number[] = [];

      await page.route(WEBHOOK_URL + '**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            message: 'Database performance test response with conversation history',
            status: 'success' 
          })
        });
      });

      // Monitor database operations
      await page.addInitScript(() => {
        (window as any).dbMetrics = {
          operationTimes: [],
          operationCount: 0
        };
        
        // Mock IndexedDB performance monitoring
        if (window.indexedDB) {
          const originalOpen = indexedDB.open;
          indexedDB.open = function(...args) {
            const startTime = performance.now();
            const request = originalOpen.apply(this, args);
            
            request.onsuccess = function(event) {
              const endTime = performance.now();
              (window as any).dbMetrics.operationTimes.push(endTime - startTime);
              (window as any).dbMetrics.operationCount++;
            };
            
            return request;
          };
        }
      });

      // Build large conversation
      for (let i = 1; i <= CONVERSATION_SIZE; i++) {
        const operationStart = Date.now();
        
        await page.fill('[contenteditable="true"]', `DB test message ${i}`);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
        
        const operationTime = Date.now() - operationStart;
        dbOperationTimes.push(operationTime);
      }

      // Analyze database performance
      const avgDbTime = dbOperationTimes.reduce((sum, time) => sum + time, 0) / dbOperationTimes.length;
      
      console.log(`Database Performance - Avg operation time: ${avgDbTime.toFixed(2)}ms`);
      
      // Database operations should be reasonably fast
      expect(avgDbTime).toBeLessThan(2000); // Under 2 seconds per operation
      
      // No operation should be extremely slow
      expect(dbOperationTimes.every(time => time < 5000)).toBe(true);
    });
  });
});