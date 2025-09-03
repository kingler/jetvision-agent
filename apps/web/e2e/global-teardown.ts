import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 JetVision Agent E2E Test Teardown Starting...');

  try {
    // Calculate total test duration
    const testDuration = Date.now() - (global as any).__TEST_START_TIME__;
    console.log(`⏱️ Total test suite duration: ${(testDuration / 1000).toFixed(2)} seconds`);

    // Clean up any test data if needed
    console.log('🗑️ Cleaning up test data...');
    
    // Clear any temporary files
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    
    // Clean up temporary test files but preserve reports
    const tempDirs = [
      path.resolve('test-results/temp'),
      path.resolve('temp-screenshots'),
    ];
    
    for (const dir of tempDirs) {
      try {
        await fs.rmdir(dir, { recursive: true });
        console.log(`🗂️ Cleaned up ${dir}`);
      } catch (error) {
        // Directory doesn't exist or can't be deleted, that's ok
      }
    }

    // Log test summary information
    console.log('📊 Test Summary:');
    console.log(`   - Test Results: ./test-results/`);
    console.log(`   - HTML Report: ./playwright-report/index.html`);
    
    if (process.env.CI) {
      console.log('☁️ CI Mode - artifacts will be uploaded');
    } else {
      console.log('🌐 View HTML report: npx playwright show-report');
    }

    // Cleanup database connections if any
    if ((global as any).__TEST_DB_CONNECTION__) {
      console.log('🔌 Closing database connections...');
      try {
        await (global as any).__TEST_DB_CONNECTION__.close();
      } catch (error) {
        console.warn('⚠️ Error closing database connection:', error);
      }
    }

    // Reset global test state
    delete (global as any).__TEST_START_TIME__;
    delete (global as any).__TEST_DB_CONNECTION__;

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here, we don't want to fail the entire test run
  }
}

export default globalTeardown;