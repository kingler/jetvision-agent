import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 JetVision Agent E2E Test Setup Starting...');

  // Create a browser instance for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Check if the application is running
    const baseURL = config.use?.baseURL || 'http://localhost:3000';
    console.log(`📡 Checking application availability at ${baseURL}...`);

    try {
      await page.goto(baseURL, { timeout: 30000 });
      console.log('✅ Application is accessible');
    } catch (error) {
      console.error('❌ Application is not accessible. Make sure to run "bun run dev" first.');
      throw new Error(`Application not accessible at ${baseURL}`);
    }

    // Setup test database or mock data if needed
    console.log('📊 Setting up test environment...');
    
    // Initialize any global test state
    await page.addInitScript(() => {
      // Add global test utilities
      (window as any).__PLAYWRIGHT_TEST__ = true;
      (window as any).__TEST_START_TIME__ = Date.now();
    });

    // Verify critical API endpoints are responding
    console.log('🔍 Verifying API endpoints...');
    
    const healthCheck = await page.request.get(`${baseURL}/api/health`);
    if (healthCheck.ok()) {
      console.log('✅ Health check endpoint is responding');
    } else {
      console.warn('⚠️ Health check endpoint not responding, continuing anyway...');
    }

    // Setup authentication mocks if needed for CI
    if (process.env.CI) {
      console.log('🔐 Setting up CI authentication mocks...');
      // Add any CI-specific setup here
    }

    // Create test directories
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    
    const testResultsDir = path.resolve('test-results');
    const playwrightReportDir = path.resolve('playwright-report');
    
    try {
      await fs.mkdir(testResultsDir, { recursive: true });
      await fs.mkdir(playwrightReportDir, { recursive: true });
      console.log('📁 Test directories created');
    } catch (error) {
      console.log('📁 Test directories already exist');
    }

    // Log environment information
    console.log('🌍 Environment Information:');
    console.log(`   - Base URL: ${baseURL}`);
    console.log(`   - CI Mode: ${!!process.env.CI}`);
    console.log(`   - Node Version: ${process.version}`);
    console.log(`   - Platform: ${process.platform}`);

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;