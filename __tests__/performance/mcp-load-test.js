// Performance and Load Testing for MCP Servers
// This script tests the performance characteristics of our MCP servers under load

const { performance } = require('perf_hooks');
const http = require('http');
const https = require('https');

class MCPPerformanceTester {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.options = {
      timeout: options.timeout || 30000,
      concurrency: options.concurrency || 10,
      iterations: options.iterations || 100,
      rampUp: options.rampUp || 1000, // ms between requests during ramp-up
      ...options
    };
    this.results = [];
    this.errors = [];
  }

  async runTest(testSuite) {
    console.log(`\n=== MCP Performance Test Suite: ${testSuite.name} ===`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Concurrency: ${this.options.concurrency}`);
    console.log(`Iterations: ${this.options.iterations}`);
    
    const startTime = performance.now();
    
    // Initialize session if needed
    let sessionId;
    if (testSuite.requiresSession) {
      sessionId = await this.initializeSession();
      console.log(`Session initialized: ${sessionId}`);
    }

    // Run tests
    const testResults = [];
    
    for (const test of testSuite.tests) {
      console.log(`\nRunning test: ${test.name}`);
      const result = await this.runSingleTest(test, sessionId);
      testResults.push(result);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Generate report
    this.generateReport(testSuite.name, testResults, totalTime);
    
    return testResults;
  }

  async initializeSession() {
    const initRequest = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '0.1.0',
        capabilities: {},
        clientInfo: {
          name: 'performance-test-client',
          version: '1.0.0'
        }
      },
      id: 1
    };

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(initRequest);
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: this.options.timeout
      };

      const req = (this.baseUrl.startsWith('https:') ? https : http).request(this.baseUrl, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const sessionId = res.headers['mcp-session-id'];
            resolve(sessionId);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Initialize request timeout')));
      req.write(postData);
      req.end();
    });
  }

  async runSingleTest(test, sessionId) {
    const results = {
      name: test.name,
      totalRequests: this.options.iterations,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      throughput: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0
    };

    const promises = [];
    const startTime = performance.now();

    // Create requests with controlled concurrency
    for (let i = 0; i < this.options.iterations; i++) {
      if (i % this.options.concurrency === 0 && i > 0) {
        // Wait for current batch to complete before starting next batch
        await Promise.all(promises.splice(0, this.options.concurrency));
      }

      promises.push(this.makeRequest(test, sessionId, i).then(result => {
        if (result.success) {
          results.successfulRequests++;
          results.responseTimes.push(result.responseTime);
          results.minResponseTime = Math.min(results.minResponseTime, result.responseTime);
          results.maxResponseTime = Math.max(results.maxResponseTime, result.responseTime);
        } else {
          results.failedRequests++;
          results.errors.push(result.error);
        }
      }));

      // Ramp-up delay
      if (this.options.rampUp > 0) {
        await this.sleep(this.options.rampUp / this.options.iterations);
      }
    }

    // Wait for all remaining requests
    await Promise.all(promises);

    const endTime = performance.now();
    const testDuration = (endTime - startTime) / 1000; // Convert to seconds

    // Calculate statistics
    if (results.responseTimes.length > 0) {
      results.responseTimes.sort((a, b) => a - b);
      results.averageResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
      results.p95ResponseTime = results.responseTimes[Math.floor(results.responseTimes.length * 0.95)];
      results.p99ResponseTime = results.responseTimes[Math.floor(results.responseTimes.length * 0.99)];
      results.throughput = results.successfulRequests / testDuration;
    }

    results.testDuration = testDuration;
    return results;
  }

  async makeRequest(test, sessionId, requestId) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      let requestData = test.request;
      if (typeof test.request === 'function') {
        requestData = test.request(requestId);
      }

      const postData = JSON.stringify(requestData);
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...(sessionId && { 'mcp-session-id': sessionId })
        },
        timeout: this.options.timeout
      };

      const req = (this.baseUrl.startsWith('https:') ? https : http).request(this.baseUrl, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;

          try {
            const response = JSON.parse(data);
            const success = res.statusCode === 200 && !response.error;
            
            resolve({
              success,
              responseTime,
              statusCode: res.statusCode,
              response: success ? response : null,
              error: success ? null : (response.error || `HTTP ${res.statusCode}`)
            });
          } catch (error) {
            resolve({
              success: false,
              responseTime,
              statusCode: res.statusCode,
              response: null,
              error: `Parse error: ${error.message}`
            });
          }
        });
      });

      req.on('error', (error) => {
        const endTime = performance.now();
        resolve({
          success: false,
          responseTime: endTime - startTime,
          statusCode: 0,
          response: null,
          error: error.message
        });
      });

      req.on('timeout', () => {
        const endTime = performance.now();
        req.destroy();
        resolve({
          success: false,
          responseTime: endTime - startTime,
          statusCode: 0,
          response: null,
          error: 'Request timeout'
        });
      });

      req.write(postData);
      req.end();
    });
  }

  generateReport(suiteName, results, totalTime) {
    console.log(`\n=== Performance Test Report: ${suiteName} ===`);
    console.log(`Total Test Duration: ${(totalTime / 1000).toFixed(2)}s`);
    
    let totalRequests = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let allResponseTimes = [];

    results.forEach(result => {
      console.log(`\n--- ${result.name} ---`);
      console.log(`  Requests: ${result.totalRequests}`);
      console.log(`  Successful: ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%)`);
      console.log(`  Failed: ${result.failedRequests} (${((result.failedRequests / result.totalRequests) * 100).toFixed(1)}%)`);
      console.log(`  Throughput: ${result.throughput.toFixed(2)} req/s`);
      console.log(`  Response Times:`);
      console.log(`    Average: ${result.averageResponseTime.toFixed(2)}ms`);
      console.log(`    Min: ${result.minResponseTime === Infinity ? 'N/A' : result.minResponseTime.toFixed(2)}ms`);
      console.log(`    Max: ${result.maxResponseTime.toFixed(2)}ms`);
      console.log(`    P95: ${result.p95ResponseTime.toFixed(2)}ms`);
      console.log(`    P99: ${result.p99ResponseTime.toFixed(2)}ms`);

      if (result.errors.length > 0) {
        console.log(`  Errors:`);
        const errorCounts = {};
        result.errors.forEach(error => {
          errorCounts[error] = (errorCounts[error] || 0) + 1;
        });
        Object.entries(errorCounts).forEach(([error, count]) => {
          console.log(`    ${error}: ${count} times`);
        });
      }

      totalRequests += result.totalRequests;
      totalSuccessful += result.successfulRequests;
      totalFailed += result.failedRequests;
      allResponseTimes = allResponseTimes.concat(result.responseTimes);
    });

    // Overall statistics
    console.log(`\n=== Overall Statistics ===`);
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Success Rate: ${((totalSuccessful / totalRequests) * 100).toFixed(1)}%`);
    console.log(`Overall Throughput: ${(totalSuccessful / (totalTime / 1000)).toFixed(2)} req/s`);
    
    if (allResponseTimes.length > 0) {
      allResponseTimes.sort((a, b) => a - b);
      const overallAverage = allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
      const overallP95 = allResponseTimes[Math.floor(allResponseTimes.length * 0.95)];
      const overallP99 = allResponseTimes[Math.floor(allResponseTimes.length * 0.99)];
      
      console.log(`Overall Response Times:`);
      console.log(`  Average: ${overallAverage.toFixed(2)}ms`);
      console.log(`  P95: ${overallP95.toFixed(2)}ms`);
      console.log(`  P99: ${overallP99.toFixed(2)}ms`);
    }

    // Performance benchmarks
    this.evaluatePerformance(results);
  }

  evaluatePerformance(results) {
    console.log(`\n=== Performance Evaluation ===`);
    
    const benchmarks = {
      responseTime: {
        excellent: 100,
        good: 500,
        acceptable: 2000,
        poor: 5000
      },
      successRate: {
        excellent: 99.9,
        good: 99.0,
        acceptable: 95.0,
        poor: 90.0
      },
      throughput: {
        excellent: 100,
        good: 50,
        acceptable: 20,
        poor: 10
      }
    };

    results.forEach(result => {
      console.log(`\n${result.name}:`);
      
      // Response time evaluation
      const avgResponseTime = result.averageResponseTime;
      let responseGrade = 'Poor';
      if (avgResponseTime <= benchmarks.responseTime.excellent) responseGrade = 'Excellent';
      else if (avgResponseTime <= benchmarks.responseTime.good) responseGrade = 'Good';
      else if (avgResponseTime <= benchmarks.responseTime.acceptable) responseGrade = 'Acceptable';
      console.log(`  Response Time: ${responseGrade}`);

      // Success rate evaluation
      const successRate = (result.successfulRequests / result.totalRequests) * 100;
      let reliabilityGrade = 'Poor';
      if (successRate >= benchmarks.successRate.excellent) reliabilityGrade = 'Excellent';
      else if (successRate >= benchmarks.successRate.good) reliabilityGrade = 'Good';
      else if (successRate >= benchmarks.successRate.acceptable) reliabilityGrade = 'Acceptable';
      console.log(`  Reliability: ${reliabilityGrade}`);

      // Throughput evaluation
      const throughput = result.throughput;
      let throughputGrade = 'Poor';
      if (throughput >= benchmarks.throughput.excellent) throughputGrade = 'Excellent';
      else if (throughput >= benchmarks.throughput.good) throughputGrade = 'Good';
      else if (throughput >= benchmarks.throughput.acceptable) throughputGrade = 'Acceptable';
      console.log(`  Throughput: ${throughputGrade}`);
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Apollo.io MCP Server Test Suite
const apolloTestSuite = {
  name: 'Apollo.io MCP Server',
  requiresSession: true,
  tests: [
    {
      name: 'List Tools',
      request: {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1
      }
    },
    {
      name: 'Search Leads',
      request: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'search-leads',
          arguments: {
            jobTitle: 'CEO',
            industry: 'Aviation',
            companySize: '50-200',
            location: 'United States'
          }
        },
        id: 2
      }
    },
    {
      name: 'Enrich Contact',
      request: (requestId) => ({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'enrich-contact',
          arguments: {
            email: `test${requestId}@example.com`
          }
        },
        id: requestId + 100
      })
    },
    {
      name: 'Get Account Data',
      request: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get-account-data',
          arguments: {
            domain: 'jetvision.com'
          }
        },
        id: 3
      }
    }
  ]
};

// Avainode MCP Server Test Suite
const avainodeTestSuite = {
  name: 'Avainode MCP Server',
  requiresSession: true,
  tests: [
    {
      name: 'List Tools',
      request: {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1
      }
    },
    {
      name: 'Search Aircraft',
      request: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'search-aircraft',
          arguments: {
            departureAirport: 'KJFK',
            arrivalAirport: 'KLAX',
            departureDate: '2024-12-01',
            passengers: 8
          }
        },
        id: 2
      }
    },
    {
      name: 'Get Pricing',
      request: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get-pricing',
          arguments: {
            aircraftId: 'ACF123',
            departureAirport: 'KJFK',
            arrivalAirport: 'KLAX',
            departureDate: '2024-12-01',
            passengers: 8
          }
        },
        id: 3
      }
    },
    {
      name: 'Get Operator Info',
      request: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get-operator-info',
          arguments: {
            operatorId: 'OP789',
            includeSafetyRecords: true
          }
        },
        id: 4
      }
    }
  ]
};

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node mcp-load-test.js <server-url> [options]');
    console.log('Example: node mcp-load-test.js http://localhost:8123 --concurrency=20 --iterations=200');
    process.exit(1);
  }

  const serverUrl = args[0];
  const options = {};
  
  // Parse command line options
  args.slice(1).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      if (value && !isNaN(value)) {
        options[key] = parseInt(value);
      } else {
        options[key] = value || true;
      }
    }
  });

  const tester = new MCPPerformanceTester(serverUrl, options);

  try {
    // Determine which test suite to run based on server URL
    let testSuite;
    if (serverUrl.includes('8123') || serverUrl.includes('apollo')) {
      testSuite = apolloTestSuite;
    } else if (serverUrl.includes('8124') || serverUrl.includes('avainode')) {
      testSuite = avainodeTestSuite;
    } else {
      // Default to Apollo if unclear
      testSuite = apolloTestSuite;
      console.log('Warning: Could not determine server type from URL, defaulting to Apollo.io tests');
    }

    await tester.runTest(testSuite);
    console.log('\n✅ Performance testing completed successfully');
  } catch (error) {
    console.error('\n❌ Performance testing failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { MCPPerformanceTester, apolloTestSuite, avainodeTestSuite };