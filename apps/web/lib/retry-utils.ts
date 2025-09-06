/**
 * Enhanced retry utility with exponential backoff and error categorization
 */

export interface RetryOptions {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
    jitter: boolean;
    retryCondition?: (error: Error, attempt: number) => boolean;
}

export interface RetryResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    attempts: number;
    totalTime: number;
}

export const defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true,
    retryCondition: (error: Error, attempt: number) => {
        // Don't retry on client errors (4xx), but do retry on server errors (5xx) and network issues
        if (
            error.message.includes('400') ||
            error.message.includes('401') ||
            error.message.includes('403') ||
            error.message.includes('404')
        ) {
            return false;
        }
        return attempt < 3; // Max 3 attempts
    },
};

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
    const exponentialDelay = Math.min(
        options.baseDelay * Math.pow(options.backoffFactor, attempt),
        options.maxDelay
    );

    if (!options.jitter) {
        return exponentialDelay;
    }

    // Add jitter to prevent thundering herd problem
    const jitter = Math.random() * 0.1; // ±10% jitter
    return exponentialDelay * (1 + (jitter - 0.05));
}

/**
 * Enhanced retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
    const config = { ...defaultRetryOptions, ...options };
    const startTime = Date.now();
    let lastError: Error = new Error('Unknown error');
    let attempt = 0;

    for (attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            const data = await operation();
            return {
                success: true,
                data,
                attempts: attempt + 1,
                totalTime: Date.now() - startTime,
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            console.warn(`[RetryWithBackoff] Attempt ${attempt + 1} failed:`, {
                error: lastError.message,
                attempt: attempt + 1,
                maxRetries: config.maxRetries,
            });

            // Check if we should retry
            if (
                attempt >= config.maxRetries ||
                (config.retryCondition && !config.retryCondition(lastError, attempt))
            ) {
                break;
            }

            // Wait before retry
            const delay = calculateDelay(attempt, config);
            console.log(`[RetryWithBackoff] Waiting ${delay}ms before retry ${attempt + 2}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return {
        success: false,
        error: lastError,
        attempts: attempt + 1,
        totalTime: Date.now() - startTime,
    };
}

/**
 * Circuit breaker state management
 */
export enum CircuitBreakerState {
    CLOSED = 'CLOSED', // Normal operation
    OPEN = 'OPEN', // Circuit is open, rejecting requests
    HALF_OPEN = 'HALF_OPEN', // Testing if service has recovered
}

export class EnhancedCircuitBreaker {
    private failures: number = 0;
    private successes: number = 0;
    private lastFailureTime: number = 0;
    private lastSuccessTime: number = 0;
    private state: CircuitBreakerState = CircuitBreakerState.CLOSED;

    constructor(
        private readonly failureThreshold: number = 5,
        private readonly resetTimeout: number = 60000, // 1 minute
        private readonly halfOpenMaxRequests: number = 3
    ) {}

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.state === CircuitBreakerState.OPEN) {
            if (Date.now() - this.lastFailureTime > this.resetTimeout) {
                this.state = CircuitBreakerState.HALF_OPEN;
                this.successes = 0;
                console.log('[CircuitBreaker] Transitioning to HALF_OPEN state');
            } else {
                throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
            }
        }

        if (
            this.state === CircuitBreakerState.HALF_OPEN &&
            this.successes >= this.halfOpenMaxRequests
        ) {
            throw new Error('Circuit breaker HALF_OPEN limit reached. Please wait.');
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        this.failures = 0;
        this.successes++;
        this.lastSuccessTime = Date.now();

        if (this.state === CircuitBreakerState.HALF_OPEN) {
            if (this.successes >= this.halfOpenMaxRequests) {
                this.state = CircuitBreakerState.CLOSED;
                console.log('[CircuitBreaker] Service recovered. Transitioning to CLOSED state');
            }
        } else {
            this.state = CircuitBreakerState.CLOSED;
        }
    }

    private onFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.failureThreshold) {
            this.state = CircuitBreakerState.OPEN;
            console.log('[CircuitBreaker] Failure threshold exceeded. Transitioning to OPEN state');
        }
    }

    getState(): {
        state: CircuitBreakerState;
        failures: number;
        successes: number;
        failureThreshold: number;
        lastFailureTime: number;
        lastSuccessTime: number;
    } {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            failureThreshold: this.failureThreshold,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
        };
    }

    reset(): void {
        this.failures = 0;
        this.successes = 0;
        this.lastFailureTime = 0;
        this.lastSuccessTime = 0;
        this.state = CircuitBreakerState.CLOSED;
        console.log('[CircuitBreaker] Circuit breaker manually reset');
    }
}

/**
 * Error categorization for better user messaging
 */
export enum ErrorCategory {
    NETWORK = 'NETWORK',
    TIMEOUT = 'TIMEOUT',
    SERVER_ERROR = 'SERVER_ERROR',
    CLIENT_ERROR = 'CLIENT_ERROR',
    PARSING_ERROR = 'PARSING_ERROR',
    AUTHENTICATION = 'AUTHENTICATION',
    RATE_LIMIT = 'RATE_LIMIT',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    UNKNOWN = 'UNKNOWN',
}

export function categorizeError(error: Error | string): ErrorCategory {
    const errorMessage = typeof error === 'string' ? error : error.message.toLowerCase();

    if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
        return ErrorCategory.TIMEOUT;
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return ErrorCategory.NETWORK;
    }
    if (
        errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504')
    ) {
        return ErrorCategory.SERVER_ERROR;
    }
    if (errorMessage.includes('401') || errorMessage.includes('403')) {
        return ErrorCategory.AUTHENTICATION;
    }
    if (errorMessage.includes('429')) {
        return ErrorCategory.RATE_LIMIT;
    }
    if (errorMessage.includes('400') || errorMessage.includes('404')) {
        return ErrorCategory.CLIENT_ERROR;
    }
    if (errorMessage.includes('parse') || errorMessage.includes('json')) {
        return ErrorCategory.PARSING_ERROR;
    }
    if (errorMessage.includes('unavailable') || errorMessage.includes('service')) {
        return ErrorCategory.SERVICE_UNAVAILABLE;
    }

    return ErrorCategory.UNKNOWN;
}

/**
 * Generate user-friendly error messages based on error category
 */
export function generateUserFriendlyError(error: Error | string, context?: string): string {
    const category = categorizeError(error);
    const contextPrefix = context ? `${context}: ` : '';

    switch (category) {
        case ErrorCategory.NETWORK:
            return `${contextPrefix}Network connectivity issue. Please check your internet connection and try again.`;

        case ErrorCategory.TIMEOUT:
            return `${contextPrefix}Request timed out. The service might be experiencing high load. Please try again in a moment.`;

        case ErrorCategory.SERVER_ERROR:
            return `${contextPrefix}Server is experiencing issues. Our team has been notified. Please try again in a few minutes.`;

        case ErrorCategory.AUTHENTICATION:
            return `${contextPrefix}Authentication failed. Please sign in again or check your permissions.`;

        case ErrorCategory.RATE_LIMIT:
            return `${contextPrefix}Too many requests. Please wait a moment before trying again.`;

        case ErrorCategory.CLIENT_ERROR:
            return `${contextPrefix}Invalid request. Please check your input and try again.`;

        case ErrorCategory.PARSING_ERROR:
            return `${contextPrefix}Response format error. The service may be temporarily misconfigured.`;

        case ErrorCategory.SERVICE_UNAVAILABLE:
            return `${contextPrefix}Service is temporarily unavailable. Please try again later.`;

        default:
            return `${contextPrefix}An unexpected error occurred. Please try again or contact support if the issue persists.`;
    }
}
