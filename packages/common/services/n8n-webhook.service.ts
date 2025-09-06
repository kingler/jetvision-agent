/**
 * n8n Webhook Service for JetVision Agent
 * Handles communication with n8n workflows for Apollo.io and Avinode operations
 */

export interface N8nWebhookRequest {
    prompt: string;
    context?: {
        userId?: string;
        sessionId?: string;
        timestamp?: string;
        source?: 'apollo' | 'avinode' | 'integration';
    };
    parameters?: Record<string, any>;
}

export interface N8nWebhookResponse {
    success: boolean;
    data?: any;
    error?: string;
    metadata?: {
        executionId?: string;
        workflowId?: string;
        processingTime?: number;
    };
}

export class N8nWebhookService {
    private readonly webhookUrl: string;
    private readonly apiKey?: string;
    private readonly timeout: number;

    constructor(config?: { webhookUrl?: string; apiKey?: string; timeout?: number }) {
        this.webhookUrl =
            config?.webhookUrl ||
            process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
            'http://localhost:5678/webhook/jetvision-agent';
        this.apiKey = config?.apiKey || process.env.NEXT_PUBLIC_N8N_API_KEY;
        this.timeout = config?.timeout || 30000; // 30 seconds default
    }

    /**
     * Send a prompt to the n8n webhook and get results
     */
    async sendPrompt(request: N8nWebhookRequest): Promise<N8nWebhookResponse> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    ...request,
                    context: {
                        ...request.context,
                        timestamp: request.context?.timestamp || new Date().toISOString(),
                    },
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return {
                success: true,
                data: data.results || data,
                metadata: {
                    executionId: data.executionId,
                    workflowId: data.workflowId,
                    processingTime: data.processingTime,
                },
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    return {
                        success: false,
                        error: 'Request timeout - n8n webhook took too long to respond',
                    };
                }
                return {
                    success: false,
                    error: error.message,
                };
            }

            return {
                success: false,
                error: 'An unknown error occurred',
            };
        }
    }

    /**
     * Stream results from n8n webhook using Server-Sent Events
     */
    async streamPrompt(
        request: N8nWebhookRequest,
        onMessage: (data: any) => void,
        onError?: (error: string) => void,
        onComplete?: () => void
    ): Promise<() => void> {
        const eventSource = new EventSource(
            `${this.webhookUrl}/stream?${new URLSearchParams({
                prompt: request.prompt,
                source: request.context?.source || 'integration',
                ...(this.apiKey && { apiKey: this.apiKey }),
            })}`
        );

        eventSource.onmessage = event => {
            try {
                const data = JSON.parse(event.data);
                onMessage(data);
            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };

        eventSource.onerror = error => {
            console.error('SSE error:', error);
            onError?.('Connection to n8n webhook failed');
            eventSource.close();
            onComplete?.();
        };

        eventSource.addEventListener('complete', () => {
            eventSource.close();
            onComplete?.();
        });

        // Return cleanup function
        return () => {
            eventSource.close();
        };
    }

    /**
     * Transform n8n response data into SearchResult format
     */
    transformToSearchResults(data: any): any[] {
        if (!data) return [];

        // Handle Apollo.io responses
        if (data.source === 'apollo') {
            return this.transformApolloResults(data.results || data);
        }

        // Handle Avinode responses
        if (data.source === 'avinode') {
            return this.transformAvinodeResults(data.results || data);
        }

        // Handle generic responses
        if (Array.isArray(data)) {
            return data.map((item, index) => ({
                id: item.id || `result-${index}`,
                type: item.type || 'generic',
                title: item.title || item.name || 'Untitled',
                subtitle: item.subtitle || item.description,
                metadata: item.metadata || item,
                score: item.score,
            }));
        }

        return [];
    }

    private transformApolloResults(data: any): any[] {
        if (!Array.isArray(data)) {
            data = [data];
        }

        return data.map((item: any) => ({
            id: item.id || item.email || Math.random().toString(36),
            type: 'contact',
            title: item.name || `${item.first_name} ${item.last_name}`,
            subtitle: `${item.title} at ${item.organization_name}`,
            metadata: {
                email: item.email,
                phone: item.phone,
                location: item.city,
                score: item.apollo_score,
            },
            score: item.apollo_score,
        }));
    }

    private transformAvinodeResults(data: any): any[] {
        if (!Array.isArray(data)) {
            data = [data];
        }

        return data.map((item: any) => ({
            id: item.id || item.aircraft_id || Math.random().toString(36),
            type: 'aircraft',
            title: item.aircraft_type || item.model,
            subtitle: `${item.base_location} • ${item.availability_status}`,
            metadata: {
                seats: item.passenger_capacity,
                range: item.range_nm,
                price: item.hourly_rate,
                available: item.is_available,
            },
            score: item.match_score,
        }));
    }

    /**
     * Check n8n webhook health
     */
    async checkHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${this.webhookUrl}/health`, {
                method: 'GET',
                headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

// Export singleton instance
export const n8nWebhook = new N8nWebhookService();
