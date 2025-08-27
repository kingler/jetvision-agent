import { NextRequest, NextResponse } from 'next/server';

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.vividwalls.blog/webhook/jetvision-agent';
const N8N_API_URL = process.env.N8N_API_URL || 'https://n8n.vividwalls.blog/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || process.env.NEXT_PUBLIC_N8N_API_KEY;
const N8N_TIMEOUT = parseInt(process.env.N8N_TIMEOUT || '60000'); // 60 seconds total timeout
const POLL_INTERVAL = 1000; // Poll every 1 second
const MAX_POLL_ATTEMPTS = 60; // Maximum 60 attempts (60 seconds)

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
 * Poll n8n API for execution status
 */
async function pollExecutionStatus(executionId: string): Promise<N8nExecution | null> {
    try {
        const response = await fetch(`${N8N_API_URL}/executions/${executionId}`, {
            headers: {
                'X-N8N-API-KEY': N8N_API_KEY || '',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Failed to get execution status: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error polling execution status:', error);
        return null;
    }
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
    
    // Look for common output nodes
    const outputNodeNames = ['Send Response', 'Respond to Webhook', 'Format Response', 'Agent', 'Code'];
    
    for (const nodeName of outputNodeNames) {
        if (runData[nodeName]) {
            const nodeData = runData[nodeName][0]?.data?.main?.[0]?.[0]?.json;
            if (nodeData) {
                // Extract response text from various possible fields
                return nodeData.response || nodeData.message || nodeData.text || nodeData.output || JSON.stringify(nodeData);
            }
        }
    }
    
    // Fallback: Look for any node with output
    for (const nodeName in runData) {
        const nodeData = runData[nodeName][0]?.data?.main?.[0]?.[0]?.json;
        if (nodeData && (nodeData.response || nodeData.message || nodeData.text)) {
            return nodeData.response || nodeData.message || nodeData.text;
        }
    }
    
    return 'Workflow completed but no response data found.';
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Extract the message from the request
        const { message, threadId, threadItemId, messages = [] } = body;
        
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
                    
                    // Start the workflow execution
                    let executionId: string | null = null;
                    
                    try {
                        const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(N8N_API_KEY && { 'X-N8N-API-KEY': N8N_API_KEY })
                            },
                            body: JSON.stringify(n8nPayload)
                        });
                        
                        if (webhookResponse.ok) {
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
                                controller.enqueue(encoder.encode(`event: answer\ndata: ${JSON.stringify({
                                    answer: { text: webhookData.response || webhookData.message },
                                    threadId,
                                    threadItemId
                                })}\n\n`));
                                
                                controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({
                                    type: 'done',
                                    threadId,
                                    threadItemId
                                })}\n\n`));
                                
                                // Controller closes automatically when the stream ends
                                return;
                            }
                            
                            console.log('Workflow started with execution ID:', executionId);
                        } else {
                            // Try to get error details from response
                            let errorMessage = `Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`;
                            try {
                                const contentType = webhookResponse.headers.get('content-type');
                                if (contentType && contentType.includes('application/json')) {
                                    const errorData = await webhookResponse.json();
                                    errorMessage = errorData.message || errorData.error || errorMessage;
                                } else {
                                    const textError = await webhookResponse.text();
                                    if (textError) {
                                        errorMessage = textError.substring(0, 200); // Limit error message length
                                    }
                                }
                            } catch (e) {
                                // Ignore parse errors
                            }
                            throw new Error(errorMessage);
                        }
                    } catch (error) {
                        console.error('Failed to start workflow:', error);
                        throw error;
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
                        
                        while (pollAttempts < MAX_POLL_ATTEMPTS) {
                            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
                            pollAttempts++;
                            
                            const execution = await pollExecutionStatus(executionId);
                            
                            if (execution) {
                                // Send progress update if status changed
                                if (execution.status !== lastStatus) {
                                    lastStatus = execution.status;
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
                                        threadItemId
                                    })}\n\n`));
                                }
                                
                                // Check if execution is complete
                                if (execution.finished || execution.status === 'success' || execution.status === 'error') {
                                    if (execution.status === 'error') {
                                        throw new Error('Workflow execution failed');
                                    }
                                    
                                    // Get the execution data
                                    const executionData = await getExecutionData(executionId);
                                    if (executionData) {
                                        const responseText = extractResponseFromExecutionData(executionData);
                                        
                                        controller.enqueue(encoder.encode(`event: answer\ndata: ${JSON.stringify({
                                            answer: { text: responseText },
                                            threadId,
                                            threadItemId
                                        })}\n\n`));
                                        
                                        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({
                                            type: 'done',
                                            threadId,
                                            threadItemId
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
                    
                    // Send fallback response
                    const fallbackResponse = `I'm the JetVision Agent. I'm currently having trouble connecting to the n8n workflow.

Your message was: "${message}"

Error: ${error instanceof Error ? error.message : 'Unknown error'}

Please ensure:
1. The n8n workflow is activated
2. The API key is configured in environment variables
3. The workflow webhook is accessible

I specialize in:
- Apollo.io lead generation and campaign management
- Avinode fleet management and aircraft availability
- Private jet charter operations

Please try again in a moment or contact support.`;
                    
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
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
}