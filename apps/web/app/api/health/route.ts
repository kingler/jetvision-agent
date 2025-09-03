import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  error?: string;
  metadata?: Record<string, any>;
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  checks: HealthCheck[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

// Database health check
async function checkDatabase(): Promise<HealthCheck> {
  try {
    const startTime = Date.now();
    
    // TODO: Replace with actual database check
    // Example: await db.raw('SELECT 1');
    
    // Simulate database check for now
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    const latency = Date.now() - startTime;
    
    return {
      service: 'database',
      status: latency > 1000 ? 'degraded' : 'healthy',
      latency,
      metadata: {
        connection_pool: 'active',
        read_replicas: 'available',
      }
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { health_check: 'database' }
    });
    
    return {
      service: 'database',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

// N8N webhook health check
async function checkN8NWebhook(): Promise<HealthCheck> {
  try {
    const startTime = Date.now();
    
    // TODO: Add actual N8N health check endpoint ping
    // For now, check if environment variables are present
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      return {
        service: 'n8n_webhook',
        status: 'unhealthy',
        error: 'N8N webhook URL not configured',
      };
    }

    // Simple connectivity check (replace with actual ping)
    const latency = Date.now() - startTime;
    
    return {
      service: 'n8n_webhook',
      status: 'healthy',
      latency,
      metadata: {
        endpoint_configured: true,
        url_masked: `${n8nWebhookUrl.substring(0, 20)}...`,
      }
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { health_check: 'n8n_webhook' }
    });
    
    return {
      service: 'n8n_webhook',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'N8N webhook check failed',
    };
  }
}

// AI Services health check
async function checkAIServices(): Promise<HealthCheck> {
  try {
    const startTime = Date.now();
    
    // Check if AI service environment variables are configured
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    
    const latency = Date.now() - startTime;
    
    const configuredServices = [];
    if (hasOpenAI) configuredServices.push('openai');
    if (hasAnthropic) configuredServices.push('anthropic');
    
    const status = configuredServices.length > 0 ? 'healthy' : 'degraded';
    
    return {
      service: 'ai_services',
      status,
      latency,
      metadata: {
        configured_providers: configuredServices,
        fallback_available: configuredServices.length > 1,
      }
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { health_check: 'ai_services' }
    });
    
    return {
      service: 'ai_services',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'AI services check failed',
    };
  }
}

// Memory and performance check
async function checkSystemHealth(): Promise<HealthCheck> {
  try {
    const startTime = Date.now();
    
    // Basic system health indicators
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const latency = Date.now() - startTime;
    
    // Consider degraded if memory usage is high
    const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const status = memoryUsedMB > 500 ? 'degraded' : 'healthy';
    
    return {
      service: 'system',
      status,
      latency,
      metadata: {
        memory_used_mb: Math.round(memoryUsedMB),
        uptime_seconds: Math.round(uptime),
        node_version: process.version,
      }
    };
  } catch (error) {
    return {
      service: 'system',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'System check failed',
    };
  }
}

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const checks = await Promise.all([
      checkDatabase(),
      checkN8NWebhook(),
      checkAIServices(),
      checkSystemHealth(),
    ]);
    
    // Calculate summary
    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
    };
    
    // Determine overall status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }
    
    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      checks,
      summary,
    };
    
    // Log health check metrics to Sentry for monitoring
    Sentry.addBreadcrumb({
      category: 'health_check',
      message: `Health check completed: ${overallStatus}`,
      level: overallStatus === 'healthy' ? 'info' : 'warning',
      data: {
        duration_ms: Date.now() - startTime,
        summary,
      }
    });
    
    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    return NextResponse.json(result, { status: httpStatus });
    
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: 'health_check' }
    });
    
    const errorResult: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      checks: [],
      summary: { total: 0, healthy: 0, unhealthy: 1, degraded: 0 },
    };
    
    return NextResponse.json(errorResult, { status: 503 });
  }
}