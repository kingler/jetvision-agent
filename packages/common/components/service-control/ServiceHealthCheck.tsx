'use client';
import { Button } from '@repo/ui';
import { IconRefresh, IconAlertCircle, IconCheck, IconClock } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useServiceControlStore } from '../../store/service-control.store';
import { ServiceStatusIndicator } from './ServiceStatusIndicator';

interface HealthCheckResult {
  healthy: boolean;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: string;
  latency?: number;
  error?: string;
  metadata?: Record<string, any>;
}

interface ServiceHealthCheckProps {
  serviceId: string;
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  showDetails?: boolean;
}

export const ServiceHealthCheck = ({
  serviceId,
  className = '',
  autoRefresh = false,
  refreshInterval = 60000, // 1 minute default
  showDetails = true,
}: ServiceHealthCheckProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<HealthCheckResult | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [autoRefreshActive, setAutoRefreshActive] = useState(autoRefresh);
  
  const { 
    services, 
    performHealthCheck, 
    updateHealthCheckResult,
    isServiceAvailable 
  } = useServiceControlStore();
  
  const service = services[serviceId];

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshActive || !isServiceAvailable(serviceId)) return;
    
    const interval = setInterval(() => {
      handleHealthCheck();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefreshActive, serviceId, refreshInterval, isServiceAvailable]);

  const handleHealthCheck = async () => {
    if (!isServiceAvailable(serviceId)) {
      setLastResult({
        healthy: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: serviceId,
        error: 'Service is disabled',
      });
      return;
    }

    setIsChecking(true);
    
    try {
      // Call the API endpoint for health check
      const response = await fetch(`/api/services/${serviceId}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-cache',
      });
      
      const result: HealthCheckResult = await response.json();
      setLastResult(result);
      setLastCheckTime(new Date());
      
      // Update the store with the result
      updateHealthCheckResult(
        serviceId, 
        result.healthy, 
        result.error
      );
      
    } catch (error) {
      const errorResult: HealthCheckResult = {
        healthy: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: serviceId,
        error: error instanceof Error ? error.message : 'Health check failed',
      };
      
      setLastResult(errorResult);
      setLastCheckTime(new Date());
      updateHealthCheckResult(serviceId, false, errorResult.error);
    } finally {
      setIsChecking(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefreshActive(!autoRefreshActive);
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <IconRefresh size={16} />
        </motion.div>
      );
    }
    
    if (!lastResult) return <IconClock size={16} />;
    
    switch (lastResult.status) {
      case 'healthy':
        return <IconCheck size={16} className="text-green-500" />;
      case 'degraded':
        return <IconAlertCircle size={16} className="text-yellow-500" />;
      case 'unhealthy':
        return <IconAlertCircle size={16} className="text-red-500" />;
      default:
        return <IconClock size={16} />;
    }
  };

  const formatLatency = (latency?: number) => {
    if (!latency) return 'N/A';
    return `${latency}ms`;
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  const getNextRefreshTime = () => {
    if (!autoRefreshActive || !lastCheckTime) return null;
    const nextTime = new Date(lastCheckTime.getTime() + refreshInterval);
    return nextTime;
  };

  return (
    <div className={`bg-background border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">
            {service?.name || serviceId} Health Check
          </h3>
          <ServiceStatusIndicator 
            status={service?.status || 'disabled'} 
            size="sm" 
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleHealthCheck}
            disabled={isChecking || !isServiceAvailable(serviceId)}
          >
            {getStatusIcon()}
            {isChecking ? 'Checking...' : 'Check Now'}
          </Button>
          
          {autoRefresh && (
            <Button
              variant={autoRefreshActive ? 'default' : 'outline'}
              size="sm"
              onClick={toggleAutoRefresh}
              disabled={!isServiceAvailable(serviceId)}
            >
              Auto Refresh {autoRefreshActive ? 'ON' : 'OFF'}
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {lastResult && showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Status:</span>
                <span className={`font-medium ${
                  lastResult.status === 'healthy' ? 'text-green-600' :
                  lastResult.status === 'degraded' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {lastResult.status.charAt(0).toUpperCase() + lastResult.status.slice(1)}
                </span>
              </div>
              
              <div>
                <span className="text-muted-foreground block">Latency:</span>
                <span className="font-medium">{formatLatency(lastResult.latency)}</span>
              </div>
              
              <div>
                <span className="text-muted-foreground block">Last Check:</span>
                <span className="font-medium">{formatTimestamp(lastResult.timestamp)}</span>
              </div>
              
              {autoRefreshActive && getNextRefreshTime() && (
                <div>
                  <span className="text-muted-foreground block">Next Check:</span>
                  <span className="font-medium text-xs">
                    {getNextRefreshTime()!.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {lastResult.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <IconAlertCircle size={16} className="text-red-500" />
                  <span className="text-sm font-medium text-red-800">Error Details</span>
                </div>
                <p className="text-sm text-red-700">{lastResult.error}</p>
              </div>
            )}

            {lastResult.metadata && Object.keys(lastResult.metadata).length > 0 && (
              <div className="bg-muted/50 rounded-md p-3">
                <h4 className="text-sm font-medium mb-2">Metadata</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {Object.entries(lastResult.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                      <span className="font-mono">{
                        typeof value === 'boolean' ? value.toString() :
                        typeof value === 'object' ? JSON.stringify(value) :
                        value?.toString() || 'N/A'
                      }</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isServiceAvailable(serviceId) && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-600">
            Service is currently disabled. Enable it to perform health checks.
          </p>
        </div>
      )}
    </div>
  );
};