/**
 * Agent Router System
 * Routes messages between OpenAI frontend agents and n8n workflow backend
 */

import { ChatMode, ChatModeConfig } from '@repo/shared/config';
import {
    classifyAviationMessage,
    getAviationContext,
    type AviationContext,
} from './aviation-classifier';

export interface RoutingDecision {
    useOpenAI: boolean;
    useN8N: boolean;
    routingStrategy: 'openai-only' | 'n8n-only' | 'hybrid' | 'sequential';
    reasoning: string;
    aviationContext?: AviationContext;
    apolloContext?: ApolloContext;
    instructions: {
        openaiPrompt?: string;
        n8nPayload?: Record<string, any>;
        followUpActions?: string[];
        hybridMode?: 'apollo-insights' | 'aviation-data' | 'general-hybrid';
    };
}

export interface ApolloContext {
    isApolloQuery: boolean;
    apolloIntentType: 'people_search' | 'company_search' | 'campaign_analysis' | 'sequence_management' | 'lead_generation' | 'generic';
    extractedParameters: Record<string, any>;
    requiresDataFetch: boolean;
    confidence: number;
}

/**
 * Main routing function that determines how to handle a message
 */
export function routeMessage(
    message: string,
    chatMode: ChatMode,
    threadContext?: {
        threadId?: string;
        previousMessages?: Array<{ role: string; content: string }>;
    }
): RoutingDecision {
    // Get aviation classification
    const aviationContext = getAviationContext(message);
    const config = ChatModeConfig[chatMode];

    // Get Apollo classification for hybrid processing
    const apolloContext = getApolloContext(message);

    // Check if aviation routing is enabled for this chat mode
    const isAviationRoutingEnabled = config?.isAviationRouted ?? true;

    // Apollo hybrid routing logic
    if (apolloContext.isApolloQuery && apolloContext.requiresDataFetch) {
        return createApolloHybridRouting(message, chatMode, apolloContext, aviationContext, threadContext);
    }

    if (aviationContext.shouldRoute && isAviationRoutingEnabled) {
        // Aviation-related message - route to n8n workflow
        return createN8NRouting(message, chatMode, aviationContext, threadContext);
    } else {
        // Non-aviation message - handle with OpenAI frontend agent
        return createOpenAIRouting(message, chatMode, threadContext);
    }
}

/**
 * Create routing decision for n8n workflow (aviation-related)
 */
function createN8NRouting(
    message: string,
    chatMode: ChatMode,
    aviationContext: AviationContext,
    threadContext?: {
        threadId?: string;
        previousMessages?: Array<{ role: string; content: string }>;
    }
): RoutingDecision {
    // Enhanced n8n payload with aviation context
    const n8nPayload = {
        message,
        chatMode,
        threadId: threadContext?.threadId,
        aviationContext: {
            classification: aviationContext.classification,
            suggestedActions: aviationContext.suggestedActions,
            confidence: aviationContext.classification.confidence,
            categories: aviationContext.classification.categories,
        },
        routing: {
            source: 'openai-frontend',
            timestamp: new Date().toISOString(),
            model: chatMode,
        },
        context: {
            useWebSearch: ChatModeConfig[chatMode]?.webSearch ?? true,
            previousMessages: threadContext?.previousMessages?.slice(-5) ?? [], // Last 5 messages for context
        },
    };

    return {
        useOpenAI: false,
        useN8N: true,
        routingStrategy: 'n8n-only',
        reasoning: `Aviation content detected (confidence: ${aviationContext.classification.confidence}): ${aviationContext.routingReason}`,
        aviationContext,
        instructions: {
            n8nPayload,
            followUpActions: aviationContext.suggestedActions,
        },
    };
}

/**
 * Create routing decision for OpenAI frontend agent (non-aviation)
 */
function createOpenAIRouting(
    message: string,
    chatMode: ChatMode,
    threadContext?: {
        threadId?: string;
        previousMessages?: Array<{ role: string; content: string }>;
    }
): RoutingDecision {
    // Enhanced OpenAI prompt for general queries
    const openaiPrompt = createOpenAIPrompt(message, chatMode, threadContext);

    return {
        useOpenAI: true,
        useN8N: false,
        routingStrategy: 'openai-only',
        reasoning: 'Non-aviation query - handling with OpenAI frontend agent',
        instructions: {
            openaiPrompt,
            followUpActions: [
                'Provide comprehensive response',
                'Suggest aviation-related follow-up if relevant',
            ],
        },
    };
}

/**
 * Create enhanced OpenAI prompt with JetVision context
 */
function createOpenAIPrompt(
    message: string,
    chatMode: ChatMode,
    threadContext?: {
        threadId?: string;
        previousMessages?: Array<{ role: string; content: string }>;
    }
): string {
    const contextPrompt = `You are JetVision Agent, an AI assistant specializing in private aviation, business jet charter, and executive travel services. While this query appears to be non-aviation related, you should still maintain your aviation expertise persona.

Your knowledge areas include:
- Private jet charter and aircraft rental
- Business aviation services and fleet management
- Apollo.io for aviation lead generation
- Avinode marketplace for aircraft operators
- Executive travel planning and luxury services
- Aviation regulations and industry insights

Current query: "${message}"

Instructions:
1. Provide a helpful, comprehensive response to the user's question
2. If the query has any potential connection to aviation or business travel, mention relevant aviation services
3. Maintain a professional, knowledgeable tone consistent with aviation industry standards
4. If appropriate, suggest how JetVision Agent's aviation expertise might be relevant

${threadContext?.previousMessages?.length ? `Previous context:\n${threadContext.previousMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n` : ''}

Please respond:`;

    return contextPrompt;
}

/**
 * Hybrid routing for complex queries that might benefit from both agents
 */
export function createHybridRouting(
    message: string,
    chatMode: ChatMode,
    aviationContext: AviationContext,
    threadContext?: {
        threadId?: string;
        previousMessages?: Array<{ role: string; content: string }>;
    }
): RoutingDecision {
    return {
        useOpenAI: true,
        useN8N: true,
        routingStrategy: 'hybrid',
        reasoning: `Complex query with aviation elements - using both OpenAI frontend and n8n workflow`,
        aviationContext,
        instructions: {
            openaiPrompt: createOpenAIPrompt(message, chatMode, threadContext),
            n8nPayload: {
                message,
                chatMode,
                threadId: threadContext?.threadId,
                aviationContext: aviationContext.classification,
                isHybridRequest: true,
            },
            followUpActions: [
                'Process with OpenAI for general context',
                'Route aviation-specific elements to n8n',
                'Combine responses for comprehensive answer',
            ],
        },
    };
}

/**
 * Sequential routing - OpenAI first, then n8n if needed
 */
export function createSequentialRouting(
    message: string,
    chatMode: ChatMode,
    aviationContext: AviationContext,
    threadContext?: {
        threadId?: string;
        previousMessages?: Array<{ role: string; content: string }>;
    }
): RoutingDecision {
    return {
        useOpenAI: true,
        useN8N: false, // N8N will be triggered based on OpenAI response
        routingStrategy: 'sequential',
        reasoning: 'Starting with OpenAI, will route to n8n if aviation-specific data needed',
        aviationContext,
        instructions: {
            openaiPrompt: `${createOpenAIPrompt(message, chatMode, threadContext)}\n\nIMPORTANT: If you determine this query requires specific aviation data, aircraft information, or marketplace queries, respond with "ROUTE_TO_N8N" followed by your analysis.`,
            followUpActions: [
                'Analyze with OpenAI first',
                'Route to n8n if specialized aviation data needed',
                'Provide combined response',
            ],
        },
    };
}

/**
 * Get Apollo context from message for hybrid processing
 */
export function getApolloContext(message: string): ApolloContext {
    const lowerMessage = message.toLowerCase();
    
    // Apollo-specific keywords and patterns
    const apolloKeywords = [
        'executive assistant', 'ea', 'find people', 'search contacts', 'prospects',
        'private equity', 'pe firms', 'managing director', 'apollo', 'lead generation',
        'email sequence', 'campaign', 'outreach', 'linkedin', 'company search',
        'organization', 'ceo', 'cfo', 'executives', 'decision makers', 'contacts'
    ];

    // Intent type detection
    let apolloIntentType: ApolloContext['apolloIntentType'] = 'generic';
    let confidence = 0;
    let requiresDataFetch = false;
    const extractedParameters: Record<string, any> = {};

    // People search patterns
    if (lowerMessage.includes('find') && (lowerMessage.includes('people') || lowerMessage.includes('contacts') || lowerMessage.includes('executive'))) {
        apolloIntentType = 'people_search';
        confidence = 0.8;
        requiresDataFetch = true;
        
        // Extract parameters for people search
        const titleMatches = lowerMessage.match(/(?:find|search for|looking for)\s+([^,\n]+?)(?:\s+at|\s+in|\s+from|\s+with|$)/i);
        if (titleMatches && titleMatches[1]) {
            extractedParameters.person_titles = [titleMatches[1].trim()];
        }
        
        const locationMatches = lowerMessage.match(/(?:in|at|from|based in)\s+([\w\s]+?)(?:\s+|$)/gi);
        if (locationMatches) {
            extractedParameters.person_locations = locationMatches.map(match => 
                match.replace(/^(in|at|from|based in)\s+/i, '').trim()
            );
        }
    }
    
    // Company search patterns
    else if (lowerMessage.includes('company') || lowerMessage.includes('organization') || lowerMessage.includes('firms')) {
        apolloIntentType = 'company_search';
        confidence = 0.7;
        requiresDataFetch = true;
        
        // Extract company parameters
        const sizeMatches = lowerMessage.match(/(\d+[\+\-\s\d]*)\s*(?:employees|people|staff)/i);
        if (sizeMatches) {
            extractedParameters.organization_num_employees_ranges = [sizeMatches[1].trim()];
        }
    }
    
    // Campaign/sequence patterns
    else if (lowerMessage.includes('sequence') || lowerMessage.includes('campaign') || lowerMessage.includes('outreach')) {
        apolloIntentType = 'sequence_management';
        confidence = 0.6;
        requiresDataFetch = true;
    }
    
    // Lead generation patterns
    else if (lowerMessage.includes('lead') || lowerMessage.includes('prospect')) {
        apolloIntentType = 'lead_generation';
        confidence = 0.7;
        requiresDataFetch = true;
    }

    // Check for Apollo keywords to boost confidence
    const keywordMatches = apolloKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
    confidence = Math.min(confidence + (keywordMatches * 0.1), 0.9);

    return {
        isApolloQuery: confidence > 0.3,
        apolloIntentType,
        extractedParameters,
        requiresDataFetch: requiresDataFetch && confidence > 0.4,
        confidence
    };
}

/**
 * Create Apollo hybrid routing for queries that need both data and commentary
 */
export function createApolloHybridRouting(
    message: string,
    chatMode: ChatMode,
    apolloContext: ApolloContext,
    aviationContext: AviationContext,
    threadContext?: {
        threadId?: string;
        previousMessages?: Array<{ role: string; content: string }>;
    }
): RoutingDecision {
    // Create Apollo-specific commentary prompt
    const apolloCommentaryPrompt = `You are JetVision Agent, specializing in aviation lead generation and Apollo.io intelligence. You will receive Apollo.io data and provide expert commentary and insights.

User Query: "${message}"
Apollo Intent: ${apolloContext.apolloIntentType}
Extracted Parameters: ${JSON.stringify(apolloContext.extractedParameters)}

Your role:
1. First, analyze the user's intent and optimize parameters for Apollo.io data retrieval
2. After receiving Apollo data, provide intelligent commentary with:
   - Executive summary of findings
   - Key insights and patterns
   - Aviation industry context
   - Actionable recommendations
   - Next steps for the user

Maintain a conversational, expert tone while referencing specific data points from the results.`;

    // Enhanced N8N payload with Apollo context
    const n8nPayload = {
        message,
        chatMode,
        threadId: threadContext?.threadId,
        apolloContext: {
            intentType: apolloContext.apolloIntentType,
            parameters: apolloContext.extractedParameters,
            confidence: apolloContext.confidence,
        },
        aviationContext: aviationContext.classification,
        isHybridRequest: true,
        hybridType: 'apollo-insights',
        routing: {
            source: 'apollo-hybrid-router',
            timestamp: new Date().toISOString(),
            model: chatMode,
        },
    };

    return {
        useOpenAI: true,
        useN8N: true,
        routingStrategy: 'hybrid',
        reasoning: `Apollo query detected (${apolloContext.apolloIntentType}, confidence: ${apolloContext.confidence}) - using hybrid processing for data + commentary`,
        aviationContext,
        apolloContext,
        instructions: {
            openaiPrompt: apolloCommentaryPrompt,
            n8nPayload,
            hybridMode: 'apollo-insights',
            followUpActions: [
                'Extract and validate Apollo parameters',
                'Fetch real data via Apollo MCP server',
                'Generate intelligent commentary on results',
                'Provide actionable next steps',
            ],
        },
    };
}

/**
 * Get routing strategy recommendation based on message complexity
 */
export function getRecommendedStrategy(
    message: string,
    aviationContext: AviationContext
): RoutingDecision['routingStrategy'] {
    const messageLength = message.split(' ').length;
    const confidence = aviationContext.classification.confidence;
    const categoryCount = aviationContext.classification.categories.length;

    // Simple aviation query -> n8n only
    if (confidence > 0.8 && messageLength < 20) {
        return 'n8n-only';
    }

    // Clear non-aviation query -> OpenAI only
    if (confidence < 0.2 && categoryCount === 0) {
        return 'openai-only';
    }

    // Complex query with mixed content -> hybrid
    if (messageLength > 50 && confidence > 0.4 && categoryCount > 2) {
        return 'hybrid';
    }

    // Moderate aviation content -> sequential
    if (confidence > 0.3 && confidence < 0.7) {
        return 'sequential';
    }

    // Default to appropriate single-agent routing
    return confidence > 0.5 ? 'n8n-only' : 'openai-only';
}
