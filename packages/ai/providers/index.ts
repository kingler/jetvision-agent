/**
 * JetVision Resilient Integration Architecture - Main Export File
 * 
 * This file provides a single entry point for the entire resilient integration system.
 * It eliminates the single point of failure in the JetVision Agent by providing:
 * 
 * 1. Primary: N8N webhook integration (full feature set)
 * 2. Secondary: Direct API integrations (Apollo.io + Avinode)
 * 3. Tertiary: Cached responses with degraded functionality
 * 4. Emergency: Offline responses with service status
 */

// Core resilient provider
export { 
  JetVisionResilientProvider, 
  createJetVisionResilient, 
  jetVisionResilient 
} from './jetvision-resilient-provider';

// Circuit breaker system
export { 
  CircuitBreaker, 
  CircuitState, 
  circuitBreakerManager 
} from './circuit-breaker';

// Caching layer
export { 
  CacheManager, 
  MultiTierCacheManager, 
  multiTierCacheManager 
} from './cache-manager';

// Direct API clients
export { 
  ApolloDirectClient, 
  createApolloDirectClient 
} from './apollo-direct-client';

export { 
  AvinodeDirectClient, 
  createAvinodeDirectClient 
} from './avinode-direct-client';

// Service monitoring
export { 
  ServiceMonitor, 
  serviceMonitor,
  DEFAULT_MONITORING_CONFIG 
} from './service-monitor';

// Integration logging
export { 
  IntegrationLogger, 
  integrationLogger,
  LogLevel,
  DEFAULT_LOGGER_CONFIG 
} from './integration-logger';

// Data synchronization
export { 
  DataSyncManager, 
  dataSyncManager 
} from './data-sync-manager';

// Legacy providers (for backward compatibility)
export { 
  jetVisionHybrid,
  createJetVisionHybrid 
} from './jetvision-hybrid-provider';

export { 
  n8nAgent,
  createN8nAgent 
} from './n8n-provider';

// Types
export type {
  ResilientProviderConfig,
  ServiceStatus,
  ResilientProviderMetrics
} from './jetvision-resilient-provider';

export type {
  CircuitBreakerConfig,
  ServiceHealth,
  CircuitBreakerMetrics
} from './circuit-breaker';

export type {
  CacheConfig,
  CacheEntry,
  CacheMetrics
} from './cache-manager';

export type {
  ApolloConfig,
  ApolloSearchParams,
  ApolloLead,
  ApolloSearchResult,
  ApolloCampaignMetrics,
  ApolloEnrichmentData
} from './apollo-direct-client';

export type {
  AvinodeConfig,
  AircraftSearchParams,
  Aircraft,
  FlightQuote,
  FleetStatus,
  AircraftSearchResult,
  BookingRequest
} from './avinode-direct-client';

export type {
  ServiceAlert,
  ServiceMetrics,
  SystemHealth,
  MonitoringConfig
} from './service-monitor';

export type {
  LogEntry,
  LogFilter,
  LoggerConfig
} from './integration-logger';

export type {
  DataSource,
  SyncResult,
  DataConflict,
  SyncPolicy,
  SyncStatus
} from './data-sync-manager';

/**
 * Quick Setup Configuration
 * 
 * Use this configuration to quickly set up the resilient provider with all features enabled.
 */
export interface JetVisionSetupConfig {
  // Primary N8N Configuration
  n8nWebhookUrl: string;
  n8nApiKey?: string;
  
  // Direct API Fallback Configuration
  apolloApiKey?: string;
  avinodeApiKey?: string;
  
  // LLM Fallback Configuration
  llmProvider?: 'openai' | 'anthropic' | 'claude';
  llmApiKey?: string;
  
  // Feature Flags
  enableFallback?: boolean;
  enableCaching?: boolean;
  enableMonitoring?: boolean;
  enableLogging?: boolean;
  enableDataSync?: boolean;
  
  // Advanced Configuration
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  monitoringInterval?: number;
  cacheMaxEntries?: number;
}

/**
 * Initialize the complete JetVision Resilient Integration System
 */
export function initializeJetVisionSystem(config: JetVisionSetupConfig) {
  const {
    n8nWebhookUrl,
    n8nApiKey,
    apolloApiKey,
    avinodeApiKey,
    llmProvider = 'openai',
    llmApiKey,
    enableFallback = true,
    enableCaching = true,
    enableMonitoring = true,
    enableLogging = true,
    enableDataSync = true,
    logLevel = 'INFO',
    monitoringInterval = 30000,
    cacheMaxEntries = 10000
  } = config;

  // Validate required configuration
  if (!n8nWebhookUrl) {
    throw new Error('n8nWebhookUrl is required for JetVision initialization');
  }

  console.log('🚀 Initializing JetVision Resilient Integration System...');

  // Configure logging
  if (enableLogging) {
    const logLevelMap = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    integrationLogger.debug('system', 'Logging system initialized', { 
      level: logLevel,
      maxEntries: cacheMaxEntries 
    });
  }

  // Start service monitoring
  if (enableMonitoring) {
    serviceMonitor.start();
    integrationLogger.info('system', 'Service monitoring started', { 
      interval: `${monitoringInterval / 1000}s` 
    });
  }

  // Initialize the resilient provider
  const provider = createJetVisionResilient({
    n8nWebhookUrl,
    n8nApiKey,
    apolloApiKey,
    avinodeApiKey,
    llmProvider,
    llmApiKey,
    enableFallback,
    enableCaching,
    enableServiceMonitoring: enableMonitoring,
    healthCheckInterval: monitoringInterval
  });

  // Log successful initialization
  integrationLogger.info('system', 'JetVision Resilient System initialized successfully', {
    features: {
      n8nPrimary: !!n8nWebhookUrl,
      apolloFallback: !!apolloApiKey,
      avinodeFallback: !!avinodeApiKey,
      llmFallback: !!llmApiKey,
      caching: enableCaching,
      monitoring: enableMonitoring,
      dataSync: enableDataSync
    }
  });

  console.log('✅ JetVision Resilient Integration System ready!');
  console.log('📊 Access the health dashboard at: /admin/system-health');
  console.log('📝 View logs and metrics through the service monitor API');

  return {
    provider,
    serviceMonitor,
    integrationLogger,
    dataSyncManager,
    circuitBreakerManager,
    multiTierCacheManager,
    
    // Utility methods
    getSystemHealth: () => serviceMonitor.getSystemHealth(),
    getMetrics: () => provider.jetVisionAgent().getMetrics(),
    getHealthReport: () => provider.jetVisionAgent().getHealthReport(),
    
    // Admin methods
    resetCircuitBreakers: () => circuitBreakerManager.resetAll(),
    clearCache: () => multiTierCacheManager.clearAll(),
    exportLogs: () => integrationLogger.exportLogs(),
    
    // Shutdown method
    shutdown: () => {
      serviceMonitor.stop();
      provider.jetVisionAgent().destroy();
      integrationLogger.info('system', 'JetVision System shutdown completed');
    }
  };
}

/**
 * Default configuration for development environment
 */
export const DEVELOPMENT_CONFIG: JetVisionSetupConfig = {
  n8nWebhookUrl: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/jetvision-agent',
  n8nApiKey: process.env.NEXT_PUBLIC_N8N_API_KEY,
  apolloApiKey: process.env.APOLLO_API_KEY,
  avinodeApiKey: process.env.AVAINODE_API_KEY,
  llmProvider: 'openai',
  llmApiKey: process.env.OPENAI_API_KEY,
  enableFallback: true,
  enableCaching: true,
  enableMonitoring: true,
  enableLogging: true,
  enableDataSync: true,
  logLevel: 'DEBUG',
  monitoringInterval: 15000, // 15 seconds for development
  cacheMaxEntries: 1000
};

/**
 * Default configuration for production environment
 */
export const PRODUCTION_CONFIG: JetVisionSetupConfig = {
  n8nWebhookUrl: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!,
  n8nApiKey: process.env.NEXT_PUBLIC_N8N_API_KEY,
  apolloApiKey: process.env.APOLLO_API_KEY,
  avinodeApiKey: process.env.AVAINODE_API_KEY,
  llmProvider: 'openai',
  llmApiKey: process.env.OPENAI_API_KEY,
  enableFallback: true,
  enableCaching: true,
  enableMonitoring: true,
  enableLogging: true,
  enableDataSync: true,
  logLevel: 'INFO',
  monitoringInterval: 60000, // 1 minute for production
  cacheMaxEntries: 50000
};

/**
 * Quick start function for development
 */
export function quickStartDevelopment() {
  return initializeJetVisionSystem(DEVELOPMENT_CONFIG);
}

/**
 * Quick start function for production
 */
export function quickStartProduction() {
  return initializeJetVisionSystem(PRODUCTION_CONFIG);
}

// Export everything as default for easy importing
export default {
  // Main initialization
  initializeJetVisionSystem,
  quickStartDevelopment,
  quickStartProduction,
  
  // Configurations
  DEVELOPMENT_CONFIG,
  PRODUCTION_CONFIG,
  
  // Core components
  jetVisionResilient,
  serviceMonitor,
  integrationLogger,
  dataSyncManager,
  circuitBreakerManager,
  multiTierCacheManager,
  
  // Direct clients
  createApolloDirectClient,
  createAvinodeDirectClient
};