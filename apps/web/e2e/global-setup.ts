import { chromium, FullConfig } from '@playwright/test';
import { getTestEnvironment } from './setup/test-environment';

async function globalSetup(config: FullConfig) {
  console.log('🚀 JetVision Agent E2E Test Setup Starting...');

  const baseURL = config.use?.baseURL || 'http://localhost:3000';
  const webhookURL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.vividwalls.blog/webhook/jetvision-agent';

  // Initialize test environment manager
  const testEnv = getTestEnvironment({
    webhookUrl: webhookURL,
    frontendUrl: baseURL,
    mockData: true,
    cleanupAfter: false, // Don't cleanup in global setup
    isolateStorage: true,
    monitorPerformance: true,
    seedData: process.env.SEED_TEST_DATA === 'true',
    parallelExecution: config.workers > 1
  });

  // Create a browser instance for setup tasks
  const browser = await chromium.launch();
  
  try {
    // Setup browser context with test environment
    const context = await testEnv.setupBrowserContext(browser);
    const page = await testEnv.setupPage(context);

    console.log(`📡 Checking application availability at ${baseURL}...`);

    // Validate environment health
    const isHealthy = await testEnv.validateHealth(page);
    if (!isHealthy) {
      throw new Error('Environment health check failed');
    }

    // Initialize test environment
    await testEnv.initialize();

    // Setup authentication for testing
    await testEnv.setupAuthentication(page, {
      skipAuth: process.env.SKIP_AUTH === 'true',
      userId: process.env.TEST_USER_ID || 'test-user-global'
    });

    // Setup N8N mocking with comprehensive options
    await testEnv.setupN8NMocking(page, {
      mockResponses: process.env.MOCK_N8N !== 'false',
      streamingResponses: true,
      errorScenarios: process.env.TEST_ERROR_SCENARIOS === 'true',
      responseDelay: parseInt(process.env.N8N_RESPONSE_DELAY || '1000', 10)
    });

    // Wait for environment to be ready
    await testEnv.waitForReady(page, 30000);

    // Verify critical API endpoints
    console.log('🔍 Verifying API endpoints...');
    
    try {
      const healthCheck = await page.request.get(`${baseURL}/api/health`);
      if (healthCheck.ok()) {
        console.log('✅ Health check endpoint is responding');
      } else {
        console.warn('⚠️ Health check endpoint not responding, continuing anyway...');
      }
    } catch (error) {
      console.warn('⚠️ Could not verify health endpoint:', error);
    }

    // Check N8N webhook endpoint
    try {
      const webhookCheck = await page.request.get(`${baseURL}/api/n8n-webhook`);
      if (webhookCheck.ok()) {
        console.log('✅ N8N webhook endpoint is responding');
      } else {
        console.warn('⚠️ N8N webhook endpoint check failed');
      }
    } catch (error) {
      console.warn('⚠️ Could not verify N8N webhook endpoint:', error);
    }

    // Setup test data directories
    await setupTestDirectories();

    // Setup CI-specific configuration
    if (process.env.CI) {
      console.log('🔐 Setting up CI-specific configuration...');
      await setupCIEnvironment(page);
    }

    // Store global test configuration
    (global as any).__TEST_CONFIG__ = {
      baseURL,
      webhookURL,
      startTime: Date.now(),
      ciMode: !!process.env.CI,
      parallelExecution: config.workers > 1,
      environment: testEnv
    };

    // Log comprehensive environment information
    await logEnvironmentInfo(page, baseURL);

    console.log('✅ Global setup completed successfully');

    // Close the setup page but keep browser for tests
    await context.close();

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    
    // Cleanup on failure
    try {
      await testEnv.cleanup();
    } catch (cleanupError) {
      console.error('❌ Cleanup after setup failure also failed:', cleanupError);
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestDirectories(): Promise<void> {
  const fs = await import('fs').then(m => m.promises);
  const path = await import('path');
  
  const directories = [
    'test-results',
    'playwright-report',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
    'test-results/performance'
  ];
  
  try {
    for (const dir of directories) {
      await fs.mkdir(path.resolve(dir), { recursive: true });
    }
    console.log('📁 Test directories created');
  } catch (error) {
    console.log('📁 Test directories setup completed');
  }
}

async function setupCIEnvironment(page: any): Promise<void> {
  // CI-specific environment setup
  await page.addInitScript(() => {
    // Disable animations for faster CI execution
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-delay: 0.01ms !important;
        transition-duration: 0.01ms !important;
        transition-delay: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `;
    document.head.appendChild(style);
    
    // Set CI flag
    (window as any).__CI_MODE__ = true;
  });
}

async function logEnvironmentInfo(page: any, baseURL: string): Promise<void> {
  const userAgent = await page.evaluate(() => navigator.userAgent);
  const viewport = page.viewportSize();
  
  console.log('🌍 Comprehensive Environment Information:');
  console.log(`   - Base URL: ${baseURL}`);
  console.log(`   - Webhook URL: ${process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'default'}`);
  console.log(`   - CI Mode: ${!!process.env.CI}`);
  console.log(`   - Node Version: ${process.version}`);
  console.log(`   - Platform: ${process.platform}`);
  console.log(`   - Browser User Agent: ${userAgent}`);
  console.log(`   - Viewport: ${viewport?.width}x${viewport?.height}`);
  console.log(`   - Parallel Workers: ${process.env.CI ? '1' : 'undefined'}`);
  console.log(`   - Mock N8N: ${process.env.MOCK_N8N !== 'false'}`);
  console.log(`   - Test Data Seeding: ${process.env.SEED_TEST_DATA === 'true'}`);
  console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
}

export default globalSetup;