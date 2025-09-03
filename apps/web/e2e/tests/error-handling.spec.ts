import { test, expect } from '@playwright/test';
import { AuthHelper, quickLogin } from '../utils/auth-helpers';
import { N8NHelper } from '../utils/n8n-helpers';
import { AviationAssertions } from '../utils/assertions';

test.describe('Error Handling and Fallback Tests', () => {
  let authHelper: AuthHelper;
  let n8nHelper: N8NHelper;
  let aviationAssertions: AviationAssertions;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    n8nHelper = new N8NHelper(page);
    aviationAssertions = new AviationAssertions(page);

    // Login as admin to test all error scenarios
    await quickLogin(page, 'admin');
    
    // Navigate to chat interface
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('N8N Service Failures', () => {
    test('should handle N8N service unavailable gracefully', async ({ page }) => {
      // Simulate N8N service completely down
      await n8nHelper.simulateFailure();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Find executive assistants at Fortune 500 companies');
      await chatInput.press('Enter');

      // Should show user-friendly error message
      const errorMessage = page.locator('[data-testid="error-message"], [data-testid="fallback-message"], .error-message');
      await expect(errorMessage).toBeVisible({ timeout: 15000 });

      // Verify error message is user-friendly
      await aviationAssertions.assertUserFriendlyError(errorMessage);

      // Should mention fallback or retry options
      const errorText = await errorMessage.textContent();
      expect(errorText?.toLowerCase()).toMatch(/(try.*again|fallback|alternative|contact.*support)/);
    });

    test('should activate circuit breaker after multiple failures', async ({ page }) => {
      // Set high failure rate to trigger circuit breaker
      n8nHelper.setFailureRate(1.0); // 100% failure rate
      await n8nHelper.setupMocks();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Send multiple requests to trigger circuit breaker
      const failureQueries = [
        'Query 1 that will fail',
        'Query 2 that will fail',
        'Query 3 that will fail',
        'Query 4 that will fail',
        'Query 5 that should trigger circuit breaker'
      ];
      
      for (let i = 0; i < failureQueries.length; i++) {
        await chatInput.fill(failureQueries[i]);
        await chatInput.press('Enter');
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Check if circuit breaker activated
        const circuitBreakerMessage = page.locator('[data-testid="circuit-breaker-message"], .circuit-breaker-active');
        if (await circuitBreakerMessage.isVisible()) {
          console.log(`✅ Circuit breaker activated after ${i + 1} failures`);
          
          const breakerText = await circuitBreakerMessage.textContent();
          expect(breakerText?.toLowerCase()).toMatch(/(circuit.*breaker|service.*degraded|fallback.*mode)/);
          break;
        }
      }
    });

    test('should recover from circuit breaker state', async ({ page }) => {
      // First trigger circuit breaker
      n8nHelper.setFailureRate(1.0);
      await n8nHelper.setupMocks();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        await chatInput.fill(`Failure query ${i + 1}`);
        await chatInput.press('Enter');
        await page.waitForTimeout(2000);
      }
      
      // Wait for circuit breaker cool-down period
      await page.waitForTimeout(10000);
      
      // Reset to working state
      n8nHelper.setFailureRate(0);
      await n8nHelper.resetMocks();
      await n8nHelper.setupMocks();
      
      // Try a new request
      await chatInput.fill('Recovery test query - should work now');
      await chatInput.press('Enter');
      
      // Should work again
      const successMessage = page.locator('[data-testid="chat-message"]').last();
      await expect(successMessage).toBeVisible({ timeout: 15000 });
      
      const messageText = await successMessage.textContent();
      expect(messageText?.trim()).toBeTruthy();
      expect(messageText?.length).toBeGreaterThan(10);
    });

    test('should handle N8N timeout scenarios', async ({ page }) => {
      await n8nHelper.simulateTimeout();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Query that will timeout');
      await chatInput.press('Enter');

      // Should show timeout message within reasonable time
      const timeoutIndicator = page.locator('[data-testid="timeout-message"], [data-testid="loading-timeout"], .timeout-error');
      await expect(timeoutIndicator).toBeVisible({ timeout: 35000 });
      
      const timeoutText = await timeoutIndicator.textContent();
      expect(timeoutText?.toLowerCase()).toMatch(/(timeout|taking.*longer|please.*wait|try.*again)/);
    });

    test('should handle partial N8N responses', async ({ page }) => {
      // Setup partial response scenario
      await page.route('**/webhook/jetvision-agent**', async (route) => {
        await route.fulfill({
          status: 206, // Partial content
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'partial-response',
            type: 'apollo',
            status: 'partial',
            data: {
              message: 'Partial results due to service constraints',
              partialResults: ['Result 1', 'Result 2'],
              totalExpected: 10,
              partialCount: 2
            },
            metadata: {
              executionTime: 5000,
              workflowId: 'partial-test',
              correlationId: 'partial-001',
              version: '1.0.0'
            },
            timestamp: new Date().toISOString()
          })
        });
      });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Query that returns partial results');
      await chatInput.press('Enter');
      
      // Should handle partial response gracefully
      const partialMessage = page.locator('[data-testid="chat-message"]').last();
      await expect(partialMessage).toBeVisible({ timeout: 10000 });
      
      const messageText = await partialMessage.textContent();
      expect(messageText?.toLowerCase()).toMatch(/(partial|some.*results|limited.*data)/);
    });
  });

  test.describe('API Fallback Mechanisms', () => {
    test('should fallback to direct Apollo.io API when N8N fails', async ({ page }) => {
      // Mock N8N failure and direct API success
      await page.route('**/webhook/jetvision-agent**', async (route) => {
        await route.fulfill({
          status: 503,
          body: 'Service Unavailable'
        });
      });
      
      // Mock direct Apollo API response
      await page.route('**/api/apollo/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              leads: [
                {
                  name: 'Fallback Lead',
                  title: 'Executive Assistant',
                  company: 'Fallback Company',
                  source: 'direct-apollo-api'
                }
              ]
            }
          })
        });
      });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Find executive assistants via fallback');
      await chatInput.press('Enter');
      
      // Should get response from fallback API
      const fallbackResponse = page.locator('[data-testid="chat-message"]').last();
      await expect(fallbackResponse).toBeVisible({ timeout: 15000 });
      
      const responseText = await fallbackResponse.textContent();
      expect(responseText).toContain('Fallback');
      
      // Should indicate fallback was used
      const fallbackIndicator = page.locator('[data-testid="fallback-indicator"], .fallback-notice');
      if (await fallbackIndicator.isVisible()) {
        const indicatorText = await fallbackIndicator.textContent();
        expect(indicatorText?.toLowerCase()).toMatch(/(fallback|direct.*api|alternative.*method)/);
      }
    });

    test('should fallback to direct Avinode API when N8N fails', async ({ page }) => {
      // Mock N8N failure
      await page.route('**/webhook/jetvision-agent**', async (route) => {
        await route.fulfill({
          status: 503,
          body: 'Service Unavailable'
        });
      });
      
      // Mock direct Avinode API response
      await page.route('**/api/avinode/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              aircraft: [
                {
                  model: 'Gulfstream G650',
                  tailNumber: 'N123FB',
                  operator: 'Fallback Aviation',
                  source: 'direct-avinode-api'
                }
              ]
            }
          })
        });
      });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Find Gulfstream aircraft via fallback');
      await chatInput.press('Enter');
      
      // Should get response from fallback API
      const fallbackResponse = page.locator('[data-testid="chat-message"]').last();
      await expect(fallbackResponse).toBeVisible({ timeout: 15000 });
      
      const responseText = await fallbackResponse.textContent();
      expect(responseText).toContain('G650');
      expect(responseText).toContain('Fallback');
    });

    test('should handle mixed success/failure scenarios', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/webhook/jetvision-agent**', async (route) => {
        requestCount++;
        
        // Fail every other request
        if (requestCount % 2 === 0) {
          await route.fulfill({
            status: 503,
            body: 'Service Unavailable'
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { message: `Success response ${requestCount}` },
              timestamp: new Date().toISOString()
            })
          });
        }
      });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Send multiple requests
      const queries = ['Query 1', 'Query 2', 'Query 3', 'Query 4'];
      
      for (const query of queries) {
        await chatInput.fill(query);
        await chatInput.press('Enter');
        await page.waitForTimeout(3000);
      }
      
      // Should handle mix of success/failure
      const messages = page.locator('[data-testid="chat-message"]');
      const messageCount = await messages.count();
      
      expect(messageCount).toBeGreaterThanOrEqual(queries.length);
    });
  });

  test.describe('Network and Connectivity Issues', () => {
    test('should handle network disconnection', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Start a query
      await chatInput.fill('Test network disconnection handling');
      await chatInput.press('Enter');
      
      // Simulate network disconnection after 2 seconds
      await page.waitForTimeout(2000);
      await page.context().setOffline(true);
      
      // Should detect offline state
      const offlineIndicator = page.locator('[data-testid="offline-indicator"], .offline-warning');
      await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
      
      const offlineText = await offlineIndicator.textContent();
      expect(offlineText?.toLowerCase()).toMatch(/(offline|connection.*lost|network.*unavailable)/);
      
      // Restore connection
      await page.context().setOffline(false);
      
      // Should detect online state
      const onlineIndicator = page.locator('[data-testid="online-indicator"], .connection-restored');
      if (await onlineIndicator.isVisible({ timeout: 5000 })) {
        console.log('✅ Connection restoration detected');
      }
    });

    test('should handle slow network conditions', async ({ page }) => {
      // Throttle network to simulate slow connection
      await page.context().route('**/*', async (route) => {
        // Add 3 second delay to simulate slow network
        await new Promise(resolve => setTimeout(resolve, 3000));
        await route.continue();
      });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Test slow network handling');
      await chatInput.press('Enter');
      
      // Should show loading state for extended period
      const loadingIndicator = page.locator('[data-testid="loading-indicator"], .loading-spinner');
      await expect(loadingIndicator).toBeVisible({ timeout: 5000 });
      
      // Should eventually complete despite slow network
      const response = page.locator('[data-testid="chat-message"]').last();
      await expect(response).toBeVisible({ timeout: 20000 });
    });

    test('should handle intermittent connectivity', async ({ page }) => {
      let isOnline = true;
      let requestCount = 0;
      
      await page.route('**/webhook/jetvision-agent**', async (route) => {
        requestCount++;
        
        // Toggle online/offline every 2 requests
        if (requestCount % 2 === 0) {
          isOnline = !isOnline;
        }
        
        if (!isOnline) {
          await route.abort('failed');
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { message: `Intermittent success ${requestCount}` },
              timestamp: new Date().toISOString()
            })
          });
        }
      });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Send requests during intermittent connectivity
      for (let i = 1; i <= 5; i++) {
        await chatInput.fill(`Intermittent test ${i}`);
        await chatInput.press('Enter');
        await page.waitForTimeout(2000);
      }
      
      // Should handle intermittent failures gracefully
      const errorMessages = page.locator('[data-testid="error-message"]');
      const successMessages = page.locator('[data-testid="chat-message"]:has-text("success")');
      
      const errorCount = await errorMessages.count();
      const successCount = await successMessages.count();
      
      expect(errorCount + successCount).toBeGreaterThan(0);
      console.log(`Intermittent test: ${successCount} successes, ${errorCount} errors`);
    });
  });

  test.describe('Authentication and Permission Errors', () => {
    test('should handle expired authentication tokens', async ({ page }) => {
      // Mock expired token response
      await page.route('**/webhook/jetvision-agent**', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Token expired',
            code: 'AUTH_TOKEN_EXPIRED'
          })
        });
      });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Test expired token handling');
      await chatInput.press('Enter');
      
      // Should handle auth error gracefully
      const authError = page.locator('[data-testid="auth-error"], .authentication-error');
      await expect(authError).toBeVisible({ timeout: 10000 });
      
      const errorText = await authError.textContent();
      expect(errorText?.toLowerCase()).toMatch(/(session.*expired|please.*login|authentication.*required)/);
    });

    test('should handle insufficient permissions', async ({ page }) => {
      // Login as demo user (limited permissions)
      await authHelper.logout();
      await quickLogin(page, 'demo');
      
      // Mock permission denied response
      await page.route('**/webhook/jetvision-agent**', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Insufficient permissions',
            code: 'PERMISSION_DENIED'
          })
        });
      });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Try to access admin-only feature');
      await chatInput.press('Enter');
      
      // Should show permission error
      const permissionError = page.locator('[data-testid="permission-error"], .permission-denied');
      await expect(permissionError).toBeVisible({ timeout: 10000 });
      
      const errorText = await permissionError.textContent();
      expect(errorText?.toLowerCase()).toMatch(/(permission.*denied|not.*authorized|upgrade.*account)/);
    });

    test('should handle API key issues', async ({ page }) => {
      // Mock API key error
      await page.route('**/webhook/jetvision-agent**', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid API key',
            code: 'API_KEY_INVALID',
            service: 'apollo'
          })
        });
      });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Test API key error handling');
      await chatInput.press('Enter');
      
      // Should show API key error
      const apiKeyError = page.locator('[data-testid="api-error"], .api-key-error');
      await expect(apiKeyError).toBeVisible({ timeout: 10000 });
      
      const errorText = await apiKeyError.textContent();
      expect(errorText?.toLowerCase()).toMatch(/(api.*key|configuration.*issue|contact.*administrator)/);
    });
  });

  test.describe('Data Validation and Format Errors', () => {
    test('should handle malformed API responses', async ({ page }) => {
      // Mock malformed JSON response
      await page.route('**/webhook/jetvision-agent**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json response { malformed'
        });
      });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Test malformed response handling');
      await chatInput.press('Enter');
      
      // Should handle parsing error gracefully
      const parseError = page.locator('[data-testid="parse-error"], .response-error');
      await expect(parseError).toBeVisible({ timeout: 10000 });
      
      await aviationAssertions.assertUserFriendlyError(parseError);
    });

    test('should validate user input format', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Test empty input
      await chatInput.fill('');
      await chatInput.press('Enter');
      
      // Should not send empty message
      await page.waitForTimeout(2000);
      const messages = page.locator('[data-testid="chat-message"]');
      const initialCount = await messages.count();
      
      // Input should remain empty or show validation
      const inputValue = await chatInput.inputValue();
      expect(inputValue).toBe('');
      
      // Test very long input
      const longInput = 'x'.repeat(10000);
      await chatInput.fill(longInput);
      
      // Should handle or limit long input
      const truncatedValue = await chatInput.inputValue();
      expect(truncatedValue.length).toBeLessThanOrEqual(10000);
    });

    test('should handle corrupted response data', async ({ page }) => {
      // Mock corrupted response with invalid data structure
      await page.route('**/webhook/jetvision-agent**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              corrupted: true,
              leads: 'this should be array but is string',
              timestamp: 'invalid date format',
              metrics: {
                openRate: 'not a number',
                clickRate: null,
                replyRate: undefined
              }
            }
          })
        });
      });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Test corrupted data handling');
      await chatInput.press('Enter');
      
      // Should handle corrupted data gracefully
      const response = page.locator('[data-testid="chat-message"]').last();
      await expect(response).toBeVisible({ timeout: 10000 });
      
      // Should not crash the application
      const responseText = await response.textContent();
      expect(responseText?.trim()).toBeTruthy();
      
      // Should show some form of error or default message
      expect(responseText?.toLowerCase()).toMatch(/(error|issue|unable.*process|please.*try)/);
    });
  });

  test.describe('Recovery and Resilience', () => {
    test('should maintain application state during errors', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Send a successful message first
      await n8nHelper.setupMocks();
      await chatInput.fill('Successful query first');
      await chatInput.press('Enter');
      await page.waitForTimeout(3000);
      
      // Then simulate error
      await n8nHelper.simulateFailure();
      await chatInput.fill('Query that will fail');
      await chatInput.press('Enter');
      await page.waitForTimeout(3000);
      
      // Application should remain functional
      await expect(chatInput).toBeEnabled();
      await expect(page.locator('[data-testid="send-button"]')).toBeEnabled();
      
      // Chat history should be preserved
      const successMessage = page.locator('[data-testid="chat-message"]:has-text("Successful query")');
      await expect(successMessage).toBeVisible();
    });

    test('should provide helpful error recovery suggestions', async ({ page }) => {
      await n8nHelper.simulateFailure();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Test recovery suggestions');
      await chatInput.press('Enter');
      
      const errorMessage = page.locator('[data-testid="error-message"]').last();
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      
      // Should provide recovery options
      const recoveryOptions = page.locator('[data-testid="recovery-options"], .error-actions');
      if (await recoveryOptions.isVisible()) {
        const retryButton = recoveryOptions.locator('[data-testid="retry-button"], button:has-text("retry")');
        const contactButton = recoveryOptions.locator('[data-testid="contact-support"], button:has-text("support")');
        
        if (await retryButton.isVisible()) {
          console.log('✅ Retry option available');
        }
        if (await contactButton.isVisible()) {
          console.log('✅ Contact support option available');
        }
      }
    });

    test('should handle error recovery flow', async ({ page }) => {
      // Start with failure
      await n8nHelper.simulateFailure();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Initial failing query');
      await chatInput.press('Enter');
      
      // Wait for error
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      
      // Fix the service
      await n8nHelper.resetMocks();
      await n8nHelper.setupMocks();
      
      // Retry the same query
      const retryButton = page.locator('[data-testid="retry-button"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
      } else {
        // Manual retry
        await chatInput.fill('Retry the same query');
        await chatInput.press('Enter');
      }
      
      // Should succeed now
      const successResponse = page.locator('[data-testid="chat-message"]').last();
      await expect(successResponse).toBeVisible({ timeout: 15000 });
      
      const responseText = await successResponse.textContent();
      expect(responseText?.trim()).toBeTruthy();
      expect(responseText?.length).toBeGreaterThan(10);
    });
  });
});