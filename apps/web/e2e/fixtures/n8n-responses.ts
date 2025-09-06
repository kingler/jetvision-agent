export interface N8NResponse {
    id: string;
    type: 'apollo' | 'avinode' | 'system' | 'error';
    status: 'success' | 'partial' | 'error';
    data: any;
    metadata: {
        executionTime: number;
        workflowId: string;
        correlationId: string;
        version: string;
    };
    timestamp: string;
}

export const apolloSuccessResponses: N8NResponse[] = [
    {
        id: 'apollo-leads-success',
        type: 'apollo',
        status: 'success',
        data: {
            leads: [
                {
                    id: 'lead-001',
                    firstName: 'John',
                    lastName: 'Smith',
                    title: 'Executive Assistant',
                    company: 'Fortune Aviation Corp',
                    email: 'j.smith@fortune-aviation.com',
                    phone: '+1-555-0123',
                    linkedin: 'https://linkedin.com/in/johnsmith-ea',
                    location: 'Los Angeles, CA',
                },
                {
                    id: 'lead-002',
                    firstName: 'Sarah',
                    lastName: 'Johnson',
                    title: 'Chief Administrative Officer',
                    company: 'Sky High Enterprises',
                    email: 's.johnson@skyhigh.com',
                    phone: '+1-555-0124',
                    linkedin: 'https://linkedin.com/in/sarah-johnson-cao',
                    location: 'San Francisco, CA',
                },
            ],
            totalCount: 15,
            searchCriteria: {
                jobTitle: 'Executive Assistant',
                industry: 'Aviation',
                location: 'California',
                companySize: '500+',
            },
        },
        metadata: {
            executionTime: 8500,
            workflowId: 'apollo-lead-search-v2',
            correlationId: 'corr-apollo-001',
            version: '2.1.0',
        },
        timestamp: '2024-09-03T12:00:00Z',
    },
    {
        id: 'apollo-campaign-success',
        type: 'apollo',
        status: 'success',
        data: {
            campaign: {
                id: 'camp-001',
                name: 'Aviation Executive Outreach Q3',
                status: 'active',
                contacts: 125,
                sequences: [
                    {
                        id: 'seq-001',
                        name: 'Executive Introduction',
                        steps: 3,
                        enrolled: 125,
                    },
                ],
                metrics: {
                    sent: 125,
                    opened: 87,
                    clicked: 23,
                    replied: 8,
                    openRate: 69.6,
                    clickRate: 18.4,
                    replyRate: 6.4,
                },
            },
        },
        metadata: {
            executionTime: 5200,
            workflowId: 'apollo-campaign-create-v1',
            correlationId: 'corr-apollo-002',
            version: '2.1.0',
        },
        timestamp: '2024-09-03T12:05:00Z',
    },
];

export const avinodeSuccessResponses: N8NResponse[] = [
    {
        id: 'avinode-aircraft-success',
        type: 'avinode',
        status: 'success',
        data: {
            aircraft: [
                {
                    id: 'aircraft-001',
                    tailNumber: 'N123GS',
                    model: 'Gulfstream G650',
                    operator: 'Elite Aviation LLC',
                    location: 'KTEB (Teterboro, NJ)',
                    availability: {
                        departure: '2024-09-10T08:00:00Z',
                        estimatedArrival: '2024-09-10T14:30:00Z',
                        flightTime: '6.5 hours',
                        status: 'available',
                    },
                    pricing: {
                        hourlyRate: 8500,
                        totalEstimate: 55250,
                        currency: 'USD',
                    },
                    specifications: {
                        passengers: 14,
                        range: '7000 nm',
                        speed: 'Mach 0.925',
                    },
                },
                {
                    id: 'aircraft-002',
                    tailNumber: 'N456GS',
                    model: 'Gulfstream G650ER',
                    operator: 'Premier Jets Inc',
                    location: 'KJFK (JFK International)',
                    availability: {
                        departure: '2024-09-10T09:00:00Z',
                        estimatedArrival: '2024-09-10T15:15:00Z',
                        flightTime: '6.25 hours',
                        status: 'available',
                    },
                    pricing: {
                        hourlyRate: 9200,
                        totalEstimate: 57500,
                        currency: 'USD',
                    },
                    specifications: {
                        passengers: 16,
                        range: '7500 nm',
                        speed: 'Mach 0.925',
                    },
                },
            ],
            route: {
                departure: 'NYC Metro Area',
                arrival: 'London Luton (EGGW)',
                distance: '3459 nm',
            },
            searchCriteria: {
                aircraft: 'Gulfstream G650',
                departure: 'NYC',
                arrival: 'London',
                date: '2024-09-10',
            },
        },
        metadata: {
            executionTime: 12500,
            workflowId: 'avinode-aircraft-search-v3',
            correlationId: 'corr-avinode-001',
            version: '3.2.1',
        },
        timestamp: '2024-09-03T12:10:00Z',
    },
    {
        id: 'avinode-pricing-success',
        type: 'avinode',
        status: 'success',
        data: {
            quote: {
                id: 'quote-001',
                route: {
                    departure: 'Miami International (KMIA)',
                    arrival: 'Aspen/Pitkin County (KASE)',
                    distance: '1685 nm',
                },
                aircraft: {
                    model: 'Citation X',
                    tailNumber: 'N789CX',
                    operator: 'Mountain Air Charter',
                },
                pricing: {
                    flightTime: '3.5 hours',
                    hourlyRate: 4200,
                    flightCost: 14700,
                    fees: {
                        repositioning: 2500,
                        overnight: 800,
                        handling: 350,
                        catering: 500,
                    },
                    totalCost: 18850,
                    currency: 'USD',
                },
                validity: '48 hours',
                terms: 'Standard charter terms apply',
            },
        },
        metadata: {
            executionTime: 9800,
            workflowId: 'avinode-pricing-quote-v2',
            correlationId: 'corr-avinode-002',
            version: '3.2.1',
        },
        timestamp: '2024-09-03T12:15:00Z',
    },
];

export const systemSuccessResponses: N8NResponse[] = [
    {
        id: 'system-health-success',
        type: 'system',
        status: 'success',
        data: {
            health: {
                overall: 'healthy',
                services: {
                    n8n: {
                        status: 'operational',
                        responseTime: 150,
                        uptime: '99.9%',
                    },
                    apollo: {
                        status: 'operational',
                        responseTime: 450,
                        rateLimitRemaining: 85,
                        uptime: '99.8%',
                    },
                    avinode: {
                        status: 'operational',
                        responseTime: 380,
                        uptime: '99.7%',
                    },
                    database: {
                        status: 'operational',
                        connections: 12,
                        queryTime: 25,
                        uptime: '99.9%',
                    },
                },
                activeWorkflows: 8,
                totalExecutions: 1247,
                errorRate: 0.02,
            },
        },
        metadata: {
            executionTime: 1200,
            workflowId: 'system-health-check-v1',
            correlationId: 'corr-system-001',
            version: '1.0.0',
        },
        timestamp: '2024-09-03T12:20:00Z',
    },
];

export const errorResponses: N8NResponse[] = [
    {
        id: 'n8n-timeout-error',
        type: 'error',
        status: 'error',
        data: {
            error: {
                code: 'TIMEOUT',
                message: 'N8N workflow execution timed out after 30 seconds',
                details: 'The workflow took longer than expected to complete',
                workflowStep: 'apollo-api-call',
                retryable: true,
            },
        },
        metadata: {
            executionTime: 30000,
            workflowId: 'apollo-lead-search-v2',
            correlationId: 'corr-error-001',
            version: '2.1.0',
        },
        timestamp: '2024-09-03T12:25:00Z',
    },
    {
        id: 'apollo-rate-limit-error',
        type: 'error',
        status: 'error',
        data: {
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Apollo.io API rate limit exceeded',
                details: 'Rate limit of 60 requests per minute exceeded',
                retryAfter: 42,
                retryable: true,
            },
        },
        metadata: {
            executionTime: 2500,
            workflowId: 'apollo-lead-search-v2',
            correlationId: 'corr-error-002',
            version: '2.1.0',
        },
        timestamp: '2024-09-03T12:30:00Z',
    },
    {
        id: 'avinode-auth-error',
        type: 'error',
        status: 'error',
        data: {
            error: {
                code: 'AUTHENTICATION_FAILED',
                message: 'Avinode API authentication failed',
                details: 'Invalid or expired API credentials',
                retryable: false,
            },
        },
        metadata: {
            executionTime: 1800,
            workflowId: 'avinode-aircraft-search-v3',
            correlationId: 'corr-error-003',
            version: '3.2.1',
        },
        timestamp: '2024-09-03T12:35:00Z',
    },
];

export const streamingResponses = {
    apollo: {
        chunks: [
            'Searching Apollo.io database...',
            'Found 127 potential matches...',
            'Filtering by job title and company size...',
            'Enriching contact data...',
            'Validating email addresses...',
            'Processing complete. Found 15 qualified leads.',
        ],
    },
    avinode: {
        chunks: [
            'Querying Avinode marketplace...',
            'Checking aircraft availability...',
            'Calculating route distances...',
            'Retrieving pricing information...',
            'Validating operator credentials...',
            'Search complete. Found 3 available aircraft.',
        ],
    },
    system: {
        chunks: [
            'Checking N8N workflow status...',
            'Validating API connections...',
            'Testing database connectivity...',
            'Measuring response times...',
            'Health check complete. All systems operational.',
        ],
    },
};

export const getResponseById = (id: string): N8NResponse | undefined => {
    const allResponses = [
        ...apolloSuccessResponses,
        ...avinodeSuccessResponses,
        ...systemSuccessResponses,
        ...errorResponses,
    ];
    return allResponses.find(response => response.id === id);
};

export const getResponsesByType = (
    type: 'apollo' | 'avinode' | 'system' | 'error'
): N8NResponse[] => {
    const allResponses = [
        ...apolloSuccessResponses,
        ...avinodeSuccessResponses,
        ...systemSuccessResponses,
        ...errorResponses,
    ];
    return allResponses.filter(response => response.type === type);
};

export const getStreamingChunks = (type: 'apollo' | 'avinode' | 'system'): string[] => {
    return streamingResponses[type]?.chunks || [];
};
