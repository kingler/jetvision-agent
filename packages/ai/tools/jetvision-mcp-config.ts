import { MCPServersConfig } from './mcp';
import { apolloMCPConfig } from './apollo-mcp-config';
import { n8nMCPConfig } from './n8n-mcp-config';

/**
 * JetVision Complete MCP Server Configuration
 * Integrates all MCP servers for comprehensive lead generation and workflow automation
 */
export const jetvisionMCPConfig: MCPServersConfig = {
    proxyEndpoint: process.env.MCP_PROXY_ENDPOINT || '/api/mcp/proxy',
    mcpServers: {
        // Apollo.io for lead generation and campaign management
        'apollo-io': process.env.APOLLO_MCP_SERVER_URL || 'http://localhost:3001/apollo',
        
        // AviNode for aviation industry data
        'avinode': process.env.AVAINODE_MCP_SERVER_URL || 'http://localhost:3002/avinode',
        
        // N8N for workflow automation and orchestration
        'n8n-workflow': process.env.N8N_MCP_SERVER_URL || 'http://localhost:3003/n8n',
    },
};

/**
 * Combined Tool Definitions for JetVision
 * All available tools across all MCP servers
 */
export const jetvisionToolDefinitions = {
    // Apollo.io Tools
    ...apolloMCPConfig.mcpServers,
    
    // N8N Tools
    ...n8nMCPConfig.mcpServers,
    
    // Additional JetVision specific tools
    'jetvision-lead-scoring': {
        name: 'jetvision-lead-scoring',
        description: 'Score leads specifically for private jet charter services',
        category: 'lead-scoring',
    },
    'jetvision-workflow-orchestrator': {
        name: 'jetvision-workflow-orchestrator',
        description: 'Orchestrate complex multi-step lead generation workflows',
        category: 'workflow-orchestration',
    },
    'jetvision-campaign-optimizer': {
        name: 'jetvision-campaign-optimizer',
        description: 'Optimize campaigns for private jet charter industry',
        category: 'campaign-optimization',
    },
};

/**
 * JetVision Environment Configuration
 */
export const jetvisionEnvironmentConfig = {
    // MCP Server URLs
    apollo: {
        url: process.env.APOLLO_MCP_SERVER_URL || 'http://localhost:3001/apollo',
        enabled: process.env.APOLLO_ENABLED !== 'false',
    },
    avinode: {
        url: process.env.AVAINODE_MCP_SERVER_URL || 'http://localhost:3002/avinode',
        enabled: process.env.AVAINODE_ENABLED !== 'false',
    },
    n8n: {
        url: process.env.N8N_MCP_SERVER_URL || 'http://localhost:3003/n8n',
        enabled: process.env.N8N_ENABLED !== 'false',
    },
    
    // Proxy Configuration
    proxy: {
        endpoint: process.env.MCP_PROXY_ENDPOINT || '/api/mcp/proxy',
        timeout: parseInt(process.env.MCP_PROXY_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.MCP_PROXY_RETRY_ATTEMPTS || '3'),
    },
    
    // JetVision Specific Settings
    jetvision: {
        industry: 'private-aviation',
        targetPersonas: [
            'executive-assistant',
            'chief-of-staff',
            'travel-coordinator',
            'office-manager',
            'executive-administrator',
        ],
        targetIndustries: [
            'private-equity',
            'venture-capital',
            'investment-banking',
            'technology',
            'real-estate',
            'entertainment',
            'professional-sports',
        ],
        leadScoring: {
            enabled: true,
            weights: {
                companySize: 0.2,
                fundingStage: 0.3,
                jobTitle: 0.25,
                location: 0.25,
            },
        },
    },
};

/**
 * Health Check Configuration for All MCP Servers
 */
export const mcpHealthCheckConfig = {
    apollo: {
        endpoint: '/health',
        timeout: 5000,
        retryAttempts: 3,
    },
    avinode: {
        endpoint: '/health',
        timeout: 5000,
        retryAttempts: 3,
    },
    n8n: {
        endpoint: '/health',
        timeout: 5000,
        retryAttempts: 3,
    },
};

/**
 * Export individual configurations for backward compatibility
 */
export { apolloMCPConfig, n8nMCPConfig };
