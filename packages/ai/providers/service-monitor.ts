/**
 * Service Monitor for JetVision Integration Architecture
 *
 * Provides real-time monitoring, alerting, and automated recovery
 * for all integration services with comprehensive metrics tracking.
 */

import { circuitBreakerManager, ServiceHealth } from './circuit-breaker';
import { multiTierCacheManager } from './cache-manager';

export interface ServiceAlert {
    id: string;
    serviceName: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: number;
    resolved: boolean;
    metadata?: Record<string, any>;
}

export interface ServiceMetrics {
    serviceName: string;
    uptime: number;
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    successRate: number;
    lastError?: {
        message: string;
        timestamp: number;
    };
}

export interface SystemHealth {
    overall: 'healthy' | 'degraded' | 'critical';
    services: ServiceHealth[];
    alerts: ServiceAlert[];
    metrics: ServiceMetrics[];
    cacheStats: {
        totalEntries: number;
        hitRate: number;
        averageResponseTime: number;
    };
    uptime: number;
    lastUpdate: number;
}

export interface MonitoringConfig {
    checkInterval: number; // Health check interval in ms
    alertThresholds: {
        errorRate: number; // Percentage (0-100)
        responseTime: number; // Milliseconds
        downtime: number; // Milliseconds
    };
    enableAlerting: boolean;
    enableAutoRecovery: boolean;
    retentionPeriod: number; // How long to keep metrics (ms)
}

export class ServiceMonitor {
    private alerts: ServiceAlert[] = [];
    private metrics: Map<string, ServiceMetrics> = new Map();
    private monitoringTimer?: NodeJS.Timeout;
    private startTime: number;
    private isRunning = false;

    constructor(private config: MonitoringConfig) {
        this.startTime = Date.now();
        console.log('🔍 Service Monitor initialized');
    }

    /**
     * Start monitoring services
     */
    start(): void {
        if (this.isRunning) {
            console.log('⚠️ Service Monitor already running');
            return;
        }

        this.isRunning = true;
        this.monitoringTimer = setInterval(() => {
            this.performHealthChecks();
        }, this.config.checkInterval);

        // Perform initial health check
        this.performHealthChecks();

        console.log(`🟢 Service Monitor started (${this.config.checkInterval / 1000}s interval)`);
    }

    /**
     * Stop monitoring services
     */
    stop(): void {
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = undefined;
        }

        this.isRunning = false;
        console.log('🔴 Service Monitor stopped');
    }

    /**
     * Get current system health status
     */
    getSystemHealth(): SystemHealth {
        const services = circuitBreakerManager.getAllServiceHealth();
        const cacheStats = multiTierCacheManager.getAggregatedStats();

        // Determine overall health
        const criticalServices = services.filter(s => s.state === 'OPEN').length;
        const healthyServices = services.filter(s => s.state === 'CLOSED').length;

        let overall: SystemHealth['overall'] = 'healthy';
        if (criticalServices > 0) {
            overall = healthyServices === 0 ? 'critical' : 'degraded';
        }

        return {
            overall,
            services,
            alerts: this.alerts.filter(a => !a.resolved).slice(-50), // Last 50 unresolved alerts
            metrics: Array.from(this.metrics.values()),
            cacheStats: {
                totalEntries: cacheStats.totalEntries,
                hitRate: cacheStats.overallHitRate,
                averageResponseTime: cacheStats.averageResponseTime,
            },
            uptime: Date.now() - this.startTime,
            lastUpdate: Date.now(),
        };
    }

    /**
     * Get alerts for a specific service
     */
    getServiceAlerts(serviceName: string, includeResolved = false): ServiceAlert[] {
        return this.alerts.filter(
            alert => alert.serviceName === serviceName && (includeResolved || !alert.resolved)
        );
    }

    /**
     * Get all alerts
     */
    getAllAlerts(includeResolved = false): ServiceAlert[] {
        return includeResolved ? this.alerts : this.alerts.filter(a => !a.resolved);
    }

    /**
     * Get metrics for a specific service
     */
    getServiceMetrics(serviceName: string): ServiceMetrics | null {
        return this.metrics.get(serviceName) || null;
    }

    /**
     * Manually trigger health check
     */
    async triggerHealthCheck(): Promise<SystemHealth> {
        await this.performHealthChecks();
        return this.getSystemHealth();
    }

    /**
     * Add custom alert
     */
    addAlert(
        serviceName: string,
        level: ServiceAlert['level'],
        message: string,
        metadata?: Record<string, any>
    ): string {
        const alert: ServiceAlert = {
            id: this.generateAlertId(),
            serviceName,
            level,
            message,
            timestamp: Date.now(),
            resolved: false,
            metadata,
        };

        this.alerts.push(alert);
        this.cleanupOldAlerts();

        console.log(`🚨 Alert [${level.toUpperCase()}] ${serviceName}: ${message}`);

        return alert.id;
    }

    /**
     * Resolve alert
     */
    resolveAlert(alertId: string): boolean {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            console.log(`✅ Alert resolved: ${alert.message}`);
            return true;
        }
        return false;
    }

    /**
     * Clear all resolved alerts
     */
    clearResolvedAlerts(): number {
        const initialCount = this.alerts.length;
        this.alerts = this.alerts.filter(a => !a.resolved);
        const clearedCount = initialCount - this.alerts.length;

        if (clearedCount > 0) {
            console.log(`🗑️ Cleared ${clearedCount} resolved alerts`);
        }

        return clearedCount;
    }

    /**
     * Get service status summary for dashboard
     */
    getStatusSummary(): {
        totalServices: number;
        healthyServices: number;
        degradedServices: number;
        downServices: number;
        criticalAlerts: number;
        warningAlerts: number;
    } {
        const services = circuitBreakerManager.getAllServiceHealth();
        const unresolvedAlerts = this.alerts.filter(a => !a.resolved);

        return {
            totalServices: services.length,
            healthyServices: services.filter(s => s.state === 'CLOSED').length,
            degradedServices: services.filter(s => s.state === 'HALF_OPEN').length,
            downServices: services.filter(s => s.state === 'OPEN').length,
            criticalAlerts: unresolvedAlerts.filter(a => a.level === 'critical').length,
            warningAlerts: unresolvedAlerts.filter(a => a.level === 'warning').length,
        };
    }

    /**
     * Perform health checks on all services
     */
    private async performHealthChecks(): Promise<void> {
        const services = circuitBreakerManager.getAllServiceHealth();
        const timestamp = Date.now();

        for (const service of services) {
            this.updateServiceMetrics(service, timestamp);
            this.checkServiceThresholds(service);
        }

        this.checkSystemHealth();
        this.attemptAutoRecovery();
        this.cleanupOldData();
    }

    /**
     * Update metrics for a service
     */
    private updateServiceMetrics(service: ServiceHealth, timestamp: number): void {
        const existingMetrics = this.metrics.get(service.serviceName);

        const metrics: ServiceMetrics = {
            serviceName: service.serviceName,
            uptime: service.uptime,
            requestCount: service.requestCount,
            errorCount: service.failureCount,
            averageResponseTime: service.averageResponseTime,
            successRate:
                service.requestCount > 0
                    ? ((service.requestCount - service.failureCount) / service.requestCount) * 100
                    : 100,
            lastError: existingMetrics?.lastError,
        };

        // Update last error if there are new failures
        if (
            service.lastFailureTime &&
            (!existingMetrics?.lastError ||
                service.lastFailureTime > existingMetrics.lastError.timestamp)
        ) {
            metrics.lastError = {
                message: `Service failure detected`,
                timestamp: service.lastFailureTime,
            };
        }

        this.metrics.set(service.serviceName, metrics);
    }

    /**
     * Check service thresholds and create alerts
     */
    private checkServiceThresholds(service: ServiceHealth): void {
        const metrics = this.metrics.get(service.serviceName);
        if (!metrics) return;

        // Check error rate threshold
        if (metrics.successRate < 100 - this.config.alertThresholds.errorRate) {
            const existingAlert = this.alerts.find(
                a =>
                    a.serviceName === service.serviceName &&
                    a.message.includes('error rate') &&
                    !a.resolved
            );

            if (!existingAlert) {
                this.addAlert(
                    service.serviceName,
                    'warning',
                    `High error rate: ${(100 - metrics.successRate).toFixed(1)}%`,
                    {
                        errorRate: 100 - metrics.successRate,
                        threshold: this.config.alertThresholds.errorRate,
                    }
                );
            }
        }

        // Check response time threshold
        if (metrics.averageResponseTime > this.config.alertThresholds.responseTime) {
            const existingAlert = this.alerts.find(
                a =>
                    a.serviceName === service.serviceName &&
                    a.message.includes('response time') &&
                    !a.resolved
            );

            if (!existingAlert) {
                this.addAlert(
                    service.serviceName,
                    'warning',
                    `High response time: ${metrics.averageResponseTime.toFixed(0)}ms`,
                    {
                        responseTime: metrics.averageResponseTime,
                        threshold: this.config.alertThresholds.responseTime,
                    }
                );
            }
        }

        // Check if service is down
        if (service.state === 'OPEN') {
            const downtime = service.lastFailureTime ? Date.now() - service.lastFailureTime : 0;

            if (downtime > this.config.alertThresholds.downtime) {
                const existingAlert = this.alerts.find(
                    a =>
                        a.serviceName === service.serviceName &&
                        a.message.includes('service down') &&
                        !a.resolved
                );

                if (!existingAlert) {
                    this.addAlert(
                        service.serviceName,
                        'critical',
                        `Service down for ${Math.floor(downtime / 1000)}s`,
                        { downtime, threshold: this.config.alertThresholds.downtime }
                    );
                }
            }
        } else {
            // Resolve service down alerts if service is now healthy
            const downAlerts = this.alerts.filter(
                a =>
                    a.serviceName === service.serviceName &&
                    a.message.includes('service down') &&
                    !a.resolved
            );

            downAlerts.forEach(alert => {
                this.resolveAlert(alert.id);
                this.addAlert(
                    service.serviceName,
                    'info',
                    'Service recovered and is now operational',
                    { recoveredAt: Date.now() }
                );
            });
        }
    }

    /**
     * Check overall system health
     */
    private checkSystemHealth(): void {
        const systemHealth = this.getSystemHealth();

        if (systemHealth.overall === 'critical') {
            const existingAlert = this.alerts.find(
                a =>
                    a.serviceName === 'system' &&
                    a.message.includes('critical state') &&
                    !a.resolved
            );

            if (!existingAlert) {
                this.addAlert(
                    'system',
                    'critical',
                    'System in critical state - multiple services down',
                    { downServices: systemHealth.services.filter(s => s.state === 'OPEN').length }
                );
            }
        }
    }

    /**
     * Attempt automatic recovery for failed services
     */
    private attemptAutoRecovery(): void {
        if (!this.config.enableAutoRecovery) return;

        const failedServices = circuitBreakerManager
            .getAllServiceHealth()
            .filter(s => s.state === 'OPEN');

        for (const service of failedServices) {
            // Only attempt recovery if service has been down for a reasonable time
            const downtime = service.lastFailureTime ? Date.now() - service.lastFailureTime : 0;

            if (downtime > 60000) {
                // 1 minute
                console.log(`🔄 Attempting auto-recovery for ${service.serviceName}`);

                // Reset circuit breaker to allow recovery attempts
                if (circuitBreakerManager.resetService(service.serviceName)) {
                    this.addAlert(
                        service.serviceName,
                        'info',
                        'Auto-recovery attempted - circuit breaker reset',
                        { recoveryAttemptAt: Date.now(), downtime }
                    );
                }
            }
        }
    }

    /**
     * Generate unique alert ID
     */
    private generateAlertId(): string {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clean up old alerts beyond retention period
     */
    private cleanupOldAlerts(): void {
        const cutoffTime = Date.now() - this.config.retentionPeriod;
        const initialCount = this.alerts.length;

        this.alerts = this.alerts.filter(alert => alert.timestamp > cutoffTime || !alert.resolved);

        const cleanedCount = initialCount - this.alerts.length;
        if (cleanedCount > 0) {
            console.log(`🗑️ Cleaned up ${cleanedCount} old alerts`);
        }
    }

    /**
     * Clean up old metrics and data
     */
    private cleanupOldData(): void {
        // Clean cache expired entries
        multiTierCacheManager.clearAllExpired();

        // Additional cleanup can be added here for metrics data
    }

    /**
     * Get monitoring statistics
     */
    getMonitoringStats(): {
        isRunning: boolean;
        uptime: number;
        totalAlerts: number;
        resolvedAlerts: number;
        servicesMonitored: number;
        lastHealthCheck: number;
    } {
        return {
            isRunning: this.isRunning,
            uptime: Date.now() - this.startTime,
            totalAlerts: this.alerts.length,
            resolvedAlerts: this.alerts.filter(a => a.resolved).length,
            servicesMonitored: this.metrics.size,
            lastHealthCheck: Date.now(),
        };
    }

    /**
     * Export metrics for external monitoring systems
     */
    exportMetrics(): {
        timestamp: number;
        services: Record<string, any>;
        system: {
            overall_health: string;
            uptime: number;
            total_alerts: number;
            cache_hit_rate: number;
        };
    } {
        const systemHealth = this.getSystemHealth();
        const services: Record<string, any> = {};

        for (const service of systemHealth.services) {
            const metrics = this.metrics.get(service.serviceName);
            services[service.serviceName] = {
                state: service.state,
                uptime: service.uptime,
                request_count: service.requestCount,
                failure_count: service.failureCount,
                success_rate: metrics?.successRate || 0,
                avg_response_time: service.averageResponseTime,
                last_failure: service.lastFailureTime,
                last_success: service.lastSuccessTime,
            };
        }

        return {
            timestamp: Date.now(),
            services,
            system: {
                overall_health: systemHealth.overall,
                uptime: systemHealth.uptime,
                total_alerts: systemHealth.alerts.length,
                cache_hit_rate: systemHealth.cacheStats.hitRate,
            },
        };
    }
}

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
    checkInterval: 30000, // 30 seconds
    alertThresholds: {
        errorRate: 10, // 10% error rate
        responseTime: 5000, // 5 seconds
        downtime: 60000, // 1 minute
    },
    enableAlerting: true,
    enableAutoRecovery: true,
    retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Global service monitor instance
 */
export const serviceMonitor = new ServiceMonitor(DEFAULT_MONITORING_CONFIG);
