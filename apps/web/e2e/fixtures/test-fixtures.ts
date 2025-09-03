/**
 * Test Fixtures for JetVision Agent E2E Tests
 * Provides sample data and utilities for testing N8N integration
 */

export interface TestQuery {
  query: string;
  expectedIntent: string;
  expectedBusinessContext: 'apollo' | 'avinode' | 'general' | 'mixed';
  expectedVisualization: boolean;
  expectedEntities?: string[];
}

export const APOLLO_QUERIES: TestQuery[] = [
  {
    query: 'Find executive contacts at Tesla for outreach campaigns',
    expectedIntent: 'apollo_search',
    expectedBusinessContext: 'apollo',
    expectedVisualization: false,
    expectedEntities: ['company:Tesla']
  },
  {
    query: 'Search for CEOs in the aviation industry using Apollo',
    expectedIntent: 'apollo_search', 
    expectedBusinessContext: 'apollo',
    expectedVisualization: false
  },
  {
    query: 'Create email campaign sequence for private jet prospects',
    expectedIntent: 'campaign_management',
    expectedBusinessContext: 'apollo',
    expectedVisualization: false
  }
];

export const AVINODE_QUERIES: TestQuery[] = [
  {
    query: 'Check availability of Gulfstream G650 for charter from KJFK to EGLL',
    expectedIntent: 'aircraft_availability',
    expectedBusinessContext: 'avinode',
    expectedVisualization: false,
    expectedEntities: ['aircraft:Gulfstream', 'airport:KJFK', 'airport:EGLL']
  },
  {
    query: 'Book a Citation X for flight from Miami to New York tomorrow',
    expectedIntent: 'booking_request',
    expectedBusinessContext: 'avinode', 
    expectedVisualization: false,
    expectedEntities: ['aircraft:Citation']
  },
  {
    query: 'Show fleet utilization metrics for our aircraft',
    expectedIntent: 'fleet_metrics',
    expectedBusinessContext: 'avinode',
    expectedVisualization: true
  }
];

export const VISUALIZATION_QUERIES: TestQuery[] = [
  {
    query: 'Show me a chart of booking trends over the last quarter',
    expectedIntent: 'fleet_metrics',
    expectedBusinessContext: 'avinode',
    expectedVisualization: true
  },
  {
    query: 'Generate a dashboard with campaign performance metrics',
    expectedIntent: 'campaign_management',
    expectedBusinessContext: 'apollo',
    expectedVisualization: true
  },
  {
    query: 'Display a graph of aircraft availability by type',
    expectedIntent: 'aircraft_availability',
    expectedBusinessContext: 'avinode',
    expectedVisualization: true
  }
];

export const MIXED_CONTEXT_QUERIES: TestQuery[] = [
  {
    query: 'Find Apollo contacts who need private jet charter services',
    expectedIntent: 'apollo_search',
    expectedBusinessContext: 'mixed',
    expectedVisualization: false
  },
  {
    query: 'Create outreach campaign for Avinode aircraft owners using Apollo',
    expectedIntent: 'campaign_management',
    expectedBusinessContext: 'mixed',
    expectedVisualization: false
  }
];

export const AIRPORT_CODES = [
  'KJFK', 'KLAX', 'EGLL', 'LFPG', 'EDDF', 'RJTT', 'OMDB', 'YSSY'
];

export const AIRCRAFT_TYPES = [
  'Citation', 'Gulfstream', 'Challenger', 'Falcon', 'Hawker', 'King Air', 'Phenom'
];

export const COMPANY_NAMES = [
  'Tesla Inc', 'Apple Corp', 'Microsoft LLC', 'Amazon Company', 'Google Ltd'
];

/**
 * Helper function to validate webhook payload structure
 */
export function validateWebhookPayload(payload: any): boolean {
  const requiredFields = ['prompt', 'message', 'context', 'intent', 'expectedOutput'];
  
  for (const field of requiredFields) {
    if (!payload.hasOwnProperty(field)) {
      return false;
    }
  }
  
  // Validate context structure
  const context = payload.context;
  if (!context.source || !context.timestamp || typeof context.useWebSearch !== 'boolean') {
    return false;
  }
  
  // Validate intent structure
  const intent = payload.intent;
  if (!intent.primary || typeof intent.confidence !== 'number' || !intent.context) {
    return false;
  }
  
  // Validate expectedOutput structure
  const expectedOutput = payload.expectedOutput;
  if (!expectedOutput.format || typeof expectedOutput.includeVisualization !== 'boolean') {
    return false;
  }
  
  return true;
}

/**
 * Mock N8N webhook responses for testing
 */
export const MOCK_N8N_RESPONSES = {
  apollo_success: {
    message: 'Found 25 executive contacts at Tesla matching your criteria.',
    data: {
      contacts: [
        { name: 'John Doe', title: 'VP Sales', email: 'john@tesla.com' },
        { name: 'Jane Smith', title: 'Director Marketing', email: 'jane@tesla.com' }
      ]
    },
    status: 'success'
  },
  avinode_success: {
    message: 'Found 3 available Gulfstream G650 aircraft for your requested route.',
    data: {
      aircraft: [
        { 
          id: 'G650-001', 
          location: 'KJFK', 
          available: true, 
          hourly_rate: '$8500'
        }
      ]
    },
    status: 'success'
  },
  general_response: {
    message: 'I can help you with Apollo.io contact searches and Avinode aircraft bookings. What would you like to know?',
    status: 'success'
  }
};