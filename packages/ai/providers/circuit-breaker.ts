/**
 * Circuit Breaker Pattern Implementation for JetVision Integration Services
 * 
 * Provides fault tolerance and automatic failover for external service integrations.
 * Prevents cascading failures and enables graceful degradation.
 */

export enum CircuitState {
  CLOSED = 'CLOSED',           // Normal operation
  OPEN = 'OPEN',               // Circuit is open, rejecting requests
  HALF_OPEN = 'HALF_OPEN'      // Testing if service is recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures before opening circuit
  recoveryTimeout: number;      // Time to wait before trying half-open (ms)
  requestTimeout: number;       // Individual request timeout (ms)
  halfOpenMaxCalls: number;     // Max calls to allow in half-open state
  successThreshold: number;     // Successful calls needed to close circuit
  monitoringWindow: number;     // Time window for failure counting (ms)
}

export interface ServiceHealth {
  serviceName: string;
  state: CircuitState;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  failureCount: number;
  successCount: number;
  requestCount: number;
  averageResponseTime: number;
  uptime: number;
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  circuitOpenCount: number;
  averageResponseTime: number;
  lastFailureReason?: string;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private nextAttempt?: number;
  private metrics: CircuitBreakerMetrics;
  private responseTimings: number[] = [];

  constructor(
    private serviceName: string,
    private config: CircuitBreakerConfig
  ) {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      circuitOpenCount: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        console.log(`🟡 Circuit breaker for ${this.serviceName} entering HALF_OPEN state`);
      } else {
        throw new Error(`Circuit breaker OPEN for ${this.serviceName}. Service temporarily unavailable.`);
      }
    }

    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(operation);
      
      const responseTime = Date.now() - startTime;
      this.recordSuccess(responseTime);
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailure(error, responseTime);
      throw error;
    }
  }

  /**
   * Execute operation with timeout protection
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout after ${this.config.requestTimeout}ms`));
      }, this.config.requestTimeout);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Record successful operation
   */
  private recordSuccess(responseTime: number): void {
    this.lastSuccessTime = Date.now();
    this.successCount++;
    this.metrics.successfulRequests++;
    this.updateResponseTime(responseTime);

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        console.log(`✅ Circuit breaker for ${this.serviceName} CLOSED - service recovered`);
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on successful operation
      this.failureCount = 0;
    }
  }

  /**
   * Record failed operation
   */
  private recordFailure(error: any, responseTime: number): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;
    this.metrics.failedRequests++;
    this.metrics.lastFailureReason = error?.message || 'Unknown error';
    this.updateResponseTime(responseTime);

    if (this.state === CircuitState.HALF_OPEN || 
        (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold)) {
      this.openCircuit();
    }
  }

  /**
   * Open the circuit breaker
   */
  private openCircuit(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.config.recoveryTimeout;
    this.metrics.circuitOpenCount++;
    console.error(`🔴 Circuit breaker OPEN for ${this.serviceName} - ${this.failureCount} failures`);
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttempt !== undefined && Date.now() >= this.nextAttempt;
  }

  /**
   * Update response time metrics
   */
  private updateResponseTime(responseTime: number): void {
    this.responseTimings.push(responseTime);
    
    // Keep only recent timings (last 100 requests)
    if (this.responseTimings.length > 100) {
      this.responseTimings.shift();
    }
    
    // Calculate average
    this.metrics.averageResponseTime = 
      this.responseTimings.reduce((sum, time) => sum + time, 0) / this.responseTimings.length;
  }

  /**
   * Get current health status
   */
  getHealth(): ServiceHealth {
    const now = Date.now();
    const uptime = this.lastSuccessTime ? (now - this.lastSuccessTime) / 1000 : 0;

    return {
      serviceName: this.serviceName,
      state: this.state,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.metrics.totalRequests,
      averageResponseTime: this.metrics.averageResponseTime,
      uptime
    };
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * Force circuit to open (for testing or manual intervention)
   */
  forceOpen(): void {
    this.openCircuit();
    console.log(`⚠️ Circuit breaker for ${this.serviceName} manually opened`);
  }

  /**
   * Force circuit to close (for testing or manual intervention)
   */
  forceClose(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    console.log(`⚠️ Circuit breaker for ${this.serviceName} manually closed`);
  }

  /**
   * Reset all metrics and state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextAttempt = undefined;
    this.responseTimings = [];
    
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      circuitOpenCount: 0,
      averageResponseTime: 0
    };
    
    console.log(`🔄 Circuit breaker for ${this.serviceName} reset`);
  }
}

/**
 * Circuit Breaker Manager for managing multiple service circuit breakers
 */
export class CircuitBreakerManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private defaultConfigs: Map<string, CircuitBreakerConfig> = new Map();

  constructor() {
    // Set default configurations for different service types
    this.setDefaultConfig('n8n', {
      failureThreshold: 5,
      recoveryTimeout: 30000,      // 30 seconds
      requestTimeout: 15000,       // 15 seconds
      halfOpenMaxCalls: 3,
      successThreshold: 2,
      monitoringWindow: 60000      // 1 minute
    });

    this.setDefaultConfig('apollo', {
      failureThreshold: 3,
      recoveryTimeout: 60000,      // 1 minute  
      requestTimeout: 10000,       // 10 seconds
      halfOpenMaxCalls: 2,
      successThreshold: 2,
      monitoringWindow: 120000     // 2 minutes
    });

    this.setDefaultConfig('avinode', {
      failureThreshold: 3,
      recoveryTimeout: 60000,      // 1 minute
      requestTimeout: 10000,       // 10 seconds
      halfOpenMaxCalls: 2,
      successThreshold: 2,
      monitoringWindow: 120000     // 2 minutes
    });

    this.setDefaultConfig('llm', {
      failureThreshold: 2,
      recoveryTimeout: 15000,      // 15 seconds
      requestTimeout: 30000,       // 30 seconds
      halfOpenMaxCalls: 1,
      successThreshold: 1,
      monitoringWindow: 60000      // 1 minute
    });
  }

  /**
   * Set default configuration for a service type
   */
  setDefaultConfig(serviceType: string, config: CircuitBreakerConfig): void {
    this.defaultConfigs.set(serviceType, config);
  }

  /**
   * Get or create circuit breaker for a service
   */
  getCircuitBreaker(serviceName: string, serviceType?: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      const config = serviceType && this.defaultConfigs.has(serviceType) 
        ? this.defaultConfigs.get(serviceType)!
        : this.defaultConfigs.get('n8n')!; // Default fallback

      this.circuitBreakers.set(serviceName, new CircuitBreaker(serviceName, config));
    }

    return this.circuitBreakers.get(serviceName)!;
  }

  /**
   * Get health status for all services
   */
  getAllServiceHealth(): ServiceHealth[] {
    return Array.from(this.circuitBreakers.values()).map(cb => cb.getHealth());
  }

  /**
   * Get health status for a specific service
   */
  getServiceHealth(serviceName: string): ServiceHealth | null {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    return circuitBreaker ? circuitBreaker.getHealth() : null;
  }

  /**
   * Check if any critical services are down
   */
  getCriticalServicesStatus(): { healthy: boolean; downServices: string[] } {
    const criticalServices = ['n8n-primary'];
    const downServices: string[] = [];

    for (const serviceName of criticalServices) {
      const cb = this.circuitBreakers.get(serviceName);
      if (cb && cb.getHealth().state === CircuitState.OPEN) {
        downServices.push(serviceName);
      }
    }

    return {
      healthy: downServices.length === 0,
      downServices
    };
  }

  /**
   * Reset specific service circuit breaker
   */
  resetService(serviceName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.reset();
      return true;
    }
    return false;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.circuitBreakers.forEach(cb => cb.reset());
    console.log('🔄 All circuit breakers reset');
  }
}

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();