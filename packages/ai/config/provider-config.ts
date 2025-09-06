/**
 * JetVision AI Provider Configuration
 * Centralized configuration for all AI providers and models
 */

export interface ProviderConfig {
    // Provider Selection
    primaryProvider: 'n8n' | 'hybrid' | 'direct-llm';
    fallbackEnabled: boolean;

    // n8n Configuration
    n8n: {
        webhookUrl: string;
        apiKey?: string;
        timeout: number;
        retryAttempts: number;
    };

    // Direct LLM Configuration
    llm: {
        provider: 'openai' | 'anthropic' | 'groq' | 'local';
        apiKey?: string;
        model: string;
        timeout: number;
    };

    // Hybrid Configuration
    hybrid: {
        preferN8n: boolean;
        fallbackThreshold: number;
        enableSmartRouting: boolean; // Route based on query type
    };

    // Performance Settings
    performance: {
        enableCaching: boolean;
        cacheTimeout: number;
        enableMetrics: boolean;
    };
}

// Default configuration
export const defaultProviderConfig: ProviderConfig = {
    primaryProvider: 'hybrid',
    fallbackEnabled: true,

    n8n: {
        webhookUrl:
            process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
            'http://localhost:5678/webhook/jetvision-agent',
        apiKey: process.env.NEXT_PUBLIC_N8N_API_KEY,
        timeout: 8000, // 8 seconds
        retryAttempts: 2,
    },

    llm: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini',
        timeout: 15000, // 15 seconds
    },

    hybrid: {
        preferN8n: true,
        fallbackThreshold: 5000, // 5 seconds
        enableSmartRouting: true,
    },

    performance: {
        enableCaching: false, // Disable for now
        cacheTimeout: 300000, // 5 minutes
        enableMetrics: true,
    },
};

// Environment-specific configurations
export const developmentConfig: Partial<ProviderConfig> = {
    n8n: {
        ...defaultProviderConfig.n8n,
        timeout: 10000, // Longer timeout for development
    },
    performance: {
        ...defaultProviderConfig.performance,
        enableMetrics: true,
    },
};

export const productionConfig: Partial<ProviderConfig> = {
    n8n: {
        ...defaultProviderConfig.n8n,
        timeout: 6000, // Shorter timeout for production
        retryAttempts: 3,
    },
    performance: {
        ...defaultProviderConfig.performance,
        enableCaching: true,
        enableMetrics: true,
    },
};

// Get configuration based on environment
export function getProviderConfig(): ProviderConfig {
    const env = process.env.NODE_ENV || 'development';

    let config = { ...defaultProviderConfig };

    if (env === 'development') {
        config = { ...config, ...developmentConfig };
    } else if (env === 'production') {
        config = { ...config, ...productionConfig };
    }

    return config;
}

// Smart routing logic
export function shouldUseN8nForQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();

    // Queries that benefit from n8n workflows
    const n8nKeywords = [
        'apollo',
        'campaign',
        'lead',
        'executive',
        'assistant',
        'avinode',
        'aircraft',
        'fleet',
        'availability',
        'booking',
        'workflow',
        'automation',
        'integration',
        'sync',
        'dashboard',
        'report',
        'analytics',
        'metrics',
    ];

    // Queries better suited for direct LLM
    const llmKeywords = [
        'explain',
        'how',
        'what',
        'why',
        'help',
        'guide',
        'tutorial',
        'example',
        'best practice',
        'advice',
        'compare',
        'difference',
        'pros and cons',
    ];

    const n8nScore = n8nKeywords.reduce(
        (score, keyword) => (lowerQuery.includes(keyword) ? score + 1 : score),
        0
    );

    const llmScore = llmKeywords.reduce(
        (score, keyword) => (lowerQuery.includes(keyword) ? score + 1 : score),
        0
    );

    // If n8n keywords are more prevalent, use n8n
    if (n8nScore > llmScore) return true;

    // If LLM keywords are more prevalent, use direct LLM
    if (llmScore > n8nScore) return false;

    // Default to n8n for operational queries
    return true;
}

// Provider health check
export interface ProviderHealth {
    provider: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    lastCheck: Date;
    error?: string;
}

export async function checkProviderHealth(config: ProviderConfig): Promise<ProviderHealth[]> {
    const results: ProviderHealth[] = [];

    // Check n8n health
    try {
        const start = Date.now();
        const response = await fetch(config.n8n.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(config.n8n.apiKey && { Authorization: `Bearer ${config.n8n.apiKey}` }),
            },
            body: JSON.stringify({ prompt: 'health check', context: { source: 'health' } }),
            signal: AbortSignal.timeout(config.n8n.timeout),
        });

        const responseTime = Date.now() - start;

        results.push({
            provider: 'n8n',
            status: response.ok ? 'healthy' : 'degraded',
            responseTime,
            lastCheck: new Date(),
            error: response.ok ? undefined : `HTTP ${response.status}`,
        });
    } catch (error) {
        results.push({
            provider: 'n8n',
            status: 'unhealthy',
            responseTime: config.n8n.timeout,
            lastCheck: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    // Add more provider health checks as needed

    return results;
}

// Configuration validation
export function validateProviderConfig(config: ProviderConfig): string[] {
    const errors: string[] = [];

    if (!config.n8n.webhookUrl) {
        errors.push('n8n webhook URL is required');
    }

    if (config.primaryProvider === 'direct-llm' && !config.llm.apiKey) {
        errors.push('LLM API key is required when using direct LLM provider');
    }

    if (config.n8n.timeout < 1000) {
        errors.push('n8n timeout should be at least 1000ms');
    }

    if (config.llm.timeout < 5000) {
        errors.push('LLM timeout should be at least 5000ms');
    }

    return errors;
}
