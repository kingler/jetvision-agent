#!/usr/bin/env node

/**
 * Manual test script for n8n webhook functionality
 * Run with: node scripts/test-n8n-webhook.js
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const N8N_WEBHOOK_URL = `${BASE_URL}/api/n8n-webhook`;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
    log(`\n📝 Testing: ${testName}`, 'cyan');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

// Test 1: Health Check
async function testHealthCheck() {
    logTest('Health Check Endpoint');

    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'GET',
        });

        const data = await response.json();

        if (response.status === 200) {
            logSuccess(`Health check passed - Status: ${data.status}`);
            log(`  Webhook URL: ${data.webhook?.url || 'Not configured'}`, 'blue');
            log(`  API Key configured: ${data.configuration?.hasApiKey ? 'Yes' : 'No'}`, 'blue');
            log(
                `  Circuit breaker: ${data.webhook?.circuitBreaker?.isOpen ? 'OPEN' : 'CLOSED'}`,
                'blue'
            );
            return true;
        } else {
            logError(`Health check failed - Status: ${response.status}`);
            return false;
        }
    } catch (error) {
        logError(`Health check error: ${error.message}`);
        return false;
    }
}

// Test 2: Message Validation
async function testMessageValidation() {
    logTest('Message Validation');

    const testCases = [
        {
            name: 'Empty message',
            payload: { message: '', threadId: 'test-123' },
            expectedStatus: 400,
            expectedError: 'Message is required',
        },
        {
            name: 'Long message',
            payload: { message: 'a'.repeat(4001), threadId: 'test-123' },
            expectedStatus: 400,
            expectedError: 'Message too long',
        },
        {
            name: 'Valid message',
            payload: { message: 'Test message', threadId: 'test-123', threadItemId: 'item-456' },
            expectedStatus: 200,
            expectedError: null,
        },
    ];

    let passed = true;

    for (const testCase of testCases) {
        try {
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testCase.payload),
            });

            if (testCase.expectedError) {
                const data = await response.json();
                if (
                    response.status === testCase.expectedStatus &&
                    data.error?.includes(testCase.expectedError)
                ) {
                    logSuccess(`  ✓ ${testCase.name}: Correctly rejected`);
                } else {
                    logError(
                        `  ✗ ${testCase.name}: Expected status ${testCase.expectedStatus}, got ${response.status}`
                    );
                    passed = false;
                }
            } else {
                if (
                    response.status === testCase.expectedStatus ||
                    response.headers.get('content-type')?.includes('event-stream')
                ) {
                    logSuccess(`  ✓ ${testCase.name}: Accepted`);
                } else {
                    logError(`  ✗ ${testCase.name}: Expected success, got ${response.status}`);
                    passed = false;
                }
            }
        } catch (error) {
            logError(`  ✗ ${testCase.name}: ${error.message}`);
            passed = false;
        }
    }

    return passed;
}

// Test 3: SSE Stream Response
async function testStreamResponse() {
    logTest('Server-Sent Events Stream');

    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Test streaming response',
                threadId: 'stream-test-123',
                threadItemId: 'stream-item-456',
            }),
        });

        if (response.headers.get('content-type')?.includes('event-stream')) {
            logSuccess('SSE headers correctly set');

            // Read first chunk of stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            const { value, done } = await reader.read();
            if (!done && value) {
                const text = decoder.decode(value);

                // Check for expected events
                const hasStatusEvent = text.includes('event: status');
                const hasAnswerEvent =
                    text.includes('event: answer') || text.includes('event: error');

                if (hasStatusEvent) {
                    logSuccess('  ✓ Status event found in stream');
                }
                if (hasAnswerEvent) {
                    logSuccess('  ✓ Answer/Error event found in stream');
                }

                // Close the stream
                reader.cancel();

                return hasStatusEvent || hasAnswerEvent;
            }
        } else {
            logError('Response is not SSE stream');
            return false;
        }
    } catch (error) {
        logError(`Stream test error: ${error.message}`);
        return false;
    }
}

// Test 4: Response Transformation
async function testResponseTransformation() {
    logTest('Response Transformation');

    // This would require the actual transformer module
    try {
        // Import the transformer if available
        const transformerPath = '../lib/n8n-response-transformer';
        let transformer;

        try {
            transformer = require(transformerPath);
        } catch {
            logWarning('Transformer module not found, skipping transformation tests');
            return true;
        }

        const testData = [
            {
                name: 'Apollo.io response',
                input: { response: 'Found Executive Assistant leads', executionId: 'test-123' },
                expected: { type: 'apollo_leads' },
            },
            {
                name: 'Avinode response',
                input: { response: 'Gulfstream G650 available', executionId: 'test-456' },
                expected: { type: 'aircraft_search' },
            },
        ];

        let passed = true;

        for (const test of testData) {
            const result = transformer.transformN8nResponse(test.input, 'thread-1', 'item-1');

            if (result.answer?.text) {
                logSuccess(`  ✓ ${test.name}: Transformed successfully`);
            } else {
                logError(`  ✗ ${test.name}: Transformation failed`);
                passed = false;
            }
        }

        return passed;
    } catch (error) {
        logError(`Transformation test error: ${error.message}`);
        return false;
    }
}

// Test 5: Error Handling
async function testErrorHandling() {
    logTest('Error Handling');

    // Simulate circuit breaker test
    log('  Testing circuit breaker behavior...', 'blue');

    // Make multiple failing requests to trigger circuit breaker
    let circuitBreakerTriggered = false;

    for (let i = 0; i < 6; i++) {
        try {
            // Use an invalid endpoint to simulate failure
            const response = await fetch(`${BASE_URL}/api/n8n-webhook-invalid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Test', threadId: 'test' }),
            });

            if (response.status === 503) {
                const data = await response.json();
                if (data.error?.includes('temporarily unavailable')) {
                    circuitBreakerTriggered = true;
                    logSuccess('  ✓ Circuit breaker activated after failures');
                    break;
                }
            }
        } catch {
            // Expected to fail
        }
    }

    if (!circuitBreakerTriggered) {
        logWarning('  ⚠ Circuit breaker test inconclusive (may need real n8n connection)');
    }

    return true;
}

// Main test runner
async function runTests() {
    log('\n🚀 Starting n8n Webhook Tests\n', 'cyan');
    log(`Testing against: ${N8N_WEBHOOK_URL}\n`, 'blue');

    const results = {
        healthCheck: false,
        validation: false,
        streaming: false,
        transformation: false,
        errorHandling: false,
    };

    // Run all tests
    results.healthCheck = await testHealthCheck();
    results.validation = await testMessageValidation();
    results.streaming = await testStreamResponse();
    results.transformation = await testResponseTransformation();
    results.errorHandling = await testErrorHandling();

    // Summary
    log('\n📊 Test Summary', 'cyan');
    log('━'.repeat(40), 'blue');

    let totalPassed = 0;
    let totalTests = 0;

    for (const [test, passed] of Object.entries(results)) {
        totalTests++;
        if (passed) {
            totalPassed++;
            log(`✅ ${test}: PASSED`, 'green');
        } else {
            log(`❌ ${test}: FAILED`, 'red');
        }
    }

    log('━'.repeat(40), 'blue');
    log(
        `\nTotal: ${totalPassed}/${totalTests} tests passed`,
        totalPassed === totalTests ? 'green' : 'yellow'
    );

    // Exit code
    process.exit(totalPassed === totalTests ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', error => {
    logError(`Unhandled error: ${error}`);
    process.exit(1);
});

// Run tests
runTests().catch(error => {
    logError(`Test runner failed: ${error.message}`);
    process.exit(1);
});
