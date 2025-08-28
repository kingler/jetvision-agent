/**
 * N8N Response Transformer
 * Handles transformation of n8n workflow responses to match the JetVision chat UI format
 */

import { ThreadItem } from '@repo/shared/types';

export interface N8nWebhookResponse {
    response?: string;
    message?: string;
    executionId?: string;
    workflowId?: string;
    timestamp?: string;
    metadata?: any;
    output?: string;
    text?: string;
}

export interface StructuredApiData {
    type: 'apollo_leads' | 'apollo_campaign' | 'apollo_enrichment' | 
          'aircraft_search' | 'booking_quote' | 'fleet_status' | 'text';
    data?: any;
    summary?: string;
    actions?: any[];
    recommendations?: string[];
    sources?: any[];
}

/**
 * Main transformer function for n8n responses
 */
export function transformN8nResponse(
    webhookData: N8nWebhookResponse,
    threadId: string,
    threadItemId: string
): Partial<ThreadItem> {
    // Extract the response text from various possible fields
    const responseText = extractResponseText(webhookData);
    
    // Parse for structured data (Apollo/Avinode responses)
    const structuredData = extractStructuredData(responseText);
    
    // Extract sources if mentioned in the response
    const sources = extractSources(responseText, structuredData);
    
    // Build the transformed response
    return {
        id: threadItemId,
        threadId,
        answer: {
            text: formatDisplayText(responseText, structuredData),
            structured: structuredData
        },
        sources,
        metadata: {
            executionId: webhookData.executionId,
            workflowId: webhookData.workflowId,
            timestamp: webhookData.timestamp || new Date().toISOString(),
            source: 'n8n'
        },
        status: 'COMPLETED' as const
    };
}

/**
 * Extract response text from various possible fields
 */
function extractResponseText(webhookData: N8nWebhookResponse): string {
    return webhookData.response || 
           webhookData.message || 
           webhookData.output || 
           webhookData.text ||
           JSON.stringify(webhookData);
}

/**
 * Parse response text for structured Apollo.io or Avinode data
 */
export function extractStructuredData(responseText: string): StructuredApiData | null {
    try {
        // Check for Apollo.io lead data patterns
        if (responseText.includes('Executive Assistant') || 
            responseText.includes('Lead Discovery') ||
            responseText.includes('Apollo.io')) {
            return parseApolloResponse(responseText);
        }
        
        // Check for Avinode aircraft data patterns
        if (responseText.includes('aircraft') || 
            responseText.includes('charter') ||
            responseText.includes('Gulfstream') ||
            responseText.includes('Avinode')) {
            return parseAvinodeResponse(responseText);
        }
        
        // Check if response contains JSON-like structure
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.type && parsed.data) {
                    return parsed as StructuredApiData;
                }
            } catch {
                // Not valid JSON, continue
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error extracting structured data:', error);
        return null;
    }
}

/**
 * Parse Apollo.io specific response format
 */
function parseApolloResponse(responseText: string): StructuredApiData {
    const data: StructuredApiData = {
        type: 'apollo_leads',
        data: {
            leads: [],
            metrics: {}
        },
        summary: '',
        actions: []
    };
    
    // Extract lead information from formatted text
    const leadMatches = responseText.matchAll(/(?:[-•]\s*)([^:]+):\s*([^\n]+)/g);
    const leads: any[] = [];
    
    for (const match of leadMatches) {
        if (match[1].includes('Name') || match[1].includes('Title') || match[1].includes('Company')) {
            leads.push({
                field: match[1].trim(),
                value: match[2].trim()
            });
        }
    }
    
    if (leads.length > 0) {
        data.data.leads = leads;
    }
    
    // Extract metrics if present
    const metricsMatch = responseText.match(/(\d+%?\s*(?:open|click|response|conversion)\s*rate)/gi);
    if (metricsMatch) {
        data.data.metrics = {
            rates: metricsMatch
        };
    }
    
    // Generate summary
    data.summary = `Found ${leads.length} Apollo.io results`;
    
    return data;
}

/**
 * Parse Avinode specific response format
 */
function parseAvinodeResponse(responseText: string): StructuredApiData {
    const data: StructuredApiData = {
        type: 'aircraft_search',
        data: {
            aircraft: [],
            pricing: {}
        },
        summary: '',
        recommendations: []
    };
    
    // Extract aircraft information
    const aircraftPattern = /(Gulfstream|Citation|Learjet|Falcon|Hawker|Embraer|Boeing|Airbus)\s+([A-Z0-9-]+)/gi;
    const aircraftMatches = responseText.matchAll(aircraftPattern);
    const aircraft: any[] = [];
    
    for (const match of aircraftMatches) {
        aircraft.push({
            manufacturer: match[1],
            model: match[2],
            fullName: `${match[1]} ${match[2]}`
        });
    }
    
    if (aircraft.length > 0) {
        data.data.aircraft = aircraft;
    }
    
    // Extract pricing if present
    const priceMatch = responseText.match(/\$[\d,]+(?:\.\d{2})?/g);
    if (priceMatch) {
        data.data.pricing = {
            quotes: priceMatch
        };
    }
    
    // Extract recommendations
    const recMatch = responseText.match(/recommend[^.]*\./gi);
    if (recMatch) {
        data.recommendations = recMatch.map(r => r.trim());
    }
    
    // Generate summary
    data.summary = `Found ${aircraft.length} available aircraft`;
    
    return data;
}

/**
 * Extract source URLs and references from response
 */
function extractSources(responseText: string, structuredData: StructuredApiData | null): any[] {
    const sources: any[] = [];
    
    // Extract URLs from text
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const urls = responseText.match(urlPattern);
    
    if (urls) {
        urls.forEach((url, index) => {
            sources.push({
                id: `source-${index}`,
                url,
                title: extractDomain(url),
                type: 'web'
            });
        });
    }
    
    // Add structured data sources
    if (structuredData?.sources) {
        sources.push(...structuredData.sources);
    }
    
    // Add API sources based on response type
    if (structuredData?.type?.includes('apollo')) {
        sources.push({
            id: 'apollo-api',
            title: 'Apollo.io API',
            type: 'api',
            icon: '🚀'
        });
    }
    
    if (structuredData?.type?.includes('aircraft') || structuredData?.type?.includes('fleet')) {
        sources.push({
            id: 'avinode-api',
            title: 'Avinode Platform',
            type: 'api',
            icon: '✈️'
        });
    }
    
    return sources;
}

/**
 * Format display text for optimal rendering
 */
export function formatDisplayText(responseText: string, structuredData: StructuredApiData | null): string {
    // If we have structured data, format it nicely
    if (structuredData) {
        let formattedText = responseText;
        
        // Add data type indicator
        if (structuredData.type === 'apollo_leads') {
            formattedText = `**Apollo.io Lead Intelligence**\n\n${formattedText}`;
        } else if (structuredData.type === 'aircraft_search') {
            formattedText = `**Avinode Aircraft Availability**\n\n${formattedText}`;
        }
        
        // Add execution metadata if not already present
        if (!formattedText.includes('Generated by JetVision')) {
            formattedText += '\n\n---\n*Generated by JetVision Agent via n8n workflow*';
        }
        
        return formattedText;
    }
    
    return responseText;
}

/**
 * Extract domain from URL for source titles
 */
function extractDomain(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return 'External Source';
    }
}

/**
 * Check if response indicates an error
 */
export function isErrorResponse(responseText: string): boolean {
    const errorIndicators = [
        'error',
        'failed',
        'unable to',
        'could not',
        'exception',
        'not found',
        'unauthorized',
        'forbidden'
    ];
    
    const lowerText = responseText.toLowerCase();
    return errorIndicators.some(indicator => lowerText.includes(indicator));
}

/**
 * Parse tool calls from n8n workflow execution
 */
export function extractToolCalls(responseText: string): any[] {
    const toolCalls: any[] = [];
    
    // Look for MCP tool invocations
    const toolPatterns = [
        /(?:Using|Calling|Executing)\s+tool:\s*([^\n]+)/gi,
        /Tool\s+([^\s]+)\s+(?:called|executed|invoked)/gi,
        /\[Tool:\s*([^\]]+)\]/gi
    ];
    
    toolPatterns.forEach(pattern => {
        const matches = responseText.matchAll(pattern);
        for (const match of matches) {
            toolCalls.push({
                name: match[1].trim(),
                status: 'completed'
            });
        }
    });
    
    return toolCalls;
}