import { test, expect } from '@playwright/test';
import { AuthHelper, quickLogin } from '../utils/auth-helpers';
import { N8NHelper, waitForN8NResponse, verifyChatResponse } from '../utils/n8n-helpers';
import { AviationAssertions } from '../utils/assertions';
import { apolloQueries, avinodeQueries, systemQueries } from '../fixtures/aviation-queries';

test.describe('N8N Workflow Integration', () => {
  let authHelper: AuthHelper;
  let n8nHelper: N8NHelper;
  let aviationAssertions: AviationAssertions;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    n8nHelper = new N8NHelper(page);
    aviationAssertions = new AviationAssertions(page);

    // Login as admin to test all workflows
    await quickLogin(page, 'admin');
    
    // Navigate to chat interface
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Webhook Connectivity', () => {
    test('should connect to N8N webhook successfully', async ({ page }) => {
      // Setup basic N8N mocks
      await n8nHelper.setupMocks();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Send a test message
      await chatInput.fill(systemQueries[0].query); // Health check query
      await chatInput.press('Enter');

      // Wait for N8N response
      await waitForN8NResponse(page, 15000);

      // Verify webhook was called
      await n8nHelper.verifyWebhookCalled('health');
    });

    test('should handle webhook authentication', async ({ page }) => {
      await n8nHelper.setupMocks();
      await n8nHelper.startMonitoring();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Send authenticated request
      await chatInput.fill('Check my account permissions');
      await chatInput.press('Enter');
      
      await waitForN8NResponse(page);

      // Verify authentication headers were sent
      const webhookCalls = await n8nHelper.getWebhookCalls();
      expect(webhookCalls.length).toBeGreaterThan(0);
      
      const lastCall = webhookCalls[webhookCalls.length - 1];
      expect(lastCall.options?.headers).toBeDefined();
    });

    test('should pass user context to webhook', async ({ page }) => {
      await n8nHelper.setupMocks();
      await n8nHelper.startMonitoring();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Show my dashboard');
      await chatInput.press('Enter');
      
      await waitForN8NResponse(page);

      // Verify user context was included
      const webhookCalls = await n8nHelper.getWebhookCalls();
      const lastCall = webhookCalls[webhookCalls.length - 1];
      
      expect(lastCall.options?.body || lastCall.options?.json).toBeDefined();
    });
  });

  test.describe('Response Processing', () => {
    test('should handle successful N8N responses', async ({ page }) => {
      await n8nHelper.setupMocks();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Test Apollo query
      const apolloQuery = apolloQueries[0];
      await chatInput.fill(apolloQuery.query);
      await chatInput.press('Enter');

      await waitForN8NResponse(page, apolloQuery.timeout);

      // Verify response matches expected pattern
      if (apolloQuery.expectedResponsePattern) {
        await verifyChatResponse(page, apolloQuery.expectedResponsePattern);
      }
    });

    test('should transform N8N data correctly', async ({ page }) => {
      await n8nHelper.setupMocks();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Send query for structured data
      await chatInput.fill(apolloQueries[0].query); // Executive assistant search
      await chatInput.press('Enter');
      
      await waitForN8NResponse(page);

      // Check that data is formatted properly
      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      await aviationAssertions.assertAviationDataFormat(responseMessage);
    });

    test('should handle streaming responses', async ({ page }) => {
      await n8nHelper.setupStreamingMocks();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill(avinodeQueries[0].query); // Aircraft search
      await chatInput.press('Enter');

      // Verify streaming indicator appears
      const streamingIndicator = page.locator('[data-testid="streaming-indicator"]');
      await expect(streamingIndicator).toBeVisible({ timeout: 5000 });

      // Wait for streaming to complete
      const messageLocator = page.locator('[data-testid="chat-message"]').last();
      await aviationAssertions.assertChatStreaming(messageLocator);
    });

    test('should handle partial responses', async ({ page }) => {
      // Configure for partial responses
      await n8nHelper.setupMocks();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Send query that might return partial results
      await chatInput.fill('Find aircraft but limit results to 1');
      await chatInput.press('Enter');
      
      await waitForN8NResponse(page);

      // Verify partial response is handled gracefully
      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      expect(responseText).toContain('result');
      expect(responseText?.length).toBeGreaterThan(10);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle N8N service unavailable', async ({ page }) => {
      await n8nHelper.simulateFailure();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Test query during service failure');
      await chatInput.press('Enter');

      // Should show user-friendly error message
      const errorMessage = page.locator('[data-testid="error-message"], .error-message');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      
      await aviationAssertions.assertUserFriendlyError(errorMessage);
    });

    test('should handle N8N timeout', async ({ page }) => {
      await n8nHelper.simulateTimeout();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Query that will timeout');
      await chatInput.press('Enter');

      // Should show timeout message within reasonable time
      const timeoutMessage = page.locator('[data-testid="timeout-message"], .timeout-message');
      await expect(timeoutMessage).toBeVisible({ timeout: 35000 });
    });

    test('should retry failed requests', async ({ page }) => {
      // Set up intermittent failures
      n8nHelper.setFailureRate(0.5); // 50% failure rate
      await n8nHelper.setupMocks();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Query with retries');
      await chatInput.press('Enter');

      // Should eventually succeed after retries
      await waitForN8NResponse(page, 20000);
      
      const successMessage = page.locator('[data-testid="chat-message"]').last();
      const messageText = await successMessage.textContent();
      
      expect(messageText?.trim()).toBeTruthy();
      expect(messageText?.length).toBeGreaterThan(5);
    });

    test('should show appropriate error for malformed responses', async ({ page }) => {
      // Setup mock that returns malformed JSON
      await page.route('**/webhook/jetvision-agent**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json response'
        });
      });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Query with malformed response');
      await chatInput.press('Enter');

      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      
      const errorText = await errorMessage.textContent();
      expect(errorText?.toLowerCase()).toContain('error');
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should handle concurrent requests', async ({ page }) => {
      await n8nHelper.setupMocks();
      n8nHelper.setDelay(2000); // 2 second delay
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Send multiple requests quickly
      const queries = [
        'Query 1 for concurrency test',
        'Query 2 for concurrency test', 
        'Query 3 for concurrency test'
      ];
      
      for (const query of queries) {
        await chatInput.fill(query);
        await chatInput.press('Enter');
        await page.waitForTimeout(500); // Small delay between sends
      }
      
      // Wait for all responses
      await page.waitForTimeout(10000);
      
      // All queries should have responses
      for (const query of queries) {
        await expect(page.locator(`text="${query}"`)).toBeVisible();
      }
    });

    test('should measure N8N response times', async ({ page }) => {
      await n8nHelper.setupMocks();
      n8nHelper.setDelay(1000); // 1 second delay
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Measure multiple queries
      const queries = apolloQueries.slice(0, 3);
      const responseTimes: number[] = [];
      
      for (const query of queries) {
        const startTime = Date.now();
        
        await chatInput.fill(query.query);
        await chatInput.press('Enter');
        await waitForN8NResponse(page, query.timeout);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        console.log(`Query "${query.id}" response time: ${responseTime}ms`);
      }
      
      // Calculate average response time
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      console.log(`Average N8N response time: ${avgResponseTime.toFixed(2)}ms`);
      
      // Should be within acceptable range (considering 1s mock delay + processing)
      expect(avgResponseTime).toBeLessThan(5000);
      expect(avgResponseTime).toBeGreaterThan(500); // Should include mock delay
    });

    test('should handle load testing scenario', async ({ page }) => {
      await n8nHelper.setupMocks();
      n8nHelper.setDelay(500); // Shorter delay for load test
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      const totalQueries = 5;
      
      console.log(`Starting load test with ${totalQueries} queries...`);
      const startTime = Date.now();
      
      // Send multiple queries in sequence
      for (let i = 0; i < totalQueries; i++) {
        await chatInput.fill(`Load test query ${i + 1}`);
        await chatInput.press('Enter');
        await waitForN8NResponse(page, 8000);
      }
      
      const totalTime = Date.now() - startTime;
      const avgTimePerQuery = totalTime / totalQueries;
      
      console.log(`Load test completed in ${totalTime}ms (${avgTimePerQuery.toFixed(2)}ms per query)`);
      
      // Verify all queries completed successfully
      const messageCount = await page.locator('[data-testid="chat-message"]').count();
      expect(messageCount).toBeGreaterThanOrEqual(totalQueries);
    });
  });

  test.describe('Business Logic Validation', () => {
    test('should route aviation queries to correct workflows', async ({ page }) => {
      await n8nHelper.setupMocks();
      await n8nHelper.startMonitoring();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Test Apollo.io routing
      await chatInput.fill(apolloQueries[0].query);
      await chatInput.press('Enter');
      await waitForN8NResponse(page);
      
      // Test Avinode routing  
      await chatInput.fill(avinodeQueries[0].query);
      await chatInput.press('Enter');
      await waitForN8NResponse(page);
      
      // Verify both queries were processed
      const webhookCalls = await n8nHelper.getWebhookCalls();
      expect(webhookCalls.length).toBe(2);
      
      // Verify responses contain appropriate aviation data
      const apolloResponse = page.locator('[data-testid="chat-message"]:has-text("executive")');
      const avinodeResponse = page.locator('[data-testid="chat-message"]:has-text("aircraft")');
      
      await expect(apolloResponse).toBeVisible();
      await expect(avinodeResponse).toBeVisible();
    });

    test('should maintain context across workflow steps', async ({ page }) => {
      await n8nHelper.setupMocks();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Send context-building query
      await chatInput.fill('I need to find executives in aviation industry');
      await chatInput.press('Enter');
      await waitForN8NResponse(page);
      
      // Send follow-up query that should use previous context
      await chatInput.fill('Now show me aircraft for their region');
      await chatInput.press('Enter');
      await waitForN8NResponse(page);
      
      // Verify context was maintained
      const messages = page.locator('[data-testid="chat-message"]');
      const messageCount = await messages.count();
      expect(messageCount).toBeGreaterThanOrEqual(4); // 2 user + 2 AI messages
    });

    test('should validate workflow outputs', async ({ page }) => {
      await n8nHelper.setupMocks();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Send query that should return structured data
      await chatInput.fill(apolloQueries[1].query); // Campaign metrics
      await chatInput.press('Enter');
      
      await waitForN8NResponse(page);
      
      // Verify structured output
      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const metricsElements = responseMessage.locator('[data-testid*="metric"], .metric, [class*="metric"]');
      
      if (await metricsElements.count() > 0) {
        await aviationAssertions.assertValidCampaignMetrics(responseMessage);
      }
    });
  });
});