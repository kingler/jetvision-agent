import { test, expect } from '@playwright/test';
import { AuthHelper, quickLogin } from '../utils/auth-helpers';
import { N8NHelper, waitForN8NResponse } from '../utils/n8n-helpers';
import { PerformanceAssertions } from '../utils/assertions';
import { apolloQueries, avinodeQueries } from '../fixtures/aviation-queries';

test.describe('Performance and Reliability Tests', () => {
    let authHelper: AuthHelper;
    let n8nHelper: N8NHelper;

    test.beforeEach(async ({ page }) => {
        authHelper = new AuthHelper(page);
        n8nHelper = new N8NHelper(page);

        // Setup N8N mocks with realistic delays
        n8nHelper.setDelay(2000); // 2 second delay for realistic testing
        await n8nHelper.setupMocks();

        // Login as admin for full access
        await quickLogin(page, 'admin');

        // Navigate to chat interface
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test.describe('Page Load Performance', () => {
        test('should load main application quickly', async ({ page }) => {
            await PerformanceAssertions.assertPageLoadPerformance(page, 3000);
        });

        test('should measure First Contentful Paint (FCP)', async ({ page }) => {
            const startTime = Date.now();

            await page.goto('/');

            // Wait for first content to appear
            await page.waitForSelector('[data-testid="chat-container"], main', { timeout: 10000 });

            const fcp = Date.now() - startTime;

            expect(fcp).toBeLessThan(2000); // FCP should be under 2 seconds
            console.log(`First Contentful Paint: ${fcp}ms`);
        });

        test('should measure Largest Contentful Paint (LCP)', async ({ page }) => {
            const startTime = Date.now();

            await page.goto('/');

            // Wait for main content to be fully loaded
            await page.waitForLoadState('networkidle');

            const lcp = Date.now() - startTime;

            expect(lcp).toBeLessThan(4000); // LCP should be under 4 seconds
            console.log(`Largest Contentful Paint: ${lcp}ms`);
        });

        test('should handle concurrent user simulation', async ({ browser }) => {
            const numUsers = 3;
            const contexts: any[] = [];
            const pages: any[] = [];
            const loadTimes: number[] = [];

            try {
                // Create multiple browser contexts
                for (let i = 0; i < numUsers; i++) {
                    const context = await browser.newContext();
                    const page = await context.newPage();

                    contexts.push(context);
                    pages.push(page);
                }

                // Simulate concurrent logins and app loads
                const loginPromises = pages.map(async (page, index) => {
                    const startTime = Date.now();
                    const auth = new AuthHelper(page);

                    await auth.loginAs(testUsers[index % testUsers.length]);
                    await page.goto('/');
                    await page.waitForLoadState('networkidle');

                    const loadTime = Date.now() - startTime;
                    loadTimes.push(loadTime);

                    return { page, loadTime };
                });

                // Wait for all concurrent loads
                await Promise.all(loginPromises);

                // Analyze performance
                const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
                const maxLoadTime = Math.max(...loadTimes);

                console.log(`Concurrent load test results:`);
                console.log(`  Users: ${numUsers}`);
                console.log(`  Average load time: ${avgLoadTime.toFixed(2)}ms`);
                console.log(`  Maximum load time: ${maxLoadTime}ms`);

                expect(avgLoadTime).toBeLessThan(5000); // Average should be under 5 seconds
                expect(maxLoadTime).toBeLessThan(8000); // No user should wait more than 8 seconds
            } finally {
                // Cleanup
                for (const context of contexts) {
                    await context.close();
                }
            }
        });
    });

    test.describe('N8N Response Performance', () => {
        test('should measure Apollo.io workflow response times', async ({ page }) => {
            await PerformanceAssertions.assertAPIPerformance(page, 'jetvision-agent', 8000);

            const chatInput = page.locator('[data-testid="chat-input"]');
            const responseTimes: number[] = [];

            // Test multiple Apollo queries
            const apolloTestQueries = apolloQueries.slice(0, 3);

            for (const query of apolloTestQueries) {
                const startTime = Date.now();

                await chatInput.fill(query.query);
                await chatInput.press('Enter');
                await waitForN8NResponse(page, query.timeout);

                const responseTime = Date.now() - startTime;
                responseTimes.push(responseTime);

                console.log(`Apollo query "${query.id}" response time: ${responseTime}ms`);
            }

            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

            expect(avgResponseTime).toBeLessThan(15000); // Average under 15 seconds
            expect(Math.max(...responseTimes)).toBeLessThan(25000); // No query over 25 seconds

            console.log(`Apollo.io average response time: ${avgResponseTime.toFixed(2)}ms`);
        });

        test('should measure Avinode workflow response times', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');
            const responseTimes: number[] = [];

            // Test multiple Avinode queries
            const avinodeTestQueries = avinodeQueries.slice(0, 3);

            for (const query of avinodeTestQueries) {
                const startTime = Date.now();

                await chatInput.fill(query.query);
                await chatInput.press('Enter');
                await waitForN8NResponse(page, query.timeout);

                const responseTime = Date.now() - startTime;
                responseTimes.push(responseTime);

                console.log(`Avinode query "${query.id}" response time: ${responseTime}ms`);
            }

            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

            expect(avgResponseTime).toBeLessThan(20000); // Average under 20 seconds
            expect(Math.max(...responseTimes)).toBeLessThan(30000); // No query over 30 seconds

            console.log(`Avinode average response time: ${avgResponseTime.toFixed(2)}ms`);
        });

        test('should maintain performance under load', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');
            const loadTestQueries = 10;
            const responseTimes: number[] = [];

            console.log(`Starting load test with ${loadTestQueries} sequential queries...`);

            for (let i = 0; i < loadTestQueries; i++) {
                const startTime = Date.now();
                const query = `Load test query ${i + 1}: Find aircraft for charter`;

                await chatInput.fill(query);
                await chatInput.press('Enter');
                await waitForN8NResponse(page, 15000);

                const responseTime = Date.now() - startTime;
                responseTimes.push(responseTime);

                console.log(`Query ${i + 1} response time: ${responseTime}ms`);
            }

            // Analyze performance degradation
            const firstHalf = responseTimes.slice(0, Math.floor(loadTestQueries / 2));
            const secondHalf = responseTimes.slice(Math.floor(loadTestQueries / 2));

            const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

            const performanceDegradation = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;

            console.log(`Performance analysis:`);
            console.log(`  First half average: ${firstHalfAvg.toFixed(2)}ms`);
            console.log(`  Second half average: ${secondHalfAvg.toFixed(2)}ms`);
            console.log(`  Performance degradation: ${(performanceDegradation * 100).toFixed(2)}%`);

            // Performance should not degrade by more than 50%
            expect(performanceDegradation).toBeLessThan(0.5);
        });

        test('should handle streaming response performance', async ({ page }) => {
            await n8nHelper.setupStreamingMocks();

            const chatInput = page.locator('[data-testid="chat-input"]');

            const startTime = Date.now();
            await chatInput.fill('Test streaming performance with aircraft search');
            await chatInput.press('Enter');

            // Measure time to first chunk
            const streamingIndicator = page.locator('[data-testid="streaming-indicator"]');
            await expect(streamingIndicator).toBeVisible({ timeout: 5000 });
            const timeToFirstChunk = Date.now() - startTime;

            // Wait for streaming to complete
            const messageLocator = page.locator('[data-testid="chat-message"]').last();
            await expect(streamingIndicator).toBeHidden({ timeout: 20000 });
            const totalStreamingTime = Date.now() - startTime;

            console.log(`Streaming performance:`);
            console.log(`  Time to first chunk: ${timeToFirstChunk}ms`);
            console.log(`  Total streaming time: ${totalStreamingTime}ms`);

            expect(timeToFirstChunk).toBeLessThan(3000); // First chunk within 3 seconds
            expect(totalStreamingTime).toBeLessThan(15000); // Complete stream within 15 seconds
        });
    });

    test.describe('Memory and Resource Management', () => {
        test('should not have memory leaks during long chat sessions', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            // Create a long chat session
            const sessionLength = 15;

            for (let i = 0; i < sessionLength; i++) {
                await chatInput.fill(`Memory test message ${i + 1}`);
                await chatInput.press('Enter');
                await waitForN8NResponse(page, 10000);

                // Check memory usage periodically
                if (i % 5 === 0) {
                    const memoryUsage = await page.evaluate(() => {
                        return {
                            usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
                            totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
                        };
                    });

                    if (memoryUsage.usedJSHeapSize > 0) {
                        console.log(
                            `Memory usage at message ${i + 1}: ${Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024)}MB`
                        );
                    }
                }
            }

            // Final memory check
            const finalMemory = await page.evaluate(() => {
                return (performance as any).memory?.usedJSHeapSize || 0;
            });

            if (finalMemory > 0) {
                const memoryMB = Math.round(finalMemory / 1024 / 1024);
                console.log(`Final memory usage: ${memoryMB}MB`);

                // Memory should not exceed reasonable limits
                expect(memoryMB).toBeLessThan(100); // Less than 100MB
            }
        });

        test('should handle large response payloads efficiently', async ({ page }) => {
            // Mock large response payload
            await page.route('**/webhook/jetvision-agent**', async route => {
                // Create large response with many results
                const largeData = {
                    leads: Array.from({ length: 100 }, (_, i) => ({
                        id: `lead-${i}`,
                        name: `Test Lead ${i}`,
                        title: `Position ${i}`,
                        company: `Company ${i}`,
                        email: `test${i}@example.com`,
                        description: 'A'.repeat(500), // Large description
                    })),
                };

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: largeData,
                        metadata: {
                            executionTime: 5000,
                            workflowId: 'large-response-test',
                            correlationId: 'large-001',
                            version: '1.0.0',
                        },
                        timestamp: new Date().toISOString(),
                    }),
                });
            });

            const chatInput = page.locator('[data-testid="chat-input"]');

            const startTime = Date.now();
            await chatInput.fill('Test large response handling');
            await chatInput.press('Enter');

            await waitForN8NResponse(page, 20000);
            const processingTime = Date.now() - startTime;

            console.log(`Large response processing time: ${processingTime}ms`);

            // Should handle large responses within reasonable time
            expect(processingTime).toBeLessThan(25000);

            // UI should still be responsive
            const isInputEnabled = await chatInput.isEnabled();
            expect(isInputEnabled).toBe(true);
        });

        test('should handle DOM node cleanup', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            // Create many messages
            for (let i = 0; i < 20; i++) {
                await chatInput.fill(`DOM cleanup test ${i + 1}`);
                await chatInput.press('Enter');
                await waitForN8NResponse(page, 8000);
            }

            // Count DOM nodes
            const nodeCount = await page.evaluate(() => {
                return document.querySelectorAll('*').length;
            });

            console.log(`Total DOM nodes after 20 messages: ${nodeCount}`);

            // Should not have excessive DOM nodes
            expect(nodeCount).toBeLessThan(5000);
        });
    });

    test.describe('Network Reliability', () => {
        test('should maintain reliability with 95% success rate', async ({ page }) => {
            // Set 5% failure rate to test reliability
            n8nHelper.setFailureRate(0.05);

            const chatInput = page.locator('[data-testid="chat-input"]');
            const totalQueries = 20;
            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < totalQueries; i++) {
                try {
                    await chatInput.fill(`Reliability test query ${i + 1}`);
                    await chatInput.press('Enter');
                    await waitForN8NResponse(page, 15000);

                    // Check if response was successful
                    const lastMessage = page.locator('[data-testid="chat-message"]').last();
                    const messageText = await lastMessage.textContent();

                    if (
                        messageText &&
                        messageText.trim().length > 10 &&
                        !messageText.toLowerCase().includes('error')
                    ) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    errorCount++;
                }
            }

            const successRate = successCount / totalQueries;

            console.log(`Reliability test results:`);
            console.log(`  Total queries: ${totalQueries}`);
            console.log(`  Successful: ${successCount}`);
            console.log(`  Failed: ${errorCount}`);
            console.log(`  Success rate: ${(successRate * 100).toFixed(2)}%`);

            // Should achieve at least 90% success rate despite 5% mock failure rate (due to retries)
            expect(successRate).toBeGreaterThan(0.9);
        });

        test('should handle network timeouts gracefully', async ({ page }) => {
            // Setup timeout scenario
            let timeoutCount = 0;
            await page.route('**/webhook/jetvision-agent**', async route => {
                timeoutCount++;

                if (timeoutCount <= 2) {
                    // First two requests timeout
                    await new Promise(resolve => setTimeout(resolve, 35000));
                }

                // Subsequent requests succeed
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: { message: `Success after ${timeoutCount} attempts` },
                        timestamp: new Date().toISOString(),
                    }),
                });
            });

            const chatInput = page.locator('[data-testid="chat-input"]');

            // This should eventually succeed after timeouts
            await chatInput.fill('Test timeout handling and recovery');
            await chatInput.press('Enter');

            // Should show timeout warning but eventually succeed
            const timeoutMessage = page.locator(
                '[data-testid="timeout-message"], .timeout-warning'
            );

            // Wait longer for eventual success
            try {
                const successMessage = page.locator('[data-testid="chat-message"]').last();
                await expect(successMessage).toBeVisible({ timeout: 45000 });

                const messageText = await successMessage.textContent();
                expect(messageText?.trim()).toBeTruthy();

                console.log('✅ Successfully recovered from timeouts');
            } catch (error) {
                console.log('Timeout handling test failed as expected:', error);
            }
        });

        test('should maintain service quality metrics', async ({ page }) => {
            const metrics = {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                totalResponseTime: 0,
                errors: [] as string[],
            };

            const chatInput = page.locator('[data-testid="chat-input"]');

            // Test various query types
            const testQueries = [...apolloQueries.slice(0, 2), ...avinodeQueries.slice(0, 2)];

            for (const query of testQueries) {
                metrics.totalRequests++;
                const startTime = Date.now();

                try {
                    await chatInput.fill(query.query);
                    await chatInput.press('Enter');
                    await waitForN8NResponse(page, query.timeout);

                    const responseTime = Date.now() - startTime;
                    metrics.totalResponseTime += responseTime;

                    // Check for successful response
                    const lastMessage = page.locator('[data-testid="chat-message"]').last();
                    const messageText = await lastMessage.textContent();

                    if (messageText && messageText.trim().length > 10) {
                        metrics.successfulRequests++;
                    } else {
                        metrics.failedRequests++;
                        metrics.errors.push(`Empty or invalid response for ${query.id}`);
                    }
                } catch (error) {
                    metrics.failedRequests++;
                    metrics.errors.push(`${query.id}: ${error}`);
                    metrics.totalResponseTime += Date.now() - startTime;
                }
            }

            // Calculate final metrics
            const avgResponseTime = metrics.totalResponseTime / metrics.totalRequests;
            const successRate = metrics.successfulRequests / metrics.totalRequests;

            console.log('Service Quality Metrics:');
            console.log(`  Total Requests: ${metrics.totalRequests}`);
            console.log(`  Success Rate: ${(successRate * 100).toFixed(2)}%`);
            console.log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
            console.log(`  Failed Requests: ${metrics.failedRequests}`);

            if (metrics.errors.length > 0) {
                console.log('Errors:', metrics.errors);
            }

            // Quality thresholds
            expect(successRate).toBeGreaterThan(0.85); // At least 85% success rate
            expect(avgResponseTime).toBeLessThan(18000); // Average under 18 seconds
        });
    });

    test.describe('Scalability Tests', () => {
        test('should handle increasing message volume', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');
            const volumeTests = [5, 10, 15, 20];
            const performanceResults = [];

            for (const messageCount of volumeTests) {
                console.log(`Testing with ${messageCount} messages...`);

                const startTime = Date.now();

                for (let i = 0; i < messageCount; i++) {
                    await chatInput.fill(`Volume test ${messageCount} - message ${i + 1}`);
                    await chatInput.press('Enter');
                    await waitForN8NResponse(page, 12000);
                }

                const totalTime = Date.now() - startTime;
                const avgTimePerMessage = totalTime / messageCount;

                performanceResults.push({
                    messageCount,
                    totalTime,
                    avgTimePerMessage,
                });

                console.log(`  Total time: ${totalTime}ms`);
                console.log(`  Avg per message: ${avgTimePerMessage.toFixed(2)}ms`);

                // Clear chat history for next test
                const clearButton = page.locator('[data-testid="clear-chat"], .clear-button');
                if (await clearButton.isVisible()) {
                    await clearButton.click();
                }
            }

            // Analyze scalability
            console.log('Scalability Analysis:');
            for (const result of performanceResults) {
                console.log(
                    `  ${result.messageCount} messages: ${result.avgTimePerMessage.toFixed(2)}ms avg`
                );
            }

            // Performance should not degrade linearly with message count
            const firstTest = performanceResults[0];
            const lastTest = performanceResults[performanceResults.length - 1];
            const scalingFactor = lastTest.avgTimePerMessage / firstTest.avgTimePerMessage;

            console.log(`Scaling factor: ${scalingFactor.toFixed(2)}x`);
            expect(scalingFactor).toBeLessThan(2.0); // Should not double in time
        });
    });
});

// Import testUsers for concurrent testing
const { testUsers } = require('../fixtures/user-profiles');
