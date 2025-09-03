/**
 * Comprehensive Test Environment Setup and Teardown
 * Provides consistent test environment management across all test suites
 * 
 * Features:
 * 1. Database initialization and cleanup
 * 2. Authentication state management  
 * 3. N8N webhook mocking and configuration
 * 4. Browser state isolation
 * 5. Performance monitoring
 * 6. Error tracking and reporting
 * 7. Test data seeding and cleanup
 * 8. Concurrent test isolation
 */

import { Browser, BrowserContext, Page } from '@playwright/test';

export interface TestEnvironmentConfig {
  webhookUrl: string;
  frontendUrl: string;
  mockData?: boolean;
  cleanupAfter?: boolean;
  isolateStorage?: boolean;
  monitorPerformance?: boolean;
  seedData?: boolean;
  parallelExecution?: boolean;
}

export interface TestSession {
  sessionId: string;
  threadId: string;
  clientId: string;
  userId: string;
  startTime: number;
  metadata: Record<string, any>;
}

export interface TestMetrics {
  totalRequests: number;
  averageResponseTime: number;
  errorCount: number;
  successRate: number;
  memoryUsage: number;
  startTime: number;
  endTime?: number;
}

export class TestEnvironmentManager {
  private config: TestEnvironmentConfig;
  private sessions: Map<string, TestSession> = new Map();
  private metrics: TestMetrics;
  private cleanup: (() => Promise<void>)[] = [];

  constructor(config: TestEnvironmentConfig) {
    this.config = {
      webhookUrl: 'https://n8n.vividwalls.blog/webhook/jetvision-agent',
      frontendUrl: 'http://localhost:3000',
      mockData: true,
      cleanupAfter: true,
      isolateStorage: true,
      monitorPerformance: true,
      seedData: false,
      parallelExecution: false,
      ...config
    };

    this.metrics = {
      totalRequests: 0,
      averageResponseTime: 0,
      errorCount: 0,
      successRate: 0,
      memoryUsage: 0,
      startTime: Date.now()
    };
  }

  /**
   * Initialize test environment
   */
  async initialize(): Promise<void> {
    console.log('[TestEnvironment] Initializing test environment...');
    
    if (this.config.seedData) {
      await this.seedTestData();
    }

    if (this.config.monitorPerformance) {
      await this.initializeMetrics();
    }

    console.log('[TestEnvironment] Test environment ready');
  }

  /**
   * Setup browser context with proper isolation
   */
  async setupBrowserContext(browser: Browser): Promise<BrowserContext> {
    const contextOptions: any = {
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 JetVision-E2E-Tests'
    };

    if (this.config.isolateStorage) {
      // Create isolated storage state for each test
      contextOptions.storageState = {
        cookies: [],
        origins: [{
          origin: this.config.frontendUrl,
          localStorage: [],
          sessionStorage: []
        }]
      };
    }

    const context = await browser.newContext(contextOptions);

    // Add performance monitoring to context
    if (this.config.monitorPerformance) {
      await this.setupPerformanceMonitoring(context);
    }

    // Setup cleanup handler
    this.cleanup.push(async () => {
      await context.close();
    });

    return context;
  }

  /**
   * Setup page with standard configuration
   */
  async setupPage(context: BrowserContext): Promise<Page> {
    const page = await context.newPage();

    // Setup console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`[Browser Console Error] ${msg.text()}`);
        this.metrics.errorCount++;
      }
    });

    // Setup page error handling
    page.on('pageerror', error => {
      console.error(`[Page Error] ${error.message}`);
      this.metrics.errorCount++;
    });

    // Setup request/response monitoring
    if (this.config.monitorPerformance) {
      await this.setupRequestMonitoring(page);
    }

    // Initialize page state
    await this.initializePageState(page);

    // Navigate to frontend
    await page.goto(this.config.frontendUrl, { waitUntil: 'domcontentloaded' });

    return page;
  }

  /**
   * Create isolated test session
   */
  async createTestSession(page: Page): Promise<TestSession> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const threadId = `thread-${Date.now()}`;
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userId = `test-user-${Date.now()}`;

    const session: TestSession = {
      sessionId,
      threadId,
      clientId,
      userId,
      startTime: Date.now(),
      metadata: {
        browser: page.context().browser()?.browserType().name(),
        viewport: page.viewportSize(),
        userAgent: await page.evaluate(() => navigator.userAgent)
      }
    };

    // Inject session data into page
    await page.addInitScript((sessionData) => {
      (window as any).__testSession = sessionData;
      
      // Override session generation if needed
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('testSessionId', sessionData.sessionId);
        sessionStorage.setItem('testThreadId', sessionData.threadId);
        sessionStorage.setItem('testClientId', sessionData.clientId);
      }
    }, session);

    this.sessions.set(sessionId, session);

    console.log(`[TestSession] Created session: ${sessionId}`);
    return session;
  }

  /**
   * Setup N8N webhook mocking
   */
  async setupN8NMocking(page: Page, options: {
    mockResponses?: boolean;
    streamingResponses?: boolean;
    errorScenarios?: boolean;
    responseDelay?: number;
  } = {}): Promise<void> {
    
    const config = {
      mockResponses: true,
      streamingResponses: true,
      errorScenarios: false,
      responseDelay: 1000,
      ...options
    };

    console.log('[N8N Mocking] Setting up webhook mocking with config:', config);

    // Setup basic webhook mocking
    if (config.mockResponses) {
      await this.setupBasicWebhookMocking(page, config.responseDelay);
    }

    // Setup streaming responses
    if (config.streamingResponses) {
      await this.setupStreamingMocking(page);
    }

    // Setup error scenarios
    if (config.errorScenarios) {
      await this.setupErrorScenarios(page);
    }

    console.log('[N8N Mocking] Webhook mocking configured');
  }

  /**
   * Setup authentication state
   */
  async setupAuthentication(page: Page, options: {
    skipAuth?: boolean;
    userId?: string;
    userRole?: string;
  } = {}): Promise<void> {

    if (options.skipAuth) {
      console.log('[Auth] Skipping authentication setup');
      return;
    }

    const userId = options.userId || `test-user-${Date.now()}`;
    const userRole = options.userRole || 'user';

    // Mock authentication state
    await page.addInitScript((authData) => {
      (window as any).__authState = {
        isAuthenticated: true,
        userId: authData.userId,
        role: authData.userRole,
        timestamp: Date.now()
      };
      
      // Mock Clerk auth if needed
      if (!window.location.href.includes('clerk')) {
        (window as any).clerk = {
          user: {
            id: authData.userId,
            primaryEmailAddress: { emailAddress: `${authData.userId}@test.jetvision.ai` }
          },
          session: { id: `session-${authData.userId}` }
        };
      }
    }, { userId, userRole });

    console.log(`[Auth] Authentication configured for user: ${userId}`);
  }

  /**
   * Seed test data
   */
  private async seedTestData(): Promise<void> {
    console.log('[TestData] Seeding test data...');
    
    // This would typically seed database with test data
    // For now, we'll prepare mock data structures
    const testData = {
      conversations: [
        {
          id: 'test-conversation-1',
          messages: [
            { role: 'user', content: 'Test message 1' },
            { role: 'assistant', content: 'Test response 1' }
          ]
        }
      ],
      prompts: [
        { id: 'jet-1', category: 'charter', prompt: 'Test aircraft search' },
        { id: 'apollo-1', category: 'apollo', prompt: 'Test lead search' }
      ]
    };

    // Store in a way that can be accessed by tests
    (global as any).__testData = testData;
    
    console.log('[TestData] Test data seeded');
  }

  /**
   * Setup basic webhook mocking
   */
  private async setupBasicWebhookMocking(page: Page, delay: number): Promise<void> {
    await page.route(this.config.webhookUrl + '**', async (route, request) => {
      const payload = request.postDataJSON();
      
      // Track metrics
      this.metrics.totalRequests++;
      const requestStart = Date.now();

      // Simulate processing delay
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const responseTime = Date.now() - requestStart;
      this.updateMetrics(responseTime, true);

      // Generate mock response based on query
      const mockResponse = this.generateMockResponse(payload);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      });
    });
  }

  /**
   * Setup streaming response mocking
   */
  private async setupStreamingMocking(page: Page): Promise<void> {
    await page.route(this.config.webhookUrl + '/stream**', async (route) => {
      const streamingChunks = [
        'Initializing request...',
        'Processing your query...',
        'Gathering information...',
        'Analyzing results...',
        'Preparing response...',
        'Complete.'
      ];

      const stream = new ReadableStream({
        start(controller) {
          streamingChunks.forEach((chunk, index) => {
            setTimeout(() => {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ message: chunk })}\n\n`)
              );
              
              if (index === streamingChunks.length - 1) {
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                controller.close();
              }
            }, index * 800);
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
  }

  /**
   * Setup error scenarios
   */
  private async setupErrorScenarios(page: Page): Promise<void> {
    let errorCount = 0;

    await page.route(this.config.webhookUrl + '/error**', async (route) => {
      errorCount++;
      this.metrics.errorCount++;

      const errorTypes = [
        { status: 500, error: 'Internal server error' },
        { status: 503, error: 'Service unavailable' },
        { status: 408, error: 'Request timeout' },
        { status: 429, error: 'Too many requests' }
      ];

      const errorType = errorTypes[errorCount % errorTypes.length];

      await route.fulfill({
        status: errorType.status,
        contentType: 'application/json',
        body: JSON.stringify({
          error: errorType.error,
          code: `ERROR_${errorType.status}`,
          timestamp: new Date().toISOString()
        })
      });
    });
  }

  /**
   * Generate mock response based on query
   */
  private generateMockResponse(payload: any): any {
    const query = payload?.message || '';
    const lowerQuery = query.toLowerCase();

    let responseType = 'general';
    let responseData = {};

    if (lowerQuery.includes('aircraft') || lowerQuery.includes('flight')) {
      responseType = 'avinode';
      responseData = {
        aircraft: [
          {
            id: 'mock-aircraft-1',
            model: 'Gulfstream G650',
            tailNumber: 'N123GS',
            availability: 'available',
            pricing: { hourlyRate: 8500, currency: 'USD' }
          }
        ]
      };
    } else if (lowerQuery.includes('contact') || lowerQuery.includes('apollo') || lowerQuery.includes('lead')) {
      responseType = 'apollo';
      responseData = {
        contacts: [
          {
            id: 'mock-contact-1',
            name: 'John Doe',
            title: 'Executive Assistant',
            company: 'Test Corp',
            email: 'john@testcorp.com'
          }
        ]
      };
    }

    return {
      id: `mock-response-${Date.now()}`,
      type: responseType,
      status: 'success',
      message: `Mock response for: ${query}`,
      data: responseData,
      metadata: {
        executionTime: Math.random() * 2000 + 500,
        workflowId: `mock-workflow-${responseType}`,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Setup performance monitoring
   */
  private async setupPerformanceMonitoring(context: BrowserContext): Promise<void> {
    context.on('response', response => {
      if (response.url().includes(this.config.webhookUrl)) {
        const timing = response.request().timing();
        if (timing) {
          this.updateMetrics(timing.responseEnd - timing.requestStart, response.ok());
        }
      }
    });
  }

  /**
   * Setup request monitoring on page
   */
  private async setupRequestMonitoring(page: Page): Promise<void> {
    await page.addInitScript(() => {
      (window as any).__requestMetrics = {
        requests: [],
        startTime: Date.now()
      };

      // Override fetch to track requests
      const originalFetch = window.fetch;
      window.fetch = async function(...args: any[]) {
        const startTime = performance.now();
        const requestId = Math.random().toString(36).substr(2, 9);
        
        try {
          const response = await originalFetch.apply(this, args);
          const endTime = performance.now();
          
          (window as any).__requestMetrics.requests.push({
            id: requestId,
            url: args[0],
            method: args[1]?.method || 'GET',
            status: response.status,
            duration: endTime - startTime,
            timestamp: new Date().toISOString(),
            success: response.ok
          });
          
          return response;
        } catch (error) {
          const endTime = performance.now();
          
          (window as any).__requestMetrics.requests.push({
            id: requestId,
            url: args[0],
            method: args[1]?.method || 'GET',
            status: 0,
            duration: endTime - startTime,
            timestamp: new Date().toISOString(),
            success: false,
            error: error.message
          });
          
          throw error;
        }
      };
    });
  }

  /**
   * Initialize page state
   */
  private async initializePageState(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // Clear any existing storage
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }

      // Set test environment flag
      (window as any).__isTestEnvironment = true;
      (window as any).__testStartTime = Date.now();
      
      // Initialize test utilities
      (window as any).__testUtils = {
        getMetrics: () => (window as any).__requestMetrics,
        getSession: () => (window as any).__testSession,
        getAuthState: () => (window as any).__authState
      };
    });
  }

  /**
   * Initialize metrics tracking
   */
  private async initializeMetrics(): Promise<void> {
    this.metrics = {
      totalRequests: 0,
      averageResponseTime: 0,
      errorCount: 0,
      successRate: 0,
      memoryUsage: 0,
      startTime: Date.now()
    };
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(responseTime: number, success: boolean): void {
    this.metrics.totalRequests++;
    
    // Calculate running average
    this.metrics.averageResponseTime = (
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1)) + responseTime
    ) / this.metrics.totalRequests;

    if (!success) {
      this.metrics.errorCount++;
    }

    this.metrics.successRate = ((this.metrics.totalRequests - this.metrics.errorCount) / this.metrics.totalRequests) * 100;
  }

  /**
   * Get test session by ID
   */
  getSession(sessionId: string): TestSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get current metrics
   */
  getMetrics(): TestMetrics {
    return { ...this.metrics, endTime: Date.now() };
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): TestSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up test environment
   */
  async cleanup(): Promise<void> {
    console.log('[TestEnvironment] Starting cleanup...');

    this.metrics.endTime = Date.now();

    // Run all cleanup handlers
    for (const cleanupFn of this.cleanup) {
      try {
        await cleanupFn();
      } catch (error) {
        console.error('[TestEnvironment] Cleanup error:', error);
      }
    }

    // Clear sessions
    this.sessions.clear();

    // Clear global test data
    delete (global as any).__testData;

    console.log('[TestEnvironment] Cleanup complete');
    
    // Log final metrics
    this.logFinalMetrics();
  }

  /**
   * Log final test metrics
   */
  private logFinalMetrics(): void {
    const totalTime = (this.metrics.endTime || Date.now()) - this.metrics.startTime;
    
    console.log('\n[TestEnvironment] Final Test Metrics:');
    console.log(`  Total Time: ${totalTime}ms`);
    console.log(`  Total Requests: ${this.metrics.totalRequests}`);
    console.log(`  Average Response Time: ${this.metrics.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Success Rate: ${this.metrics.successRate.toFixed(2)}%`);
    console.log(`  Error Count: ${this.metrics.errorCount}`);
    console.log(`  Sessions Created: ${this.sessions.size}`);
  }

  /**
   * Wait for environment to be ready
   */
  async waitForReady(page: Page, timeout: number = 10000): Promise<void> {
    await page.waitForFunction(
      () => {
        return document.readyState === 'complete' && 
               (window as any).__isTestEnvironment === true &&
               document.querySelector('[data-chat-input="true"]') !== null;
      },
      { timeout }
    );
    
    console.log('[TestEnvironment] Environment ready for testing');
  }

  /**
   * Validate environment health
   */
  async validateHealth(page: Page): Promise<boolean> {
    try {
      // Check if frontend is accessible
      const response = await page.request.get(this.config.frontendUrl);
      if (!response.ok()) {
        console.error(`[Health] Frontend not accessible: ${response.status()}`);
        return false;
      }

      // Check if page loads correctly
      await page.goto(this.config.frontendUrl);
      const hasInput = await page.locator('[data-chat-input="true"]').isVisible();
      if (!hasInput) {
        console.error('[Health] Chat input not found on page');
        return false;
      }

      console.log('[Health] Environment health check passed');
      return true;
    } catch (error) {
      console.error('[Health] Environment health check failed:', error);
      return false;
    }
  }
}

/**
 * Global test environment manager instance
 */
let globalTestEnvironment: TestEnvironmentManager | null = null;

/**
 * Get or create global test environment
 */
export function getTestEnvironment(config?: TestEnvironmentConfig): TestEnvironmentManager {
  if (!globalTestEnvironment) {
    globalTestEnvironment = new TestEnvironmentManager(config || {
      webhookUrl: 'https://n8n.vividwalls.blog/webhook/jetvision-agent',
      frontendUrl: 'http://localhost:3000'
    });
  }
  return globalTestEnvironment;
}

/**
 * Cleanup global test environment
 */
export async function cleanupGlobalTestEnvironment(): Promise<void> {
  if (globalTestEnvironment) {
    await globalTestEnvironment.cleanup();
    globalTestEnvironment = null;
  }
}