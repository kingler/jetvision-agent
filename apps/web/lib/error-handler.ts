/**
 * Comprehensive Error Handling and Logging System for JetVision API
 * Provides structured error handling, logging, and monitoring capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiErrorCode, ApiErrorResponse, AuthContext } from './api-types';

// ========================
// Error Types and Enums
// ========================

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    FATAL = 'fatal'
}

export enum ErrorCategory {
    VALIDATION = 'validation',
    AUTHENTICATION = 'authentication',
    AUTHORIZATION = 'authorization',
    EXTERNAL_API = 'external_api',
    DATABASE = 'database',
    NETWORK = 'network',
    BUSINESS_LOGIC = 'business_logic',
    SYSTEM = 'system',
    RATE_LIMIT = 'rate_limit',
    TIMEOUT = 'timeout'
}

export interface ErrorContext {
    requestId: string;
    userId?: string;
    endpoint: string;
    method: string;
    userAgent?: string;
    ip?: string;
    timestamp: string;
    parameters?: any;
    stackTrace?: string;
    additionalData?: Record<string, any>;
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    category?: ErrorCategory;
    context: ErrorContext;
    error?: Error;
    metadata?: Record<string, any>;
}

// ========================
// Custom Error Classes
// ========================

export class JetVisionError extends Error {
    public readonly code: ApiErrorCode;
    public readonly category: ErrorCategory;
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly context?: ErrorContext;
    public readonly retryable: boolean;

    constructor(
        message: string,
        code: ApiErrorCode,
        category: ErrorCategory,
        statusCode = 500,
        isOperational = true,
        retryable = false,
        context?: ErrorContext
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.category = category;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.retryable = retryable;
        this.context = context;

        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export class ValidationError extends JetVisionError {
    public readonly field?: string;
    public readonly value?: any;

    constructor(message: string, field?: string, value?: any, context?: ErrorContext) {
        super(message, 'VALIDATION_ERROR', ErrorCategory.VALIDATION, 400, true, false, context);
        this.field = field;
        this.value = value;
    }
}

export class AuthenticationError extends JetVisionError {
    constructor(message = 'Authentication required', context?: ErrorContext) {
        super(message, 'AUTH_REQUIRED', ErrorCategory.AUTHENTICATION, 401, true, false, context);
    }
}

export class AuthorizationError extends JetVisionError {
    public readonly requiredPermission?: string;

    constructor(message = 'Insufficient permissions', requiredPermission?: string, context?: ErrorContext) {
        super(message, 'PERMISSION_DENIED', ErrorCategory.AUTHORIZATION, 403, true, false, context);
        this.requiredPermission = requiredPermission;
    }
}

export class RateLimitError extends JetVisionError {
    public readonly limit: number;
    public readonly resetTime: number;

    constructor(message: string, limit: number, resetTime: number, context?: ErrorContext) {
        super(message, 'RATE_LIMIT_EXCEEDED', ErrorCategory.RATE_LIMIT, 429, true, true, context);
        this.limit = limit;
        this.resetTime = resetTime;
    }
}

export class ExternalAPIError extends JetVisionError {
    public readonly service: string;
    public readonly originalError?: Error;

    constructor(service: string, message: string, originalError?: Error, retryable = true, context?: ErrorContext) {
        super(`${service} API error: ${message}`, 'EXTERNAL_API_ERROR', ErrorCategory.EXTERNAL_API, 502, true, retryable, context);
        this.service = service;
        this.originalError = originalError;
    }
}

export class TimeoutError extends JetVisionError {
    public readonly timeoutMs: number;

    constructor(operation: string, timeoutMs: number, context?: ErrorContext) {
        super(`${operation} timed out after ${timeoutMs}ms`, 'TIMEOUT_ERROR', ErrorCategory.TIMEOUT, 408, true, true, context);
        this.timeoutMs = timeoutMs;
    }
}

// ========================
// Logger Implementation
// ========================

export class Logger {
    private static instance: Logger;
    private logBuffer: LogEntry[] = [];
    private readonly maxBufferSize = 1000;

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private constructor() {
        // Set up periodic log flushing in production
        if (process.env.NODE_ENV === 'production') {
            setInterval(() => this.flushLogs(), 30000); // Flush every 30 seconds
        }
    }

    log(level: LogLevel, message: string, context: ErrorContext, error?: Error, metadata?: Record<string, any>): void {
        const logEntry: LogEntry = {
            level,
            message,
            context,
            error,
            metadata,
            category: this.inferCategory(error)
        };

        // Add to buffer
        this.logBuffer.push(logEntry);
        
        // Trim buffer if too large
        if (this.logBuffer.length > this.maxBufferSize) {
            this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
        }

        // Console output for development
        if (process.env.NODE_ENV === 'development') {
            this.consoleOutput(logEntry);
        }

        // Send to external logging service in production
        if (process.env.NODE_ENV === 'production') {
            this.sendToExternalLogger(logEntry);
        }
    }

    debug(message: string, context: ErrorContext, metadata?: Record<string, any>): void {
        this.log(LogLevel.DEBUG, message, context, undefined, metadata);
    }

    info(message: string, context: ErrorContext, metadata?: Record<string, any>): void {
        this.log(LogLevel.INFO, message, context, undefined, metadata);
    }

    warn(message: string, context: ErrorContext, metadata?: Record<string, any>): void {
        this.log(LogLevel.WARN, message, context, undefined, metadata);
    }

    error(message: string, context: ErrorContext, error?: Error, metadata?: Record<string, any>): void {
        this.log(LogLevel.ERROR, message, context, error, metadata);
    }

    fatal(message: string, context: ErrorContext, error?: Error, metadata?: Record<string, any>): void {
        this.log(LogLevel.FATAL, message, context, error, metadata);
        this.flushLogs(); // Immediate flush for fatal errors
    }

    private inferCategory(error?: Error): ErrorCategory {
        if (!error) return ErrorCategory.SYSTEM;

        if (error instanceof ValidationError) return ErrorCategory.VALIDATION;
        if (error instanceof AuthenticationError) return ErrorCategory.AUTHENTICATION;
        if (error instanceof AuthorizationError) return ErrorCategory.AUTHORIZATION;
        if (error instanceof RateLimitError) return ErrorCategory.RATE_LIMIT;
        if (error instanceof ExternalAPIError) return ErrorCategory.EXTERNAL_API;
        if (error instanceof TimeoutError) return ErrorCategory.TIMEOUT;

        // Infer from error message
        const message = error.message.toLowerCase();
        if (message.includes('validation') || message.includes('invalid')) return ErrorCategory.VALIDATION;
        if (message.includes('auth') || message.includes('unauthorized')) return ErrorCategory.AUTHENTICATION;
        if (message.includes('permission') || message.includes('forbidden')) return ErrorCategory.AUTHORIZATION;
        if (message.includes('rate limit')) return ErrorCategory.RATE_LIMIT;
        if (message.includes('timeout')) return ErrorCategory.TIMEOUT;
        if (message.includes('network') || message.includes('connection')) return ErrorCategory.NETWORK;

        return ErrorCategory.SYSTEM;
    }

    private consoleOutput(entry: LogEntry): void {
        const timestamp = entry.context.timestamp;
        const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.context.requestId}]`;
        
        switch (entry.level) {
            case LogLevel.DEBUG:
                console.debug(`${prefix} ${entry.message}`, entry.metadata || '');
                break;
            case LogLevel.INFO:
                console.info(`${prefix} ${entry.message}`, entry.metadata || '');
                break;
            case LogLevel.WARN:
                console.warn(`${prefix} ${entry.message}`, entry.metadata || '');
                break;
            case LogLevel.ERROR:
            case LogLevel.FATAL:
                console.error(`${prefix} ${entry.message}`);
                if (entry.error) {
                    console.error('Stack trace:', entry.error.stack);
                }
                if (entry.metadata) {
                    console.error('Metadata:', entry.metadata);
                }
                break;
        }
    }

    private async sendToExternalLogger(entry: LogEntry): Promise<void> {
        // In production, send to external logging service like DataDog, Sentry, etc.
        try {
            // Example implementation - replace with actual service
            if (process.env.LOGGING_WEBHOOK_URL) {
                await fetch(process.env.LOGGING_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entry)
                }).catch(() => {}); // Silent fail for logging
            }
        } catch (error) {
            // Don't let logging errors affect the main application
            console.error('Failed to send log to external service:', error);
        }
    }

    private flushLogs(): void {
        // In production, batch send logs to external service
        if (this.logBuffer.length === 0) return;

        const logsToFlush = [...this.logBuffer];
        this.logBuffer = [];

        // Send to external service (implement based on your logging provider)
        this.batchSendLogs(logsToFlush);
    }

    private async batchSendLogs(logs: LogEntry[]): Promise<void> {
        if (process.env.BATCH_LOGGING_URL) {
            try {
                await fetch(process.env.BATCH_LOGGING_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ logs })
                }).catch(() => {});
            } catch (error) {
                console.error('Failed to batch send logs:', error);
            }
        }
    }

    getRecentLogs(level?: LogLevel, limit = 100): LogEntry[] {
        let filtered = this.logBuffer;
        
        if (level) {
            filtered = this.logBuffer.filter(entry => entry.level === level);
        }

        return filtered.slice(-limit);
    }
}

// ========================
// Error Handler Implementation
// ========================

export class ErrorHandler {
    private static instance: ErrorHandler;
    private logger: Logger;

    static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    private constructor() {
        this.logger = Logger.getInstance();
    }

    /**
     * Handle errors and convert to API response
     */
    handleError(
        error: Error | JetVisionError,
        context: ErrorContext
    ): NextResponse<ApiErrorResponse> {
        let statusCode = 500;
        let errorCode: ApiErrorCode = 'INTERNAL_ERROR';
        let message = 'An internal server error occurred';
        let details: any = undefined;

        if (error instanceof JetVisionError) {
            statusCode = error.statusCode;
            errorCode = error.code;
            message = error.message;
            
            if (error instanceof ValidationError) {
                details = { field: error.field, value: error.value };
            } else if (error instanceof AuthorizationError) {
                details = { requiredPermission: error.requiredPermission };
            } else if (error instanceof RateLimitError) {
                details = { limit: error.limit, resetTime: error.resetTime };
            } else if (error instanceof ExternalAPIError) {
                details = { service: error.service };
            } else if (error instanceof TimeoutError) {
                details = { timeoutMs: error.timeoutMs };
            }
        } else {
            // Handle standard errors
            message = process.env.NODE_ENV === 'development' ? error.message : message;
        }

        // Log the error
        this.logger.error(message, context, error, { statusCode, errorCode, details });

        // Create API error response
        const errorResponse: ApiErrorResponse = {
            success: false,
            error: message,
            code: errorCode,
            details,
            timestamp: new Date().toISOString(),
            requestId: context.requestId
        };

        // Add retry information for retryable errors
        const headers: Record<string, string> = {};
        
        if (error instanceof RateLimitError) {
            headers['Retry-After'] = Math.ceil((error.resetTime - Date.now()) / 1000).toString();
        }

        if (error instanceof JetVisionError && error.retryable) {
            headers['X-Retryable'] = 'true';
        }

        return NextResponse.json(errorResponse, { status: statusCode, headers });
    }

    /**
     * Create error context from request
     */
    createErrorContext(
        request: NextRequest,
        authContext?: AuthContext,
        additionalData?: Record<string, any>
    ): ErrorContext {
        const requestId = this.generateRequestId();
        const url = new URL(request.url);

        return {
            requestId,
            userId: authContext?.user?.userId,
            endpoint: url.pathname,
            method: request.method,
            userAgent: request.headers.get('user-agent') || undefined,
            ip: this.getClientIP(request),
            timestamp: new Date().toISOString(),
            parameters: {
                query: Object.fromEntries(url.searchParams),
                headers: Object.fromEntries(request.headers)
            },
            additionalData
        };
    }

    /**
     * Wrap async handler with error handling
     */
    wrapHandler<T>(
        handler: (request: NextRequest, context: ErrorContext) => Promise<NextResponse<T>>
    ) {
        return async (request: NextRequest, authContext?: AuthContext): Promise<NextResponse<T | ApiErrorResponse>> => {
            const errorContext = this.createErrorContext(request, authContext);
            
            try {
                // Log request start
                this.logger.info(`Request started: ${request.method} ${errorContext.endpoint}`, errorContext, {
                    userId: errorContext.userId,
                    userAgent: errorContext.userAgent
                });

                const response = await handler(request, errorContext);

                // Log successful request
                this.logger.info(`Request completed: ${request.method} ${errorContext.endpoint}`, errorContext, {
                    statusCode: response.status
                });

                return response;

            } catch (error) {
                return this.handleError(error as Error, errorContext);
            }
        };
    }

    /**
     * Generate unique request ID
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Extract client IP from request
     */
    private getClientIP(request: NextRequest): string | undefined {
        const headers = [
            'x-forwarded-for',
            'x-real-ip',
            'x-client-ip',
            'cf-connecting-ip',
            'x-vercel-forwarded-for'
        ];

        for (const header of headers) {
            const value = request.headers.get(header);
            if (value) {
                return value.split(',')[0].trim();
            }
        }

        return undefined;
    }
}

// ========================
// Utility Functions
// ========================

/**
 * Assert condition and throw validation error if false
 */
export function assert(condition: any, message: string, field?: string, value?: any): asserts condition {
    if (!condition) {
        throw new ValidationError(message, field, value);
    }
}

/**
 * Require authentication
 */
export function requireAuth(authContext?: AuthContext): asserts authContext is AuthContext {
    if (!authContext?.user?.userId) {
        throw new AuthenticationError();
    }
}

/**
 * Require specific permission
 */
export function requirePermission(authContext: AuthContext, permission: string): void {
    if (!authContext.canAccess(permission)) {
        throw new AuthorizationError(`Permission required: ${permission}`, permission);
    }
}

/**
 * Validate input against schema
 */
export function validateInput<T>(input: any, validator: (input: any) => T, fieldName?: string): T {
    try {
        return validator(input);
    } catch (error) {
        throw new ValidationError(
            `Invalid ${fieldName || 'input'}: ${error instanceof Error ? error.message : 'validation failed'}`,
            fieldName,
            input
        );
    }
}

/**
 * Wrap external API calls with error handling
 */
export async function withExternalAPI<T>(
    serviceName: string,
    operation: () => Promise<T>,
    retryable = true
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        throw new ExternalAPIError(
            serviceName,
            error instanceof Error ? error.message : 'Unknown error',
            error instanceof Error ? error : undefined,
            retryable
        );
    }
}

/**
 * Add timeout to async operations
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName = 'Operation'
): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new TimeoutError(operationName, timeoutMs)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
}

// ========================
// Export Everything
// ========================

export {
    Logger,
    ErrorHandler
    // All error classes are already exported as classes above
};

// Default export
export default {
    Logger: Logger.getInstance(),
    ErrorHandler: ErrorHandler.getInstance(),
    JetVisionError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    RateLimitError,
    ExternalAPIError,
    TimeoutError,
    assert,
    requireAuth,
    requirePermission,
    validateInput,
    withExternalAPI,
    withTimeout
};