/**
 * N8N Response Transformer
 * Transforms raw n8n webhook responses into structured format expected by the UI
 */

export interface StructuredData {
  type: 'apollo_leads' | 'aircraft_search' | 'booking_data' | 'general';
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
  // Try different field names that might contain the response
  const possibleFields = ['response', 'message', 'output', 'text', 'result', 'answer', 'content'];
  
  for (const field of possibleFields) {
    if (webhookData[field] && typeof webhookData[field] === 'string') {
      return webhookData[field].trim();
    }
  }
  
  // If no standard field found, try to extract from nested data
  if (webhookData.data) {
    for (const field of possibleFields) {
      if (webhookData.data[field] && typeof webhookData.data[field] === 'string') {
        return webhookData.data[field].trim();
      }
    }
  }
  
  // Last resort: stringify the entire object if it has meaningful data
  if (typeof webhookData === 'object' && webhookData !== null) {
    const keys = Object.keys(webhookData);
    if (keys.length > 0 && !keys.every(key => ['executionId', 'workflowId', 'timestamp'].includes(key))) {
      return JSON.stringify(webhookData, null, 2);
    }
  }
  
  return 'No response data available';
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
  
  // Apollo.io lead data patterns
  if (lowerText.includes('executive assistant') || 
      lowerText.includes('lead') || 
      lowerText.includes('apollo') ||
      lowerText.includes('contact') && lowerText.includes('company')) {
    
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
  if (lowerText.includes('aircraft') || 
      lowerText.includes('gulfstream') || 
      lowerText.includes('bombardier') ||
      lowerText.includes('cessna') ||
      lowerText.includes('embraer') ||
      lowerText.includes('available') && (lowerText.includes('jet') || lowerText.includes('plane'))) {
    
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
  if (lowerText.includes('booking') || 
      lowerText.includes('reservation') ||
      lowerText.includes('flight plan') ||
      lowerText.includes('departure') && lowerText.includes('arrival')) {
    
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
  const aircraftMatches = text.match(/(Gulfstream|Bombardier|Cessna|Embraer|Boeing|Airbus)\s+([A-Z0-9-]+)/gi) || [];
  const locationMatches = text.match(/from\s+([A-Z]{3}|[A-Z][a-z]+)/gi) || [];
  const priceMatches = text.match(/\$[\d,]+/g) || [];
  
  aircraftMatches.forEach((match, i) => {
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
export function formatDisplayText(responseText: string, structuredData: StructuredData | null): string {
  if (!structuredData) {
    return responseText;
  }
  
  let formattedText = '';
  
  // Add appropriate headers based on data type
  switch (structuredData.type) {
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
  return response && 
         typeof response === 'object' &&
         typeof response.id === 'string' &&
         typeof response.threadId === 'string' &&
         response.answer &&
         typeof response.answer.text === 'string';
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
    const responseNodes = ['Agent', 'OpenAI Chat', 'Response', 'Final Response', 'Chat', 'AI Response'];
    
    for (const nodeName of responseNodes) {
      if (runData[nodeName]?.length > 0) {
        const nodeData = runData[nodeName][0];
        
        if (nodeData.error) {
          return `Error in workflow node "${nodeName}": ${nodeData.error.message || nodeData.error}`;
        }
        
        if (nodeData.data?.main?.[0]?.[0]?.json) {
          const json = nodeData.data.main[0][0].json;
          
          // Try different response field names
          const responseFields = ['response', 'output', 'text', 'message', 'result', 'answer'];
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