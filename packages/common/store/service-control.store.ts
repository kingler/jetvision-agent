'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type ServiceStatus = 'enabled' | 'disabled' | 'error' | 'loading' | 'maintenance';

export type ServiceConfig = {
    id: string;
    name: string;
    status: ServiceStatus;
    lastHealthCheck?: Date;
    errorMessage?: string;
    dependencies?: string[];
    healthCheckInterval?: number;
};

export type ServiceControlState = {
    services: Record<string, ServiceConfig>;
    healthCheckIntervals: Record<string, NodeJS.Timeout>;
    isInitialized: boolean;
};

export type ServiceControlActions = {
    // Core service management
    initializeServices: () => void;
    enableService: (serviceId: string) => void;
    disableService: (serviceId: string) => void;
    toggleService: (serviceId: string) => void;
    enableAllServices: () => void;
    disableAllServices: () => void;

    // Service status management
    setServiceStatus: (serviceId: string, status: ServiceStatus, errorMessage?: string) => void;
    setServiceError: (serviceId: string, errorMessage: string) => void;
    clearServiceError: (serviceId: string) => void;

    // Health checking
    performHealthCheck: (serviceId: string) => Promise<void>;
    performAllHealthChecks: () => Promise<void>;
    startHealthCheckInterval: (serviceId: string) => void;
    stopHealthCheckInterval: (serviceId: string) => void;
    updateHealthCheckResult: (serviceId: string, isHealthy: boolean, errorMessage?: string) => void;

    // Service configuration
    updateServiceConfig: (serviceId: string, config: Partial<ServiceConfig>) => void;
    getServiceConfig: (serviceId: string) => ServiceConfig | undefined;
    isServiceAvailable: (serviceId: string) => boolean;
    getAvailableServices: () => string[];

    // Maintenance mode
    setMaintenanceMode: (serviceId: string, enabled: boolean) => void;
    isServiceInMaintenance: (serviceId: string) => boolean;

    // API key validation
    validateApiKey: (serviceId: string) => Promise<boolean>;
    hasValidApiKey: (serviceId: string) => boolean;
};

const DEFAULT_SERVICES: Record<string, ServiceConfig> = {
    apollo: {
        id: 'apollo',
        name: 'Apollo.io',
        status: 'disabled',
        healthCheckInterval: 5 * 60 * 1000, // 5 minutes
        dependencies: [],
    },
    avinode: {
        id: 'avinode',
        name: 'Avinode',
        status: 'disabled',
        healthCheckInterval: 5 * 60 * 1000, // 5 minutes
        dependencies: [],
    },
    n8n: {
        id: 'n8n',
        name: 'N8N Workflows',
        status: 'enabled', // N8N is typically always available
        healthCheckInterval: 10 * 60 * 1000, // 10 minutes
        dependencies: [],
    },
};

export const useServiceControlStore = create<ServiceControlState & ServiceControlActions>()(
    persist(
        immer<ServiceControlState & ServiceControlActions>((set, get) => ({
            services: DEFAULT_SERVICES,
            healthCheckIntervals: {},
            isInitialized: false,

            // Core service management
            initializeServices: () => {
                if (get().isInitialized) return;

                set(state => {
                    state.isInitialized = true;
                    // Initialize health checks for enabled services
                    Object.keys(state.services).forEach(serviceId => {
                        if (state.services[serviceId].status === 'enabled') {
                            get().startHealthCheckInterval(serviceId);
                        }
                    });
                });
            },

            enableService: (serviceId: string) => {
                set(state => {
                    if (state.services[serviceId]) {
                        state.services[serviceId].status = 'enabled';
                        state.services[serviceId].errorMessage = undefined;
                    }
                });
                get().startHealthCheckInterval(serviceId);
                get().performHealthCheck(serviceId);
            },

            disableService: (serviceId: string) => {
                set(state => {
                    if (state.services[serviceId]) {
                        state.services[serviceId].status = 'disabled';
                        state.services[serviceId].errorMessage = undefined;
                    }
                });
                get().stopHealthCheckInterval(serviceId);
            },

            toggleService: (serviceId: string) => {
                const service = get().services[serviceId];
                if (!service) return;

                if (service.status === 'enabled') {
                    get().disableService(serviceId);
                } else if (service.status === 'disabled') {
                    get().enableService(serviceId);
                }
            },

            enableAllServices: () => {
                const serviceIds = Object.keys(get().services);
                serviceIds.forEach(serviceId => get().enableService(serviceId));
            },

            disableAllServices: () => {
                const serviceIds = Object.keys(get().services);
                serviceIds.forEach(serviceId => get().disableService(serviceId));
            },

            // Service status management
            setServiceStatus: (serviceId: string, status: ServiceStatus, errorMessage?: string) => {
                set(state => {
                    if (state.services[serviceId]) {
                        state.services[serviceId].status = status;
                        state.services[serviceId].errorMessage = errorMessage;
                        state.services[serviceId].lastHealthCheck = new Date();
                    }
                });
            },

            setServiceError: (serviceId: string, errorMessage: string) => {
                get().setServiceStatus(serviceId, 'error', errorMessage);
            },

            clearServiceError: (serviceId: string) => {
                set(state => {
                    if (state.services[serviceId]) {
                        state.services[serviceId].errorMessage = undefined;
                        if (state.services[serviceId].status === 'error') {
                            state.services[serviceId].status = 'enabled';
                        }
                    }
                });
            },

            // Health checking
            performHealthCheck: async (serviceId: string) => {
                const service = get().services[serviceId];
                if (!service || service.status !== 'enabled') return;

                set(state => {
                    if (state.services[serviceId]) {
                        state.services[serviceId].status = 'loading';
                    }
                });

                try {
                    const response = await fetch(`/api/services/${serviceId}/health`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                    });

                    if (response.ok) {
                        const data = await response.json();
                        get().updateHealthCheckResult(serviceId, data.healthy, data.error);
                    } else {
                        throw new Error(`Health check failed with status ${response.status}`);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    get().updateHealthCheckResult(serviceId, false, errorMessage);
                }
            },

            performAllHealthChecks: async () => {
                const serviceIds = Object.keys(get().services).filter(
                    id => get().services[id].status === 'enabled'
                );
                await Promise.all(serviceIds.map(id => get().performHealthCheck(id)));
            },

            startHealthCheckInterval: (serviceId: string) => {
                const service = get().services[serviceId];
                if (!service?.healthCheckInterval) return;

                get().stopHealthCheckInterval(serviceId); // Clear any existing interval

                const intervalId = setInterval(() => {
                    get().performHealthCheck(serviceId);
                }, service.healthCheckInterval);

                set(state => {
                    state.healthCheckIntervals[serviceId] = intervalId;
                });
            },

            stopHealthCheckInterval: (serviceId: string) => {
                const intervals = get().healthCheckIntervals;
                if (intervals[serviceId]) {
                    clearInterval(intervals[serviceId]);
                    set(state => {
                        delete state.healthCheckIntervals[serviceId];
                    });
                }
            },

            updateHealthCheckResult: (
                serviceId: string,
                isHealthy: boolean,
                errorMessage?: string
            ) => {
                set(state => {
                    if (state.services[serviceId]) {
                        state.services[serviceId].status = isHealthy ? 'enabled' : 'error';
                        state.services[serviceId].errorMessage = errorMessage;
                        state.services[serviceId].lastHealthCheck = new Date();
                    }
                });
            },

            // Service configuration
            updateServiceConfig: (serviceId: string, config: Partial<ServiceConfig>) => {
                set(state => {
                    if (state.services[serviceId]) {
                        Object.assign(state.services[serviceId], config);
                    }
                });
            },

            getServiceConfig: (serviceId: string) => {
                return get().services[serviceId];
            },

            isServiceAvailable: (serviceId: string) => {
                const service = get().services[serviceId];
                return service?.status === 'enabled';
            },

            getAvailableServices: () => {
                return Object.keys(get().services).filter(id => get().isServiceAvailable(id));
            },

            // Maintenance mode
            setMaintenanceMode: (serviceId: string, enabled: boolean) => {
                set(state => {
                    if (state.services[serviceId]) {
                        state.services[serviceId].status = enabled ? 'maintenance' : 'enabled';
                    }
                });

                if (enabled) {
                    get().stopHealthCheckInterval(serviceId);
                } else {
                    get().startHealthCheckInterval(serviceId);
                }
            },

            isServiceInMaintenance: (serviceId: string) => {
                return get().services[serviceId]?.status === 'maintenance';
            },

            // API key validation
            validateApiKey: async (serviceId: string) => {
                try {
                    const response = await fetch(`/api/services/${serviceId}/validate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                    });
                    return response.ok;
                } catch (error) {
                    console.error(`API key validation failed for ${serviceId}:`, error);
                    return false;
                }
            },

            hasValidApiKey: (serviceId: string) => {
                // This would typically check against the API keys store
                // For now, we'll assume valid keys exist for enabled services
                const service = get().services[serviceId];
                return service?.status !== 'disabled';
            },
        })),
        {
            name: 'service-control-storage',
            // Only persist service configurations, not runtime state like intervals
            partialize: state => ({
                services: Object.fromEntries(
                    Object.entries(state.services).map(([id, service]) => [
                        id,
                        {
                            ...service,
                            // Don't persist runtime status for health checks
                            status: service.status === 'loading' ? 'enabled' : service.status,
                        },
                    ])
                ),
                isInitialized: false, // Always reinitialize on startup
            }),
        }
    )
);
