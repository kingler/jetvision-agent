/**
 * Integration Logger for JetVision Services
 *
 * Provides comprehensive logging for debugging integration issues,
 * tracking request flows, and maintaining audit trails.
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    CRITICAL = 4,
}

export interface LogEntry {
    id: string;
    timestamp: number;
    level: LogLevel;
    category: string;
    message: string;
    service?: string;
    requestId?: string;
    userId?: string;
    metadata?: Record<string, any>;
    stackTrace?: string;
    duration?: number;
}

export interface LogFilter {
    level?: LogLevel;
    category?: string;
    service?: string;
    requestId?: string;
    startTime?: number;
    endTime?: number;
    searchText?: string;
}

export interface LoggerConfig {
    level: LogLevel;
    enableConsole: boolean;
    enableFileLogging: boolean;
    enableStructuredLogging: boolean;
    maxLogEntries: number;
    categories: string[];
    services: string[];
}

export class IntegrationLogger {
    private logs: LogEntry[] = [];
    private logCounter = 0;

    constructor(private config: LoggerConfig) {
        this.log(LogLevel.INFO, 'system', 'Integration Logger initialized', {
            config: {
                level: LogLevel[config.level],
                enableConsole: config.enableConsole,
                maxEntries: config.maxLogEntries,
            },
        });
    }

    /**
     * Log debug message
     */
    debug(
        category: string,
        message: string,
        metadata?: Record<string, any>,
        requestId?: string
    ): string {
        return this.log(LogLevel.DEBUG, category, message, metadata, requestId);
    }

    /**
     * Log info message
     */
    info(
        category: string,
        message: string,
        metadata?: Record<string, any>,
        requestId?: string
    ): string {
        return this.log(LogLevel.INFO, category, message, metadata, requestId);
    }

    /**
     * Log warning message
     */
    warn(
        category: string,
        message: string,
        metadata?: Record<string, any>,
        requestId?: string
    ): string {
        return this.log(LogLevel.WARN, category, message, metadata, requestId);
    }

    /**
     * Log error message
     */
    error(
        category: string,
        message: string,
        error?: Error,
        metadata?: Record<string, any>,
        requestId?: string
    ): string {
        const logMetadata = {
            ...metadata,
            ...(error && {
                errorName: error.name,
                errorMessage: error.message,
                errorStack: error.stack,
            }),
        };

        return this.log(LogLevel.ERROR, category, message, logMetadata, requestId, error?.stack);
    }

    /**
     * Log critical message
     */
    critical(
        category: string,
        message: string,
        error?: Error,
        metadata?: Record<string, any>,
        requestId?: string
    ): string {
        const logMetadata = {
            ...metadata,
            ...(error && {
                errorName: error.name,
                errorMessage: error.message,
                errorStack: error.stack,
            }),
        };

        return this.log(LogLevel.CRITICAL, category, message, logMetadata, requestId, error?.stack);
    }

    /**
     * Log request start
     */
    startRequest(
        category: string,
        operation: string,
        metadata?: Record<string, any>
    ): {
        requestId: string;
        startTime: number;
        complete: (success: boolean, result?: any, error?: Error) => void;
    } {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        this.info(
            category,
            `🚀 Starting ${operation}`,
            {
                ...metadata,
                operation,
                startTime,
            },
            requestId
        );

        return {
            requestId,
            startTime,
            complete: (success: boolean, result?: any, error?: Error) => {
                const duration = Date.now() - startTime;
                const level = success ? LogLevel.INFO : LogLevel.ERROR;
                const status = success ? '✅' : '❌';

                this.log(
                    level,
                    category,
                    `${status} Completed ${operation}`,
                    {
                        ...metadata,
                        operation,
                        success,
                        duration: `${duration}ms`,
                        ...(result && { result: this.sanitizeForLog(result) }),
                        ...(error && { error: error.message }),
                    },
                    requestId,
                    error?.stack,
                    duration
                );
            },
        };
    }

    /**
     * Log API request/response
     */
    logApiCall(
        service: string,
        method: string,
        url: string,
        requestBody?: any,
        responseStatus?: number,
        responseBody?: any,
        duration?: number,
        requestId?: string
    ): string {
        const success = responseStatus ? responseStatus < 400 : false;
        const level = success ? LogLevel.INFO : LogLevel.ERROR;
        const status = success ? '✅' : '❌';

        return this.log(
            level,
            'api-call',
            `${status} ${method} ${url}`,
            {
                service,
                method,
                url,
                requestBody: this.sanitizeForLog(requestBody),
                responseStatus,
                responseBody: this.sanitizeForLog(responseBody),
                duration: duration ? `${duration}ms` : undefined,
            },
            requestId,
            undefined,
            duration
        );
    }

    /**
     * Log circuit breaker state change
     */
    logCircuitBreakerEvent(
        service: string,
        oldState: string,
        newState: string,
        reason: string,
        metadata?: Record<string, any>,
        requestId?: string
    ): string {
        const level =
            newState === 'OPEN'
                ? LogLevel.WARN
                : newState === 'CLOSED'
                  ? LogLevel.INFO
                  : LogLevel.DEBUG;

        return this.log(
            level,
            'circuit-breaker',
            `Circuit breaker ${service}: ${oldState} → ${newState}`,
            {
                service,
                oldState,
                newState,
                reason,
                ...metadata,
            },
            requestId
        );
    }

    /**
     * Log cache operation
     */
    logCacheOperation(
        operation: 'hit' | 'miss' | 'set' | 'delete' | 'clear',
        cacheType: string,
        key?: string,
        ttl?: number,
        metadata?: Record<string, any>,
        requestId?: string
    ): string {
        const emoji = {
            hit: '⚡',
            miss: '❌',
            set: '💾',
            delete: '🗑️',
            clear: '🧹',
        };

        return this.debug(
            'cache',
            `${emoji[operation]} Cache ${operation} - ${cacheType}`,
            {
                operation,
                cacheType,
                key: key ? this.sanitizeKey(key) : undefined,
                ttl,
                ...metadata,
            },
            requestId
        );
    }

    /**
     * Log fallback activation
     */
    logFallbackActivation(
        primaryService: string,
        fallbackService: string,
        reason: string,
        metadata?: Record<string, any>,
        requestId?: string
    ): string {
        return this.warn(
            'fallback',
            `🔄 Fallback activated: ${primaryService} → ${fallbackService}`,
            {
                primaryService,
                fallbackService,
                reason,
                ...metadata,
            },
            requestId
        );
    }

    /**
     * Log service recovery
     */
    logServiceRecovery(
        service: string,
        downtime: number,
        metadata?: Record<string, any>,
        requestId?: string
    ): string {
        return this.info(
            'recovery',
            `🟢 Service recovered: ${service}`,
            {
                service,
                downtime: `${Math.floor(downtime / 1000)}s`,
                ...metadata,
            },
            requestId
        );
    }

    /**
     * Get logs with optional filtering
     */
    getLogs(filter?: LogFilter, limit?: number): LogEntry[] {
        let filteredLogs = this.logs;

        if (filter) {
            filteredLogs = this.logs.filter(log => {
                if (filter.level !== undefined && log.level < filter.level) return false;
                if (filter.category && log.category !== filter.category) return false;
                if (filter.service && log.service !== filter.service) return false;
                if (filter.requestId && log.requestId !== filter.requestId) return false;
                if (filter.startTime && log.timestamp < filter.startTime) return false;
                if (filter.endTime && log.timestamp > filter.endTime) return false;
                if (
                    filter.searchText &&
                    !log.message.toLowerCase().includes(filter.searchText.toLowerCase()) &&
                    !JSON.stringify(log.metadata || {})
                        .toLowerCase()
                        .includes(filter.searchText.toLowerCase())
                )
                    return false;

                return true;
            });
        }

        // Sort by timestamp (newest first)
        filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

        return limit ? filteredLogs.slice(0, limit) : filteredLogs;
    }

    /**
     * Get logs for specific request ID
     */
    getRequestLogs(requestId: string): LogEntry[] {
        return this.getLogs({ requestId });
    }

    /**
     * Get error logs
     */
    getErrorLogs(hours?: number): LogEntry[] {
        const filter: LogFilter = { level: LogLevel.ERROR };

        if (hours) {
            filter.startTime = Date.now() - hours * 60 * 60 * 1000;
        }

        return this.getLogs(filter);
    }

    /**
     * Get service logs
     */
    getServiceLogs(service: string, hours?: number): LogEntry[] {
        const filter: LogFilter = { service };

        if (hours) {
            filter.startTime = Date.now() - hours * 60 * 60 * 1000;
        }

        return this.getLogs(filter);
    }

    /**
     * Get performance metrics from logs
     */
    getPerformanceMetrics(
        service?: string,
        hours = 1
    ): {
        avgResponseTime: number;
        totalRequests: number;
        errorRate: number;
        slowRequests: number;
        requestsPerMinute: number;
    } {
        const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
        const relevantLogs = this.logs.filter(
            log =>
                log.timestamp >= cutoffTime &&
                log.duration !== undefined &&
                (service ? log.service === service : true)
        );

        if (relevantLogs.length === 0) {
            return {
                avgResponseTime: 0,
                totalRequests: 0,
                errorRate: 0,
                slowRequests: 0,
                requestsPerMinute: 0,
            };
        }

        const totalRequests = relevantLogs.length;
        const errorRequests = relevantLogs.filter(log => log.level >= LogLevel.ERROR).length;
        const slowRequests = relevantLogs.filter(log => (log.duration || 0) > 2000).length;
        const avgResponseTime =
            relevantLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / totalRequests;
        const requestsPerMinute = totalRequests / hours / 60;

        return {
            avgResponseTime: Math.round(avgResponseTime),
            totalRequests,
            errorRate: (errorRequests / totalRequests) * 100,
            slowRequests,
            requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
        };
    }

    /**
     * Export logs as JSON
     */
    exportLogs(filter?: LogFilter): string {
        const logs = this.getLogs(filter);
        return JSON.stringify(
            {
                exportTime: new Date().toISOString(),
                totalLogs: logs.length,
                logs: logs.map(log => ({
                    ...log,
                    timestamp: new Date(log.timestamp).toISOString(),
                    level: LogLevel[log.level],
                })),
            },
            null,
            2
        );
    }

    /**
     * Clear logs
     */
    clearLogs(olderThan?: number): number {
        const cutoffTime = olderThan || Date.now() - 24 * 60 * 60 * 1000; // Default 24 hours
        const initialCount = this.logs.length;

        this.logs = this.logs.filter(log => log.timestamp > cutoffTime);
        const clearedCount = initialCount - this.logs.length;

        if (clearedCount > 0) {
            this.info('system', `🗑️ Cleared ${clearedCount} old log entries`);
        }

        return clearedCount;
    }

    /**
     * Get logging statistics
     */
    getStats(): {
        totalLogs: number;
        logsByLevel: Record<string, number>;
        logsByCategory: Record<string, number>;
        logsByService: Record<string, number>;
        oldestLog?: number;
        newestLog?: number;
    } {
        const logsByLevel: Record<string, number> = {};
        const logsByCategory: Record<string, number> = {};
        const logsByService: Record<string, number> = {};

        for (const log of this.logs) {
            const levelName = LogLevel[log.level];
            logsByLevel[levelName] = (logsByLevel[levelName] || 0) + 1;
            logsByCategory[log.category] = (logsByCategory[log.category] || 0) + 1;

            if (log.service) {
                logsByService[log.service] = (logsByService[log.service] || 0) + 1;
            }
        }

        const timestamps = this.logs.map(log => log.timestamp);

        return {
            totalLogs: this.logs.length,
            logsByLevel,
            logsByCategory,
            logsByService,
            oldestLog: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
            newestLog: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
        };
    }

    /**
     * Core logging method
     */
    private log(
        level: LogLevel,
        category: string,
        message: string,
        metadata?: Record<string, any>,
        requestId?: string,
        stackTrace?: string,
        duration?: number
    ): string {
        if (level < this.config.level) {
            return '';
        }

        const logId = this.generateLogId();
        const entry: LogEntry = {
            id: logId,
            timestamp: Date.now(),
            level,
            category,
            message,
            service: metadata?.service,
            requestId,
            metadata,
            stackTrace,
            duration,
        };

        // Add to internal log storage
        this.logs.push(entry);
        this.trimLogs();

        // Console logging if enabled
        if (this.config.enableConsole) {
            this.logToConsole(entry);
        }

        // Structured logging for external systems
        if (this.config.enableStructuredLogging) {
            this.logStructured(entry);
        }

        return logId;
    }

    /**
     * Log to console with appropriate formatting
     */
    private logToConsole(entry: LogEntry): void {
        const timestamp = new Date(entry.timestamp).toISOString();
        const levelName = LogLevel[entry.level].padEnd(8);
        const category = entry.category.padEnd(15);
        const prefix = `[${timestamp}] ${levelName} ${category}`;

        const logMessage = `${prefix} ${entry.message}`;

        // Add metadata if present
        const metadataStr = entry.metadata ? `\n${JSON.stringify(entry.metadata, null, 2)}` : '';

        const fullMessage = `${logMessage}${metadataStr}`;

        switch (entry.level) {
            case LogLevel.DEBUG:
                console.debug(fullMessage);
                break;
            case LogLevel.INFO:
                console.info(fullMessage);
                break;
            case LogLevel.WARN:
                console.warn(fullMessage);
                break;
            case LogLevel.ERROR:
            case LogLevel.CRITICAL:
                console.error(fullMessage);
                if (entry.stackTrace) {
                    console.error(entry.stackTrace);
                }
                break;
        }
    }

    /**
     * Log structured data for external monitoring systems
     */
    private logStructured(entry: LogEntry): void {
        const structured = {
            '@timestamp': new Date(entry.timestamp).toISOString(),
            level: LogLevel[entry.level],
            category: entry.category,
            message: entry.message,
            service: entry.service,
            request_id: entry.requestId,
            duration: entry.duration,
            ...entry.metadata,
        };

        // This would typically send to external logging service
        // For now, we'll just mark it as structured
        console.log('STRUCTURED:', JSON.stringify(structured));
    }

    /**
     * Trim logs to stay within max entries limit
     */
    private trimLogs(): void {
        if (this.logs.length > this.config.maxLogEntries) {
            const excessLogs = this.logs.length - this.config.maxLogEntries;
            this.logs.splice(0, excessLogs);
        }
    }

    /**
     * Generate unique log ID
     */
    private generateLogId(): string {
        return `log_${Date.now()}_${(++this.logCounter).toString().padStart(6, '0')}`;
    }

    /**
     * Generate unique request ID
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sanitize data for logging (remove sensitive information)
     */
    private sanitizeForLog(data: any): any {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const sensitiveKeys = ['password', 'apikey', 'api_key', 'token', 'secret', 'authorization'];
        const sanitized = { ...data };

        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof sanitized[key] === 'object') {
                sanitized[key] = this.sanitizeForLog(sanitized[key]);
            }
        }

        return sanitized;
    }

    /**
     * Sanitize cache key for logging
     */
    private sanitizeKey(key: string): string {
        // Truncate very long keys
        return key.length > 100 ? key.substring(0, 97) + '...' : key;
    }
}

/**
 * Default logger configuration
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
    level: LogLevel.INFO,
    enableConsole: true,
    enableFileLogging: false,
    enableStructuredLogging: false,
    maxLogEntries: 10000,
    categories: [
        'system',
        'api-call',
        'circuit-breaker',
        'cache',
        'fallback',
        'recovery',
        'n8n',
        'apollo',
        'avinode',
        'llm',
    ],
    services: ['n8n-primary', 'apollo-direct', 'avinode-direct', 'llm-provider'],
};

/**
 * Global integration logger instance
 */
export const integrationLogger = new IntegrationLogger(DEFAULT_LOGGER_CONFIG);
