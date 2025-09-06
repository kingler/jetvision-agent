/**
 * Service Health Dashboard for JetVision Integration Architecture
 *
 * Real-time monitoring dashboard showing the status of all integration services,
 * circuit breaker states, cache performance, and system health metrics.
 */

import * as React from 'react';
const { useEffect, useState } = React;
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@repo/ui';
import {
    ChartBarIcon as IconActivity,
    ExclamationTriangleIcon as IconAlert,
    ExclamationTriangleIcon as IconAlertTriangle,
    CheckIcon as IconCheck,
    ClockIcon as IconClock,
    CircleStackIcon as IconDatabase,
    ArrowPathIcon as IconRefresh,
    ServerIcon as IconServer,
    ArrowTrendingUpIcon as IconTrendingUp,
    XMarkIcon as IconX,
    CogIcon as IconSettings,
    BoltIcon as IconBolt,
} from '@heroicons/react/24/outline';

// Simple Progress Component (since not exported from @repo/ui)
const Progress: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
    return (
        <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 ${className}`}>
            <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out" 
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    );
};

// Types (these would normally be imported from the service files)
interface ServiceHealth {
    serviceName: string;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    lastFailureTime?: number;
    lastSuccessTime?: number;
    failureCount: number;
    successCount: number;
    requestCount: number;
    averageResponseTime: number;
    uptime: number;
}

interface ServiceAlert {
    id: string;
    serviceName: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: number;
    resolved: boolean;
}

interface SystemHealth {
    overall: 'healthy' | 'degraded' | 'critical';
    services: ServiceHealth[];
    alerts: ServiceAlert[];
    cacheStats: {
        totalEntries: number;
        hitRate: number;
        averageResponseTime: number;
    };
    uptime: number;
    lastUpdate: number;
}

interface ServiceMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    successRate: number;
}

interface ServiceHealthDashboardProps {
    autoRefresh?: boolean;
    refreshInterval?: number;
    onServiceAction?: (serviceName: string, action: 'reset' | 'force-open' | 'force-close') => void;
}

export const ServiceHealthDashboard: React.FC<ServiceHealthDashboardProps> = ({
    autoRefresh = true,
    refreshInterval = 10000,
    onServiceAction,
}) => {
    const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<number>(0);

    // Mock data - in production this would come from the actual service monitor
    const mockSystemHealth: SystemHealth = {
        overall: 'healthy',
        services: [
            {
                serviceName: 'n8n-primary',
                state: 'CLOSED',
                lastSuccessTime: Date.now() - 1000,
                failureCount: 0,
                successCount: 156,
                requestCount: 156,
                averageResponseTime: 850,
                uptime: 99.8,
            },
            {
                serviceName: 'apollo-direct',
                state: 'CLOSED',
                lastSuccessTime: Date.now() - 5000,
                failureCount: 2,
                successCount: 89,
                requestCount: 91,
                averageResponseTime: 1250,
                uptime: 97.8,
            },
            {
                serviceName: 'avinode-direct',
                state: 'HALF_OPEN',
                lastFailureTime: Date.now() - 30000,
                failureCount: 5,
                successCount: 45,
                requestCount: 50,
                averageResponseTime: 2100,
                uptime: 90.0,
            },
            {
                serviceName: 'llm-provider',
                state: 'OPEN',
                lastFailureTime: Date.now() - 120000,
                failureCount: 8,
                successCount: 23,
                requestCount: 31,
                averageResponseTime: 3500,
                uptime: 74.2,
            },
        ],
        alerts: [
            {
                id: 'alert-1',
                serviceName: 'avinode-direct',
                level: 'warning',
                message: 'High response time: 2100ms',
                timestamp: Date.now() - 60000,
                resolved: false,
            },
            {
                id: 'alert-2',
                serviceName: 'llm-provider',
                level: 'critical',
                message: 'Service down for 120s',
                timestamp: Date.now() - 120000,
                resolved: false,
            },
        ],
        cacheStats: {
            totalEntries: 2847,
            hitRate: 78.5,
            averageResponseTime: 12,
        },
        uptime: Date.now() - 24 * 60 * 60 * 1000, // 24 hours
        lastUpdate: Date.now(),
    };

    // Simulate fetching system health
    const fetchSystemHealth = async (): Promise<void> => {
        setLoading(true);
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // In production: const response = await fetch('/api/system-health');
            // const health = await response.json();

            setSystemHealth(mockSystemHealth);
            setLastRefresh(Date.now());
        } catch (error) {
            console.error('Failed to fetch system health:', error);
        } finally {
            setLoading(false);
        }
    };

    // Auto refresh effect
    useEffect(() => {
        fetchSystemHealth();

        if (autoRefresh && refreshInterval > 0) {
            const interval = setInterval(fetchSystemHealth, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, refreshInterval]);

    const getStatusColor = (state: string): string => {
        switch (state) {
            case 'CLOSED':
                return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
            case 'HALF_OPEN':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
            case 'OPEN':
                return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
        }
    };

    const getStatusIcon = (state: string) => {
        switch (state) {
            case 'CLOSED':
                return <IconCheck className="h-4 w-4" />;
            case 'HALF_OPEN':
                return <IconAlertTriangle className="h-4 w-4" />;
            case 'OPEN':
                return <IconX className="h-4 w-4" />;
            default:
                return <IconAlert className="h-4 w-4" />;
        }
    };

    const getOverallHealthColor = (overall: string): string => {
        switch (overall) {
            case 'healthy':
                return 'text-green-600';
            case 'degraded':
                return 'text-yellow-600';
            case 'critical':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const formatUptime = (seconds: number): string => {
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
        if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
        return `${(seconds / 86400).toFixed(1)}d`;
    };

    const handleServiceAction = (
        serviceName: string,
        action: 'reset' | 'force-open' | 'force-close'
    ) => {
        if (onServiceAction) {
            onServiceAction(serviceName, action);
        }

        // Refresh after action
        setTimeout(fetchSystemHealth, 1000);
    };

    if (loading && !systemHealth) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconActivity className="h-5 w-5 animate-pulse" />
                        Loading System Health...
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="animate-pulse">
                                <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
                                <div className="h-3 w-1/2 rounded bg-gray-200"></div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!systemHealth) return null;

    const criticalAlerts = systemHealth.alerts.filter(a => a.level === 'critical' && !a.resolved);
    const warningAlerts = systemHealth.alerts.filter(a => a.level === 'warning' && !a.resolved);
    const healthyServices = systemHealth.services.filter(s => s.state === 'CLOSED').length;
    const totalServices = systemHealth.services.length;

    return (
        <div className="space-y-6">
            {/* System Overview */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <IconActivity className="h-5 w-5" />
                            JetVision Integration Health Dashboard
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge
                                variant={
                                    systemHealth.overall === 'healthy'
                                        ? 'default'
                                        : systemHealth.overall === 'degraded'
                                          ? 'secondary'
                                          : 'destructive'
                                }
                                className="capitalize"
                            >
                                {systemHealth.overall}
                            </Badge>
                            <Button
                                variant="outlined"
                                size="sm"
                                onClick={fetchSystemHealth}
                                disabled={loading}
                                className="flex items-center gap-1"
                            >
                                <IconRefresh
                                    className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                                />
                                Refresh
                            </Button>
                        </div>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Last updated: {new Date(lastRefresh).toLocaleTimeString()} • Uptime:{' '}
                        {formatUptime((Date.now() - systemHealth.uptime) / 1000)}
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {healthyServices}
                            </div>
                            <div className="text-muted-foreground text-sm">Healthy Services</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                                {criticalAlerts.length}
                            </div>
                            <div className="text-muted-foreground text-sm">Critical Alerts</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {systemHealth.cacheStats.hitRate.toFixed(1)}%
                            </div>
                            <div className="text-muted-foreground text-sm">Cache Hit Rate</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {systemHealth.cacheStats.totalEntries.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground text-sm">Cache Entries</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Service Status Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {systemHealth.services.map(service => (
                    <Card key={service.serviceName}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <IconServer className="h-5 w-5" />
                                    {service.serviceName
                                        .replace('-', ' ')
                                        .replace(/\b\w/g, l => l.toUpperCase())}
                                </CardTitle>
                                <Badge className={getStatusColor(service.state)}>
                                    {getStatusIcon(service.state)}
                                    <span className="ml-1">{service.state}</span>
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Performance Metrics */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-muted-foreground flex items-center gap-1">
                                        <IconTrendingUp className="h-3 w-3" />
                                        Success Rate
                                    </div>
                                    <div className="font-semibold">
                                        {(
                                            (service.successCount / service.requestCount) *
                                            100
                                        ).toFixed(1)}
                                        %
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground flex items-center gap-1">
                                        <IconClock className="h-3 w-3" />
                                        Avg Response
                                    </div>
                                    <div className="font-semibold">
                                        {service.averageResponseTime}ms
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground flex items-center gap-1">
                                        <IconActivity className="h-3 w-3" />
                                        Total Requests
                                    </div>
                                    <div className="font-semibold">{service.requestCount}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground flex items-center gap-1">
                                        <IconAlert className="h-3 w-3" />
                                        Failures
                                    </div>
                                    <div className="font-semibold">{service.failureCount}</div>
                                </div>
                            </div>

                            {/* Uptime Progress Bar */}
                            <div>
                                <div className="mb-1 flex justify-between text-sm">
                                    <span>Uptime</span>
                                    <span>{service.uptime.toFixed(1)}%</span>
                                </div>
                                <Progress value={service.uptime} className="h-2" />
                            </div>

                            {/* Last Activity */}
                            <div className="text-muted-foreground text-xs">
                                {service.lastSuccessTime && (
                                    <div>
                                        Last success:{' '}
                                        {new Date(service.lastSuccessTime).toLocaleTimeString()}
                                    </div>
                                )}
                                {service.lastFailureTime && (
                                    <div>
                                        Last failure:{' '}
                                        {new Date(service.lastFailureTime).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outlined"
                                    size="sm"
                                    onClick={() =>
                                        handleServiceAction(service.serviceName, 'reset')
                                    }
                                    className="flex-1"
                                >
                                    Reset Circuit
                                </Button>
                                {onServiceAction && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            handleServiceAction(
                                                service.serviceName,
                                                service.state === 'OPEN'
                                                    ? 'force-close'
                                                    : 'force-open'
                                            )
                                        }
                                    >
                                        <IconSettings className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Active Alerts */}
            {systemHealth.alerts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <IconAlert className="h-5 w-5" />
                            Active Alerts
                            <Badge variant="destructive" className="ml-auto">
                                {systemHealth.alerts.filter(a => !a.resolved).length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {systemHealth.alerts
                                .filter(alert => !alert.resolved)
                                .sort((a, b) => b.timestamp - a.timestamp)
                                .map(alert => (
                                    <div
                                        key={alert.id}
                                        className={`rounded-lg border-l-4 p-3 ${
                                            alert.level === 'critical'
                                                ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
                                                : alert.level === 'warning'
                                                  ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                                                  : 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={
                                                            alert.level === 'critical'
                                                                ? 'destructive'
                                                                : alert.level === 'warning'
                                                                  ? 'secondary'
                                                                  : 'secondary'
                                                        }
                                                        className="text-xs"
                                                    >
                                                        {alert.level.toUpperCase()}
                                                    </Badge>
                                                    <span className="font-medium">
                                                        {alert.serviceName}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-sm">{alert.message}</p>
                                                <p className="text-muted-foreground mt-1 text-xs">
                                                    {new Date(alert.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Cache Performance */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconDatabase className="h-5 w-5" />
                        Cache Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">
                                {systemHealth.cacheStats.hitRate.toFixed(1)}%
                            </div>
                            <div className="text-muted-foreground text-sm">Hit Rate</div>
                            <Progress
                                value={systemHealth.cacheStats.hitRate}
                                className="mt-2 h-2"
                            />
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">
                                {systemHealth.cacheStats.averageResponseTime}ms
                            </div>
                            <div className="text-muted-foreground text-sm">Avg Response Time</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600">
                                {systemHealth.cacheStats.totalEntries.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground text-sm">Total Entries</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ServiceHealthDashboard;
