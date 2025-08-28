import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { transformN8nResponse } from '@/lib/n8n-response-transformer';

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.vividwalls.blog/webhook/jetvision-agent';
const N8N_API_URL = process.env.N8N_API_URL || 'https://n8n.vividwalls.blog/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || process.env.NEXT_PUBLIC_N8N_API_KEY;
const N8N_TIMEOUT = parseInt(process.env.N8N_TIMEOUT || '60000'); // 60 seconds total timeout
const POLL_INTERVAL = 1000; // Poll every 1 second
const MAX_POLL_ATTEMPTS = 60; // Maximum 60 attempts (60 seconds)
const MAX_RETRIES = 3; // Maximum retry attempts for failed requests
const RETRY_DELAYS = [1000, 2000, 5000]; // Progressive delay between retries in ms

// Track webhook health and circuit breaker state
interface WebhookHealthState {
    isHealthy: boolean;
    lastFailureTime: number;
    consecutiveFailures: number;
    circuitBreakerOpen: boolean;
    circuitBreakerOpenUntil: number;
}

let webhookHealth: WebhookHealthState = {
    isHealthy: true,
    lastFailureTime: 0,
    consecutiveFailures: 0,
    circuitBreakerOpen: false,
    circuitBreakerOpenUntil: 0
};

interface N8nExecution {
    id: string;
    finished: boolean;
    mode: string;
    startedAt: string;
    stoppedAt?: string;
    workflowId: string;
    status: 'running' | 'success' | 'error' | 'waiting';
    data?: any;
}

interface N8nExecutionData {
    resultData: {
        runData: {
            [nodeName: string]: Array<{
                data?: {
                    main?: Array<Array<{
                        json: any;
                        pairedItem?: any;
                    }>>;
                };
                error?: any;
                executionTime?: number;
                startTime?: number;
            }>;
        };
    };
}

/**
 * Check circuit breaker state and update webhook health
 */
function checkCircuitBreaker(): boolean {
    const now = Date.now();
    
    // Reset circuit breaker if timeout has passed
    if (webhookHealth.circuitBreakerOpen && now > webhookHealth.circuitBreakerOpenUntil) {
        webhookHealth.circuitBreakerOpen = false;
        webhookHealth.consecutiveFailures = 0;
        console.log('Circuit breaker reset - attempting to reconnect to n8n');
    }
    
    return !webhookHealth.circuitBreakerOpen;
}

/**
 * Record webhook failure and potentially open circuit breaker
 */
function recordWebhookFailure() {
    const now = Date.now();
    webhookHealth.isHealthy = false;
    webhookHealth.lastFailureTime = now;
    webhookHealth.consecutiveFailures++;
    
    // Open circuit breaker after 5 consecutive failures
    if (webhookHealth.consecutiveFailures >= 5) {
        webhookHealth.circuitBreakerOpen = true;
        webhookHealth.circuitBreakerOpenUntil = now + (5 * 60 * 1000); // 5 minutes
        console.warn('Circuit breaker opened - n8n webhook temporarily disabled');
    }
}

/**
 * Record webhook success and reset failure counters
 */
function recordWebhookSuccess() {
    webhookHealth.isHealthy = true;
    webhookHealth.consecutiveFailures = 0;
    webhookHealth.circuitBreakerOpen = false;
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = MAX_RETRIES,
    operationName: string = 'operation'
): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await operation();
            if (attempt > 0) {
                console.log(`${operationName} succeeded after ${attempt} retries`);
            }
            return result;
        } catch (error) {
            lastError = error as Error;
            
            if (attempt === retries) {
                console.error(`${operationName} failed after ${retries} retries:`, lastError.message);
                throw lastError;
            }
            
            const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
            console.warn(`${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

/**
 * Poll n8n API for execution status with retry logic
 */
async function pollExecutionStatus(executionId: string): Promise<N8nExecution | null> {
    return await retryWithBackoff(async () => {
        const response = await fetch(`${N8N_API_URL}/executions/${executionId}`, {
            headers: {
                'X-N8N-API-KEY': N8N_API_KEY || '',
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout per request
        });

        if (!response.ok) {
            throw new Error(`Failed to get execution status: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }, 2, `Poll execution ${executionId}`).catch(error => {
        console.error('Error polling execution status:', error);
        return null;
    });
}

/**
 * Get execution data including node outputs
 */
async function getExecutionData(executionId: string): Promise<N8nExecutionData | null> {
    try {
        const response = await fetch(`${N8N_API_URL}/executions/${executionId}`, {
            headers: {
                'X-N8N-API-KEY': N8N_API_KEY || '',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Failed to get execution data: ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data.data as N8nExecutionData;
    } catch (error) {
        console.error('Error getting execution data:', error);
        return null;
    }
}

/**
 * Extract the final response from n8n execution data
 */
function extractResponseFromExecutionData(executionData: N8nExecutionData): string {
    const runData = executionData.resultData?.runData || {};
    
    // Check for errors first
    for (const nodeName in runData) {
        const nodeExecution = runData[nodeName][0];
        if (nodeExecution?.error) {
            const errorMsg = nodeExecution.error.message || 'Unknown error';
            const errorNode = nodeName;
            return `Error in workflow node "${errorNode}": ${errorMsg}`;
        }
    }
    
    // Look for common output nodes
    const outputNodeNames = ['Send Response', 'Respond to Webhook', 'Format Response', 'Agent', 'Code', 'AI Agent', 'LLM', 'ChatGPT'];
    
    for (const nodeName of outputNodeNames) {
        if (runData[nodeName]) {
            const nodeData = runData[nodeName][0]?.data?.main?.[0]?.[0]?.json;
            if (nodeData) {
                // Extract response text from various possible fields
                return nodeData.response || nodeData.message || nodeData.text || nodeData.output || nodeData.content || JSON.stringify(nodeData);
            }
        }
    }
    
    // Fallback: Look for any node with output
    for (const nodeName in runData) {
        const nodeData = runData[nodeName][0]?.data?.main?.[0]?.[0]?.json;
        if (nodeData && (nodeData.response || nodeData.message || nodeData.text || nodeData.output)) {
            return nodeData.response || nodeData.message || nodeData.text || nodeData.output;
        }
    }
    
    return 'Workflow completed but no response data found.';
}

export async function POST(request: NextRequest) {
    try {
        // Optional authentication - not required for n8n webhook but logged for analytics
        const session = await auth().catch(() => null);
        const userId = session?.userId;

        // Check circuit breaker before processing
        if (!checkCircuitBreaker()) {
            return NextResponse.json({
                error: 'n8n service temporarily unavailable. Please try again in a few minutes.',
                retryAfter: Math.ceil((webhookHealth.circuitBreakerOpenUntil - Date.now()) / 1000)
            }, { 
                status: 503,
                headers: {
                    'Retry-After': Math.ceil((webhookHealth.circuitBreakerOpenUntil - Date.now()) / 1000).toString()
                }
            });
        }

        const body = await request.json().catch(() => ({}));
        
        // Enhanced input validation
        const { message, threadId, threadItemId, messages = [] } = body;
        
        if (!message || typeof message !== 'string' || !message.trim()) {
            return NextResponse.json({
                error: 'Message is required and must be a non-empty string'
            }, { status: 400 });
        }

        // Validate message length
        if (message.length > 4000) {
            return NextResponse.json({
                error: 'Message too long. Maximum 4000 characters allowed.'
            }, { status: 400 });
        }
        
        console.log('Sending message to n8n webhook:', message);
        
        // Prepare the payload for n8n
        const n8nPayload = {
            message,
            threadId,
            threadItemId,
            context: messages.map((m: any) => ({
                role: m.role || 'user',
                content: m.query || m.answer?.text || ''
            })),
            timestamp: new Date().toISOString(),
            source: 'jetvision-agent',
            // Request execution ID in response
            returnExecutionId: true
        };
        
        // Stream the response back to the client
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Send initial status with loading state
                    controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify({ 
                        status: 'connecting',
                        message: 'Connecting to JetVision Agent...',
                        isLoading: true,
                        progress: 5,
                        threadId,
                        threadItemId
                    })}\n\n`));
                    
                    // Start the workflow execution with retry logic
                    let executionId: string | null = null;
                    
                    const webhookResponse = await retryWithBackoff(async () => {
                        const response = await fetch(N8N_WEBHOOK_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'User-Agent': 'JetVision-Agent/1.0',
                                ...(N8N_API_KEY && { 'X-N8N-API-KEY': N8N_API_KEY })
                            },
                            body: JSON.stringify(n8nPayload),
                            signal: AbortSignal.timeout(15000) // 15 second timeout per attempt
                        });
                        
                        if (!response.ok) {
                            const errorText = await response.text().catch(() => 'Unknown error');
                            throw new Error(`Webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
                        }
                        
                        return response;
                    }, MAX_RETRIES, 'n8n webhook call');

                    // Record successful webhook call
                    recordWebhookSuccess();
                    
                    try {
                        // Check if response has content
                        const contentType = webhookResponse.headers.get('content-type');
                            let webhookData: any = {};
                            
                            if (contentType && contentType.includes('application/json')) {
                                try {
                                    webhookData = await webhookResponse.json();
                                } catch (jsonError) {
                                    console.warn('Failed to parse JSON response from webhook:', jsonError);
                                    webhookData = {};
                                }
                            } else {
                                // If not JSON, try to read as text
                                const textResponse = await webhookResponse.text();
                                console.log('Non-JSON webhook response:', textResponse);
                                webhookData = { response: textResponse };
                            }
                            
                            executionId = webhookData.executionId || webhookData.execution?.id;
                            
                            // If we got an immediate response, use it
                            if (webhookData.response || webhookData.message) {
                                // Transform the n8n response to match expected format
                                const transformedResponse = transformN8nResponse(
                                    webhookData,
                                    threadId,
                                    threadItemId
                                );
                                
                                // Send the properly formatted answer event
                                controller.enqueue(encoder.encode(`event: answer\ndata: ${JSON.stringify({
                                    answer: transformedResponse.answer,
                                    threadId,
                                    threadItemId,
                                    sources: transformedResponse.sources || [],
                                    metadata: transformedResponse.metadata
                                })}\n\n`));
                                
                                // Send sources event if available
                                if (transformedResponse.sources && transformedResponse.sources.length > 0) {
                                    controller.enqueue(encoder.encode(`event: sources\ndata: ${JSON.stringify({
                                        sources: transformedResponse.sources,
                                        threadId,
                                        threadItemId
                                    })}\n\n`));
                                }
                                
                                controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({
                                    type: 'done',
                                    threadId,
                                    threadItemId,
                                    executionId: webhookData.executionId
                                })}\n\n`));
                                
                                // Controller closes automatically when the stream ends
                                return;
                            }
                            
                            console.log('Workflow started with execution ID:', executionId);
                    } catch (webhookError: any) {
                        console.error('Failed to start workflow:', webhookError);
                        recordWebhookFailure();
                        
                        // Enhanced error reporting
                        const errorMessage = webhookError.message || 'Unknown webhook error';
                        const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('rate limit');
                        const isServerError = errorMessage.includes('5') && errorMessage.includes('0'); // 500-level errors
                        
                        if (isRateLimitError) {
                            throw new Error('n8n service is rate limited. Please wait and try again.');
                        } else if (isServerError) {
                            throw new Error('n8n service is experiencing issues. Please try again later.');
                        } else {
                            throw webhookError;
                        }
                    }
                    
                    // If we have an execution ID, poll for status
                    if (executionId && N8N_API_KEY) {
                        controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify({ 
                            status: 'executing',
                            message: 'Processing your request with JetVision Agent...',
                            isLoading: true,
                            progress: 20,
                            executionId,
                            threadId,
                            threadItemId
                        })}\n\n`));
                        
                        let pollAttempts = 0;
                        let lastStatus = '';
                        let lastProgressUpdate = Date.now();
                        const PROGRESS_TIMEOUT = 30000; // 30 seconds without progress
                        
                        while (pollAttempts < MAX_POLL_ATTEMPTS) {
                            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
                            pollAttempts++;
                            
                            // Check if we've been stuck without progress
                            if (Date.now() - lastProgressUpdate > PROGRESS_TIMEOUT) {
                                console.warn('Execution appears stuck, sending timeout warning');
                                controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify({
                                    status: 'warning',
                                    message: 'Workflow is taking longer than expected. Still processing...',
                                    isLoading: true,
                                    progress: Math.min(20 + (pollAttempts / MAX_POLL_ATTEMPTS) * 70, 90),
                                    threadId,
                                    threadItemId
                                })}\n\n`));
                                lastProgressUpdate = Date.now();
                            }
                            
                            const execution = await pollExecutionStatus(executionId);
                            
                            if (!execution) {
                                // If we can't get execution status, log and continue
                                console.warn(`Failed to get status for execution ${executionId} on attempt ${pollAttempts}`);
                                
                                // After several failures, send an error
                                if (pollAttempts > 10 && pollAttempts % 10 === 0) {
                                    controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify({
                                        status: 'warning',
                                        message: `Having trouble connecting to workflow. Attempt ${pollAttempts}/${MAX_POLL_ATTEMPTS}...`,
                                        isLoading: true,
                                        progress: Math.min(20 + (pollAttempts / MAX_POLL_ATTEMPTS) * 70, 90),
                                        threadId,
                                        threadItemId
                                    })}\n\n`));
                                }
                                continue;
                            }
                            
                            if (execution) {
                                // Send progress update if status changed
                                if (execution.status !== lastStatus) {
                                    lastStatus = execution.status;
                                    lastProgressUpdate = Date.now(); // Reset progress timer on status change
                                    
                                    const statusMessages: Record<string, string> = {
                                        'running': 'Analyzing data and preparing response...',
                                        'success': 'Finalizing your personalized insights...',
                                        'waiting': 'Gathering information from data sources...',
                                        'error': 'Encountered an issue, attempting recovery...'
                                    };
                                    controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify({ 
                                        status: execution.status,
                                        message: statusMessages[execution.status] || `Processing ${execution.status}...`,
                                        isLoading: true,
                                        progress: Math.min(20 + (pollAttempts / MAX_POLL_ATTEMPTS) * 70, 90),
                                        threadId,
                                        threadItemId,
                                        executionId
                                    })}\n\n`));
                                }
                                
                                // Check if execution is complete
                                if (execution.finished || execution.status === 'success' || execution.status === 'error') {
                                    // Get the execution data (including error details)
                                    const executionData = await getExecutionData(executionId);
                                    
                                    if (execution.status === 'error') {
                                        // Extract error details from execution data
                                        let errorMessage = 'Workflow execution failed';
                                        let errorDetails = '';
                                        
                                        if (executionData) {
                                            // Look for error information in the execution data
                                            const runData = executionData.resultData?.runData || {};
                                            for (const nodeName in runData) {
                                                const nodeExecution = runData[nodeName][0];
                                                if (nodeExecution?.error) {
                                                    errorMessage = `Error in ${nodeName}: ${nodeExecution.error.message || 'Unknown error'}`;
                                                    errorDetails = nodeExecution.error.description || nodeExecution.error.stack || '';
                                                    break;
                                                }
                                            }
                                        }
                                        
                                        console.error('N8N Workflow Error:', errorMessage, errorDetails);
                                        
                                        // Send error event to frontend
                                        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({
                                            error: errorMessage,
                                            details: errorDetails,
                                            executionId,
                                            threadId,
                                            threadItemId
                                        })}\n\n`));
                                        
                                        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({
                                            type: 'done',
                                            status: 'error',
                                            threadId,
                                            threadItemId,
                                            executionId
                                        })}\n\n`));
                                        
                                        return;
                                    }
                                    
                                    if (executionData) {
                                        const responseText = extractResponseFromExecutionData(executionData);
                                        
                                        // Transform the response using our transformer
                                        const transformedResponse = transformN8nResponse(
                                            { 
                                                response: responseText,
                                                executionId,
                                                workflowId: execution.workflowId
                                            },
                                            threadId,
                                            threadItemId
                                        );
                                        
                                        controller.enqueue(encoder.encode(`event: answer\ndata: ${JSON.stringify({
                                            answer: transformedResponse.answer,
                                            threadId,
                                            threadItemId,
                                            sources: transformedResponse.sources || [],
                                            metadata: transformedResponse.metadata
                                        })}\n\n`));
                                        
                                        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({
                                            type: 'done',
                                            threadId,
                                            threadItemId,
                                            executionId
                                        })}\n\n`));
                                        
                                        // Controller closes automatically when the stream ends
                                        return;
                                    }
                                    break;
                                }
                            }
                        }
                        
                        // Timeout fallback
                        throw new Error(`Workflow execution timed out after ${MAX_POLL_ATTEMPTS} seconds`);
                        
                    } else {
                        // No execution ID or API key - wait for webhook response with timeout
                        controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify({ 
                            status: 'waiting',
                            message: 'Waiting for n8n response (legacy mode)...',
                            threadId,
                            threadItemId
                        })}\n\n`));
                        
                        // Fallback to waiting for direct response (legacy mode)
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        
                        throw new Error('No execution ID received and n8n API key not configured');
                    }
                    
                } catch (error) {
                    console.error('n8n webhook error:', error);
                    recordWebhookFailure();
                    
                    // Log detailed error information for monitoring
                    const errorDetails = {
                        userId: userId || 'anonymous',
                        message: message.substring(0, 100) + '...',
                        error: error instanceof Error ? error.message : 'Unknown error',
                        webhookHealth: {
                            consecutiveFailures: webhookHealth.consecutiveFailures,
                            circuitBreakerOpen: webhookHealth.circuitBreakerOpen
                        },
                        timestamp: new Date().toISOString()
                    };
                    console.error('Detailed n8n error context:', errorDetails);
                    
                    // Determine error type for appropriate fallback response
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('AbortError');
                    const isNetworkError = errorMessage.includes('network') || errorMessage.includes('ENOTFOUND');
                    const isServiceError = errorMessage.includes('rate limit') || errorMessage.includes('service');
                    
                    let fallbackResponse = `I'm the JetVision Agent. I'm currently experiencing connectivity issues with the workflow engine.

Your message: "${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"

`;
                    
                    if (isTimeoutError) {
                        fallbackResponse += `The request timed out. The workflow might be processing a complex request.
                        
Please try a simpler query or wait a moment before trying again.`;
                    } else if (isNetworkError) {
                        fallbackResponse += `Unable to connect to the workflow service. This might be a temporary network issue.
                        
Please try again in a few moments.`;
                    } else if (isServiceError) {
                        fallbackResponse += `The workflow service is currently overloaded or rate limited.
                        
Please wait a few minutes before trying again.`;
                    } else {
                        fallbackResponse += `Error: ${errorMessage}

Please ensure:
1. The n8n workflow is activated
2. All service connections are healthy
3. API keys are properly configured`;
                    }
                    
                    fallbackResponse += `

I specialize in:
- Apollo.io lead generation and campaign management  
- Avainode fleet management and aircraft availability
- Private jet charter operations

For immediate assistance, please contact support or try a simpler request.`;
                    
                    controller.enqueue(encoder.encode(`event: answer\ndata: ${JSON.stringify({
                        answer: { text: fallbackResponse },
                        threadId,
                        threadItemId
                    })}\n\n`));
                    
                    controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({
                        type: 'done',
                        status: 'error',
                        threadId,
                        threadItemId
                    })}\n\n`));
                    
                } finally {
                    // Controller is automatically closed when the stream ends
                    // Don't manually close it here to avoid "Controller is already closed" error
                }
            }
        });
        
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
        
    } catch (error) {
        console.error('Request error:', error);
        return NextResponse.json(
            { 
                error: 'Failed to process request',
                details: error instanceof Error ? error.message : 'Unknown error',
                health: {
                    webhookHealthy: webhookHealth.isHealthy,
                    circuitBreakerOpen: webhookHealth.circuitBreakerOpen,
                    consecutiveFailures: webhookHealth.consecutiveFailures
                }
            },
            { status: 500 }
        );
    }
}

/**
 * GET endpoint for health check and service status
 */
export async function GET(request: NextRequest) {
    const now = Date.now();
    const healthStatus = {
        service: 'n8n-webhook',
        status: webhookHealth.isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        webhook: {
            url: N8N_WEBHOOK_URL,
            isHealthy: webhookHealth.isHealthy,
            consecutiveFailures: webhookHealth.consecutiveFailures,
            lastFailure: webhookHealth.lastFailureTime > 0 ? 
                new Date(webhookHealth.lastFailureTime).toISOString() : null,
            circuitBreaker: {
                isOpen: webhookHealth.circuitBreakerOpen,
                openUntil: webhookHealth.circuitBreakerOpen ? 
                    new Date(webhookHealth.circuitBreakerOpenUntil).toISOString() : null,
                remainingSeconds: webhookHealth.circuitBreakerOpen ? 
                    Math.ceil((webhookHealth.circuitBreakerOpenUntil - now) / 1000) : null
            }
        },
        configuration: {
            hasApiKey: !!N8N_API_KEY,
            hasWebhookUrl: !!N8N_WEBHOOK_URL,
            maxRetries: MAX_RETRIES,
            pollInterval: POLL_INTERVAL,
            maxPollAttempts: MAX_POLL_ATTEMPTS,
            timeout: N8N_TIMEOUT
        },
        endpoints: {
            webhook: N8N_WEBHOOK_URL,
            api: N8N_API_URL
        }
    };

    return NextResponse.json(healthStatus, {
        status: webhookHealth.isHealthy ? 200 : 503,
        headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json'
        }
    });
}

/**
 * OPTIONS endpoint for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}