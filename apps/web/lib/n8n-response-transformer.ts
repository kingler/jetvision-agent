/**
 * N8N Response Transformer
 * Transforms raw n8n webhook responses into structured format expected by the UI
 */

export interface StructuredData {
    type: 'apollo_leads' | 'people_search' | 'aircraft_search' | 'booking_data' | 'google_sheets' | 'general';
    data: any;
}

export interface TransformedResponse {
    id: string;
    threadId: string;
    answer: {
        text: string;
        structured: StructuredData | null;
    };
    sources: any[];
    metadata: {
        executionId?: string;
        workflowId?: string;
        source: string;
        timestamp?: string;
        [key: string]: any;
    };
    status: 'COMPLETED' | 'ERROR' | 'PENDING';
}

/**
 * Main transformer function that processes n8n webhook responses
 */
export function transformN8nResponse(
    webhookData: any,
    threadId: string,
    threadItemId: string
): TransformedResponse {
    try {
        // Extract the main response text from various possible field names
        const responseText = extractResponseText(webhookData);

        // Try to extract structured data from the response
        const structuredData = extractStructuredData(responseText);

        // Format the display text with appropriate headers and formatting
        const formattedText = formatDisplayText(responseText, structuredData);

        return {
            id: threadItemId || `n8n-${Date.now()}`,
            threadId,
            answer: {
                text: formattedText,
                structured: structuredData,
            },
            sources: extractSources(webhookData),
            metadata: {
                executionId: webhookData.executionId,
                workflowId: webhookData.workflowId,
                source: 'n8n',
                timestamp: new Date().toISOString(),
                originalData: webhookData,
            },
            status: 'COMPLETED',
        };
    } catch (error) {
        console.error('Error transforming n8n response:', error);

        return {
            id: threadItemId || `n8n-error-${Date.now()}`,
            threadId,
            answer: {
                text: 'I encountered an error processing the response from our business intelligence system. Please try your request again.',
                structured: null,
            },
            sources: [],
            metadata: {
                executionId: webhookData?.executionId,
                source: 'n8n',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            },
            status: 'ERROR',
        };
    }
}

/**
 * Extract response text from various possible field names in webhook data
 */
function extractResponseText(webhookData: any): string {
    // Handle array responses (common with n8n workflows)
    if (Array.isArray(webhookData)) {
        if (webhookData.length > 0) {
            return extractResponseText(webhookData[0]);
        }
        return 'Empty array response';
    }

    // Try different field names that might contain the response
    const possibleFields = ['response', 'message', 'output', 'text', 'result', 'answer', 'content'];

    for (const field of possibleFields) {
        if (webhookData[field]) {
            const value = webhookData[field];
            
            // If it's a string that looks like JSON, try to parse and format it
            if (typeof value === 'string') {
                const trimmedValue = value.trim();
                
                // Check if it's JSON string
                if ((trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) ||
                    (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))) {
                    try {
                        const parsed = JSON.parse(trimmedValue);
                        return formatParsedResponse(parsed);
                    } catch {
                        // If JSON parsing fails, return as-is
                        return trimmedValue;
                    }
                }
                
                return trimmedValue;
            }
            
            // If it's already an object, format it
            if (typeof value === 'object' && value !== null) {
                return formatParsedResponse(value);
            }
        }
    }

    // If no standard field found, try to extract from nested data
    if (webhookData.data) {
        for (const field of possibleFields) {
            if (webhookData.data[field]) {
                const value = webhookData.data[field];
                if (typeof value === 'string') {
                    return value.trim();
                }
                if (typeof value === 'object' && value !== null) {
                    return formatParsedResponse(value);
                }
            }
        }
    }

    // Last resort: stringify the entire object if it has meaningful data
    if (typeof webhookData === 'object' && webhookData !== null) {
        const keys = Object.keys(webhookData);
        if (
            keys.length > 0 &&
            !keys.every(key => ['executionId', 'workflowId', 'timestamp'].includes(key))
        ) {
            return formatParsedResponse(webhookData);
        }
    }

    return 'No response data available';
}

/**
 * Format parsed JSON responses for better display
 */
function formatParsedResponse(data: any): string {
    if (!data || typeof data !== 'object') {
        return String(data || '');
    }

    // Handle Google Sheets response specifically
    if (data.spreadsheetId && data.spreadsheetUrl) {
        return formatGoogleSheetsResponse(data);
    }

    // Handle Apollo.io people search responses
    if (data.people || (Array.isArray(data) && data[0]?.name)) {
        return formatPeopleSearchResponse(data);
    }

    // Handle Avinode aircraft responses
    if (data.aircraft || (Array.isArray(data) && data[0]?.manufacturer)) {
        return formatAircraftResponse(data);
    }

    // Default formatting for other structured data
    return JSON.stringify(data, null, 2);
}

/**
 * Format Google Sheets response for display
 */
function formatGoogleSheetsResponse(data: any): string {
    let formatted = `**📊 Google Sheets Created Successfully**\n\n`;
    
    if (data.properties?.title) {
        formatted += `**Title:** ${data.properties.title}\n`;
    }
    
    if (data.spreadsheetId) {
        formatted += `**Spreadsheet ID:** ${data.spreadsheetId}\n`;
    }
    
    if (data.spreadsheetUrl) {
        formatted += `**URL:** [Open Spreadsheet](${data.spreadsheetUrl})\n`;
    }
    
    if (data.sheets && data.sheets.length > 0) {
        formatted += `\n**Sheets:**\n`;
        data.sheets.forEach((sheet: any, index: number) => {
            formatted += `• ${sheet.properties?.title || `Sheet ${index + 1}`}`;
            if (sheet.properties?.gridProperties) {
                const rows = sheet.properties.gridProperties.rowCount;
                const cols = sheet.properties.gridProperties.columnCount;
                formatted += ` (${rows}x${cols})`;
            }
            formatted += `\n`;
        });
    }
    
    if (data.properties?.locale) {
        formatted += `\n**Locale:** ${data.properties.locale}`;
    }
    
    if (data.properties?.timeZone) {
        formatted += `\n**Time Zone:** ${data.properties.timeZone}`;
    }
    
    formatted += `\n\n✅ Your spreadsheet is ready for use!`;
    
    return formatted;
}

/**
 * Format people search response for display
 */
function formatPeopleSearchResponse(data: any): string {
    const people = Array.isArray(data) ? data : data.people || [];
    
    let formatted = `**👥 People Search Results**\n\n`;
    formatted += `Found ${people.length} result(s):\n\n`;
    
    people.forEach((person: any, index: number) => {
        formatted += `**${index + 1}. ${person.name || 'Unknown'}**\n`;
        if (person.title) formatted += `• Title: ${person.title}\n`;
        if (person.company) formatted += `• Company: ${person.company}\n`;
        if (person.email) formatted += `• Email: ${person.email}\n`;
        if (person.location) formatted += `• Location: ${person.location}\n`;
        formatted += `\n`;
    });
    
    return formatted;
}

/**
 * Format aircraft response for display
 */
function formatAircraftResponse(data: any): string {
    const aircraft = Array.isArray(data) ? data : data.aircraft || [];
    
    let formatted = `**✈️ Aircraft Search Results**\n\n`;
    formatted += `Found ${aircraft.length} available aircraft:\n\n`;
    
    aircraft.forEach((plane: any, index: number) => {
        formatted += `**${index + 1}. ${plane.manufacturer || ''} ${plane.model || ''}**\n`;
        if (plane.location) formatted += `• Location: ${plane.location}\n`;
        if (plane.price) formatted += `• Price: ${plane.price}\n`;
        if (plane.available !== undefined) formatted += `• Available: ${plane.available ? 'Yes' : 'No'}\n`;
        formatted += `\n`;
    });
    
    return formatted;
}

/**
 * Extract and identify structured data from response text
 */
export function extractStructuredData(responseText: string): StructuredData | null {
    if (!responseText || typeof responseText !== 'string') {
        return null;
    }

    // Try to parse JSON structured data first
    const jsonMatch = responseText.match(/\{[^}]*"type"[^}]*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.type && parsed.data) {
                return parsed as StructuredData;
            }
        } catch {
            // Not valid JSON, continue with pattern matching
        }
    }

    // Pattern matching for different data types
    const lowerText = responseText.toLowerCase();

    // Google Sheets data patterns
    if (
        lowerText.includes('google sheets') ||
        lowerText.includes('spreadsheet') ||
        lowerText.includes('spreadsheetid') ||
        lowerText.includes('sheets created successfully')
    ) {
        return {
            type: 'google_sheets',
            data: {
                source: 'google_sheets',
                timestamp: new Date().toISOString(),
            },
        };
    }

    // People search data patterns (more specific)
    if (
        lowerText.includes('people search') ||
        lowerText.includes('find people') ||
        lowerText.includes('executive search') ||
        lowerText.includes('prospect search') ||
        lowerText.includes('contact search')
    ) {
        return {
            type: 'people_search',
            data: {
                people: extractPeopleSearchData(responseText),
                source: 'apollo.io',
                timestamp: new Date().toISOString(),
            },
        };
    }

    // Apollo.io lead data patterns (general leads)
    if (
        lowerText.includes('executive assistant') ||
        lowerText.includes('lead') ||
        lowerText.includes('apollo') ||
        (lowerText.includes('contact') && lowerText.includes('company'))
    ) {
        return {
            type: 'apollo_leads',
            data: {
                leads: extractLeadData(responseText),
                source: 'apollo.io',
                timestamp: new Date().toISOString(),
            },
        };
    }

    // Avinode aircraft data patterns
    if (
        lowerText.includes('aircraft') ||
        lowerText.includes('gulfstream') ||
        lowerText.includes('bombardier') ||
        lowerText.includes('cessna') ||
        lowerText.includes('embraer') ||
        (lowerText.includes('available') &&
            (lowerText.includes('jet') || lowerText.includes('plane')))
    ) {
        return {
            type: 'aircraft_search',
            data: {
                aircraft: extractAircraftData(responseText),
                source: 'avinode',
                timestamp: new Date().toISOString(),
            },
        };
    }

    // Booking data patterns
    if (
        lowerText.includes('booking') ||
        lowerText.includes('reservation') ||
        lowerText.includes('flight plan') ||
        (lowerText.includes('departure') && lowerText.includes('arrival'))
    ) {
        return {
            type: 'booking_data',
            data: {
                booking: extractBookingData(responseText),
                timestamp: new Date().toISOString(),
            },
        };
    }

    return null;
}

/**
 * Extract lead data from Apollo.io responses
 */
function extractLeadData(text: string): any[] {
    const leads: any[] = [];

    // Basic pattern matching for lead information
    const nameMatches = text.match(/([A-Z][a-z]+ [A-Z][a-z]+)/g) || [];
    const companyMatches = text.match(/at ([A-Z][a-zA-Z\s&,.-]+)/g) || [];
    const emailMatches = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g) || [];

    for (let i = 0; i < nameMatches.length; i++) {
        leads.push({
            name: nameMatches[i],
            company: companyMatches[i]?.replace('at ', ''),
            email: emailMatches[i],
            title: 'Executive Assistant', // Default based on common use case
            source: 'apollo.io',
        });
    }

    return leads.length > 0 ? leads : [{ text, parsed: false }];
}

/**
 * Extract aircraft data from Avinode responses
 */
function extractAircraftData(text: string): any[] {
    const aircraft: any[] = [];

    // Pattern matching for aircraft information
    const aircraftMatches =
        text.match(/(Gulfstream|Bombardier|Cessna|Embraer|Boeing|Airbus)\s+([A-Z0-9-]+)/gi) || [];
    const locationMatches = text.match(/from\s+([A-Z]{3}|[A-Z][a-z]+)/gi) || [];
    const priceMatches = text.match(/\$[\d,]+/g) || [];

    aircraftMatches.forEach((match: string, i) => {
        const [manufacturer, model] = match.split(' ');
        aircraft.push({
            manufacturer,
            model,
            location: locationMatches[i]?.replace('from ', ''),
            price: priceMatches[i],
            source: 'avinode',
            available: true,
        });
    });

    return aircraft.length > 0 ? aircraft : [{ text, parsed: false }];
}

/**
 * Extract people search data from Apollo.io responses
 */
function extractPeopleSearchData(text: string): any[] {
    const people: any[] = [];

    // Enhanced pattern matching for people search results
    const lines = text.split('\n');

    for (const line of lines) {
        // Look for structured person data patterns
        const nameMatch = line.match(/([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
        const titleMatch = line.match(
            /(CEO|CFO|CTO|VP|Director|Manager|Assistant|President|Partner|Principal)/i
        );
        const companyMatch = line.match(/(?:at|@)\s+([A-Z][a-zA-Z\s&,.-]+)/);
        const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

        if (nameMatch && titleMatch) {
            people.push({
                name: nameMatch[1],
                title: titleMatch[1],
                company: companyMatch ? companyMatch[1].trim() : null,
                email: emailMatch ? emailMatch[1] : null,
                source: 'apollo.io',
                searchType: 'people_search',
            });
        }
    }

    // If no structured data found, return raw text for manual processing
    return people.length > 0
        ? people
        : [
              {
                  text,
                  parsed: false,
                  searchType: 'people_search',
                  source: 'apollo.io',
              },
          ];
}

/**
 * Extract booking data from responses
 */
function extractBookingData(text: string): any {
    return {
        text,
        parsed: false,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Format display text with appropriate headers and styling
 */
export function formatDisplayText(
    responseText: string,
    structuredData: StructuredData | null
): string {
    if (!structuredData) {
        return responseText;
    }

    let formattedText = '';

    // Add appropriate headers based on data type
    switch (structuredData.type) {
        case 'google_sheets':
            formattedText = responseText; // Google Sheets formatter already includes header
            break;

        case 'people_search':
            formattedText = `**🔍 Apollo.io People Search Results**\n\n${responseText}`;
            break;

        case 'apollo_leads':
            formattedText = `**🎯 Apollo.io Lead Intelligence**\n\n${responseText}`;
            break;

        case 'aircraft_search':
            formattedText = `**✈️ Avinode Aircraft Availability**\n\n${responseText}`;
            break;

        case 'booking_data':
            formattedText = `**📅 Booking Information**\n\n${responseText}`;
            break;

        default:
            formattedText = responseText;
    }

    // Add footer with attribution
    formattedText += `\n\n---\n*Generated by JetVision Agent via n8n workflow*`;

    return formattedText;
}

/**
 * Extract sources from webhook data
 */
function extractSources(webhookData: any): any[] {
    const sources: any[] = [];

    // Look for source information in the webhook data
    if (webhookData.sources && Array.isArray(webhookData.sources)) {
        return webhookData.sources;
    }

    // Extract implicit sources based on content
    if (webhookData.response || webhookData.message) {
        const text = webhookData.response || webhookData.message;

        if (text.toLowerCase().includes('apollo')) {
            sources.push({
                name: 'Apollo.io',
                type: 'lead_database',
                url: 'https://apollo.io',
            });
        }

        if (text.toLowerCase().includes('avinode')) {
            sources.push({
                name: 'Avinode',
                type: 'aircraft_charter',
                url: 'https://avinode.com',
            });
        }
    }

    return sources;
}

/**
 * Validate response structure
 */
export function validateResponse(response: any): boolean {
    return (
        response &&
        typeof response === 'object' &&
        typeof response.id === 'string' &&
        typeof response.threadId === 'string' &&
        response.answer &&
        typeof response.answer.text === 'string'
    );
}

/**
 * Get response summary for logging/debugging
 */
export function getResponseSummary(response: TransformedResponse): string {
    const textLength = response.answer.text.length;
    const hasStructuredData = !!response.answer.structured;
    const sourcesCount = response.sources.length;

    return `Response: ${textLength} chars, structured: ${hasStructuredData}, sources: ${sourcesCount}, status: ${response.status}`;
}

/**
 * Helper function to extract response from execution data
 * Used by the API route for polling results
 */
export function extractResponseFromExecutionData(executionData: any): string {
    try {
        if (!executionData?.resultData?.runData) {
            return 'No execution data available';
        }

        const runData = executionData.resultData.runData;

        // Look for common node names that contain responses
        const responseNodes = [
            'Agent',
            'OpenAI Chat',
            'Response',
            'Final Response',
            'Chat',
            'AI Response',
        ];

        for (const nodeName of responseNodes) {
            if (runData[nodeName]?.length > 0) {
                const nodeData = runData[nodeName][0];

                if (nodeData.error) {
                    return `Error in workflow node "${nodeName}": ${nodeData.error.message || nodeData.error}`;
                }

                if (nodeData.data?.main?.[0]?.[0]?.json) {
                    const json = nodeData.data.main[0][0].json;

                    // Try different response field names
                    const responseFields = [
                        'response',
                        'output',
                        'text',
                        'message',
                        'result',
                        'answer',
                    ];
                    for (const field of responseFields) {
                        if (json[field] && typeof json[field] === 'string') {
                            return json[field];
                        }
                    }

                    // If no standard field, return the whole JSON as string
                    return JSON.stringify(json, null, 2);
                }
            }
        }

        // If no response nodes found, look in any node with data
        for (const [nodeName, nodeResults] of Object.entries(runData)) {
            if (Array.isArray(nodeResults) && nodeResults.length > 0) {
                const nodeData = nodeResults[0] as any;

                if (nodeData.error) {
                    return `Error in workflow node "${nodeName}": ${nodeData.error.message || nodeData.error}`;
                }

                if (nodeData.data?.main?.[0]?.[0]?.json?.response) {
                    return nodeData.data.main[0][0].json.response;
                }
            }
        }

        return 'No response data found in execution';
    } catch (error) {
        console.error('Error extracting execution response:', error);
        return `Error processing execution data: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
}

// For backwards compatibility and testing
export default {
    transformN8nResponse,
    extractStructuredData,
    formatDisplayText,
    extractResponseFromExecutionData,
    validateResponse,
    getResponseSummary,
};
