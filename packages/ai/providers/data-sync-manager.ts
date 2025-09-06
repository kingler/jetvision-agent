/**
 * Data Synchronization Manager for JetVision Integration Services
 *
 * Ensures data consistency across N8N workflows, direct API calls, and cached data.
 * Handles conflict resolution, data validation, and synchronization strategies.
 */

import { integrationLogger, LogLevel } from './integration-logger';
import { multiTierCacheManager, CacheManager } from './cache-manager';

export interface DataSource {
    id: string;
    name: string;
    priority: number; // Higher number = higher priority
    lastSync: number;
    isAvailable: boolean;
    version?: string;
}

export interface SyncResult<T = any> {
    success: boolean;
    data?: T;
    source: string;
    timestamp: number;
    conflicts?: DataConflict[];
    errors?: string[];
    metadata?: Record<string, any>;
}

export interface DataConflict {
    field: string;
    sources: Array<{
        source: string;
        value: any;
        timestamp: number;
        confidence?: number;
    }>;
    resolution: 'newest' | 'highest_priority' | 'manual' | 'merge';
    resolvedValue?: any;
    resolvedBy?: string;
}

export interface SyncPolicy {
    strategy: 'optimistic' | 'pessimistic' | 'eventual_consistency';
    conflictResolution: 'newest_wins' | 'priority_wins' | 'merge' | 'manual';
    maxAge: number; // Max age of data before considered stale (ms)
    requiredSources: string[]; // Sources that must be available for sync
    fallbackSources: string[]; // Fallback sources when primary unavailable
    validationRules: Array<{
        field: string;
        rule: 'required' | 'format' | 'range' | 'custom';
        value?: any;
        validator?: (value: any) => boolean;
    }>;
}

export interface SyncStatus {
    lastSync: number;
    nextSync?: number;
    status: 'synced' | 'syncing' | 'conflict' | 'error';
    activeSources: string[];
    conflicts: DataConflict[];
    errors: string[];
}

export class DataSyncManager {
    private dataSources: Map<string, DataSource> = new Map();
    private syncPolicies: Map<string, SyncPolicy> = new Map();
    private syncStatus: Map<string, SyncStatus> = new Map();
    private conflictHistory: DataConflict[] = [];

    constructor() {
        this.initializeDefaultSources();
        this.initializeDefaultPolicies();

        integrationLogger.info('data-sync', 'Data Sync Manager initialized', {
            sources: Array.from(this.dataSources.keys()),
            policies: Array.from(this.syncPolicies.keys()),
        });
    }

    /**
     * Register a data source
     */
    registerSource(source: DataSource): void {
        this.dataSources.set(source.id, source);
        integrationLogger.info('data-sync', `Data source registered: ${source.name}`, {
            sourceId: source.id,
            priority: source.priority,
        });
    }

    /**
     * Set sync policy for data type
     */
    setSyncPolicy(dataType: string, policy: SyncPolicy): void {
        this.syncPolicies.set(dataType, policy);
        integrationLogger.info('data-sync', `Sync policy set for ${dataType}`, {
            strategy: policy.strategy,
            conflictResolution: policy.conflictResolution,
        });
    }

    /**
     * Synchronize data from multiple sources with conflict resolution
     */
    async syncData<T>(
        dataType: string,
        dataKey: string,
        fetchFunctions: Record<string, () => Promise<T>>,
        requestId?: string
    ): Promise<SyncResult<T>> {
        const policy = this.syncPolicies.get(dataType);
        if (!policy) {
            throw new Error(`No sync policy defined for data type: ${dataType}`);
        }

        const syncLog = integrationLogger.startRequest('data-sync', `Sync ${dataType}:${dataKey}`, {
            dataType,
            dataKey,
            sources: Object.keys(fetchFunctions),
        });

        try {
            // Fetch data from all available sources
            const sourceResults = await this.fetchFromSources(fetchFunctions, policy);

            // Validate data from each source
            const validatedResults = this.validateSourceData(sourceResults, policy, dataType);

            // Detect conflicts between sources
            const conflicts = this.detectConflicts(validatedResults, dataType);

            // Resolve conflicts based on policy
            const resolvedData = await this.resolveConflicts(
                validatedResults,
                conflicts,
                policy,
                dataType,
                requestId
            );

            // Update cache with resolved data
            await this.updateCache(dataType, dataKey, resolvedData, sourceResults);

            // Update sync status
            this.updateSyncStatus(dataType, 'synced', conflicts);

            syncLog.complete(true, { conflicts: conflicts.length });

            return {
                success: true,
                data: resolvedData,
                source: 'synchronized',
                timestamp: Date.now(),
                conflicts: conflicts.length > 0 ? conflicts : undefined,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.updateSyncStatus(dataType, 'error', [], [errorMessage]);
            syncLog.complete(false, undefined, error instanceof Error ? error : new Error(String(error)));

            return {
                success: false,
                source: 'error',
                timestamp: Date.now(),
                errors: [errorMessage],
            };
        }
    }

    /**
     * Get data with fallback strategy
     */
    async getData<T>(
        dataType: string,
        dataKey: string,
        primaryFetch: () => Promise<T>,
        fallbackFetchers?: Array<() => Promise<T>>,
        requestId?: string
    ): Promise<SyncResult<T>> {
        const policy = this.syncPolicies.get(dataType) || this.getDefaultPolicy();

        // Try primary source first
        try {
            const data = await primaryFetch();
            const validated = this.validateData(data, policy, dataType);

            if (validated.isValid) {
                // Cache successful result
                const cache = multiTierCacheManager.getCache(dataType);
                if (cache) {
                    cache.set(dataKey, data, 'primary-source');
                }

                return {
                    success: true,
                    data,
                    source: 'primary',
                    timestamp: Date.now(),
                };
            }
        } catch (error) {
            integrationLogger.warn(
                'data-sync',
                `Primary source failed for ${dataType}:${dataKey}`,
                {
                    error: error instanceof Error ? error.message : String(error),
                },
                requestId
            );
        }

        // Try fallback sources
        if (fallbackFetchers) {
            for (let i = 0; i < fallbackFetchers.length; i++) {
                try {
                    const data = await fallbackFetchers[i]();
                    const validated = this.validateData(data, policy, dataType);

                    if (validated.isValid) {
                        return {
                            success: true,
                            data,
                            source: `fallback-${i}`,
                            timestamp: Date.now(),
                        };
                    }
                } catch (error) {
                    integrationLogger.warn(
                        'data-sync',
                        `Fallback ${i} failed for ${dataType}:${dataKey}`,
                        {
                            error: error instanceof Error ? error.message : String(error),
                        },
                        requestId
                    );
                }
            }
        }

        // Try cache as last resort
        const cache = multiTierCacheManager.getCache(dataType);
        if (cache) {
            const cached = await cache.get<T>(dataKey);
            if (cached) {
                integrationLogger.info(
                    'data-sync',
                    `Serving stale data from cache for ${dataType}:${dataKey}`,
                    {},
                    requestId
                );

                return {
                    success: true,
                    data: cached,
                    source: 'cache-stale',
                    timestamp: Date.now(),
                    metadata: { warning: 'Data may be outdated' },
                };
            }
        }

        return {
            success: false,
            source: 'all-failed',
            timestamp: Date.now(),
            errors: ['All data sources failed and no cache available'],
        };
    }

    /**
     * Check data consistency across sources
     */
    async checkConsistency<T>(
        dataType: string,
        dataKey: string,
        fetchFunctions: Record<string, () => Promise<T>>
    ): Promise<{
        consistent: boolean;
        conflicts: DataConflict[];
        sourceData: Record<string, T>;
    }> {
        const sourceResults = await this.fetchFromSources(fetchFunctions);
        const conflicts = this.detectConflicts(sourceResults, dataType);

        return {
            consistent: conflicts.length === 0,
            conflicts,
            sourceData: sourceResults,
        };
    }

    /**
     * Get sync status for data type
     */
    getSyncStatus(dataType: string): SyncStatus | null {
        return this.syncStatus.get(dataType) || null;
    }

    /**
     * Get conflict history
     */
    getConflictHistory(dataType?: string, limit = 50): DataConflict[] {
        let conflicts = this.conflictHistory;

        if (dataType) {
            conflicts = conflicts.filter(c => c.sources.some(s => s.source.includes(dataType)));
        }

        return conflicts.slice(-limit);
    }

    /**
     * Manually resolve conflict
     */
    resolveConflictManually(
        conflictField: string,
        resolvedValue: any,
        resolvedBy: string
    ): boolean {
        const conflict = this.conflictHistory.find(
            c => c.field === conflictField && !c.resolvedValue
        );

        if (conflict) {
            conflict.resolution = 'manual';
            conflict.resolvedValue = resolvedValue;
            conflict.resolvedBy = resolvedBy;

            integrationLogger.info(
                'data-sync',
                `Conflict manually resolved for field: ${conflictField}`,
                {
                    resolvedValue,
                    resolvedBy,
                }
            );

            return true;
        }

        return false;
    }

    /**
     * Fetch data from multiple sources
     */
    private async fetchFromSources<T>(
        fetchFunctions: Record<string, () => Promise<T>>,
        policy?: SyncPolicy
    ): Promise<Record<string, T>> {
        const results: Record<string, T> = {};
        const errors: Record<string, string> = {};

        const promises = Object.entries(fetchFunctions).map(async ([source, fetchFn]) => {
            try {
                const data = await fetchFn();
                results[source] = data;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                errors[source] = errorMessage;
                integrationLogger.warn('data-sync', `Failed to fetch from ${source}`, {
                    error: errorMessage,
                });
            }
        });

        await Promise.allSettled(promises);

        // Check if we have enough successful sources
        if (policy?.requiredSources) {
            const missingRequired = policy.requiredSources.filter(required => !results[required]);
            if (missingRequired.length > 0) {
                throw new Error(`Missing required sources: ${missingRequired.join(', ')}`);
            }
        }

        return results;
    }

    /**
     * Validate data from sources
     */
    private validateSourceData<T>(
        sourceResults: Record<string, T>,
        policy: SyncPolicy,
        dataType: string
    ): Record<string, { data: T; isValid: boolean; errors: string[] }> {
        const validated: Record<string, { data: T; isValid: boolean; errors: string[] }> = {};

        for (const [source, data] of Object.entries(sourceResults)) {
            const validation = this.validateData(data, policy, dataType);
            validated[source] = {
                data,
                isValid: validation.isValid,
                errors: validation.errors,
            };

            if (!validation.isValid) {
                integrationLogger.warn('data-sync', `Data validation failed for source ${source}`, {
                    dataType,
                    errors: validation.errors,
                });
            }
        }

        return validated;
    }

    /**
     * Validate individual data item
     */
    private validateData<T>(
        data: T,
        policy: SyncPolicy,
        dataType: string
    ): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!data) {
            errors.push('Data is null or undefined');
            return { isValid: false, errors };
        }

        for (const rule of policy.validationRules) {
            const value = (data as any)[rule.field];

            switch (rule.rule) {
                case 'required':
                    if (value === undefined || value === null) {
                        errors.push(`Required field '${rule.field}' is missing`);
                    }
                    break;

                case 'format':
                    if (
                        rule.value &&
                        typeof value === 'string' &&
                        !new RegExp(rule.value).test(value)
                    ) {
                        errors.push(`Field '${rule.field}' format is invalid`);
                    }
                    break;

                case 'range':
                    if (rule.value && typeof value === 'number') {
                        const [min, max] = rule.value as [number, number];
                        if (value < min || value > max) {
                            errors.push(`Field '${rule.field}' is out of range [${min}, ${max}]`);
                        }
                    }
                    break;

                case 'custom':
                    if (rule.validator && !rule.validator(value)) {
                        errors.push(`Custom validation failed for field '${rule.field}'`);
                    }
                    break;
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Detect conflicts between source data
     */
    private detectConflicts<T>(
        sourceResults: Record<string, T> | Record<string, { data: T; isValid: boolean }>,
        dataType: string
    ): DataConflict[] {
        const conflicts: DataConflict[] = [];
        const sources = Object.keys(sourceResults);

        if (sources.length < 2) {
            return conflicts;
        }

        // Get actual data objects
        const dataObjects: Record<string, T> = {};
        for (const [source, result] of Object.entries(sourceResults)) {
            if (typeof result === 'object' && 'data' in result) {
                dataObjects[source] = (result as any).data;
            } else {
                dataObjects[source] = result as T;
            }
        }

        // Compare fields across sources
        const allFields = new Set<string>();
        Object.values(dataObjects).forEach(data => {
            if (data && typeof data === 'object') {
                Object.keys(data).forEach(field => allFields.add(field));
            }
        });

        for (const field of allFields) {
            const fieldValues = sources.map(source => ({
                source,
                value: (dataObjects[source] as any)?.[field],
                timestamp: Date.now(),
            }));

            // Check if values differ
            const uniqueValues = new Set(fieldValues.map(fv => JSON.stringify(fv.value)));

            if (uniqueValues.size > 1) {
                const conflict: DataConflict = {
                    field,
                    sources: fieldValues,
                    resolution: this.determineConflictResolution(dataType, field),
                };

                conflicts.push(conflict);
            }
        }

        return conflicts;
    }

    /**
     * Resolve conflicts based on policy
     */
    private async resolveConflicts<T>(
        validatedResults: Record<string, { data: T; isValid: boolean; errors: string[] }>,
        conflicts: DataConflict[],
        policy: SyncPolicy,
        dataType: string,
        requestId?: string
    ): Promise<T> {
        // Start with the highest priority valid source as base
        const validSources = Object.entries(validatedResults)
            .filter(([_, result]) => result.isValid)
            .sort(([a], [b]) => this.getSourcePriority(b) - this.getSourcePriority(a));

        if (validSources.length === 0) {
            throw new Error('No valid data sources available');
        }

        let resolvedData = { ...validSources[0][1].data };

        // Resolve each conflict
        for (const conflict of conflicts) {
            const resolvedValue = await this.resolveFieldConflict(conflict, policy, requestId);
            if (resolvedValue !== undefined) {
                (resolvedData as any)[conflict.field] = resolvedValue;
                conflict.resolvedValue = resolvedValue;
            }
        }

        // Store conflicts in history
        this.conflictHistory.push(...conflicts);
        this.trimConflictHistory();

        integrationLogger.info(
            'data-sync',
            `Resolved ${conflicts.length} conflicts for ${dataType}`,
            {
                conflicts: conflicts.map(c => ({ field: c.field, resolution: c.resolution })),
            },
            requestId
        );

        return resolvedData;
    }

    /**
     * Resolve individual field conflict
     */
    private async resolveFieldConflict(
        conflict: DataConflict,
        policy: SyncPolicy,
        requestId?: string
    ): Promise<any> {
        switch (policy.conflictResolution) {
            case 'newest_wins':
                const newest = conflict.sources.sort((a, b) => b.timestamp - a.timestamp)[0];
                return newest.value;

            case 'priority_wins':
                const highestPriority = conflict.sources.sort(
                    (a, b) => this.getSourcePriority(b.source) - this.getSourcePriority(a.source)
                )[0];
                return highestPriority.value;

            case 'merge':
                // Simple merge strategy - can be enhanced based on data type
                return this.mergeValues(conflict.sources.map(s => s.value));

            case 'manual':
                // Mark for manual resolution
                integrationLogger.warn(
                    'data-sync',
                    `Manual resolution required for field: ${conflict.field}`,
                    {
                        sources: conflict.sources.map(s => ({ source: s.source, value: s.value })),
                    },
                    requestId
                );

                // Return first available value as temporary resolution
                return conflict.sources[0].value;

            default:
                return conflict.sources[0].value;
        }
    }

    /**
     * Simple value merging for conflict resolution
     */
    private mergeValues(values: any[]): any {
        // Filter out null/undefined values
        const validValues = values.filter(v => v !== null && v !== undefined);

        if (validValues.length === 0) return null;
        if (validValues.length === 1) return validValues[0];

        const firstValue = validValues[0];

        // If all values are the same, return it
        if (validValues.every(v => JSON.stringify(v) === JSON.stringify(firstValue))) {
            return firstValue;
        }

        // For objects, merge properties
        if (typeof firstValue === 'object' && !Array.isArray(firstValue)) {
            const merged = {};
            for (const value of validValues) {
                if (typeof value === 'object') {
                    Object.assign(merged, value);
                }
            }
            return merged;
        }

        // For arrays, merge and deduplicate
        if (Array.isArray(firstValue)) {
            const merged = validValues.flat();
            return [...new Set(merged)];
        }

        // For primitives, return newest or most common value
        return firstValue;
    }

    /**
     * Update cache with synchronized data
     */
    private async updateCache<T>(
        dataType: string,
        dataKey: string,
        data: T,
        sourceResults: Record<string, T>
    ): Promise<void> {
        const cache = multiTierCacheManager.getCache(dataType);
        if (!cache) return;

        // Store resolved data
        cache.set(dataKey, data, 'synchronized', {
            metadata: {
                syncTime: Date.now(),
                sources: Object.keys(sourceResults),
            },
        });

        // Also store individual source data for fallback
        for (const [source, sourceData] of Object.entries(sourceResults)) {
            cache.set(`${dataKey}:${source}`, sourceData, source);
        }
    }

    /**
     * Update sync status
     */
    private updateSyncStatus(
        dataType: string,
        status: SyncStatus['status'],
        conflicts: DataConflict[] = [],
        errors: string[] = []
    ): void {
        this.syncStatus.set(dataType, {
            lastSync: Date.now(),
            status,
            activeSources: Array.from(this.dataSources.values())
                .filter(s => s.isAvailable)
                .map(s => s.id),
            conflicts,
            errors,
        });
    }

    /**
     * Get source priority
     */
    private getSourcePriority(sourceId: string): number {
        const source = this.dataSources.get(sourceId);
        return source?.priority || 0;
    }

    /**
     * Determine conflict resolution strategy for field
     */
    private determineConflictResolution(
        dataType: string,
        field: string
    ): DataConflict['resolution'] {
        const policy = this.syncPolicies.get(dataType);
        if (!policy) return 'newest';

        // Can be enhanced with field-specific rules
        switch (policy.conflictResolution) {
            case 'newest_wins':
                return 'newest';
            case 'priority_wins':
                return 'highest_priority';
            case 'merge':
                return 'merge';
            case 'manual':
                return 'manual';
            default:
                return 'newest';
        }
    }

    /**
     * Get default sync policy
     */
    private getDefaultPolicy(): SyncPolicy {
        return {
            strategy: 'optimistic',
            conflictResolution: 'newest_wins',
            maxAge: 5 * 60 * 1000, // 5 minutes
            requiredSources: [],
            fallbackSources: [],
            validationRules: [],
        };
    }

    /**
     * Trim conflict history to prevent memory bloat
     */
    private trimConflictHistory(): void {
        if (this.conflictHistory.length > 1000) {
            this.conflictHistory = this.conflictHistory.slice(-500);
        }
    }

    /**
     * Initialize default data sources
     */
    private initializeDefaultSources(): void {
        this.registerSource({
            id: 'n8n-primary',
            name: 'N8N Primary Workflows',
            priority: 100,
            lastSync: Date.now(),
            isAvailable: true,
            version: '1.0',
        });

        this.registerSource({
            id: 'apollo-direct',
            name: 'Apollo.io Direct API',
            priority: 80,
            lastSync: Date.now(),
            isAvailable: true,
            version: '1.0',
        });

        this.registerSource({
            id: 'avinode-direct',
            name: 'Avinode Direct API',
            priority: 80,
            lastSync: Date.now(),
            isAvailable: true,
            version: '1.0',
        });

        this.registerSource({
            id: 'cache-layer',
            name: 'Cache Layer',
            priority: 10,
            lastSync: Date.now(),
            isAvailable: true,
            version: '1.0',
        });
    }

    /**
     * Initialize default sync policies
     */
    private initializeDefaultPolicies(): void {
        // Apollo leads data policy
        this.setSyncPolicy('apollo-leads', {
            strategy: 'optimistic',
            conflictResolution: 'newest_wins',
            maxAge: 15 * 60 * 1000, // 15 minutes
            requiredSources: [],
            fallbackSources: ['cache-layer'],
            validationRules: [
                { field: 'id', rule: 'required' },
                { field: 'name', rule: 'required' },
                { field: 'email', rule: 'format', value: '^[^@]+@[^@]+\\.[^@]+$' },
            ],
        });

        // Avinode aircraft data policy
        this.setSyncPolicy('avinode-aircraft', {
            strategy: 'pessimistic',
            conflictResolution: 'priority_wins',
            maxAge: 3 * 60 * 1000, // 3 minutes (aircraft availability changes rapidly)
            requiredSources: [],
            fallbackSources: ['cache-layer'],
            validationRules: [
                { field: 'id', rule: 'required' },
                { field: 'manufacturer', rule: 'required' },
                { field: 'passengers', rule: 'range', value: [1, 50] },
            ],
        });

        // Campaign metrics policy
        this.setSyncPolicy('apollo-campaigns', {
            strategy: 'eventual_consistency',
            conflictResolution: 'merge',
            maxAge: 5 * 60 * 1000, // 5 minutes
            requiredSources: [],
            fallbackSources: ['cache-layer'],
            validationRules: [{ field: 'campaignId', rule: 'required' }],
        });
    }
}

// Export singleton instance
export const dataSyncManager = new DataSyncManager();
