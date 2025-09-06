import { MCPServersConfig } from './mcp';

/**
 * JetVision Apollo.io MCP Server Configuration
 * Integrates Apollo.io tools for lead generation, campaign management,
 * and executive assistant targeting for private jet charter services
 */
export const apolloMCPConfig: MCPServersConfig = {
    proxyEndpoint: process.env.MCP_PROXY_ENDPOINT || '/api/mcp/proxy',
    mcpServers: {
        'apollo-io': process.env.APOLLO_MCP_SERVER_URL || 'http://localhost:3001/apollo',
        avinode: process.env.AVAINODE_MCP_SERVER_URL || 'http://localhost:3002/avinode',
    },
};

/**
 * Apollo.io Tool Definitions for JetVision
 * These tools are specifically configured for private jet charter industry
 */
export const apolloToolDefinitions = {
    // Lead Discovery & Research
    'search-executive-assistants': {
        name: 'search-executive-assistants',
        description: 'Find executive assistants at target companies for jet charter outreach',
        category: 'lead-discovery',
    },
    'find-funding-companies': {
        name: 'find-funding-companies',
        description: 'Identify companies that recently raised funding (high travel potential)',
        category: 'lead-discovery',
    },
    'job-change-alerts': {
        name: 'job-change-alerts',
        description: 'Monitor prospects who changed jobs in the last 30 days',
        category: 'lead-discovery',
    },

    // Campaign Management
    'launch-campaign': {
        name: 'launch-campaign',
        description: 'Start targeted campaigns for jet charter services',
        category: 'campaign',
    },
    'track-conversions': {
        name: 'track-conversions',
        description: 'Monitor conversion rates and campaign performance',
        category: 'analytics',
    },
    'sequence-management': {
        name: 'sequence-management',
        description: 'Manage automated email sequences for prospects',
        category: 'campaign',
    },

    // Performance Analytics
    'response-rates': {
        name: 'response-rates',
        description: 'Analyze email response rates by industry and persona',
        category: 'analytics',
    },
    'cost-per-lead': {
        name: 'cost-per-lead',
        description: 'Calculate and track cost per lead metrics',
        category: 'analytics',
    },
    'roi-analysis': {
        name: 'roi-analysis',
        description: 'Analyze ROI by lead source and campaign',
        category: 'analytics',
    },

    // Aviation-Specific Tools
    'empty-leg-prospects': {
        name: 'empty-leg-prospects',
        description: 'Identify prospects for empty leg flight opportunities',
        category: 'aviation',
    },
    'event-travel-targeting': {
        name: 'event-travel-targeting',
        description: 'Target prospects based on major events and conferences',
        category: 'aviation',
    },
    'corporate-travel-analysis': {
        name: 'corporate-travel-analysis',
        description: 'Analyze corporate travel patterns and needs',
        category: 'aviation',
    },
};

/**
 * Natural Language Command Mappings
 * Maps user queries to Apollo.io tool invocations
 */
export const apolloCommandMappings = {
    // Conversions & Performance
    'how many conversions': 'track-conversions',
    'conversion rate': 'track-conversions',
    'show conversions': 'track-conversions',

    // Response Rates
    'response rates': 'response-rates',
    'email performance': 'response-rates',
    'open rates': 'response-rates',

    // Lead Discovery
    'find executive assistants': 'search-executive-assistants',
    'executive assistant': 'search-executive-assistants',
    'find EA': 'search-executive-assistants',

    // Funding & Growth
    'raised funding': 'find-funding-companies',
    'new funding': 'find-funding-companies',
    'recently funded': 'find-funding-companies',

    // Job Changes
    'job changes': 'job-change-alerts',
    'changed jobs': 'job-change-alerts',
    'new position': 'job-change-alerts',

    // Campaign Launch
    'launch campaign': 'launch-campaign',
    'start campaign': 'launch-campaign',
    'kick off campaign': 'launch-campaign',

    // Cost Analysis
    'cost per lead': 'cost-per-lead',
    CPL: 'cost-per-lead',
    'lead cost': 'cost-per-lead',

    // ROI
    ROI: 'roi-analysis',
    'return on investment': 'roi-analysis',
    'lead source ROI': 'roi-analysis',

    // Aviation Specific
    'empty leg': 'empty-leg-prospects',
    'empty legs': 'empty-leg-prospects',
    'repositioning flights': 'empty-leg-prospects',

    // Event Targeting
    'conference attendees': 'event-travel-targeting',
    'event travel': 'event-travel-targeting',
    'major events': 'event-travel-targeting',
};

/**
 * Apollo.io Integration Settings for JetVision
 */
export const apolloSettings = {
    apiKey: process.env.APOLLO_API_KEY,
    workspace: process.env.APOLLO_WORKSPACE || 'jetvision',
    defaultSequenceId: process.env.APOLLO_DEFAULT_SEQUENCE,
    industryFilters: [
        'Private Equity',
        'Venture Capital',
        'Investment Banking',
        'Technology',
        'Real Estate',
        'Entertainment',
        'Professional Sports',
    ],
    personaFilters: [
        'Executive Assistant',
        'Chief of Staff',
        'Travel Coordinator',
        'Office Manager',
        'Executive Administrator',
    ],
    scoringCriteria: {
        companySize: { min: 50, weight: 0.2 },
        fundingStage: { preferred: ['Series B', 'Series C', 'IPO'], weight: 0.3 },
        jobTitle: { keywords: ['executive', 'chief', 'partner'], weight: 0.25 },
        location: { hubs: ['NYC', 'SF', 'LA', 'Miami', 'London'], weight: 0.25 },
    },
};
