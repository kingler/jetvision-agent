import * as Sentry from '@sentry/nextjs';
import { CircuitBreaker, CircuitBreakerError } from './circuit-breaker';

export interface N8NWebhookPayload {
  type: 'lead_processing' | 'email_response' | 'booking_request' | 'data_sync';
  data: Record<string, any>;
  metadata?: {
    timestamp: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    source: string;
    user_id?: string;
    session_id?: string;
  };
}

export interface N8NResponse {
  success: boolean;
  data?: any;
  error?: string;
  execution_id?: string;
  processed_at: string;
}

export interface N8NFallbackResponse {
  success: boolean;
  fallback_used: true;
  data?: any;
  message: string;
  queued_for_retry?: boolean;
}

export class N8NClient {
  private circuitBreaker: CircuitBreaker<N8NResponse>;
  private fallbackQueue: N8NWebhookPayload[] = [];
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.N8N_WEBHOOK_URL || '';
    
    if (!this.baseURL) {
      Sentry.captureMessage('N8N webhook URL not configured', 'warning');
    }

    // Initialize circuit breaker with business-appropriate settings
    this.circuitBreaker = new CircuitBreaker('n8n-webhook', {
      failureThreshold: 3, // Open after 3 failures (stricter for business critical)
      resetTimeout: 30000, // Try again after 30 seconds
      monitoringPeriod: 300000, // 5 minutes
      fallbackEnabled: true,
    });
  }

  /**
   * Send webhook with circuit breaker protection and fallback handling
   */
  async sendWebhook(payload: N8NWebhookPayload): Promise<N8NResponse | N8NFallbackResponse> {
    // Add metadata if not present
    const enrichedPayload: N8NWebhookPayload = {
      ...payload,
      metadata: {
        timestamp: new Date().toISOString(),
        priority: 'normal',
        source: 'jetvision-agent',
        ...payload.metadata,
      },
    };

    try {
      const result = await this.circuitBreaker.execute(
        () => this.executeWebhook(enrichedPayload),
        () => this.executeFallback(enrichedPayload)
      );

      return result;
    } catch (error) {
      // Log the error with business context
      Sentry.captureException(error, {
        tags: {
          service: 'n8n',
          webhook_type: payload.type,
          priority: payload.metadata?.priority || 'normal',
        },
        extra: {
          payload_type: payload.type,
          has_fallback: true,
          circuit_state: this.circuitBreaker.getState(),
        }
      });

      throw error;
    }
  }

  /**
   * Execute the actual webhook call
   */
  private async executeWebhook(payload: N8NWebhookPayload): Promise<N8NResponse> {
    if (!this.baseURL) {
      throw new Error('N8N webhook URL not configured');
    }

    const startTime = Date.now();

    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'JetVision-Agent/1.0',
          'X-Request-ID': `jv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
        body: JSON.stringify(payload),
        // Timeout after 15 seconds for webhook calls
        signal: AbortSignal.timeout(15000),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`N8N webhook failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Log successful webhook execution
      Sentry.addBreadcrumb({
        category: 'n8n_webhook',
        message: `Webhook executed successfully: ${payload.type}`,
        level: 'info',
        data: {
          type: payload.type,
          duration_ms: duration,
          status: response.status,
          priority: payload.metadata?.priority,
        }
      });

      return {
        success: true,
        data: result,
        execution_id: result.execution_id || `exec-${Date.now()}`,
        processed_at: new Date().toISOString(),
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Enhanced error logging for business context
      Sentry.addBreadcrumb({
        category: 'n8n_webhook',
        message: `Webhook failed: ${payload.type}`,
        level: 'error',
        data: {
          type: payload.type,
          duration_ms: duration,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          priority: payload.metadata?.priority,
        }
      });

      throw error;
    }
  }

  /**
   * Execute fallback logic when N8N is unavailable
   */
  private async executeFallback(payload: N8NWebhookPayload): Promise<N8NFallbackResponse> {
    // Queue for later retry
    this.fallbackQueue.push(payload);

    // Handle different payload types with appropriate fallback strategies
    switch (payload.type) {
      case 'lead_processing':
        return this.handleLeadProcessingFallback(payload);
      
      case 'email_response':
        return this.handleEmailResponseFallback(payload);
      
      case 'booking_request':
        return this.handleBookingRequestFallback(payload);
      
      case 'data_sync':
        return this.handleDataSyncFallback(payload);
      
      default:
        return {
          success: true,
          fallback_used: true,
          message: `Payload queued for retry: ${payload.type}`,
          queued_for_retry: true,
        };
    }
  }

  /**
   * Handle lead processing when N8N is down
   */
  private async handleLeadProcessingFallback(payload: N8NWebhookPayload): Promise<N8NFallbackResponse> {
    // For lead processing, we can store in database and process later
    // This maintains business continuity for Fortune 500 clients
    
    try {
      // TODO: Store in database queue table
      // await db.leadQueue.create(payload.data);
      
      Sentry.addBreadcrumb({
        category: 'fallback',
        message: 'Lead processing fallback executed',
        level: 'info',
        data: {
          lead_id: payload.data.lead_id,
          priority: payload.metadata?.priority,
        }
      });

      return {
        success: true,
        fallback_used: true,
        message: 'Lead queued for processing when N8N service recovers',
        data: { queued_at: new Date().toISOString() },
        queued_for_retry: true,
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { fallback: 'lead_processing' }
      });
      
      throw new Error('Lead processing fallback failed');
    }
  }

  /**
   * Handle email response when N8N is down
   */
  private async handleEmailResponseFallback(payload: N8NWebhookPayload): Promise<N8NFallbackResponse> {
    // For email responses, we might have a secondary email service
    
    Sentry.addBreadcrumb({
      category: 'fallback',
      message: 'Email response fallback executed',
      level: 'warning',
      data: {
        email_type: payload.data.type,
        priority: payload.metadata?.priority,
      }
    });

    return {
      success: true,
      fallback_used: true,
      message: 'Email response will be processed when N8N service recovers',
      queued_for_retry: true,
    };
  }

  /**
   * Handle booking requests when N8N is down
   */
  private async handleBookingRequestFallback(payload: N8NWebhookPayload): Promise<N8NFallbackResponse> {
    // Booking requests are critical - might need immediate attention
    
    Sentry.captureMessage('Booking request fallback activated - manual intervention may be required', 'warning', {
      tags: {
        business_critical: true,
        fallback: 'booking_request',
      },
      extra: {
        booking_data: payload.data,
        timestamp: payload.metadata?.timestamp,
      }
    });

    return {
      success: true,
      fallback_used: true,
      message: 'Booking request queued - manual processing may be required',
      data: { 
        requires_manual_review: true,
        queued_at: new Date().toISOString(),
      },
      queued_for_retry: true,
    };
  }

  /**
   * Handle data sync when N8N is down
   */
  private async handleDataSyncFallback(payload: N8NWebhookPayload): Promise<N8NFallbackResponse> {
    // Data sync can usually wait
    
    return {
      success: true,
      fallback_used: true,
      message: 'Data sync queued for when N8N service recovers',
      queued_for_retry: true,
    };
  }

  /**
   * Get circuit breaker health metrics
   */
  getHealthMetrics() {
    return {
      ...this.circuitBreaker.getHealthMetrics(),
      fallback_queue_size: this.fallbackQueue.length,
      webhook_configured: !!this.baseURL,
    };
  }

  /**
   * Process queued items (call periodically or when circuit closes)
   */
  async processQueuedItems(): Promise<void> {
    if (this.fallbackQueue.length === 0) return;

    const itemsToProcess = [...this.fallbackQueue];
    this.fallbackQueue = [];

    for (const item of itemsToProcess) {
      try {
        await this.sendWebhook(item);
      } catch (error) {
        // If still failing, put back in queue (with limit to prevent infinite growth)
        if (this.fallbackQueue.length < 1000) {
          this.fallbackQueue.push(item);
        }
      }
    }
  }

  /**
   * Manual circuit breaker control
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  forceCircuitOpen(): void {
    this.circuitBreaker.forceOpen();
  }
}

// Singleton instance for application use
export const n8nClient = new N8NClient();