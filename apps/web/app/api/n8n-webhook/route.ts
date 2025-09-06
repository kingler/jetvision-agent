import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import {
    transformN8nResponse,
    extractResponseFromExecutionData,
} from '../../../lib/n8n-response-transformer';
import {
    retryWithBackoff,
    EnhancedCircuitBreaker,
    generateUserFriendlyError,
    categorizeError,
    ErrorCategory,
} from '../../../lib/retry-utils';

// Configuration with environment variables
const N8N_CONFIG = {
    webhookUrl:
        process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
        'https://n8n.vividwalls.blog/webhook/jetvision-agent',
    apiKey: process.env.N8N_API_KEY,
    apiUrl: process.env.N8N_API_URL || 'https://n8n.vividwalls.blog/api/v1',
    timeout: 30000, // 30 seconds
    maxRetries: 3,
    pollingInterval: 2000, // 2 seconds
    maxPollingTime: 60000, // 60 seconds max wait
};

// Enhanced circuit breaker instance
const circuitBreaker = new EnhancedCircuitBreaker(
    5, // failure threshold
    60000, // reset timeout (1 minute)
    3 // half-open max requests
);

// Health check endpoint
export async function GET(request: NextRequest) {
    try {
        const health = {
            service: 'n8n-webhook',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            webhook: {
                url: N8N_CONFIG.webhookUrl,
                circuitBreaker: circuitBreaker.getState(),
                isHealthy: circuitBreaker.getState().state === 'CLOSED',
            },
            configuration: {
                hasApiKey: !!N8N_CONFIG.apiKey,
                apiUrl: N8N_CONFIG.apiUrl,
                timeout: N8N_CONFIG.timeout,
            },
        };

        return NextResponse.json(health, { status: 200 });
    } catch (error) {
        console.error('Health check error:', error);
        return NextResponse.json(
            {
                error: 'Health check failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// Main webhook handler
export async function POST(request: NextRequest) {
    // Check authentication (bypass in development/keyless mode)
    const session = await auth();
    const clerkUserId = session?.userId;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!clerkUserId && !isDevelopment) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check circuit breaker state
    try {
        // Test circuit breaker with a dummy operation first
        await circuitBreaker.execute(async () => Promise.resolve('test'));
    } catch (error) {
        const friendlyError = generateUserFriendlyError(
            error instanceof Error ? error : new Error(String(error)),
            'N8N Service'
        );
        return NextResponse.json(
            {
                error: friendlyError,
                category: 'SERVICE_UNAVAILABLE',
                retryAfter: 60, // seconds
            },
            { status: 503 }
        );
    }

    let body: any = null;
    let message: string = '';
    let threadId: string = '';
    let threadItemId: string | undefined;
    let options: any = {};

    try {
        const requestText = await request.text();
        if (!requestText || !requestText.trim()) {
            return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
        }

        try {
            body = JSON.parse(requestText);
        } catch (parseError) {
            console.error('Failed to parse request JSON:', parseError);
            return NextResponse.json(
                {
                    error: 'Invalid JSON in request body',
                    details:
                        parseError instanceof Error ? parseError.message : 'Unknown parsing error',
                },
                { status: 400 }
            );
        }

        if (!body || typeof body !== 'object') {
            return NextResponse.json(
                { error: 'Request body must be a valid JSON object' },
                { status: 400 }
            );
        }

        ({ message, threadId, threadItemId, ...options } = body);

        // Validate input
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        if (message.length > 4000) {
            return NextResponse.json(
                { error: 'Message too long (max 4000 characters)' },
                { status: 400 }
            );
        }

        if (!threadId) {
            return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
        }

        // Create Server-Sent Events response
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                const sendEvent = (event: string, data: any) => {
                    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(encoder.encode(message));
                };

                try {
                    // Send initial status with workflow step information
                    sendEvent('status', {
                        threadId,
                        threadItemId: threadItemId || `n8n-${Date.now()}`,
                        event: 'status',
                        message: 'Processing request...',
                        status: 'connecting',
                        timestamp: new Date().toISOString(),
                        statusData: {
                            status: 'connecting',
                            currentStep: 'webhook',
                            progress: 10,
                            message: 'Initializing JetVision workflow connection...',
                        },
                    });

                    // Prepare request payload
                    const webhookPayload = {
                        message: message.trim(),
                        threadId,
                        threadItemId,
                        userId: clerkUserId,
                        timestamp: new Date().toISOString(),
                        ...options,
                    };

                    // Send to N8N webhook with retry logic and circuit breaker
                    console.log('🚀 Sending to n8n webhook with retry:', N8N_CONFIG.webhookUrl);

                    const webhookResult = await retryWithBackoff(
                        async () => {
                            return await circuitBreaker.execute(async () => {
                                let response: Response | null = null;

                                try {
                                    response = await fetch(N8N_CONFIG.webhookUrl, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            ...(N8N_CONFIG.apiKey && {
                                                Authorization: `Bearer ${N8N_CONFIG.apiKey}`,
                                            }),
                                        },
                                        body: JSON.stringify(webhookPayload),
                                        signal: AbortSignal.timeout(N8N_CONFIG.timeout),
                                    });
                                } catch (fetchError) {
                                    const errorMsg =
                                        fetchError instanceof Error
                                            ? fetchError.message
                                            : String(fetchError);
                                    console.error('Webhook fetch error:', {
                                        error: errorMsg,
                                        url: N8N_CONFIG.webhookUrl,
                                        timestamp: new Date().toISOString(),
                                    });

                                    // Enhance error message based on error type
                                    if (
                                        errorMsg.includes('timeout') ||
                                        errorMsg.includes('aborted')
                                    ) {
                                        throw new Error(
                                            `Webhook request timed out after ${N8N_CONFIG.timeout}ms: ${errorMsg}`
                                        );
                                    } else if (
                                        errorMsg.includes('network') ||
                                        errorMsg.includes('fetch')
                                    ) {
                                        throw new Error(
                                            `Network error connecting to webhook: ${errorMsg}`
                                        );
                                    } else {
                                        throw new Error(`Webhook request failed: ${errorMsg}`);
                                    }
                                }

                                // Validate response object
                                if (!response) {
                                    throw new Error('No response received from webhook server');
                                }

                                if (!(response instanceof Response)) {
                                    throw new Error(
                                        'Invalid response object received from webhook server'
                                    );
                                }

                                if (!response.ok) {
                                    let errorDetails = '';
                                    try {
                                        errorDetails = await response.text();
                                    } catch (textError) {
                                        errorDetails = 'Unable to read error response';
                                    }
                                    throw new Error(
                                        `Webhook failed: ${response.status} ${response.statusText}. Details: ${errorDetails}`
                                    );
                                }

                                return response;
                            });
                        },
                        {
                            maxRetries: N8N_CONFIG.maxRetries,
                            baseDelay: 1000,
                            maxDelay: 10000,
                            backoffFactor: 2,
                            jitter: true,
                            retryCondition: (error: Error, attempt: number) => {
                                const category = categorizeError(error);
                                // Retry on server errors and network issues, but not client errors
                                return [
                                    ErrorCategory.SERVER_ERROR,
                                    ErrorCategory.NETWORK,
                                    ErrorCategory.TIMEOUT,
                                    ErrorCategory.SERVICE_UNAVAILABLE,
                                ].includes(category);
                            },
                        }
                    );

                    if (!webhookResult.success) {
                        console.error('N8N webhook failed after retries:', {
                            error: webhookResult.error?.message,
                            attempts: webhookResult.attempts,
                            totalTime: webhookResult.totalTime,
                        });
                        throw webhookResult.error || new Error('Unknown webhook error');
                    }

                    const response = webhookResult.data;
                    console.log(
                        `N8N webhook succeeded after ${webhookResult.attempts} attempts (${webhookResult.totalTime}ms)`
                    );

                    // Enhanced type guard to ensure response exists and is a valid Response object
                    if (!response) {
                        throw new Error('No response received from webhook');
                    }

                    // Type assertion with runtime validation for Response object
                    if (!(response instanceof Response)) {
                        console.error('Invalid response type received:', typeof response, response);
                        throw new Error('Invalid response object type from webhook');
                    }

                    if (!response.ok) {
                        const errorText = await response
                            .text()
                            .catch(() => 'Unable to read error response');
                        throw new Error(
                            `Webhook failed: ${response.status} ${response.statusText}. Details: ${errorText}`
                        );
                    }

                    // Safe header access with null check
                    const contentType = response.headers?.get('content-type') || '';
                    let webhookData: any = null;

                    try {
                        // Clone response to avoid consuming the body multiple times
                        const responseClone = response.clone();

                        if (contentType.includes('application/json')) {
                            const jsonText = await response.text();
                            if (!jsonText || !jsonText.trim()) {
                                console.warn('Empty JSON response from N8N webhook');
                                webhookData = { response: 'Empty response received' };
                            } else {
                                try {
                                    webhookData = JSON.parse(jsonText);
                                    if (webhookData === null || webhookData === undefined) {
                                        console.warn(
                                            'Null/undefined JSON response from N8N webhook'
                                        );
                                        webhookData = { response: 'Null response received' };
                                    }
                                } catch (jsonError) {
                                    console.error('JSON parsing failed:', jsonError);
                                    webhookData = {
                                        response: `Failed to parse JSON response: ${jsonText.slice(0, 200)}...`,
                                        parseError: true,
                                        originalError:
                                            jsonError instanceof Error
                                                ? jsonError.message
                                                : String(jsonError),
                                    };
                                }
                            }
                        } else {
                            const textResponse = await response.text();
                            webhookData = {
                                response: textResponse || 'Empty text response',
                                contentType: contentType || 'unknown',
                            };
                        }
                    } catch (parseError) {
                        console.error('Failed to read N8N response:', parseError);
                        try {
                            // Try to get any available text from the cloned response
                            const rawText = await response.clone().text();
                            webhookData = {
                                response: rawText || 'Failed to read response',
                                parseError: true,
                                originalError:
                                    parseError instanceof Error
                                        ? parseError.message
                                        : String(parseError),
                            };
                        } catch (finalError) {
                            console.error('Complete failure to read response:', finalError);
                            webhookData = {
                                response: 'Complete failure to read response from server',
                                parseError: true,
                                criticalError: true,
                                originalError:
                                    finalError instanceof Error
                                        ? finalError.message
                                        : String(finalError),
                            };
                        }
                    }

                    // Final validation that we have some webhook data
                    if (!webhookData) {
                        console.error('No webhook data available after processing response');
                        webhookData = {
                            response: 'Server returned no data',
                            noData: true,
                        };
                    }

                    // Check if we got an immediate response or need to poll
                    if (webhookData.response) {
                        // Immediate response
                        const transformed = transformN8nResponse(
                            webhookData,
                            threadId,
                            threadItemId || `n8n-${Date.now()}`
                        );

                        sendEvent('answer', {
                            threadId,
                            threadItemId: threadItemId || transformed.id,
                            event: 'answer',
                            answer: {
                                text: transformed.answer.text,
                                structured: transformed.answer.structured,
                            },
                        });

                        sendEvent('done', {
                            type: 'done',
                            threadId,
                            threadItemId: threadItemId || transformed.id,
                            timestamp: new Date().toISOString(),
                            status: 'success',
                        });
                    } else if (webhookData.executionId) {
                        // Long-running execution - poll for result
                        const result = await pollForExecution(webhookData.executionId, sendEvent, threadId, threadItemId);

                        if (result) {
                            const transformed = transformN8nResponse(
                                result,
                                threadId,
                                threadItemId || `n8n-${Date.now()}`
                            );

                            sendEvent('answer', {
                                threadId,
                                threadItemId: threadItemId || transformed.id,
                                event: 'answer',
                                answer: {
                                    text: transformed.answer.text,
                                    structured: transformed.answer.structured,
                                },
                            });
                        }

                        sendEvent('done', {
                            type: 'done',
                            threadId,
                            threadItemId: threadItemId || `n8n-${Date.now()}`,
                            timestamp: new Date().toISOString(),
                            status: 'success',
                        });
                    } else {
                        // Fallback response
                        sendEvent('answer', {
                            threadId,
                            threadItemId: threadItemId || `n8n-${Date.now()}`,
                            event: 'answer',
                            answer: {
                                text:
                                    webhookData.message ||
                                    webhookData.response ||
                                    'Request processed successfully',
                                structured: null,
                            },
                        });

                        sendEvent('done', {
                            type: 'done',
                            threadId,
                            threadItemId: threadItemId || `n8n-${Date.now()}`,
                            timestamp: new Date().toISOString(),
                            status: 'success',
                        });
                    }
                } catch (error) {
                    console.error('N8N webhook error:', error);

                    const errorInstance = error instanceof Error ? error : new Error(String(error));
                    const errorCategory = categorizeError(errorInstance);
                    const friendlyMessage = generateUserFriendlyError(
                        errorInstance,
                        'JetVision Agent'
                    );

                    // Enhanced error logging
                    console.error('N8N Error Details:', {
                        category: errorCategory,
                        message: errorInstance.message,
                        stack: errorInstance.stack,
                        timestamp: new Date().toISOString(),
                        circuitBreakerState: circuitBreaker.getState(),
                    });

                    // Create context-aware fallback response based on error category
                    let fallbackResponse = friendlyMessage;
                    let recoveryActions: string[] = [];

                    switch (errorCategory) {
                        case ErrorCategory.NETWORK:
                            recoveryActions = [
                                'Check your internet connection',
                                'Try refreshing the page',
                                'Contact support if the issue persists',
                            ];
                            break;
                        case ErrorCategory.TIMEOUT:
                            recoveryActions = [
                                'Try again in a few moments',
                                'The system may be under high load',
                                'Consider breaking down complex requests',
                            ];
                            break;
                        case ErrorCategory.SERVER_ERROR:
                            recoveryActions = [
                                'Our team has been automatically notified',
                                'Try again in 2-3 minutes',
                                'Use the contact form if urgent',
                            ];
                            break;
                        case ErrorCategory.SERVICE_UNAVAILABLE:
                            recoveryActions = [
                                'Service is temporarily down for maintenance',
                                'Normal service will resume shortly',
                                'Check our status page for updates',
                            ];
                            break;
                        default:
                            recoveryActions = [
                                'Try rephrasing your request',
                                'Check that your input is valid',
                                'Contact support with error details',
                            ];
                    }

                    const enhancedFallback = `${fallbackResponse}\n\n**What you can do:**\n${recoveryActions.map(action => `• ${action}`).join('\n')}`;

                    sendEvent('answer', {
                        threadId,
                        threadItemId: threadItemId || `error-${Date.now()}`,
                        event: 'answer',
                        answer: {
                            text: enhancedFallback,
                            structured: null,
                        },
                    });

                    sendEvent('error', {
                        threadId,
                        threadItemId: threadItemId || `error-${Date.now()}`,
                        event: 'error',
                        error: friendlyMessage,
                        message: friendlyMessage,
                        category: errorCategory,
                        details: errorInstance.message,
                        recoverable: [
                            ErrorCategory.NETWORK,
                            ErrorCategory.TIMEOUT,
                            ErrorCategory.SERVER_ERROR,
                        ].includes(errorCategory),
                        timestamp: new Date().toISOString(),
                    });

                    sendEvent('done', {
                        type: 'done',
                        threadId,
                        threadItemId: threadItemId || `error-${Date.now()}`,
                        timestamp: new Date().toISOString(),
                        status: 'error',
                        error: errorCategory,
                    });
                } finally {
                    controller.close();
                }
            },
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    } catch (error) {
        console.error('Request processing error:', error);
        return NextResponse.json(
            {
                error: 'Failed to process request',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// Helper function to poll for execution results
async function pollForExecution(
    executionId: string,
    sendEvent: (event: string, data: any) => void,
    threadId: string,
    threadItemId: string | undefined
): Promise<any> {
    const startTime = Date.now();
    const pollInterval = N8N_CONFIG.pollingInterval;
    const maxWaitTime = N8N_CONFIG.maxPollingTime;

    while (Date.now() - startTime < maxWaitTime) {
        try {
            const progress = Math.min(((Date.now() - startTime) / maxWaitTime) * 100, 90);
            let currentStep = 'agent';
            let stepMessage = 'JetVision Agent is processing your request...';

            // Determine current step based on progress and time
            if (progress > 60) {
                currentStep = 'response';
                stepMessage = 'Generating your comprehensive response...';
            } else if (progress > 40) {
                currentStep = 'knowledge';
                stepMessage = 'Searching knowledge base and integrating data...';
            } else if (progress > 20) {
                currentStep = 'apollo';
                stepMessage = 'Querying Apollo.io and Avinode systems...';
            }

            sendEvent('status', {
                threadId,
                threadItemId: threadItemId || `n8n-${Date.now()}`,
                event: 'status',
                message: 'Retrieving execution results...',
                status: 'executing',
                executionId,
                elapsed: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                statusData: {
                    status: 'executing',
                    currentStep,
                    progress: Math.round(progress),
                    message: stepMessage,
                },
            });

            let response: Response | null = null;

            try {
                response = await fetch(`${N8N_CONFIG.apiUrl}/executions/${executionId}`, {
                    headers: {
                        Authorization: `Bearer ${N8N_CONFIG.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    signal: AbortSignal.timeout(10000), // 10s timeout for polling requests
                });
            } catch (fetchError) {
                console.error('Polling fetch error:', fetchError);
                // Continue polling on fetch errors - network might be temporarily down
                continue;
            }

            // Validate response object
            if (!response || !(response instanceof Response)) {
                console.error('Invalid response object during polling:', typeof response, response);
                continue; // Continue polling
            }

            if (response.ok) {
                let execution: any = null;

                try {
                    const responseText = await response.text();
                    if (!responseText || !responseText.trim()) {
                        console.warn('Empty response body during polling');
                        continue; // Continue polling
                    }

                    execution = JSON.parse(responseText);

                    if (!execution || typeof execution !== 'object') {
                        console.warn('Invalid execution object received:', execution);
                        continue; // Continue polling
                    }
                } catch (parseError) {
                    console.error('Failed to parse polling response:', parseError);
                    continue; // Continue polling
                }

                if (execution.finished === true) {
                    if (execution.status === 'success' && execution.data) {
                        // Extract response from execution data with null check
                        let responseText: string = '';
                        try {
                            responseText = extractResponseFromExecutionData(execution.data);
                        } catch (extractError) {
                            console.error(
                                'Failed to extract response from execution data:',
                                extractError
                            );
                            responseText = 'Failed to extract response from execution';
                        }

                        return {
                            response: responseText || 'Empty execution response',
                            executionId,
                            workflowId: execution.workflowId || 'unknown',
                            status: execution.status || 'unknown',
                        };
                    } else if (execution.status === 'error') {
                        const errorDetails = execution.error
                            ? typeof execution.error === 'string'
                                ? execution.error
                                : JSON.stringify(execution.error)
                            : 'Unknown execution error';
                        throw new Error(`Execution failed: ${errorDetails}`);
                    } else {
                        console.warn('Execution finished with unknown status:', execution.status);
                        throw new Error(
                            `Execution finished with unexpected status: ${execution.status || 'undefined'}`
                        );
                    }
                }
                // Still running, continue polling
            } else {
                const errorText = await response
                    .text()
                    .catch(() => 'Unable to read error response');
                console.warn(
                    `Polling failed: ${response.status} ${response.statusText}. Details: ${errorText}`
                );

                // For certain error codes, we should stop polling
                if (response.status === 401 || response.status === 403 || response.status === 404) {
                    throw new Error(
                        `Polling failed with unrecoverable error: ${response.status} ${response.statusText}`
                    );
                }
                // For other errors, continue polling
            }
        } catch (error) {
            console.error('Polling error:', error);
            // Continue polling on non-critical errors
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout reached
    throw new Error(`Execution timeout after ${maxWaitTime}ms`);
}
