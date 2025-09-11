import { MCPServersConfig } from './mcp';

/**
 * JetVision N8N MCP Server Configuration
 * Integrates n8n workflow management tools for automated lead generation,
 * workflow orchestration, and business process automation
 */
export const n8nMCPConfig: MCPServersConfig = {
    proxyEndpoint: process.env.MCP_PROXY_ENDPOINT || '/api/mcp/proxy',
    mcpServers: {
        'n8n-workflow': process.env.N8N_MCP_SERVER_URL || 'http://localhost:3003/n8n',
    },
};

/**
 * N8N Tool Definitions for JetVision
 * These tools provide comprehensive n8n workflow management capabilities
 */
export const n8nToolDefinitions = {
    // Workflow Management
    'list-workflows': {
        name: 'list-workflows',
        description: 'List all n8n workflows with filtering options',
        category: 'workflow-management',
    },
    'get-workflow': {
        name: 'get-workflow',
        description: 'Get detailed information about a specific workflow',
        category: 'workflow-management',
    },
    'create-workflow': {
        name: 'create-workflow',
        description: 'Create a new n8n workflow',
        category: 'workflow-management',
    },
    'update-workflow': {
        name: 'update-workflow',
        description: 'Update an existing n8n workflow',
        category: 'workflow-management',
    },
    'delete-workflow': {
        name: 'delete-workflow',
        description: 'Delete a workflow and optionally its executions',
        category: 'workflow-management',
    },
    'activate-workflow': {
        name: 'activate-workflow',
        description: 'Activate a workflow to enable automatic execution',
        category: 'workflow-management',
    },
    'deactivate-workflow': {
        name: 'deactivate-workflow',
        description: 'Deactivate a workflow to stop automatic execution',
        category: 'workflow-management',
    },

    // Execution Management
    'list-executions': {
        name: 'list-executions',
        description: 'List workflow executions with filtering and pagination',
        category: 'execution-management',
    },
    'execute-workflow': {
        name: 'execute-workflow',
        description: 'Manually execute a workflow with optional data input',
        category: 'execution-management',
    },
    'get-execution': {
        name: 'get-execution',
        description: 'Get detailed information about a specific execution',
        category: 'execution-management',
    },
    'retry-execution': {
        name: 'retry-execution',
        description: 'Retry a failed workflow execution',
        category: 'execution-management',
    },
    'stop-execution': {
        name: 'stop-execution',
        description: 'Stop a running workflow execution',
        category: 'execution-management',
    },
    'delete-execution': {
        name: 'delete-execution',
        description: 'Delete a workflow execution',
        category: 'execution-management',
    },

    // Credential Management
    'list-credentials': {
        name: 'list-credentials',
        description: 'List all n8n credentials with filtering options',
        category: 'credential-management',
    },
    'create-credential': {
        name: 'create-credential',
        description: 'Create a new credential for API integrations',
        category: 'credential-management',
    },
    'get-credential': {
        name: 'get-credential',
        description: 'Get detailed information about a specific credential',
        category: 'credential-management',
    },
    'update-credential': {
        name: 'update-credential',
        description: 'Update an existing credential',
        category: 'credential-management',
    },
    'test-credential': {
        name: 'test-credential',
        description: 'Test a credential to verify it works correctly',
        category: 'credential-management',
    },
    'delete-credential': {
        name: 'delete-credential',
        description: 'Delete a credential',
        category: 'credential-management',
    },

    // Tag Management
    'list-tags': {
        name: 'list-tags',
        description: 'List all workflow tags',
        category: 'tag-management',
    },
    'create-tag': {
        name: 'create-tag',
        description: 'Create a new tag for organizing workflows',
        category: 'tag-management',
    },
    'update-workflow-tags': {
        name: 'update-workflow-tags',
        description: 'Update tags associated with a workflow',
        category: 'tag-management',
    },

    // User Management
    'list-users': {
        name: 'list-users',
        description: 'List all n8n users',
        category: 'user-management',
    },
    'get-user': {
        name: 'get-user',
        description: 'Get detailed information about a specific user',
        category: 'user-management',
    },

    // Variable Management
    'list-variables': {
        name: 'list-variables',
        description: 'List all n8n variables',
        category: 'variable-management',
    },
    'create-variable': {
        name: 'create-variable',
        description: 'Create a new n8n variable',
        category: 'variable-management',
    },
    'update-variable': {
        name: 'update-variable',
        description: 'Update an existing n8n variable',
        category: 'variable-management',
    },
    'delete-variable': {
        name: 'delete-variable',
        description: 'Delete a n8n variable',
        category: 'variable-management',
    },

    // Utility Tools
    'check-connectivity': {
        name: 'check-connectivity',
        description: 'Check connectivity to n8n instance',
        category: 'utility',
    },
    'get-health-status': {
        name: 'get-health-status',
        description: 'Get health status of n8n instance',
        category: 'utility',
    },
    'upload-workflow': {
        name: 'upload-workflow',
        description: 'Upload a workflow file to n8n',
        category: 'utility',
    },
};

/**
 * Natural Language Command Mappings for N8N
 * Maps user queries to n8n tool invocations
 */
export const n8nCommandMappings = {
    // Workflow Operations
    'list workflows': 'list-workflows',
    'show workflows': 'list-workflows',
    'get workflow': 'get-workflow',
    'workflow details': 'get-workflow',
    'create workflow': 'create-workflow',
    'new workflow': 'create-workflow',
    'update workflow': 'update-workflow',
    'edit workflow': 'update-workflow',
    'delete workflow': 'delete-workflow',
    'remove workflow': 'delete-workflow',
    'activate workflow': 'activate-workflow',
    'enable workflow': 'activate-workflow',
    'start workflow': 'activate-workflow',
    'deactivate workflow': 'deactivate-workflow',
    'disable workflow': 'deactivate-workflow',
    'stop workflow': 'deactivate-workflow',

    // Execution Operations
    'list executions': 'list-executions',
    'show executions': 'list-executions',
    'run workflow': 'execute-workflow',
    'execute workflow': 'execute-workflow',
    'trigger workflow': 'execute-workflow',
    'execution details': 'get-execution',
    'retry execution': 'retry-execution',
    'restart execution': 'retry-execution',
    'stop execution': 'stop-execution',
    'cancel execution': 'stop-execution',

    // Credential Operations
    'list credentials': 'list-credentials',
    'show credentials': 'list-credentials',
    'create credential': 'create-credential',
    'add credential': 'create-credential',
    'credential details': 'get-credential',
    'test credential': 'test-credential',
    'verify credential': 'test-credential',
    'update credential': 'update-credential',
    'edit credential': 'update-credential',
    'delete credential': 'delete-credential',
    'remove credential': 'delete-credential',

    // Tag Operations
    'list tags': 'list-tags',
    'show tags': 'list-tags',
    'create tag': 'create-tag',
    'add tag': 'create-tag',
    'update tags': 'update-workflow-tags',
    'tag workflow': 'update-workflow-tags',

    // User Operations
    'list users': 'list-users',
    'show users': 'list-users',
    'user details': 'get-user',

    // Variable Operations
    'list variables': 'list-variables',
    'show variables': 'list-variables',
    'create variable': 'create-variable',
    'add variable': 'create-variable',
    'update variable': 'update-variable',
    'edit variable': 'update-variable',
    'delete variable': 'delete-variable',
    'remove variable': 'delete-variable',

    // Utility Operations
    'check connection': 'check-connectivity',
    'test connection': 'check-connectivity',
    'health check': 'get-health-status',
    'system status': 'get-health-status',
    'upload workflow': 'upload-workflow',
    'import workflow': 'upload-workflow',
};

/**
 * N8N Integration Settings for JetVision
 */
export const n8nSettings = {
    apiUrl: process.env.N8N_API_URL || 'http://localhost:5678/api/v1',
    apiKey: process.env.N8N_API_KEY,
    webhookUsername: process.env.N8N_WEBHOOK_USERNAME,
    webhookPassword: process.env.N8N_WEBHOOK_PASSWORD,
    timeout: parseInt(process.env.N8N_API_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.N8N_API_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.N8N_API_RETRY_DELAY || '1000'),
    
    // JetVision specific workflow categories
    workflowCategories: [
        'lead-generation',
        'apollo-integration',
        'email-automation',
        'data-processing',
        'reporting',
        'aviation-specific',
    ],
    
    // Default workflow settings for JetVision
    defaultWorkflowSettings: {
        errorWorkflow: 'error-handler',
        timezone: 'UTC',
        executionTimeout: 3600, // 1 hour
        saveDataErrorExecution: 'all',
        saveDataSuccessExecution: 'all',
        saveManualExecutions: true,
    },
    
    // Lead generation specific configurations
    leadGenerationConfig: {
        apolloIntegration: {
            enabled: true,
            defaultSequenceId: process.env.APOLLO_DEFAULT_SEQUENCE,
            batchSize: 100,
            delayBetweenBatches: 2000, // 2 seconds
        },
        emailAutomation: {
            enabled: true,
            maxEmailsPerDay: 1000,
            delayBetweenEmails: 1000, // 1 second
        },
        dataValidation: {
            enabled: true,
            requiredFields: ['email', 'company', 'job_title'],
            emailValidation: true,
            duplicateCheck: true,
        },
    },
};
