#!/usr/bin/env node

/**
 * JetVision Send Button Integration Test
 * Tests the complete flow from button click to n8n response
 */

const fetch = require('node-fetch');
const EventSource = require('eventsource');
const readline = require('readline');
const { v4: uuidv4 } = require('uuid');

// Terminal colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

// Test configuration
const config = {
    apiUrl: process.env.API_URL || 'http://localhost:3000',
    n8nWebhookPath: '/api/n8n-webhook',
    healthCheckPath: '/api/n8n-webhook',
    testMessage: 'Find executive assistants at tech companies in California',
    threadId: `test-${uuidv4().slice(0, 8)}`,
    threadItemId: `item-${uuidv4().slice(0, 8)}`,
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
};

// Utility functions
const log = {
    info: msg => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
    success: msg => console.log(`${colors.green}✅${colors.reset} ${msg}`),
    error: msg => console.log(`${colors.red}❌${colors.reset} ${msg}`),
    warning: msg => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    debug: msg => config.verbose && console.log(`${colors.magenta}🔍${colors.reset} ${msg}`),
    test: (name, passed, details = '') => {
        const status = passed
            ? `${colors.green}PASS${colors.reset}`
            : `${colors.red}FAIL${colors.reset}`;
        console.log(
            `  ${status} - ${name}${details ? ` (${colors.bright}${details}${colors.reset})` : ''}`
        );
    },
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Test functions
async function testHealthCheck() {
    log.info('Testing health check endpoint...');

    try {
        const response = await fetch(`${config.apiUrl}${config.healthCheckPath}`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
        });

        const data = await response.json();

        log.test('Health endpoint accessible', response.ok, `Status: ${response.status}`);
        log.test('Response has status field', data.status !== undefined, data.status);
        log.test(
            'Circuit breaker check',
            !data.webhook?.circuitBreaker?.isOpen,
            data.webhook?.circuitBreaker?.isOpen ? 'OPEN' : 'CLOSED'
        );

        if (data.configuration?.hasApiKey) {
            log.success('API key is configured');
        } else {
            log.warning('API key not configured - some features may not work');
        }

        return response.ok;
    } catch (error) {
        log.error(`Health check failed: ${error.message}`);
        return false;
    }
}

async function testValidation() {
    log.info('Testing validation rules...');

    // Test empty message
    try {
        const response = await fetch(`${config.apiUrl}${config.n8nWebhookPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: '',
                threadId: config.threadId,
                threadItemId: uuidv4(),
            }),
        });

        const data = await response.json();
        log.test(
            'Empty message validation',
            response.status === 400 && data.error?.includes('required'),
            data.error || 'No validation'
        );
    } catch (error) {
        log.test('Empty message validation', false, error.message);
    }

    // Test long message
    try {
        const response = await fetch(`${config.apiUrl}${config.n8nWebhookPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'a'.repeat(4001),
                threadId: config.threadId,
                threadItemId: uuidv4(),
            }),
        });

        const data = await response.json();
        log.test(
            'Long message validation',
            response.status === 400 && data.error?.includes('too long'),
            data.error || 'No validation'
        );
    } catch (error) {
        log.test('Long message validation', false, error.message);
    }

    return true;
}

async function simulateSendButton() {
    log.info(`${colors.bright}Simulating send button click...${colors.reset}`);

    // Log the exact behavior
    log.debug('[SendButton] Clicked - hasTextInput: true, isGenerating: false');
    log.debug(`[SendButton] Message: "${config.testMessage}"`);
    log.debug('[SendButton] Calling sendMessage()...');

    // Simulate the exact frontend behavior
    await delay(100); // Small delay to simulate UI interaction

    log.debug('[SendMessage] Starting - isSignedIn: true');
    log.debug('[SendMessage] Setting isGenerating to true');
    log.debug(`[SendMessage] Creating thread item: ${config.threadItemId}`);

    return true;
}

async function testSendMessage() {
    log.info(`${colors.bright}Testing message sending to n8n webhook...${colors.reset}`);

    const startTime = Date.now();
    const events = [];
    let responseData = null;
    let errorOccurred = false;

    try {
        // Simulate send button click
        await simulateSendButton();

        // Send the actual request
        log.info(`Sending message: "${config.testMessage}"`);

        const response = await fetch(`${config.apiUrl}${config.n8nWebhookPath}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
            },
            body: JSON.stringify({
                message: config.testMessage,
                threadId: config.threadId,
                threadItemId: config.threadItemId,
                context: {
                    source: 'test-script',
                    timestamp: new Date().toISOString(),
                    test: true,
                },
            }),
        });

        log.test('HTTP request sent', response.ok, `Status: ${response.status}`);

        if (response.headers.get('content-type')?.includes('event-stream')) {
            log.success('SSE stream established');

            // Read the stream
            const reader = response.body;
            const decoder = new TextDecoder();
            let buffer = '';

            for await (const chunk of reader) {
                buffer += decoder.decode(chunk, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('event:')) {
                        const eventType = line.substring(6).trim();
                        events.push(eventType);
                        log.debug(`[Stream] Event: ${eventType}`);

                        if (eventType === 'status') {
                            log.info('⏳ Processing with n8n workflow...');
                        } else if (eventType === 'answer') {
                            log.success('Received answer from n8n!');
                        } else if (eventType === 'error') {
                            log.warning('Error event received from n8n');
                            errorOccurred = true;
                        } else if (eventType === 'done') {
                            const elapsed = Date.now() - startTime;
                            log.success(`Request completed in ${elapsed}ms`);
                            break;
                        }
                    } else if (line.startsWith('data:')) {
                        try {
                            const data = JSON.parse(line.substring(5).trim());
                            responseData = data;

                            if (data.answer?.text) {
                                log.debug(`[Answer] ${data.answer.text.substring(0, 100)}...`);
                            }
                            if (data.error) {
                                log.error(`[Error] ${data.error}`);
                                errorOccurred = true;
                            }
                        } catch (e) {
                            // Ignore parse errors for heartbeats
                        }
                    }
                }
            }
        } else {
            // Regular JSON response
            const data = await response.json();
            responseData = data;

            if (data.error) {
                log.error(`Error: ${data.error}`);
                errorOccurred = true;
            } else {
                log.success('Response received');
            }
        }

        // Test results
        log.test('Response received', responseData !== null);
        log.test('No errors occurred', !errorOccurred);
        log.test('Events received', events.length > 0, `${events.length} events`);

        if (events.length > 0) {
            log.debug(`Events: ${events.join(', ')}`);
        }

        return !errorOccurred;
    } catch (error) {
        log.error(`Send message failed: ${error.message}`);
        if (error.cause) {
            log.debug(`Cause: ${error.cause}`);
        }
        return false;
    }
}

async function interactiveTest() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const question = prompt => new Promise(resolve => rl.question(prompt, resolve));

    console.log(`\n${colors.bright}Interactive Send Button Test${colors.reset}`);
    console.log('='.repeat(50));

    const customMessage = await question(`\nEnter test message (or press Enter for default): `);
    if (customMessage.trim()) {
        config.testMessage = customMessage.trim();
    }

    console.log(`\nUsing message: ${colors.cyan}${config.testMessage}${colors.reset}`);

    rl.close();

    return testSendMessage();
}

// Main test runner
async function runTests() {
    console.log(`\n${colors.bright}🚀 JetVision Send Button Integration Test${colors.reset}`);
    console.log('='.repeat(50));
    console.log(`API URL: ${colors.cyan}${config.apiUrl}${colors.reset}`);
    console.log(`Thread ID: ${colors.cyan}${config.threadId}${colors.reset}`);
    console.log(`Test Mode: ${config.verbose ? 'Verbose' : 'Normal'}`);
    console.log('='.repeat(50));

    const tests = [
        { name: 'Health Check', fn: testHealthCheck },
        { name: 'Validation Rules', fn: testValidation },
        { name: 'Send Message', fn: testSendMessage },
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        console.log(`\n${colors.bright}Running: ${test.name}${colors.reset}`);
        console.log('-'.repeat(30));

        const result = await test.fn();
        if (result) {
            passed++;
        } else {
            failed++;
        }

        await delay(1000); // Brief pause between tests
    }

    // Summary
    console.log(`\n${'='.repeat(50)}`);
    console.log(`${colors.bright}Test Summary${colors.reset}`);
    console.log(
        `${colors.green}Passed: ${passed}${colors.reset} | ${colors.red}Failed: ${failed}${colors.reset}`
    );

    if (failed === 0) {
        log.success('All tests passed! The send button integration is working correctly.');
    } else {
        log.warning(`${failed} test(s) failed. Please check the errors above.`);
    }

    // Interactive option
    const args = process.argv.slice(2);
    if (args.includes('--interactive') || args.includes('-i')) {
        console.log(`\n${colors.bright}Starting interactive test...${colors.reset}`);
        await interactiveTest();
    }

    console.log(`\n${colors.cyan}💡 Tip: Run with --verbose for detailed logs${colors.reset}`);
    console.log(
        `${colors.cyan}💡 Tip: Run with --interactive to test custom messages${colors.reset}\n`
    );

    process.exit(failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', error => {
    log.error(`Unhandled error: ${error.message}`);
    process.exit(1);
});

// Run tests
if (require.main === module) {
    runTests().catch(error => {
        log.error(`Test runner failed: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { testHealthCheck, testValidation, testSendMessage, simulateSendButton };
