export interface AviationQuery {
  id: string;
  type: 'apollo' | 'avinode' | 'system';
  query: string;
  expectedResponsePattern?: RegExp;
  expectedResultCount?: number;
  timeout?: number;
  description: string;
}

export const apolloQueries: AviationQuery[] = [
  {
    id: 'apollo-exec-assistants-fortune500',
    type: 'apollo',
    query: 'Find executive assistants at Fortune 500 companies in California',
    expectedResponsePattern: /executive assistant|EA|administrative assistant/i,
    expectedResultCount: 10,
    timeout: 15000,
    description: 'Search for executive assistants at large companies'
  },
  {
    id: 'apollo-campaign-metrics',
    type: 'apollo',
    query: 'Show campaign performance metrics',
    expectedResponsePattern: /campaign|performance|metrics|analytics/i,
    timeout: 10000,
    description: 'Retrieve campaign performance data'
  },
  {
    id: 'apollo-tech-campaign',
    type: 'apollo',
    query: 'Launch targeted campaign for tech companies',
    expectedResponsePattern: /campaign|launched|created|tech/i,
    timeout: 20000,
    description: 'Create and launch new campaign targeting tech sector'
  },
  {
    id: 'apollo-ceo-aviation',
    type: 'apollo',
    query: 'Find CEOs in private aviation industry with 100+ employees',
    expectedResponsePattern: /CEO|chief executive|aviation|private jet/i,
    expectedResultCount: 5,
    timeout: 15000,
    description: 'Search for aviation industry executives'
  },
  {
    id: 'apollo-sequence-enrollment',
    type: 'apollo',
    query: 'Add these contacts to email sequence for aviation leads',
    expectedResponsePattern: /sequence|enrolled|added|email/i,
    timeout: 12000,
    description: 'Enroll contacts in email automation sequence'
  }
];

export const avinodeQueries: AviationQuery[] = [
  {
    id: 'avinode-g650-nyc-london',
    type: 'avinode',
    query: 'Search for Gulfstream G650 availability NYC to London next week',
    expectedResponsePattern: /gulfstream|g650|NYC|london|availability/i,
    expectedResultCount: 3,
    timeout: 20000,
    description: 'Search for specific aircraft availability on route'
  },
  {
    id: 'avinode-fleet-utilization',
    type: 'avinode',
    query: 'Show fleet utilization metrics for this month',
    expectedResponsePattern: /fleet|utilization|metrics|hours|usage/i,
    timeout: 15000,
    description: 'Retrieve fleet utilization analytics'
  },
  {
    id: 'avinode-charter-pricing',
    type: 'avinode',
    query: 'Generate pricing quote for charter flight Miami to Aspen',
    expectedResponsePattern: /pricing|quote|charter|miami|aspen/i,
    timeout: 18000,
    description: 'Generate charter flight pricing quote'
  },
  {
    id: 'avinode-aircraft-search',
    type: 'avinode',
    query: 'Find available Citation X aircraft within 500nm of Dallas',
    expectedResponsePattern: /citation|dallas|500nm|available/i,
    expectedResultCount: 5,
    timeout: 15000,
    description: 'Search for aircraft by location radius'
  },
  {
    id: 'avinode-booking-history',
    type: 'avinode',
    query: 'Show booking history and revenue for Q3 2024',
    expectedResponsePattern: /booking|history|revenue|Q3|2024/i,
    timeout: 12000,
    description: 'Retrieve historical booking and revenue data'
  }
];

export const systemQueries: AviationQuery[] = [
  {
    id: 'system-health-check',
    type: 'system',
    query: 'Check system health and API connections',
    expectedResponsePattern: /health|status|API|connection|operational/i,
    timeout: 10000,
    description: 'System health and connectivity check'
  },
  {
    id: 'system-n8n-workflows',
    type: 'system',
    query: 'Show active N8N workflows and their status',
    expectedResponsePattern: /n8n|workflow|active|status/i,
    timeout: 8000,
    description: 'Display active N8N workflow status'
  },
  {
    id: 'system-error-recovery',
    type: 'system',
    query: 'Test error recovery and fallback mechanisms',
    expectedResponsePattern: /error|recovery|fallback|circuit breaker/i,
    timeout: 15000,
    description: 'Test system resilience and error handling'
  }
];

export const complexScenarios: AviationQuery[] = [
  {
    id: 'complex-lead-to-flight',
    type: 'apollo',
    query: 'Find private aviation executives, then search for available aircraft for their region',
    expectedResponsePattern: /executive|aviation|aircraft|available/i,
    timeout: 30000,
    description: 'Complex workflow combining lead generation and aircraft search'
  },
  {
    id: 'complex-campaign-optimization',
    type: 'apollo',
    query: 'Analyze campaign performance and optimize targeting for aviation industry',
    expectedResponsePattern: /campaign|performance|optimize|aviation|targeting/i,
    timeout: 25000,
    description: 'Multi-step campaign analysis and optimization'
  }
];

export const getAllQueries = (): AviationQuery[] => [
  ...apolloQueries,
  ...avinodeQueries,
  ...systemQueries,
  ...complexScenarios
];

export const getQueriesByType = (type: 'apollo' | 'avinode' | 'system'): AviationQuery[] => {
  return getAllQueries().filter(query => query.type === type);
};

export const getQueryById = (id: string): AviationQuery | undefined => {
  return getAllQueries().find(query => query.id === id);
};