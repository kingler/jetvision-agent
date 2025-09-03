import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { n8nClient } from '@repo/common/src/n8n-client';

interface BusinessMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  tags: Record<string, string>;
}

interface SystemMetric {
  name: string;
  value: number;
  timestamp: string;
}

interface MetricsResponse {
  timestamp: string;
  environment: string;
  version: string;
  business_metrics: BusinessMetric[];
  system_metrics: SystemMetric[];
  circuit_breakers: Record<string, any>;
  alerts?: string[];
}

// Helper to get memory usage metrics
function getMemoryMetrics(): SystemMetric[] {
  const usage = process.memoryUsage();
  const timestamp = new Date().toISOString();
  
  return [
    {
      name: 'memory_heap_used_mb',
      value: Math.round(usage.heapUsed / 1024 / 1024),
      timestamp,
    },
    {
      name: 'memory_heap_total_mb', 
      value: Math.round(usage.heapTotal / 1024 / 1024),
      timestamp,
    },
    {
      name: 'memory_external_mb',
      value: Math.round(usage.external / 1024 / 1024),
      timestamp,
    },
    {
      name: 'memory_rss_mb',
      value: Math.round(usage.rss / 1024 / 1024),
      timestamp,
    }
  ];
}

// Helper to get process metrics
function getProcessMetrics(): SystemMetric[] {
  const timestamp = new Date().toISOString();
  
  return [
    {
      name: 'uptime_seconds',
      value: Math.round(process.uptime()),
      timestamp,
    },
    {
      name: 'cpu_usage_percent',
      value: Math.round(process.cpuUsage().system / 1000000), // Convert to seconds
      timestamp,
    }
  ];
}

// Helper to simulate business metrics (replace with actual data queries)
async function getBusinessMetrics(): Promise<BusinessMetric[]> {
  const timestamp = new Date().toISOString();
  
  // TODO: Replace with actual database queries
  // These are placeholder metrics for the business requirements
  
  const metrics: BusinessMetric[] = [];
  
  try {
    // Lead conversion rate (target: 25% quarterly growth)
    // TODO: SELECT COUNT(*) FROM leads WHERE status = 'converted' AND created_at >= ?
    metrics.push({
      name: 'lead_conversion_rate',
      value: 0.18, // 18% conversion rate
      unit: 'percentage',
      timestamp,
      tags: { period: 'current_quarter' }
    });
    
    // Email response rate (target: >15%)
    // TODO: SELECT AVG(response_rate) FROM email_campaigns WHERE created_at >= ?
    metrics.push({
      name: 'email_response_rate',
      value: 0.16, // 16% response rate
      unit: 'percentage',
      timestamp,
      tags: { period: 'last_30_days' }
    });
    
    // System availability (target: 99.9%)
    // TODO: Calculate from health check logs
    metrics.push({
      name: 'system_availability',
      value: 0.999,
      unit: 'percentage',
      timestamp,
      tags: { period: 'last_24_hours' }
    });
    
    // Error rate (target: <0.1%)
    // TODO: Calculate from error logs
    metrics.push({
      name: 'error_rate',
      value: 0.0005, // 0.05%
      unit: 'percentage',
      timestamp,
      tags: { period: 'last_hour' }
    });
    
    // N8N webhook success rate
    // TODO: Calculate from webhook execution logs
    metrics.push({
      name: 'n8n_webhook_success_rate',
      value: 0.98, // 98% success rate
      unit: 'percentage',
      timestamp,
      tags: { service: 'n8n' }
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: { metrics: 'business' }
    });
  }
  
  return metrics;
}

// Generate alerts based on metrics
function generateAlerts(businessMetrics: BusinessMetric[], systemMetrics: SystemMetric[]): string[] {
  const alerts: string[] = [];
  
  // Business metric alerts
  const conversionRate = businessMetrics.find(m => m.name === 'lead_conversion_rate');
  if (conversionRate && conversionRate.value < 0.15) {
    alerts.push(`Lead conversion rate is ${(conversionRate.value * 100).toFixed(1)}% (target: >15%)`);
  }
  
  const emailRate = businessMetrics.find(m => m.name === 'email_response_rate');
  if (emailRate && emailRate.value < 0.15) {
    alerts.push(`Email response rate is ${(emailRate.value * 100).toFixed(1)}% (target: >15%)`);
  }
  
  const availability = businessMetrics.find(m => m.name === 'system_availability');
  if (availability && availability.value < 0.999) {
    alerts.push(`System availability is ${(availability.value * 100).toFixed(2)}% (target: >99.9%)`);
  }
  
  const errorRate = businessMetrics.find(m => m.name === 'error_rate');
  if (errorRate && errorRate.value > 0.001) {
    alerts.push(`Error rate is ${(errorRate.value * 100).toFixed(3)}% (target: <0.1%)`);
  }
  
  // System metric alerts
  const memoryUsed = systemMetrics.find(m => m.name === 'memory_heap_used_mb');
  if (memoryUsed && memoryUsed.value > 1000) {
    alerts.push(`High memory usage: ${memoryUsed.value}MB`);
  }
  
  return alerts;
}

export async function GET(request: Request) {
  try {
    const startTime = Date.now();
    
    // Collect all metrics in parallel
    const [businessMetrics, memoryMetrics, processMetrics] = await Promise.all([
      getBusinessMetrics(),
      Promise.resolve(getMemoryMetrics()),
      Promise.resolve(getProcessMetrics()),
    ]);
    
    const systemMetrics = [...memoryMetrics, ...processMetrics];
    
    // Get circuit breaker status
    const circuitBreakers = {
      n8n_webhook: n8nClient.getHealthMetrics(),
      // Add other circuit breakers as they're implemented
    };
    
    // Generate alerts
    const alerts = generateAlerts(businessMetrics, systemMetrics);
    
    const response: MetricsResponse = {
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      version: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      business_metrics: businessMetrics,
      system_metrics: systemMetrics,
      circuit_breakers: circuitBreakers,
      alerts: alerts.length > 0 ? alerts : undefined,
    };
    
    // Log metrics collection performance
    Sentry.addBreadcrumb({
      category: 'metrics',
      message: 'Metrics collected successfully',
      level: 'info',
      data: {
        collection_time_ms: Date.now() - startTime,
        business_metrics_count: businessMetrics.length,
        system_metrics_count: systemMetrics.length,
        alerts_count: alerts.length,
      }
    });
    
    // If there are critical alerts, log them to Sentry
    if (alerts.length > 0) {
      Sentry.captureMessage('Business metrics alerts detected', {
        level: 'warning',
        tags: { metrics_monitoring: true },
        extra: { alerts }
      });
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: 'metrics' }
    });
    
    return NextResponse.json(
      { error: 'Failed to collect metrics', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

// Optional: Add POST endpoint for custom metric ingestion
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { metric_name, value, unit = 'count', tags = {} } = body;
    
    if (!metric_name || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: metric_name, value' },
        { status: 400 }
      );
    }
    
    // Log custom metric to Sentry for tracking
    Sentry.addBreadcrumb({
      category: 'custom_metric',
      message: `Custom metric: ${metric_name}`,
      level: 'info',
      data: {
        metric_name,
        value,
        unit,
        tags,
      }
    });
    
    // TODO: Store custom metric in time series database
    // await timeSeriesDB.record(metric_name, value, unit, tags);
    
    return NextResponse.json({
      success: true,
      message: 'Metric recorded',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: 'metrics', method: 'POST' }
    });
    
    return NextResponse.json(
      { error: 'Failed to record custom metric' },
      { status: 500 }
    );
  }
}