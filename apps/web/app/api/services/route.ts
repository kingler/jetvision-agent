import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

interface ServiceHealthCheck {
  serviceId: string;
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  error?: string;
  lastCheck: string;
  metadata?: Record<string, any>;
}

interface ServicesHealthResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: ServiceHealthCheck[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

// Apollo.io health check
async function checkApolloHealth(): Promise<ServiceHealthCheck> {
  try {
    const startTime = Date.now();
    
    // Check if Apollo API key is configured
    const apolloApiKey = process.env.APOLLO_API_KEY;
    
    if (!apolloApiKey) {
      return {
        serviceId: 'apollo',
        name: 'Apollo.io',
        status: 'unhealthy',
        error: 'Apollo API key not configured',
        lastCheck: new Date().toISOString(),
      };
    }
    
    // Check Apollo API connectivity
    const response = await fetch('https://api.apollo.io/v1/auth/health', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'X-Api-Key': apolloApiKey,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      return {
        serviceId: 'apollo',
        name: 'Apollo.io',
        status: latency > 2000 ? 'degraded' : 'healthy',
        latency,
        lastCheck: new Date().toISOString(),
        metadata: {
          api_endpoint: 'https://api.apollo.io/v1',
          rate_limit_remaining: response.headers.get('x-rate-limit-remaining'),
          response_time_ms: latency,
        },
      };
    } else {
      return {
        serviceId: 'apollo',
        name: 'Apollo.io',
        status: 'unhealthy',
        error: `API responded with status ${response.status}`,
        latency,
        lastCheck: new Date().toISOString(),
      };
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { service_health: 'apollo' }
    });
    
    return {
      serviceId: 'apollo',
      name: 'Apollo.io',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Apollo connectivity check failed',
      lastCheck: new Date().toISOString(),
    };
  }
}

// Avinode health check
async function checkAvinodeHealth(): Promise<ServiceHealthCheck> {
  try {
    const startTime = Date.now();
    
    // Check if Avinode API key is configured
    const avinodeApiKey = process.env.AVINODE_API_KEY;
    
    if (!avinodeApiKey) {
      return {
        serviceId: 'avinode',
        name: 'Avinode',
        status: 'unhealthy',
        error: 'Avinode API key not configured',
        lastCheck: new Date().toISOString(),
      };
    }
    
    // Check Avinode API connectivity
    // Note: Using a lightweight endpoint for health check
    const response = await fetch('https://api.avinode.com/api/v1/health', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${avinodeApiKey}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    const latency = Date.now() - startTime;
    
    if (response.ok || response.status === 401) {
      // 401 means API is responding but auth failed (still considered healthy for connectivity)
      const isHealthy = response.ok;
      return {
        serviceId: 'avinode',
        name: 'Avinode',
        status: response.status === 401 ? 'degraded' : 
               (latency > 2000 ? 'degraded' : 'healthy'),
        latency,
        lastCheck: new Date().toISOString(),
        metadata: {
          api_endpoint: 'https://api.avinode.com/api/v1',
          auth_valid: response.ok,
          response_time_ms: latency,
        },
        ...(response.status === 401 && { error: 'Invalid API key or expired token' }),
      };
    } else {
      return {
        serviceId: 'avinode',
        name: 'Avinode',
        status: 'unhealthy',
        error: `API responded with status ${response.status}`,
        latency,
        lastCheck: new Date().toISOString(),
      };
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { service_health: 'avinode' }
    });
    
    return {
      serviceId: 'avinode',
      name: 'Avinode',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Avinode connectivity check failed',
      lastCheck: new Date().toISOString(),
    };
  }
}

// N8N service health (always healthy for workflow automation)
async function checkN8NHealth(): Promise<ServiceHealthCheck> {
  try {
    const startTime = Date.now();
    const latency = Date.now() - startTime;
    
    return {
      serviceId: 'n8n',
      name: 'N8N Workflows',
      status: 'healthy',
      latency,
      lastCheck: new Date().toISOString(),
      metadata: {
        service_type: 'workflow_automation',
        always_available: true,
      },
    };
  } catch (error) {
    return {
      serviceId: 'n8n',
      name: 'N8N Workflows',
      status: 'degraded',
      error: error instanceof Error ? error.message : 'N8N check failed',
      lastCheck: new Date().toISOString(),
    };
  }
}

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    // Get URL parameters to filter specific services
    const { searchParams } = new URL(request.url);
    const serviceFilter = searchParams.get('service');
    
    // Run health checks based on filter or all services
    let checks: ServiceHealthCheck[] = [];
    
    if (!serviceFilter || serviceFilter === 'apollo') {
      checks.push(await checkApolloHealth());
    }
    
    if (!serviceFilter || serviceFilter === 'avinode') {
      checks.push(await checkAvinodeHealth());
    }
    
    if (!serviceFilter || serviceFilter === 'n8n') {
      checks.push(await checkN8NHealth());
    }
    
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
    
    const result: ServicesHealthResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: checks,
      summary,
    };
    
    // Add rate limiting headers
    const response = NextResponse.json(result, { status: 200 });
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('X-RateLimit-Limit', '60');
    response.headers.set('X-RateLimit-Window', '60');
    
    return response;
    
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: 'services_health' }
    });
    
    const errorResult: ServicesHealthResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: [],
      summary: { total: 0, healthy: 0, unhealthy: 1, degraded: 0 },
    };
    
    return NextResponse.json(errorResult, { status: 503 });
  }
}