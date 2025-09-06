/**
 * Cache Manager for JetVision Integration Services
 *
 * Provides intelligent caching for API responses with TTL, fallback strategies,
 * and data consistency management across different providers.
 */

import QuickLRU from '@alloc/quick-lru';

export interface CacheConfig {
    maxSize: number;
    ttl: number; // Time to live in milliseconds
    staleWhileRevalidate: number; // Serve stale data while fetching fresh data (ms)
    enableCompression?: boolean;
    enablePersistence?: boolean;
}

export interface CacheEntry<T = any> {
    data: T;
    timestamp: number;
    ttl: number;
    source: string;
    version: string;
    metadata?: Record<string, any>;
}

export interface CacheMetrics {
    hits: number;
    misses: number;
    entries: number;
    hitRate: number;
    averageResponseTime: number;
}

export class CacheManager {
    private cache: QuickLRU<string, CacheEntry>;
    private metrics: CacheMetrics;
    private responseTimings: number[] = [];

    constructor(private config: CacheConfig) {
        this.cache = new QuickLRU({ maxSize: config.maxSize });
        this.metrics = {
            hits: 0,
            misses: 0,
            entries: 0,
            hitRate: 0,
            averageResponseTime: 0,
        };
    }

    /**
     * Get data from cache with intelligent fallback
     */
    async get<T>(key: string): Promise<T | null> {
        const startTime = Date.now();
        const entry = this.cache.get(key);

        if (!entry) {
            this.recordMiss(Date.now() - startTime);
            return null;
        }

        const now = Date.now();
        const age = now - entry.timestamp;

        // Check if entry is fresh
        if (age < entry.ttl) {
            this.recordHit(Date.now() - startTime);
            return entry.data;
        }

        // Check if we can serve stale data while revalidating
        if (age < entry.ttl + this.config.staleWhileRevalidate) {
            this.recordHit(Date.now() - startTime, true);
            // Return stale data immediately, trigger background refresh if needed
            return entry.data;
        }

        // Entry is too old
        this.cache.delete(key);
        this.recordMiss(Date.now() - startTime);
        return null;
    }

    /**
     * Set data in cache with metadata
     */
    set<T>(
        key: string,
        data: T,
        source: string,
        options?: {
            ttl?: number;
            version?: string;
            metadata?: Record<string, any>;
        }
    ): void {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: options?.ttl || this.config.ttl,
            source,
            version: options?.version || '1.0',
            metadata: options?.metadata,
        };

        this.cache.set(key, entry);
        this.metrics.entries = this.cache.size;
    }

    /**
     * Delete specific cache entry
     */
    delete(key: string): boolean {
        const deleted = this.cache.delete(key);
        this.metrics.entries = this.cache.size;
        return deleted;
    }

    /**
     * Check if cache has valid (non-expired) entry
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        const age = Date.now() - entry.timestamp;
        return age < entry.ttl;
    }

    /**
     * Get cache entry with metadata
     */
    getEntry(key: string): CacheEntry | null {
        return this.cache.get(key) || null;
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.metrics.entries = 0;
        console.log('🗑️ Cache cleared');
    }

    /**
     * Clear expired entries
     */
    clearExpired(): number {
        const now = Date.now();
        let cleared = 0;

        for (const [key, entry] of this.cache) {
            const age = now - entry.timestamp;
            if (age >= entry.ttl + this.config.staleWhileRevalidate) {
                this.cache.delete(key);
                cleared++;
            }
        }

        this.metrics.entries = this.cache.size;
        console.log(`🗑️ Cleared ${cleared} expired cache entries`);
        return cleared;
    }

    /**
     * Get cache metrics
     */
    getMetrics(): CacheMetrics {
        return { ...this.metrics };
    }

    /**
     * Generate cache key from query parameters
     */
    static generateKey(prefix: string, params: Record<string, any>): string {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}=${JSON.stringify(params[key])}`)
            .join('&');

        return `${prefix}:${Buffer.from(sortedParams).toString('base64url')}`;
    }

    /**
     * Record cache hit
     */
    private recordHit(responseTime: number, stale = false): void {
        this.metrics.hits++;
        this.updateResponseTime(responseTime);
        this.updateHitRate();

        if (stale) {
            console.log('⚡ Cache hit (stale-while-revalidate)');
        }
    }

    /**
     * Record cache miss
     */
    private recordMiss(responseTime: number): void {
        this.metrics.misses++;
        this.updateResponseTime(responseTime);
        this.updateHitRate();
    }

    /**
     * Update hit rate calculation
     */
    private updateHitRate(): void {
        const total = this.metrics.hits + this.metrics.misses;
        this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
    }

    /**
     * Update average response time
     */
    private updateResponseTime(responseTime: number): void {
        this.responseTimings.push(responseTime);

        if (this.responseTimings.length > 100) {
            this.responseTimings.shift();
        }

        this.metrics.averageResponseTime =
            this.responseTimings.reduce((sum, time) => sum + time, 0) / this.responseTimings.length;
    }
}

/**
 * Multi-tier Cache Manager for different data types
 */
export class MultiTierCacheManager {
    private caches: Map<string, CacheManager> = new Map();

    constructor() {
        // Initialize different cache tiers for different data types

        // Apollo.io lead data - longer TTL as lead data changes less frequently
        this.caches.set(
            'apollo-leads',
            new CacheManager({
                maxSize: 1000,
                ttl: 15 * 60 * 1000, // 15 minutes
                staleWhileRevalidate: 5 * 60 * 1000, // 5 minutes stale
                enableCompression: true,
            })
        );

        // Apollo.io campaign metrics - shorter TTL as metrics change frequently
        this.caches.set(
            'apollo-campaigns',
            new CacheManager({
                maxSize: 500,
                ttl: 5 * 60 * 1000, // 5 minutes
                staleWhileRevalidate: 2 * 60 * 1000, // 2 minutes stale
                enableCompression: false,
            })
        );

        // Avinode aircraft availability - very short TTL as availability changes rapidly
        this.caches.set(
            'avinode-aircraft',
            new CacheManager({
                maxSize: 2000,
                ttl: 3 * 60 * 1000, // 3 minutes
                staleWhileRevalidate: 1 * 60 * 1000, // 1 minute stale
                enableCompression: true,
            })
        );

        // Avinode pricing - medium TTL as pricing is relatively stable
        this.caches.set(
            'avinode-pricing',
            new CacheManager({
                maxSize: 1000,
                ttl: 10 * 60 * 1000, // 10 minutes
                staleWhileRevalidate: 3 * 60 * 1000, // 3 minutes stale
                enableCompression: true,
            })
        );

        // LLM responses - very short TTL for conversation context
        this.caches.set(
            'llm-responses',
            new CacheManager({
                maxSize: 200,
                ttl: 2 * 60 * 1000, // 2 minutes
                staleWhileRevalidate: 30 * 1000, // 30 seconds stale
                enableCompression: false,
            })
        );

        // Service health status - very short TTL
        this.caches.set(
            'service-health',
            new CacheManager({
                maxSize: 100,
                ttl: 30 * 1000, // 30 seconds
                staleWhileRevalidate: 10 * 1000, // 10 seconds stale
                enableCompression: false,
            })
        );

        // Start periodic cleanup
        this.startPeriodicCleanup();
    }

    /**
     * Get cache for specific data type
     */
    getCache(type: string): CacheManager | null {
        return this.caches.get(type) || null;
    }

    /**
     * Get all cache metrics
     */
    getAllMetrics(): Record<string, CacheMetrics> {
        const metrics: Record<string, CacheMetrics> = {};

        Array.from(this.caches.entries()).forEach(([type, cache]) => {
            metrics[type] = cache.getMetrics();
        });

        return metrics;
    }

    /**
     * Clear all caches
     */
    clearAll(): void {
        Array.from(this.caches.values()).forEach(cache => {
            cache.clear();
        });
        console.log('🗑️ All caches cleared');
    }

    /**
     * Clear expired entries from all caches
     */
    clearAllExpired(): void {
        let totalCleared = 0;

        Array.from(this.caches.entries()).forEach(([type, cache]) => {
            const cleared = cache.clearExpired();
            totalCleared += cleared;

            if (cleared > 0) {
                console.log(`🗑️ Cleared ${cleared} expired entries from ${type} cache`);
            }
        });

        if (totalCleared > 0) {
            console.log(`🗑️ Total cleared: ${totalCleared} expired entries`);
        }
    }

    /**
     * Get aggregated cache statistics
     */
    getAggregatedStats(): {
        totalEntries: number;
        totalHits: number;
        totalMisses: number;
        overallHitRate: number;
        averageResponseTime: number;
    } {
        let totalEntries = 0;
        let totalHits = 0;
        let totalMisses = 0;
        let totalResponseTime = 0;
        let cacheCount = 0;

        Array.from(this.caches.values()).forEach(cache => {
            const metrics = cache.getMetrics();
            totalEntries += metrics.entries;
            totalHits += metrics.hits;
            totalMisses += metrics.misses;
            totalResponseTime += metrics.averageResponseTime;
            cacheCount++;
        });

        const total = totalHits + totalMisses;

        return {
            totalEntries,
            totalHits,
            totalMisses,
            overallHitRate: total > 0 ? (totalHits / total) * 100 : 0,
            averageResponseTime: cacheCount > 0 ? totalResponseTime / cacheCount : 0,
        };
    }

    /**
     * Start periodic cache cleanup
     */
    private startPeriodicCleanup(): void {
        // Clean up expired entries every 5 minutes
        setInterval(
            () => {
                this.clearAllExpired();
            },
            5 * 60 * 1000
        );

        console.log('⏰ Cache cleanup scheduled every 5 minutes');
    }
}

// Export singleton instance
export const multiTierCacheManager = new MultiTierCacheManager();
