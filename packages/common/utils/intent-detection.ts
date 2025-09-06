/**
 * Intent Detection Utility
 * Automatically detects user intent from chat messages for better N8N workflow routing
 */

export interface DetectedIntent {
    primary: string;
    confidence: number;
    entities: string[];
    context: {
        requiresVisualization: boolean;
        requiresRecommendations: boolean;
        businessContext: 'apollo' | 'avinode' | 'general' | 'mixed';
    };
}

// Intent patterns with weighted keywords
const INTENT_PATTERNS = {
    apollo_search: {
        keywords: [
            'apollo',
            'contact',
            'executive',
            'lead',
            'prospect',
            'search',
            'find people',
            'email',
            'outreach',
        ],
        weight: 0.8,
        businessContext: 'apollo' as const,
    },
    aircraft_availability: {
        keywords: [
            'aircraft',
            'jet',
            'availability',
            'charter',
            'flight',
            'avinode',
            'plane',
            'booking',
        ],
        weight: 0.8,
        businessContext: 'avinode' as const,
    },
    fleet_metrics: {
        keywords: [
            'utilization',
            'metrics',
            'performance',
            'analytics',
            'dashboard',
            'kpi',
            'fleet',
        ],
        weight: 0.7,
        businessContext: 'avinode' as const,
    },
    campaign_management: {
        keywords: ['campaign', 'outreach', 'marketing', 'sequence', 'apollo', 'email campaign'],
        weight: 0.7,
        businessContext: 'apollo' as const,
    },
    booking_request: {
        keywords: ['book', 'reserve', 'schedule', 'charter', 'trip', 'flight request'],
        weight: 0.9,
        businessContext: 'avinode' as const,
    },
    market_analysis: {
        keywords: ['market', 'analysis', 'trends', 'opportunities', 'competitive', 'industry'],
        weight: 0.6,
        businessContext: 'general' as const,
    },
    general_inquiry: {
        keywords: ['help', 'assistance', 'question', 'support', 'explain'],
        weight: 0.5,
        businessContext: 'general' as const,
    },
};

// Visualization triggers
const VISUALIZATION_KEYWORDS = [
    'chart',
    'graph',
    'dashboard',
    'metrics',
    'analytics',
    'visual',
    'plot',
    'report',
];

// Recommendation triggers
const RECOMMENDATION_KEYWORDS = [
    'recommend',
    'suggest',
    'advice',
    'best',
    'optimize',
    'improve',
    'strategy',
];

export function detectIntent(message: string): DetectedIntent {
    const lowerMessage = message.toLowerCase();
    const words = lowerMessage.split(/\s+/);

    // Score each intent
    const intentScores: Record<string, number> = {};
    const detectedBusinessContexts: Set<string> = new Set();

    for (const [intentName, pattern] of Object.entries(INTENT_PATTERNS)) {
        let score = 0;
        const matchedKeywords: string[] = [];

        for (const keyword of pattern.keywords) {
            if (lowerMessage.includes(keyword.toLowerCase())) {
                score += pattern.weight;
                matchedKeywords.push(keyword);
                detectedBusinessContexts.add(pattern.businessContext);
            }
        }

        // Normalize score by number of matched keywords vs total keywords
        const normalizedScore =
            matchedKeywords.length > 0
                ? (score / pattern.keywords.length) *
                  (matchedKeywords.length / pattern.keywords.length)
                : 0;

        intentScores[intentName] = normalizedScore;
    }

    // Find primary intent
    const primaryIntent = Object.entries(intentScores).sort(([, a], [, b]) => b - a)[0];

    const primaryIntentName = primaryIntent?.[0] || 'general_inquiry';
    const confidence = primaryIntent?.[1] || 0.5;

    // Extract entities (proper nouns, airports, companies)
    const entities = extractEntities(message);

    // Determine business context
    let businessContext: 'apollo' | 'avinode' | 'general' | 'mixed' = 'general';
    if (detectedBusinessContexts.size === 1) {
        businessContext = Array.from(detectedBusinessContexts)[0] as any;
    } else if (detectedBusinessContexts.size > 1) {
        businessContext = 'mixed';
    }

    return {
        primary: primaryIntentName,
        confidence: Math.min(confidence, 1.0),
        entities,
        context: {
            requiresVisualization: VISUALIZATION_KEYWORDS.some(kw => lowerMessage.includes(kw)),
            requiresRecommendations: RECOMMENDATION_KEYWORDS.some(kw => lowerMessage.includes(kw)),
            businessContext,
        },
    };
}

function extractEntities(message: string): string[] {
    const entities: string[] = [];

    // Airport codes (ICAO format: 4 letters)
    const airportMatch = message.match(/\b[A-Z]{4}\b/g);
    if (airportMatch) {
        entities.push(...airportMatch.map(code => `airport:${code}`));
    }

    // Cities (capitalized words followed by common airport words)
    const cityMatch = message.match(/\b([A-Z][a-z]+)(?:\s+(?:Airport|International))?/g);
    if (cityMatch) {
        entities.push(...cityMatch.map(city => `location:${city}`));
    }

    // Aircraft types
    const aircraftTypes = [
        'Citation',
        'Gulfstream',
        'Challenger',
        'Falcon',
        'Hawker',
        'King Air',
        'Phenom',
    ];
    for (const aircraft of aircraftTypes) {
        if (message.includes(aircraft)) {
            entities.push(`aircraft:${aircraft}`);
        }
    }

    // Company names (look for common patterns)
    const companyMatch = message.match(
        /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc|Corp|LLC|Ltd|Company)/gi
    );
    if (companyMatch) {
        entities.push(...companyMatch.map(company => `company:${company}`));
    }

    return Array.from(new Set(entities)); // Remove duplicates
}
