import { FullConfig } from '@playwright/test';
import { cleanupGlobalTestEnvironment } from './setup/test-environment';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 JetVision Agent E2E Test Teardown Starting...');

  try {
    const testConfig = (global as any).__TEST_CONFIG__;
    const startTime = testConfig?.startTime || Date.now();
    const testDuration = Date.now() - startTime;

    console.log(`⏱️ Total test suite duration: ${(testDuration / 1000).toFixed(2)} seconds`);

    // Cleanup test environment manager
    console.log('🏗️ Cleaning up test environment...');
    await cleanupGlobalTestEnvironment();

    // Generate and save performance report
    if (testConfig?.environment) {
      await generatePerformanceReport(testConfig.environment.getMetrics());
    }

    // Clean up test data and temporary files
    console.log('🗑️ Cleaning up test data and temporary files...');
    await cleanupTestFiles();

    // Cleanup database connections and test data
    await cleanupTestData();

    // Generate comprehensive test summary
    await generateTestSummary(testConfig, testDuration);

    // Archive test results if in CI
    if (process.env.CI) {
      await archiveTestResults();
    }

    // Reset all global test state
    resetGlobalTestState();

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    
    // Log error details but don't fail the test run
    console.error('Teardown Error Details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}

async function generatePerformanceReport(metrics: any): Promise<void> {
  try {
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    
    const performanceReport = {
      summary: {
        totalRequests: metrics.totalRequests,
        averageResponseTime: Math.round(metrics.averageResponseTime),
        successRate: Math.round(metrics.successRate * 100) / 100,
        errorCount: metrics.errorCount,
        testDuration: metrics.endTime - metrics.startTime
      },
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ciMode: !!process.env.CI
      }
    };

    const reportPath = path.resolve('test-results/performance/performance-summary.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(performanceReport, null, 2));
    
    console.log('📊 Performance report generated:', reportPath);
  } catch (error) {
    console.warn('⚠️ Could not generate performance report:', error);
  }
}

async function cleanupTestFiles(): Promise<void> {
  const fs = await import('fs').then(m => m.promises);
  const path = await import('path');
  
  // Clean up temporary test files but preserve reports and important artifacts
  const tempDirs = [
    path.resolve('test-results/temp'),
    path.resolve('temp-screenshots'),
    path.resolve('.tmp-test-data'),
  ];
  
  const tempFiles = [
    path.resolve('test-session-*.tmp'),
    path.resolve('*.test.db'),
  ];
  
  // Clean directories
  for (const dir of tempDirs) {
    try {
      await fs.rmdir(dir, { recursive: true });
      console.log(`🗂️ Cleaned up directory: ${dir}`);
    } catch (error) {
      // Directory doesn't exist or can't be deleted, that's ok
    }
  }
  
  // Clean temporary files
  for (const filePattern of tempFiles) {
    try {
      const files = await import('glob').then(g => g.glob(filePattern));
      for (const file of files) {
        await fs.unlink(file);
        console.log(`🗄️ Cleaned up file: ${file}`);
      }
    } catch (error) {
      // Files don't exist, that's ok
    }
  }
}

async function cleanupTestData(): Promise<void> {
  // Cleanup database connections if any
  if ((global as any).__TEST_DB_CONNECTION__) {
    console.log('🔌 Closing database connections...');
    try {
      await (global as any).__TEST_DB_CONNECTION__.close();
    } catch (error) {
      console.warn('⚠️ Error closing database connection:', error);
    }
  }

  // Clear any test data from global state
  if ((global as any).__testData) {
    console.log('🧹 Clearing global test data...');
    delete (global as any).__testData;
  }

  // Clear any cached authentication tokens or sessions
  if ((global as any).__TEST_AUTH_TOKENS__) {
    console.log('🔐 Clearing test authentication data...');
    delete (global as any).__TEST_AUTH_TOKENS__;
  }
}

async function generateTestSummary(testConfig: any, duration: number): Promise<void> {
  console.log('\n📊 Comprehensive Test Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (testConfig) {
    console.log(`🌐 Base URL: ${testConfig.baseURL}`);
    console.log(`🔗 Webhook URL: ${testConfig.webhookURL}`);
    console.log(`⚡ Parallel Execution: ${testConfig.parallelExecution ? 'Yes' : 'No'}`);
    console.log(`☁️ CI Mode: ${testConfig.ciMode ? 'Yes' : 'No'}`);
  }
  
  console.log(`⏱️ Total Duration: ${(duration / 1000).toFixed(2)} seconds`);
  console.log(`🕒 Completed: ${new Date().toLocaleString()}`);
  
  console.log('\n📁 Generated Artifacts:');
  console.log(`   - Test Results: ./test-results/`);
  console.log(`   - HTML Report: ./playwright-report/index.html`);
  console.log(`   - Performance Data: ./test-results/performance/`);
  
  if (process.env.CI) {
    console.log('\n☁️ CI Mode - Artifacts Processing:');
    console.log(`   - Artifacts will be uploaded automatically`);
    console.log(`   - Test results available in CI dashboard`);
  } else {
    console.log('\n🛠️ Local Development:');
    console.log(`   - View HTML report: npx playwright show-report`);
    console.log(`   - Debug failed tests: npx playwright test --debug`);
    console.log(`   - Run specific tests: npx playwright test <test-file>`);
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function archiveTestResults(): Promise<void> {
  try {
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    
    // Create archive metadata for CI
    const archiveMetadata = {
      timestamp: new Date().toISOString(),
      gitCommit: process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA || 'unknown',
      branch: process.env.GITHUB_REF || process.env.CI_COMMIT_BRANCH || 'unknown',
      buildNumber: process.env.GITHUB_RUN_NUMBER || process.env.CI_PIPELINE_ID || 'unknown',
      environment: process.env.NODE_ENV || 'test'
    };
    
    const metadataPath = path.resolve('test-results/archive-metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(archiveMetadata, null, 2));
    
    console.log('📦 CI archive metadata created');
  } catch (error) {
    console.warn('⚠️ Could not create archive metadata:', error);
  }
}

function resetGlobalTestState(): void {
  // Reset all global test state variables
  const globalTestKeys = [
    '__TEST_CONFIG__',
    '__TEST_START_TIME__',
    '__TEST_DB_CONNECTION__',
    '__TEST_AUTH_TOKENS__',
    '__testData'
  ];
  
  for (const key of globalTestKeys) {
    if ((global as any)[key]) {
      delete (global as any)[key];
    }
  }
  
  console.log('🔄 Global test state reset');
}

export default globalTeardown;