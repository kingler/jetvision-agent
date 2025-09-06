import * as Sentry from '@sentry/nextjs';

export interface CircuitBreakerOptions {
    failureThreshold: number;
    resetTimeout: number;
    monitoringPeriod: number;
    fallbackEnabled: boolean;
}

export interface CircuitBreakerState {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: number;
    nextAttemptTime: number;
    successCount: number;
}

export class CircuitBreakerError extends Error {
    constructor(
        message: string,
        public readonly circuitOpen: boolean = false
    ) {
        super(message);
        this.name = 'CircuitBreakerError';
    }
}

export class CircuitBreaker<T = any> {
    private state: CircuitBreakerState = {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
        successCount: 0,
    };

    constructor(
        private name: string,
        private options: CircuitBreakerOptions = {
            failureThreshold: 5,
            resetTimeout: 60000, // 1 minute
            monitoringPeriod: 300000, // 5 minutes
            fallbackEnabled: true,
        }
    ) {}

    async execute<R>(operation: () => Promise<R>, fallback?: () => Promise<R> | R): Promise<R> {
        const startTime = Date.now();

        try {
            // Check if circuit is open
            if (this.shouldRejectRequest()) {
                this.logCircuitState('request_rejected');

                if (fallback && this.options.fallbackEnabled) {
                    Sentry.addBreadcrumb({
                        category: 'circuit_breaker',
                        message: `Circuit ${this.name} is open, executing fallback`,
                        level: 'warning',
                    });

                    return await Promise.resolve(fallback());
                }

                throw new CircuitBreakerError(
                    `Circuit breaker ${this.name} is OPEN. Service unavailable.`,
                    true
                );
            }

            // Execute the operation
            const result = await operation();

            // Record success
            this.onSuccess();

            // Log successful execution
            Sentry.addBreadcrumb({
                category: 'circuit_breaker',
                message: `Operation succeeded through circuit ${this.name}`,
                level: 'info',
                data: {
                    duration_ms: Date.now() - startTime,
                    state: this.state.state,
                },
            });

            return result;
        } catch (error) {
            // Record failure
            this.onFailure(error);

            // Log failure
            Sentry.captureException(error, {
                tags: {
                    circuit_breaker: this.name,
                    circuit_state: this.state.state,
                },
                extra: {
                    failure_count: this.state.failureCount,
                    circuit_options: this.options,
                },
            });

            // Try fallback if available and circuit is now open
            if (this.state.state === 'OPEN' && fallback && this.options.fallbackEnabled) {
                Sentry.addBreadcrumb({
                    category: 'circuit_breaker',
                    message: `Circuit ${this.name} opened due to failure, executing fallback`,
                    level: 'warning',
                });

                try {
                    return await Promise.resolve(fallback());
                } catch (fallbackError) {
                    Sentry.captureException(fallbackError, {
                        tags: {
                            circuit_breaker: this.name,
                            fallback: true,
                        },
                    });
                    throw fallbackError;
                }
            }

            throw error;
        }
    }

    private shouldRejectRequest(): boolean {
        const now = Date.now();

        switch (this.state.state) {
            case 'CLOSED':
                return false;

            case 'OPEN':
                // Check if it's time to try again
                if (now >= this.state.nextAttemptTime) {
                    this.state.state = 'HALF_OPEN';
                    this.state.successCount = 0;
                    this.logCircuitState('transitioning_to_half_open');
                    return false;
                }
                return true;

            case 'HALF_OPEN':
                return false;

            default:
                return false;
        }
    }

    private onSuccess(): void {
        this.state.successCount++;

        if (this.state.state === 'HALF_OPEN') {
            // If we're in HALF_OPEN and got a success, consider closing the circuit
            if (this.state.successCount >= 2) {
                this.state.state = 'CLOSED';
                this.state.failureCount = 0;
                this.state.successCount = 0;
                this.logCircuitState('circuit_closed_after_recovery');
            }
        } else if (this.state.state === 'CLOSED') {
            // Reset failure count on success in CLOSED state
            this.state.failureCount = Math.max(0, this.state.failureCount - 1);
        }
    }

    private onFailure(error: any): void {
        this.state.failureCount++;
        this.state.lastFailureTime = Date.now();

        // Open circuit if failure threshold exceeded
        if (this.state.failureCount >= this.options.failureThreshold) {
            this.state.state = 'OPEN';
            this.state.nextAttemptTime = Date.now() + this.options.resetTimeout;
            this.logCircuitState('circuit_opened_due_to_failures');
        } else if (this.state.state === 'HALF_OPEN') {
            // If we fail in HALF_OPEN state, go back to OPEN immediately
            this.state.state = 'OPEN';
            this.state.nextAttemptTime = Date.now() + this.options.resetTimeout;
            this.logCircuitState('circuit_reopened_from_half_open');
        }
    }

    private logCircuitState(event: string): void {
        Sentry.addBreadcrumb({
            category: 'circuit_breaker',
            message: `Circuit ${this.name}: ${event}`,
            level: this.state.state === 'OPEN' ? 'warning' : 'info',
            data: {
                state: this.state.state,
                failure_count: this.state.failureCount,
                success_count: this.state.successCount,
                next_attempt_time: this.state.nextAttemptTime,
            },
        });
    }

    // Public methods for monitoring
    public getState(): CircuitBreakerState {
        return { ...this.state };
    }

    public getName(): string {
        return this.name;
    }

    public getHealthMetrics() {
        const now = Date.now();
        return {
            name: this.name,
            state: this.state.state,
            failureCount: this.state.failureCount,
            successCount: this.state.successCount,
            isHealthy: this.state.state === 'CLOSED',
            timeSinceLastFailure: this.state.lastFailureTime
                ? now - this.state.lastFailureTime
                : null,
            timeToNextAttempt:
                this.state.nextAttemptTime > now ? this.state.nextAttemptTime - now : 0,
        };
    }

    // Manual control methods (for testing/admin)
    public reset(): void {
        this.state = {
            state: 'CLOSED',
            failureCount: 0,
            lastFailureTime: 0,
            nextAttemptTime: 0,
            successCount: 0,
        };
        this.logCircuitState('manually_reset');
    }

    public forceOpen(): void {
        this.state.state = 'OPEN';
        this.state.nextAttemptTime = Date.now() + this.options.resetTimeout;
        this.logCircuitState('manually_opened');
    }
}
