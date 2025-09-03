import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { transformN8nResponse, extractResponseFromExecutionData } from '../../../lib/n8n-response-transformer';
import { 
  retryWithBackoff, 
  EnhancedCircuitBreaker, 
  generateUserFriendlyError, 
  categorizeError,
  ErrorCategory 
} from '../../../lib/retry-utils';

// Configuration with environment variables
const N8N_CONFIG = {
  webhookUrl: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.vividwalls.blog/webhook/jetvision-agent',
  apiKey: process.env.N8N_API_KEY,
  apiUrl: process.env.N8N_API_URL || 'https://n8n.vividwalls.blog/api/v1',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  pollingInterval: 2000, // 2 seconds
  maxPollingTime: 60000, // 60 seconds max wait
};

// Enhanced circuit breaker instance
const circuitBreaker = new EnhancedCircuitBreaker(
  5,      // failure threshold
  60000,  // reset timeout (1 minute)
  3       // half-open max requests
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
      { error: 'Health check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Main webhook handler
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();
  const clerkUserId = session?.userId;

  if (!clerkUserId) {
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
        retryAfter: 60 // seconds
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { message, threadId, threadItemId, ...options } = body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message too long (max 4000 characters)' }, { status: 400 });
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
            message: 'Processing request...', 
            status: 'connecting',
            timestamp: new Date().toISOString(),
            statusData: {
              status: 'connecting',
              currentStep: 'webhook',
              progress: 10,
              message: 'Initializing JetVision workflow connection...'
            }
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
                const response = await fetch(N8N_CONFIG.webhookUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(N8N_CONFIG.apiKey && { 'Authorization': `Bearer ${N8N_CONFIG.apiKey}` }),
                  },
                  body: JSON.stringify(webhookPayload),
                  signal: AbortSignal.timeout(N8N_CONFIG.timeout),
                });

                if (!response.ok) {
                  throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
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
                  ErrorCategory.SERVICE_UNAVAILABLE
                ].includes(category);
              }
            }
          );

          if (!webhookResult.success) {
            console.error('N8N webhook failed after retries:', {
              error: webhookResult.error?.message,
              attempts: webhookResult.attempts,
              totalTime: webhookResult.totalTime
            });
            throw webhookResult.error || new Error('Unknown webhook error');
          }

          const response = webhookResult.data;
          console.log(`N8N webhook succeeded after ${webhookResult.attempts} attempts (${webhookResult.totalTime}ms)`);
          
          if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
          }

          const contentType = response.headers.get('content-type');
          let webhookData;

          try {
            if (contentType?.includes('application/json')) {
              const jsonText = await response.text();
              if (!jsonText.trim()) {
                console.warn('Empty JSON response from N8N webhook');
                webhookData = { response: 'Empty response received' };
              } else {
                webhookData = JSON.parse(jsonText);
              }
            } else {
              const textResponse = await response.text();
              webhookData = { response: textResponse || 'Empty text response' };
            }
          } catch (parseError) {
            console.error('Failed to parse N8N response:', parseError);
            const rawText = await response.text();
            webhookData = { response: rawText || 'Failed to parse response', parseError: true };
          }

          // Check if we got an immediate response or need to poll
          if (webhookData.response) {
            // Immediate response
            const transformed = transformN8nResponse(webhookData, threadId, threadItemId);
            
            sendEvent('answer', {
              id: transformed.id,
              threadId: transformed.threadId,
              answer: transformed.answer,
              sources: transformed.sources || [],
              metadata: transformed.metadata,
              timestamp: new Date().toISOString(),
            });

            sendEvent('done', { 
              timestamp: new Date().toISOString(),
              status: 'success'
            });
          } else if (webhookData.executionId) {
            // Long-running execution - poll for result
            const result = await pollForExecution(webhookData.executionId, sendEvent);
            
            if (result) {
              const transformed = transformN8nResponse(result, threadId, threadItemId);
              
              sendEvent('answer', {
                id: transformed.id,
                threadId: transformed.threadId,
                answer: transformed.answer,
                sources: transformed.sources || [],
                metadata: transformed.metadata,
                timestamp: new Date().toISOString(),
              });
            }

            sendEvent('done', { 
              timestamp: new Date().toISOString(),
              status: 'success' 
            });
          } else {
            // Fallback response
            sendEvent('answer', {
              id: threadItemId || `n8n-${Date.now()}`,
              threadId,
              answer: {
                text: webhookData.message || webhookData.response || 'Request processed successfully',
                structured: null,
              },
              sources: [],
              metadata: { source: 'n8n', executionId: webhookData.executionId },
              timestamp: new Date().toISOString(),
            });

            sendEvent('done', { 
              timestamp: new Date().toISOString(),
              status: 'success' 
            });
          }

        } catch (error) {
          console.error('N8N webhook error:', error);
          
          const errorInstance = error instanceof Error ? error : new Error(String(error));
          const errorCategory = categorizeError(errorInstance);
          const friendlyMessage = generateUserFriendlyError(errorInstance, 'JetVision Agent');
          
          // Enhanced error logging
          console.error('N8N Error Details:', {
            category: errorCategory,
            message: errorInstance.message,
            stack: errorInstance.stack,
            timestamp: new Date().toISOString(),
            circuitBreakerState: circuitBreaker.getState()
          });

          // Create context-aware fallback response based on error category
          let fallbackResponse = friendlyMessage;
          let recoveryActions: string[] = [];
          
          switch (errorCategory) {
            case ErrorCategory.NETWORK:
              recoveryActions = [
                'Check your internet connection',
                'Try refreshing the page',
                'Contact support if the issue persists'
              ];
              break;
            case ErrorCategory.TIMEOUT:
              recoveryActions = [
                'Try again in a few moments',
                'The system may be under high load',
                'Consider breaking down complex requests'
              ];
              break;
            case ErrorCategory.SERVER_ERROR:
              recoveryActions = [
                'Our team has been automatically notified',
                'Try again in 2-3 minutes',
                'Use the contact form if urgent'
              ];
              break;
            case ErrorCategory.SERVICE_UNAVAILABLE:
              recoveryActions = [
                'Service is temporarily down for maintenance',
                'Normal service will resume shortly',
                'Check our status page for updates'
              ];
              break;
            default:
              recoveryActions = [
                'Try rephrasing your request',
                'Check that your input is valid',
                'Contact support with error details'
              ];
          }

          const enhancedFallback = `${fallbackResponse}\n\n**What you can do:**\n${recoveryActions.map(action => `• ${action}`).join('\n')}`;

          sendEvent('answer', {
            id: threadItemId || `error-${Date.now()}`,
            threadId,
            answer: {
              text: enhancedFallback,
              structured: null,
            },
            sources: [],
            metadata: { 
              error: errorInstance.message,
              errorCategory,
              source: 'error_fallback',
              timestamp: new Date().toISOString(),
              circuitBreakerState: circuitBreaker.getState().state,
              recoverable: [ErrorCategory.NETWORK, ErrorCategory.TIMEOUT, ErrorCategory.SERVER_ERROR].includes(errorCategory)
            },
            timestamp: new Date().toISOString(),
          });

          sendEvent('error', { 
            message: friendlyMessage,
            category: errorCategory,
            details: errorInstance.message,
            recoverable: [ErrorCategory.NETWORK, ErrorCategory.TIMEOUT, ErrorCategory.SERVER_ERROR].includes(errorCategory),
            timestamp: new Date().toISOString(),
          });

          sendEvent('done', { 
            timestamp: new Date().toISOString(),
            status: 'error',
            error: errorCategory 
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
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to poll for execution results
async function pollForExecution(executionId: string, sendEvent: (event: string, data: any) => void): Promise<any> {
  const startTime = Date.now();
  const pollInterval = N8N_CONFIG.pollingInterval;
  const maxWaitTime = N8N_CONFIG.maxPollingTime;

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const progress = Math.min((Date.now() - startTime) / maxWaitTime * 100, 90);
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
        message: 'Retrieving execution results...', 
        status: 'executing',
        executionId,
        elapsed: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        statusData: {
          status: 'executing',
          currentStep,
          progress: Math.round(progress),
          message: stepMessage
        }
      });

      const response = await fetch(`${N8N_CONFIG.apiUrl}/executions/${executionId}`, {
        headers: {
          'Authorization': `Bearer ${N8N_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout for polling requests
      });

      if (response.ok) {
        const execution = await response.json();
        
        if (execution.finished) {
          if (execution.status === 'success' && execution.data) {
            // Extract response from execution data
            const responseText = extractResponseFromExecutionData(execution.data);
            return {
              response: responseText,
              executionId,
              workflowId: execution.workflowId,
              status: execution.status,
            };
          } else if (execution.status === 'error') {
            throw new Error(`Execution failed: ${JSON.stringify(execution.error || 'Unknown error')}`);
          }
        }
        // Still running, continue polling
      } else {
        console.warn(`Polling failed: ${response.status} ${response.statusText}`);
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

