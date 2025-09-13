/**
 * Query Mapper Service
 * Converts natural language queries into structured N8N webhook payloads
 */

import { v4 as uuidv4 } from 'uuid';

// Types
export interface QueryMappingResult {
    confidence: number;
    category: string;
    payload: Record<string, any>;
    requiresClarification: boolean;
    clarificationQuestions?: string[];
    suggestedDefaults?: Record<string, any>;
}

export interface QueryPattern {
    pattern: RegExp;
    category: string;
    extractor: (match: RegExpMatchArray, query: string) => Record<string, any>;
    confidence: number;
}

// Airport mappings
const AIRPORT_CODES: Record<string, string[]> = {
    // Major US Cities
    'new york': ['KTEB', 'KJFK', 'KLGA'],
    nyc: ['KTEB', 'KJFK', 'KLGA'],
    teterboro: ['KTEB'],
    'los angeles': ['KLAX', 'KVNY', 'KBUR'],
    la: ['KLAX', 'KVNY', 'KBUR'],
    chicago: ['KMDW', 'KORD', 'KPWK'],
    miami: ['KMIA', 'KFLL', 'KOPF'],
    'san francisco': ['KSFO', 'KOAK', 'KSJC'],
    sf: ['KSFO', 'KOAK', 'KSJC'],
    boston: ['KBOS', 'KBED'],
    washington: ['KDCA', 'KIAD', 'KBWI'],
    dc: ['KDCA', 'KIAD'],
    dallas: ['KDFW', 'KDAL', 'KADS'],
    houston: ['KIAH', 'KHOU', 'KTME'],
    atlanta: ['KATL', 'KPDK'],
    seattle: ['KSEA', 'KBFI'],
    denver: ['KDEN', 'KAPA'],
    phoenix: ['KPHX', 'KSDL'],
    'las vegas': ['KLAS', 'KVGT'],

    // International
    london: ['EGLL', 'EGLF', 'EGKB'],
    paris: ['LFPB', 'LFPG', 'LFPO'],
    dubai: ['OMDB', 'OMDW'],
    tokyo: ['RJTT', 'RJAA'],
    davos: ['LSZS', 'LSZH'],
    geneva: ['LSGG'],
    monaco: ['LFMN'],
    milan: ['LIML', 'LIMJ'],
    rome: ['LIRF', 'LIRA'],
};

// Job title mappings
const JOB_TITLE_MAPPINGS: Record<string, string[]> = {
    ceo: ['CEO', 'Chief Executive Officer', 'President & CEO'],
    cfo: ['CFO', 'Chief Financial Officer', 'Finance Director'],
    cto: ['CTO', 'Chief Technology Officer', 'VP Engineering'],
    coo: ['COO', 'Chief Operating Officer', 'Operations Director'],
    cmo: ['CMO', 'Chief Marketing Officer', 'Marketing Director'],
    executive: ['CEO', 'CFO', 'CTO', 'COO', 'CMO', 'President', 'EVP', 'SVP'],
    vp: ['VP', 'Vice President', 'EVP', 'SVP'],
    director: ['Director', 'Managing Director', 'Sr Director', 'Associate Director'],
    manager: ['Manager', 'Sr Manager', 'General Manager', 'Regional Manager'],
    owner: ['Owner', 'Founder', 'Co-Founder', 'Principal'],
};

// Industry mappings
const INDUSTRY_MAPPINGS: Record<string, string[]> = {
    technology: ['Software', 'SaaS', 'Technology', 'IT Services', 'Cloud Computing'],
    tech: ['Software', 'SaaS', 'Technology', 'IT Services'],
    fintech: ['Fintech', 'Financial Technology', 'Payment Processing', 'Digital Banking'],
    finance: [
        'Banking',
        'Private Equity',
        'Hedge Fund',
        'Investment Management',
        'Venture Capital',
    ],
    healthcare: [
        'Healthcare',
        'Pharmaceutical',
        'Biotech',
        'Medical Device',
        'Healthcare Services',
    ],
    aviation: ['Aviation', 'Private Aviation', 'Business Aviation', 'Airlines', 'Aerospace'],
    entertainment: ['Entertainment', 'Film', 'Music', 'Media', 'Gaming', 'Sports'],
    energy: ['Energy', 'Oil & Gas', 'Renewable Energy', 'Utilities', 'Solar', 'Wind Power'],
    'real estate': ['Real Estate', 'Property Management', 'REIT', 'Construction', 'Development'],
    retail: ['Retail', 'E-commerce', 'Fashion', 'Luxury Goods', 'Consumer Goods'],
};

// Aircraft category mappings
const AIRCRAFT_CATEGORIES: Record<string, string> = {
    light: 'Light Jet',
    midsize: 'Midsize Jet',
    'mid-size': 'Midsize Jet',
    'super midsize': 'Super Midsize Jet',
    'super mid': 'Super Midsize Jet',
    heavy: 'Heavy Jet',
    'ultra long': 'Ultra Long Range',
    'ultra long range': 'Ultra Long Range',
};

// Date parsing utilities
function parseRelativeDate(dateStr: string): string {
    const today = new Date();
    const dayMap: Record<string, number> = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 0,
    };

    dateStr = dateStr.toLowerCase();

    if (dateStr.includes('today')) {
        return today.toISOString().split('T')[0];
    }

    if (dateStr.includes('tomorrow')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    if (dateStr.includes('next')) {
        for (const [day, dayNum] of Object.entries(dayMap)) {
            if (dateStr.includes(day)) {
                const daysUntil = (dayNum - today.getDay() + 7) % 7 || 7;
                const nextDate = new Date(today);
                nextDate.setDate(today.getDate() + daysUntil);
                return nextDate.toISOString().split('T')[0];
            }
        }

        if (dateStr.includes('week')) {
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            return `${today.toISOString().split('T')[0]}_${nextWeek.toISOString().split('T')[0]}`;
        }

        if (dateStr.includes('month')) {
            const nextMonth = new Date(today);
            nextMonth.setMonth(today.getMonth() + 1);
            return `${today.toISOString().split('T')[0]}_${nextMonth.toISOString().split('T')[0]}`;
        }
    }

    if (dateStr.includes('this week')) {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return `${startOfWeek.toISOString().split('T')[0]}_${endOfWeek.toISOString().split('T')[0]}`;
    }

    if (dateStr.includes('this month')) {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return `${startOfMonth.toISOString().split('T')[0]}_${endOfMonth.toISOString().split('T')[0]}`;
    }

    return today.toISOString().split('T')[0];
}

// Apollo Search Directives mapping
const APOLLO_DIRECTIVES: Record<string, any> = {
    'private equity ceos new york': {
        name: 'Private Equity CEOs - New York',
        sessionId: 'pe-ceo-ny-001',
        jobTitles: ['ceo', 'ceo and founder', 'ceo owner'],
        industries: ['venture capital & private equity', 'investment banking'],
        locations: ['Greater New York City Area', 'New York, New York'],
        companySize: '11-20',
        emailStatus: 'Verified',
        marketSegment: ['B2B'],
    },
    'executive assistants major markets': {
        name: 'Executive Assistants to CEOs - Major Markets',
        sessionId: 'ea-ceo-major-002',
        jobTitles: ['executive assistant to ceo', 'executive assistant to the president'],
        industries: ['venture capital & private equity', 'investment management'],
        locations: ['Los Angeles, California', 'New York, New York', 'Miami, Florida'],
        companySize: '21-50',
    },
    'real estate executives miami la': {
        name: 'Real Estate Executives - Miami/LA',
        sessionId: 're-exec-miami-la-003',
        jobTitles: ['ceo', 'ceo president', 'owner'],
        industries: ['commercial real estate', 'real estate'],
        locations: ['Miami, Florida', 'Los Angeles, California'],
        companySize: '11-20',
    },
    'investment banking directors chicago dallas': {
        name: 'Investment Banking Directors - Chicago/Dallas',
        sessionId: 'ib-dir-midwest-004',
        jobTitles: ['director', 'manager'],
        industries: ['investment banking', 'investment management'],
        locations: ['Chicago, Illinois', 'Dallas, Texas'],
        companySize: '21-50',
    },
    'tech ceos founders small': {
        name: 'Tech CEOs & Founders - Small Companies',
        sessionId: 'tech-ceo-small-005',
        jobTitles: ['ceo and founder', 'ceo and co-founder', 'ceo founder'],
        industries: ['information technology & services', 'computer software'],
        locations: ['Los Angeles, California', 'New York, New York'],
        companySize: '1-10',
    },
};

// Query patterns for different categories
const QUERY_PATTERNS: QueryPattern[] = [
    // Apollo Directive Pattern Matching
    {
        pattern: /(?:private equity|pe)\s+(?:ceos?|executives?)\s+(?:in\s+)?(?:new york|nyc|ny)/i,
        category: 'lead_generation',
        confidence: 0.95,
        extractor: (match, query) => {
            const directive = APOLLO_DIRECTIVES['private equity ceos new york'];
            return {
                apollo_job_titles: directive.jobTitles,
                apollo_industries: directive.industries,
                apollo_locations: directive.locations,
                apollo_company_size: directive.companySize,
                apollo_email_status: directive.emailStatus,
                apollo_market_segment: directive.marketSegment,
                apollo_seniority_levels: ['owner', 'c_suite'],
                expected_results: 75,
                enrich_contacts: true,
                routing_tool: 'apollo',
                directive_id: 'directive_01',
                session_id: directive.sessionId,
            };
        },
    },

    // Enhanced Lead Generation Pattern
    {
        pattern:
            /find\s+(\w+(?:\s+\w+)*?)\s+(?:of|from|at|in)\s+([\w\s,]+?)(?:\s+companies?)?(?:\s+in\s+([\w\s,]+?))?(?:\s+with\s+([\d\-\+]+)\s+employees?)?/i,
        category: 'lead_generation',
        confidence: 0.9,
        extractor: (match, query) => {
            const titles = match[1] ? extractJobTitles(match[1]) : [];
            const industries = match[2] ? extractIndustries(match[2]) : [];
            const locations = match[3] ? [match[3].trim()] : [];
            const companySize = match[4] || null;

            // Check if this matches any directive pattern
            const directiveMatch = findMatchingDirective(
                titles,
                industries,
                locations,
                companySize
            );

            return {
                apollo_job_titles: titles,
                apollo_industries: industries,
                apollo_locations: locations,
                apollo_company_size: companySize,
                apollo_seniority_levels: determineSeniorityLevels(titles),
                expected_results: directiveMatch?.expectedResults || 25,
                enrich_contacts: true,
                routing_tool: 'apollo',
                ...(directiveMatch && {
                    directive_id: directiveMatch.id,
                    session_id: directiveMatch.sessionId,
                }),
            };
        },
    },

    {
        pattern:
            /(?:executives?|contacts?|leads?|prospects?)\s+(?:who|that)\s+([\w\s]+?)(?:\s+in\s+([\w\s,]+?))?/i,
        category: 'lead_generation',
        confidence: 0.85,
        extractor: (match, query) => {
            const criteria = match[1] || '';
            const location = match[2] || '';

            return {
                apollo_search_criteria: criteria,
                apollo_locations: location ? [location.trim()] : [],
                expected_results: 50,
                enrich_contacts: true,
                routing_tool: 'apollo',
            };
        },
    },

    // Job Change Tracking
    {
        pattern:
            /(?:job changes?|recently joined|new hires?|moved to)\s+(?:at|in)?\s*([\w\s,]+?)(?:\s+as\s+([\w\s,]+?))?/i,
        category: 'job_change_alerts',
        confidence: 0.85,
        extractor: (match, query) => {
            const companies = match[1] ? [match[1].trim()] : [];
            const titles = match[2] ? extractJobTitles(match[2]) : [];

            return {
                apollo_job_change_period: 'last_90_days',
                apollo_target_companies: companies,
                apollo_new_titles: titles,
                setup_alerts: true,
                routing_tool: 'apollo',
            };
        },
    },

    // Aircraft Availability Patterns
    {
        pattern:
            /(?:check|find|show|get)\s+(?:availability|available|aircraft)\s+(?:for\s+)?(?:a\s+)?([\w\s]+jet)?\s*(?:from|departure)?\s*([\w\s]+?)\s+to\s+([\w\s]+?)(?:\s+(?:on|next|this)\s+([\w\s]+?))?(?:\s+for\s+(\d+)\s+passengers?)?/i,
        category: 'aircraft_availability',
        confidence: 0.9,
        extractor: (match, query) => {
            const aircraftType = match[1] ? normalizeAircraftCategory(match[1]) : 'Light Jet';
            const departure = match[2] ? getAirportCode(match[2]) : '';
            const arrival = match[3] ? getAirportCode(match[3]) : '';
            const date = match[4]
                ? parseRelativeDate(match[4])
                : new Date().toISOString().split('T')[0];
            const passengers = match[5] ? parseInt(match[5]) : 4;

            return {
                avinode_departure_airport: departure,
                avinode_arrival_airport: arrival,
                avinode_departure_date: date,
                avinode_passengers: passengers,
                avinode_aircraft_category: aircraftType,
                routing_tool: 'avinode',
            };
        },
    },

    // Empty Legs Pattern
    {
        pattern:
            /(?:empty legs?|repositioning|ferry flights?)\s+(?:from|between)?\s*([\w\s]+?)(?:\s+to\s+([\w\s]+?))?(?:\s+(?:this|next)\s+([\w\s]+?))?/i,
        category: 'empty_leg_search',
        confidence: 0.9,
        extractor: (match, query) => {
            const departure = match[1] || '';
            const arrival = match[2] || '';
            const period = match[3] || 'month';

            return {
                avinode_departure_region: departure.trim(),
                avinode_arrival_region: arrival.trim(),
                avinode_date_range: parseRelativeDate(`this ${period}`),
                min_discount_percentage: 40,
                routing_tool: 'avinode',
            };
        },
    },

    // Pricing Quote Pattern
    {
        pattern:
            /(?:quote|price|cost|pricing)\s+(?:for\s+)?(?:a\s+)?([\w\s]+jet)?\s*(?:from|departure)?\s*([\w\s]+?)\s+to\s+([\w\s]+?)(?:\s+(round\s*trip|one\s*way))?/i,
        category: 'pricing_quote',
        confidence: 0.9,
        extractor: (match, query) => {
            const aircraftType = match[1] ? normalizeAircraftCategory(match[1]) : 'Midsize Jet';
            const departure = match[2] ? getAirportCode(match[2]) : '';
            const arrival = match[3] ? getAirportCode(match[3]) : '';
            const tripType = match[4] ? match[4].replace(/\s+/g, '_').toLowerCase() : 'one_way';

            return {
                avinode_route: `${departure}-${arrival}`,
                avinode_aircraft_category: aircraftType,
                trip_type: tripType,
                include_all_fees: true,
                include_taxes: true,
                routing_tool: 'avinode',
            };
        },
    },

    // Combined Scenarios Pattern
    {
        pattern:
            /(?:find|show|get)\s+([\w\s]+?)\s+(?:who|that)\s+(?:need|might need|require)\s+(?:jets?|flights?|aircraft)\s+and\s+(?:show|check|find)\s+([\w\s]+)/i,
        category: 'combined_intel',
        confidence: 0.85,
        extractor: (match, query) => {
            const leadCriteria = match[1] || '';
            const aviationCriteria = match[2] || '';

            // Extract both Apollo and Avinode parameters
            const apolloParams = extractApolloParams(leadCriteria);
            const avinodeParams = extractAvinodeParams(aviationCriteria);

            return {
                ...apolloParams,
                ...avinodeParams,
                match_prospects_to_availability: true,
                routing_tool: 'both',
            };
        },
    },
];

// Helper functions
function extractJobTitles(text: string): string[] {
    const titles: string[] = [];
    const normalizedText = text.toLowerCase();

    for (const [key, values] of Object.entries(JOB_TITLE_MAPPINGS)) {
        if (normalizedText.includes(key)) {
            titles.push(...values);
        }
    }

    return titles.length > 0 ? titles : [text.trim()];
}

function extractIndustries(text: string): string[] {
    const industries: string[] = [];
    const normalizedText = text.toLowerCase();

    for (const [key, values] of Object.entries(INDUSTRY_MAPPINGS)) {
        if (normalizedText.includes(key)) {
            industries.push(...values);
        }
    }

    return industries.length > 0 ? industries : [text.trim()];
}

function determineSeniorityLevels(titles: string[]): string[] {
    const levels = new Set<string>();
    const titleStr = titles.join(' ').toLowerCase();

    if (titleStr.includes('ceo') || titleStr.includes('founder') || titleStr.includes('owner')) {
        levels.add('owner');
    }
    if (titleStr.includes('c') && (titleStr.includes('officer') || titleStr.length === 3)) {
        levels.add('c_suite');
    }
    if (titleStr.includes('vp') || titleStr.includes('vice president')) {
        levels.add('vp');
    }
    if (titleStr.includes('director')) {
        levels.add('director');
    }
    if (titleStr.includes('manager')) {
        levels.add('manager');
    }

    return Array.from(levels);
}

function normalizeAircraftCategory(text: string): string {
    const normalized = text.toLowerCase().trim();

    for (const [key, value] of Object.entries(AIRCRAFT_CATEGORIES)) {
        if (normalized.includes(key)) {
            return value;
        }
    }

    // Default based on common patterns
    if (normalized.includes('small') || normalized.includes('light')) return 'Light Jet';
    if (normalized.includes('large') || normalized.includes('heavy')) return 'Heavy Jet';

    return 'Midsize Jet'; // Default
}

function getAirportCode(location: string): string {
    const normalized = location.toLowerCase().trim();

    // Check if it's already an airport code
    if (/^[A-Z]{3,4}$/i.test(location.trim())) {
        return location.trim().toUpperCase();
    }

    // Look up in airport mappings
    for (const [key, codes] of Object.entries(AIRPORT_CODES)) {
        if (normalized.includes(key)) {
            return codes[0]; // Return primary airport
        }
    }

    // Default to unknown
    return location.trim().toUpperCase();
}

function extractApolloParams(text: string): Record<string, any> {
    const params: Record<string, any> = {};

    // Extract job titles
    const titles = extractJobTitles(text);
    if (titles.length > 0) {
        params.apollo_job_titles = titles;
        params.apollo_seniority_levels = determineSeniorityLevels(titles);
    }

    // Extract industries
    const industries = extractIndustries(text);
    if (industries.length > 0) {
        params.apollo_industries = industries;
    }

    // Extract company size
    const sizeMatch = text.match(/(\d+)[\s\-to]+(\d+)/);
    if (sizeMatch) {
        params.apollo_company_size = `${sizeMatch[1]}-${sizeMatch[2]}`;
    } else if (text.includes('fortune 500')) {
        params.apollo_company_size = '5000+';
    } else if (text.includes('startup')) {
        params.apollo_company_size = '1-50';
    }

    params.expected_results = 25;
    params.enrich_contacts = true;

    return params;
}

function findMatchingDirective(
    titles: string[],
    industries: string[],
    locations: string[],
    companySize: string | null
): any {
    // Implementation to match against Apollo directives
    // This would check similarity between extracted params and directive templates
    return null; // Placeholder for now
}

function extractAvinodeParams(text: string): Record<string, any> {
    const params: Record<string, any> = {};

    // Extract airports
    const airportMatches = text.match(/from\s+([\w\s]+?)\s+to\s+([\w\s]+)/i);
    if (airportMatches) {
        params.avinode_departure_airport = getAirportCode(airportMatches[1]);
        params.avinode_arrival_airport = getAirportCode(airportMatches[2]);
    }

    // Extract dates
    const datePatterns = ['next week', 'this week', 'tomorrow', 'today', 'next month'];
    for (const pattern of datePatterns) {
        if (text.includes(pattern)) {
            params.avinode_date_range = parseRelativeDate(pattern);
            break;
        }
    }

    // Extract aircraft type
    const aircraftMatch = text.match(/(light|midsize|heavy|ultra long range)\s*jet/i);
    if (aircraftMatch) {
        params.avinode_aircraft_category = normalizeAircraftCategory(aircraftMatch[0]);
    }

    return params;
}

// Main query mapping function
export function mapQueryToPayload(query: string, sessionId?: string): QueryMappingResult {
    const normalizedQuery = query.toLowerCase().trim();
    let bestMatch: QueryMappingResult | null = null;
    let highestConfidence = 0;

    // Try to match against patterns
    for (const pattern of QUERY_PATTERNS) {
        const match = query.match(pattern.pattern);
        if (match) {
            const payload = pattern.extractor(match, query);
            const confidence = calculateConfidence(payload, pattern.confidence);

            if (confidence > highestConfidence) {
                highestConfidence = confidence;
                bestMatch = {
                    confidence,
                    category: pattern.category,
                    payload: {
                        id: `req_${Date.now()}_${uuidv4().slice(0, 8)}`,
                        prompt: query,
                        sessionId: sessionId || `session_${Date.now()}`,
                        category: pattern.category,
                        ...payload,
                    },
                    requiresClarification: confidence < 0.7,
                };
            }
        }
    }

    // If no pattern matched or confidence is too low, return clarification request
    if (!bestMatch || bestMatch.confidence < 0.5) {
        return createClarificationRequest(query, sessionId);
    }

    // Add clarification questions if confidence is moderate
    if (bestMatch.confidence < 0.8) {
        bestMatch.clarificationQuestions = generateClarificationQuestions(
            bestMatch.category,
            bestMatch.payload
        );
    }

    return bestMatch;
}

// Calculate confidence based on payload completeness
function calculateConfidence(payload: Record<string, any>, baseConfidence: number): number {
    let completeness = 1.0;
    const requiredFields: Record<string, string[]> = {
        lead_generation: ['apollo_job_titles', 'apollo_industries'],
        aircraft_availability: [
            'avinode_departure_airport',
            'avinode_arrival_airport',
            'avinode_departure_date',
        ],
        pricing_quote: ['avinode_route', 'avinode_aircraft_category'],
        empty_leg_search: ['avinode_departure_region', 'avinode_date_range'],
    };

    const category =
        payload.routing_tool === 'apollo'
            ? 'lead_generation'
            : payload.routing_tool === 'avinode'
              ? 'aircraft_availability'
              : 'combined_intel';

    const required = requiredFields[category] || [];
    const missingFields = required.filter(
        field => !payload[field] || (Array.isArray(payload[field]) && payload[field].length === 0)
    );

    if (missingFields.length > 0) {
        completeness -= missingFields.length * 0.15;
    }

    return Math.max(0.3, Math.min(1.0, baseConfidence * completeness));
}

// Generate clarification questions
function generateClarificationQuestions(category: string, payload: Record<string, any>): string[] {
    const questions: string[] = [];

    switch (category) {
        case 'lead_generation':
            if (!payload.apollo_job_titles || payload.apollo_job_titles.length === 0) {
                questions.push('What job titles are you looking for? (e.g., CEO, CFO, VP Sales)');
            }
            if (!payload.apollo_industries || payload.apollo_industries.length === 0) {
                questions.push('Which industries are you targeting?');
            }
            if (!payload.apollo_locations || payload.apollo_locations.length === 0) {
                questions.push('What geographic locations should I search?');
            }
            break;

        case 'aircraft_availability':
            if (!payload.avinode_departure_airport) {
                questions.push('What is your departure airport or city?');
            }
            if (!payload.avinode_arrival_airport) {
                questions.push('What is your destination airport or city?');
            }
            if (!payload.avinode_departure_date) {
                questions.push('When would you like to depart?');
            }
            if (!payload.avinode_passengers) {
                questions.push('How many passengers will be traveling?');
            }
            break;

        case 'pricing_quote':
            if (!payload.avinode_route) {
                questions.push('What route are you looking to fly?');
            }
            if (!payload.trip_type) {
                questions.push('Is this a one-way or round-trip flight?');
            }
            break;
    }

    return questions;
}

// Create clarification request
function createClarificationRequest(query: string, sessionId?: string): QueryMappingResult {
    const clarificationQuestions = [
        'Are you looking to find business contacts or leads?',
        'Do you need to check aircraft availability or book a flight?',
        'Are you interested in pricing information?',
        'Would you like to search for empty leg opportunities?',
        'Do you need help with something else?',
    ];

    return {
        confidence: 0.3,
        category: 'needs_clarification',
        payload: {
            id: `req_${Date.now()}_${uuidv4().slice(0, 8)}`,
            prompt: query,
            sessionId: sessionId || `session_${Date.now()}`,
            category: 'needs_clarification',
            detected_intent: 'unclear',
            routing_tool: 'none',
        },
        requiresClarification: true,
        clarificationQuestions,
    };
}

// Export additional utilities
export {
    AIRPORT_CODES,
    JOB_TITLE_MAPPINGS,
    INDUSTRY_MAPPINGS,
    AIRCRAFT_CATEGORIES,
    parseRelativeDate,
    extractJobTitles,
    extractIndustries,
    getAirportCode,
    normalizeAircraftCategory,
};
