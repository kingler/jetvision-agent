/**
 * Streaming Response Handlers for Real-time Updates
 * Provides utilities for Server-Sent Events (SSE) and WebSocket communication
 */

import { NextRequest } from 'next/server';
import { 
    StreamEvent, 
    StreamStatusEvent, 
    StreamAnswerEvent, 
    StreamErrorEvent, 
    StreamDoneEvent,
    AuthContext 
} from './api-types';

// ========================
// Core Streaming Types
// ========================

export interface StreamController {
    enqueue: (chunk: Uint8Array) => void;
    close: () => void;
    error: (error: Error) => void;
}

export interface StreamingOptions {
    enableHeartbeat?: boolean;
    heartbeatInterval?: number;
    timeout?: number;
    compression?: boolean;
    bufferSize?: number;
}

export interface StreamMetadata {
    streamId: string;
    startTime: number;
    userId?: string;
    endpoint: string;
    userAgent?: string;
}

// ========================
// Server-Sent Events Handler
// ========================

export class SSEHandler {
    private controller: StreamController;
    private encoder: TextEncoder;
    private metadata: StreamMetadata;
    private options: Required<StreamingOptions>;
    private heartbeatInterval?: NodeJS.Timeout;
    private timeoutInterval?: NodeJS.Timeout;
    private isClosed = false;
    private eventCounter = 0;

    constructor(
        controller: StreamController,
        metadata: StreamMetadata,
        options: StreamingOptions = {}
    ) {
        this.controller = controller;
        this.encoder = new TextEncoder();
        this.metadata = metadata;
        this.options = {
            enableHeartbeat: options.enableHeartbeat ?? true,
            heartbeatInterval: options.heartbeatInterval ?? 30000, // 30 seconds
            timeout: options.timeout ?? 300000, // 5 minutes
            compression: options.compression ?? true,
            bufferSize: options.bufferSize ?? 8192
        };

        this.setupHeartbeat();
        this.setupTimeout();
    }

    /**
     * Send a Server-Sent Event
     */
    sendEvent(event: StreamEvent): void {
        if (this.isClosed) return;

        try {
            this.eventCounter++;
            let eventData = `event: ${event.event}\n`;
            
            if (event.id) {
                eventData += `id: ${event.id}\n`;
            } else {
                eventData += `id: ${this.metadata.streamId}-${this.eventCounter}\n`;
            }
            
            if (event.retry) {
                eventData += `retry: ${event.retry}\n`;
            }

            // Handle data serialization
            const dataString = typeof event.data === 'string' 
                ? event.data 
                : JSON.stringify(event.data);
            
            // Support multi-line data
            const dataLines = dataString.split('\n');
            dataLines.forEach(line => {
                eventData += `data: ${line}\n`;
            });

            eventData += '\n'; // End of event

            this.controller.enqueue(this.encoder.encode(eventData));

            // Log event for analytics
            this.logEvent(event);

        } catch (error) {
            console.error('Failed to send SSE event:', error);
            this.sendErrorEvent('Failed to send event', 'STREAM_ERROR');
        }
    }

    /**
     * Send status update event
     */
    sendStatus(status: StreamStatusEvent): void {
        this.sendEvent({
            event: 'status',
            data: status,
            id: `status-${Date.now()}`
        });
    }

    /**
     * Send answer/response event
     */
    sendAnswer(answer: StreamAnswerEvent): void {
        this.sendEvent({
            event: 'answer',
            data: answer,
            id: `answer-${Date.now()}`
        });
    }

    /**
     * Send error event
     */
    sendErrorEvent(message: string, code?: string, retryable = false): void {
        const error: StreamErrorEvent = {
            error: message,
            code,
            retryable,
            threadId: this.metadata.streamId,
            threadItemId: `error-${Date.now()}`
        };

        this.sendEvent({
            event: 'error',
            data: error,
            id: `error-${Date.now()}`
        });
    }

    /**
     * Send completion event and close stream
     */
    sendDone(status: 'success' | 'error' | 'aborted' = 'success', executionTime?: number): void {
        const doneEvent: StreamDoneEvent = {
            type: 'done',
            status,
            threadId: this.metadata.streamId,
            threadItemId: `done-${Date.now()}`,
            executionTime: executionTime || (Date.now() - this.metadata.startTime)
        };

        this.sendEvent({
            event: 'done',
            data: doneEvent,
            id: `done-${Date.now()}`
        });

        this.close();
    }

    /**
     * Send heartbeat to keep connection alive
     */
    private sendHeartbeat(): void {
        if (this.isClosed) return;

        try {
            const heartbeat = `: heartbeat ${Date.now()}\n\n`;
            this.controller.enqueue(this.encoder.encode(heartbeat));
        } catch (error) {
            console.warn('Failed to send heartbeat:', error);
        }
    }

    /**
     * Set up heartbeat interval
     */
    private setupHeartbeat(): void {
        if (!this.options.enableHeartbeat) return;

        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, this.options.heartbeatInterval);
    }

    /**
     * Set up timeout to prevent hanging connections
     */
    private setupTimeout(): void {
        this.timeoutInterval = setTimeout(() => {
            if (!this.isClosed) {
                console.warn(`Stream timeout for ${this.metadata.streamId}`);
                this.sendErrorEvent('Request timeout', 'TIMEOUT_ERROR', true);
                this.close();
            }
        }, this.options.timeout);
    }

    /**
     * Close the stream
     */
    close(): void {
        if (this.isClosed) return;

        this.isClosed = true;

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        if (this.timeoutInterval) {
            clearTimeout(this.timeoutInterval);
        }

        try {
            this.controller.close();
        } catch (error) {
            console.warn('Error closing stream controller:', error);
        }

        // Log stream completion
        this.logStreamCompletion();
    }

    /**
     * Handle stream error
     */
    error(error: Error): void {
        if (this.isClosed) return;

        console.error(`Stream error for ${this.metadata.streamId}:`, error);
        this.sendErrorEvent(error.message, 'STREAM_INTERNAL_ERROR');
        
        try {
            this.controller.error(error);
        } catch (controllerError) {
            console.error('Error notifying controller:', controllerError);
        }

        this.close();
    }

    /**
     * Log stream event for analytics
     */
    private logEvent(event: StreamEvent): void {
        if (process.env.NODE_ENV === 'development') {
            console.log(`SSE Event [${this.metadata.streamId}]:`, {
                event: event.event,
                dataSize: JSON.stringify(event.data).length,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Log stream completion for analytics
     */
    private logStreamCompletion(): void {
        const duration = Date.now() - this.metadata.startTime;
        console.log(`Stream completed [${this.metadata.streamId}]:`, {
            duration: `${duration}ms`,
            events: this.eventCounter,
            userId: this.metadata.userId,
            endpoint: this.metadata.endpoint
        });
    }

    /**
     * Get stream statistics
     */
    getStats() {
        return {
            streamId: this.metadata.streamId,
            startTime: this.metadata.startTime,
            duration: Date.now() - this.metadata.startTime,
            eventsCount: this.eventCounter,
            isClosed: this.isClosed
        };
    }
}

// ========================
// Streaming Response Factory
// ========================

export class StreamingResponseFactory {
    /**
     * Create a new SSE streaming response
     */
    static createSSEResponse(
        handler: (sseHandler: SSEHandler) => Promise<void>,
        request: NextRequest,
        authContext?: AuthContext,
        options?: StreamingOptions
    ): Response {
        const streamId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const metadata: StreamMetadata = {
            streamId,
            startTime: Date.now(),
            userId: authContext?.user?.userId,
            endpoint: request.url,
            userAgent: request.headers.get('user-agent') || 'unknown'
        };

        const stream = new ReadableStream({
            async start(controller) {
                const sseHandler = new SSEHandler(controller, metadata, options);

                try {
                    await handler(sseHandler);
                } catch (error) {
                    console.error('Stream handler error:', error);
                    sseHandler.error(error as Error);
                }
            },
            cancel() {
                console.log(`Stream cancelled: ${streamId}`);
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'X-Accel-Buffering': 'no', // Disable nginx buffering
                'X-Stream-ID': streamId
            }
        });
    }

    /**
     * Create a JSON streaming response for non-SSE scenarios
     */
    static createJSONStreamResponse(
        handler: (write: (data: any) => void) => Promise<void>,
        options?: StreamingOptions
    ): Response {
        const encoder = new TextEncoder();
        let isFirstChunk = true;

        const stream = new ReadableStream({
            async start(controller) {
                // Start JSON array
                controller.enqueue(encoder.encode('['));

                const write = (data: any) => {
                    try {
                        if (!isFirstChunk) {
                            controller.enqueue(encoder.encode(','));
                        }
                        isFirstChunk = false;
                        
                        const json = JSON.stringify(data);
                        controller.enqueue(encoder.encode(json));
                    } catch (error) {
                        console.error('JSON stream write error:', error);
                        controller.error(error);
                    }
                };

                try {
                    await handler(write);
                    // Close JSON array
                    controller.enqueue(encoder.encode(']'));
                    controller.close();
                } catch (error) {
                    console.error('JSON stream handler error:', error);
                    controller.error(error);
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'application/json',
                'Transfer-Encoding': 'chunked',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}

// ========================
// Utility Functions
// ========================

/**
 * Create a progress tracking SSE handler
 */
export function createProgressTracker(
    sseHandler: SSEHandler,
    totalSteps: number,
    taskName = 'Processing'
) {
    let currentStep = 0;

    return {
        nextStep: (stepName?: string) => {
            currentStep++;
            const progress = Math.round((currentStep / totalSteps) * 100);
            
            sseHandler.sendStatus({
                status: 'processing',
                message: stepName || `${taskName} step ${currentStep} of ${totalSteps}`,
                isLoading: true,
                progress
            });
        },
        
        complete: (message = 'Processing completed') => {
            sseHandler.sendStatus({
                status: 'completing',
                message,
                isLoading: false,
                progress: 100
            });
        },
        
        error: (error: string) => {
            sseHandler.sendErrorEvent(error, 'PROGRESS_ERROR');
        }
    };
}

/**
 * Async generator for processing streams
 */
export async function* processAsyncIterable<T>(
    iterable: AsyncIterable<T>,
    processor: (item: T) => Promise<any>
) {
    for await (const item of iterable) {
        try {
            const result = await processor(item);
            yield result;
        } catch (error) {
            console.error('Error processing item:', error);
            yield { error: error instanceof Error ? error.message : 'Processing error' };
        }
    }
}

/**
 * Debounce function for stream events
 */
export function debounceStreamEvents<T extends any[]>(
    func: (...args: T) => void,
    delay: number
): (...args: T) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: T) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

/**
 * Throttle function for stream events
 */
export function throttleStreamEvents<T extends any[]>(
    func: (...args: T) => void,
    limit: number
): (...args: T) => void {
    let inThrottle = false;
    
    return (...args: T) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ========================
// Stream Monitoring
// ========================

export class StreamMonitor {
    private static instance: StreamMonitor;
    private activeStreams = new Map<string, SSEHandler>();
    private streamStats = new Map<string, any>();

    static getInstance(): StreamMonitor {
        if (!StreamMonitor.instance) {
            StreamMonitor.instance = new StreamMonitor();
        }
        return StreamMonitor.instance;
    }

    registerStream(streamId: string, handler: SSEHandler): void {
        this.activeStreams.set(streamId, handler);
        this.streamStats.set(streamId, {
            startTime: Date.now(),
            events: 0,
            lastActivity: Date.now()
        });
    }

    unregisterStream(streamId: string): void {
        this.activeStreams.delete(streamId);
        this.streamStats.delete(streamId);
    }

    getActiveStreamsCount(): number {
        return this.activeStreams.size;
    }

    getStreamStats(streamId: string): any {
        return this.streamStats.get(streamId);
    }

    getAllStreamStats(): Record<string, any> {
        const stats: Record<string, any> = {};
        for (const [streamId, stat] of this.streamStats) {
            stats[streamId] = stat;
        }
        return stats;
    }

    closeAllStreams(): void {
        for (const handler of this.activeStreams.values()) {
            handler.close();
        }
        this.activeStreams.clear();
        this.streamStats.clear();
    }
}

// ========================
// Export Everything
// ========================

export {
    SSEHandler,
    StreamingResponseFactory,
    createProgressTracker,
    processAsyncIterable,
    debounceStreamEvents,
    throttleStreamEvents,
    StreamMonitor
};

export default {
    SSEHandler,
    StreamingResponseFactory,
    createProgressTracker,
    StreamMonitor: StreamMonitor.getInstance()
};