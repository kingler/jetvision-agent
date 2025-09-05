import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

interface AvinodeHealthResponse {
  healthy: boolean;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: 'avinode';
  latency?: number;
  error?: string;
  metadata?: {
    api_endpoint: string;
    api_key_configured: boolean;
    last_successful_request?: string;
    connectivity: 'available' | 'limited' | 'unavailable';
    auth_status?: 'valid' | 'invalid' | 'expired';
  };
}

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    // Check if Avinode API key is configured
    const avinodeApiKey = process.env.AVINODE_API_KEY;
    
    if (!avinodeApiKey) {
      const response: AvinodeHealthResponse = {
        healthy: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'avinode',
        error: 'Avinode API key not configured',
        metadata: {
          api_endpoint: 'https://api.avinode.com/api/v1',
          api_key_configured: false,
          connectivity: 'unavailable',
        },
      };
      
      return NextResponse.json(response, { status: 503 });
    }
    
    // Test Avinode API connectivity
    try {
      // Using a lightweight endpoint - adjust URL based on actual Avinode API
      const apiResponse = await fetch('https://api.avinode.com/api/v1/health', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${avinodeApiKey}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'User-Agent': 'JetVision-Agent/1.0',
        },
        signal: AbortSignal.timeout(8000), // 8 second timeout
      });
      
      const latency = Date.now() - startTime;
      
      if (apiResponse.ok) {
        const response: AvinodeHealthResponse = {
          healthy: true,
          status: latency > 3000 ? 'degraded' : 'healthy',
          timestamp: new Date().toISOString(),
          service: 'avinode',
          latency,
          metadata: {
            api_endpoint: 'https://api.avinode.com/api/v1',
            api_key_configured: true,
            last_successful_request: new Date().toISOString(),
            connectivity: latency > 3000 ? 'limited' : 'available',
            auth_status: 'valid',
          },
        };
        
        return NextResponse.json(response, { status: 200 });
        
      } else if (apiResponse.status === 401) {
        // Unauthorized - API key issue but service is responding
        const response: AvinodeHealthResponse = {
          healthy: false,
          status: 'degraded',
          timestamp: new Date().toISOString(),
          service: 'avinode',
          latency,
          error: 'Avinode API authentication failed - invalid or expired API key',
          metadata: {
            api_endpoint: 'https://api.avinode.com/api/v1',
            api_key_configured: true,
            connectivity: 'limited',
            auth_status: 'invalid',
          },
        };
        
        return NextResponse.json(response, { status: 200 }); // Service is responding, just auth issue
        
      } else {
        // Other API errors
        const errorText = await apiResponse.text().catch(() => 'Unknown error');
        
        const response: AvinodeHealthResponse = {
          healthy: false,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          service: 'avinode',
          latency,
          error: `Avinode API error: ${apiResponse.status} - ${errorText}`,
          metadata: {
            api_endpoint: 'https://api.avinode.com/api/v1',
            api_key_configured: true,
            connectivity: 'unavailable',
          },
        };
        
        return NextResponse.json(response, { status: 503 });
      }
      
    } catch (fetchError) {
      const latency = Date.now() - startTime;
      
      Sentry.captureException(fetchError, {
        tags: { 
          service: 'avinode',
          health_check: true 
        },
        extra: { latency }
      });
      
      const response: AvinodeHealthResponse = {
        healthy: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'avinode',
        latency,
        error: fetchError instanceof Error ? fetchError.message : 'Network connectivity failed',
        metadata: {
          api_endpoint: 'https://api.avinode.com/api/v1',
          api_key_configured: true,
          connectivity: 'unavailable',
        },
      };
      
      return NextResponse.json(response, { status: 503 });
    }
    
  } catch (error) {
    Sentry.captureException(error, {
      tags: { 
        endpoint: 'avinode_health',
        service: 'avinode'
      }
    });
    
    const response: AvinodeHealthResponse = {
      healthy: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'avinode',
      error: error instanceof Error ? error.message : 'Avinode health check failed',
      metadata: {
        api_endpoint: 'https://api.avinode.com/api/v1',
        api_key_configured: !!process.env.AVINODE_API_KEY,
        connectivity: 'unavailable',
      },
    };
    
    return NextResponse.json(response, { status: 503 });
  }
}

export async function POST(request: Request) {
  // API key validation endpoint
  try {
    const { apiKey } = await request.json();
    
    if (!apiKey) {
      return NextResponse.json({ 
        valid: false, 
        error: 'API key is required' 
      }, { status: 400 });
    }
    
    // Test the provided API key
    const response = await fetch('https://api.avinode.com/api/v1/health', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'User-Agent': 'JetVision-Agent/1.0',
      },
      signal: AbortSignal.timeout(5000),
    });
    
    const result = {
      valid: response.ok,
      status: response.status,
      message: response.ok ? 'API key is valid' : 'API key validation failed',
      auth_status: response.status === 401 ? 'invalid' : 
                   response.ok ? 'valid' : 'unknown',
    };
    
    return NextResponse.json(result, { status: response.ok ? 200 : 400 });
    
  } catch (error) {
    return NextResponse.json({ 
      valid: false, 
      error: 'API key validation failed' 
    }, { status: 500 });
  }
}