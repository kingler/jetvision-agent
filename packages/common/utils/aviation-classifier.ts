/**
 * Aviation Message Classification System
 * Determines if a message should be routed to the n8n aviation workflow
 */

// Aviation-related keywords and patterns
const AVIATION_KEYWORDS = {
  // Aircraft types and categories
  aircraft: ['aircraft', 'plane', 'jet', 'airplane', 'helicopter', 'charter', 'private jet', 'business jet'],
  
  // Aviation services
  services: ['charter', 'flight', 'booking', 'rental', 'lease', 'hire', 'aviation'],
  
  // Airports and locations
  airports: ['airport', 'airfield', 'runway', 'terminal', 'ICAO', 'IATA', 'FBO'],
  
  // Business aviation terms
  business: ['apollo.io', 'avinode', 'lead generation', 'fleet management', 'broker', 'operator'],
  
  // Flight operations
  operations: ['flight plan', 'crew', 'pilot', 'maintenance', 'hangar', 'fuel', 'catering'],
  
  // Travel and logistics
  travel: ['trip', 'travel', 'destination', 'passenger', 'cargo', 'freight'],
  
  // Aviation regulations and compliance
  compliance: ['FAA', 'EASA', 'certification', 'inspection', 'regulation', 'compliance'],
  
  // Executive and luxury travel
  executive: ['executive', 'luxury', 'VIP', 'premium', 'corporate', 'business travel']
};

// Combined aviation keywords for quick lookup
const ALL_AVIATION_KEYWORDS = Object.values(AVIATION_KEYWORDS).flat().map(keyword => keyword.toLowerCase());

// Aviation-related phrases and patterns
const AVIATION_PHRASES = [
  'private jet',
  'business jet',
  'charter flight',
  'flight booking',
  'aircraft rental',
  'aviation services',
  'executive travel',
  'corporate aviation',
  'fleet management',
  'lead generation',
  'apollo.io campaign',
  'avinode listing',
  'jet charter',
  'aircraft operator',
  'aviation broker',
  'flight crew',
  'aircraft maintenance',
  'hangar space',
  'aviation fuel',
  'flight catering',
  'airport services',
  'business aviation',
  'luxury travel',
  'VIP transport'
];

// Geographic patterns (airport codes, major aviation hubs)
const AIRPORT_PATTERNS = [
  /\b[A-Z]{3,4}\b/g, // ICAO/IATA codes (3-4 letters)
  /\b(JFK|LAX|LHR|CDG|DXB|SIN|HKG|NRT|FRA|AMS|MUC|ZUR)\b/gi, // Major airports
];

// Company and platform mentions
const AVIATION_COMPANIES = [
  'apollo.io',
  'avinode',
  'jetnet',
  'aircraft bluebook',
  'controller',
  'trade-a-plane',
  'globalair',
  'avbuyer',
  'corporate jet investor',
  'business jet traveler'
];

/**
 * Classifies if a message is aviation-related
 */
export function classifyAviationMessage(message: string): {
  isAviation: boolean;
  confidence: number;
  categories: string[];
  matchedTerms: string[];
  reason: string;
} {
  if (!message || typeof message !== 'string') {
    return {
      isAviation: false,
      confidence: 0,
      categories: [],
      matchedTerms: [],
      reason: 'Invalid or empty message'
    };
  }

  const normalizedMessage = message.toLowerCase().trim();
  const matchedTerms: string[] = [];
  const matchedCategories: string[] = [];
  let score = 0;

  // Check for exact phrase matches (highest weight)
  AVIATION_PHRASES.forEach(phrase => {
    if (normalizedMessage.includes(phrase.toLowerCase())) {
      matchedTerms.push(phrase);
      score += 10;
      matchedCategories.push('phrases');
    }
  });

  // Check for aviation company mentions (high weight)
  AVIATION_COMPANIES.forEach(company => {
    if (normalizedMessage.includes(company.toLowerCase())) {
      matchedTerms.push(company);
      score += 8;
      matchedCategories.push('companies');
    }
  });

  // Check for keyword matches by category
  Object.entries(AVIATION_KEYWORDS).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      if (normalizedMessage.includes(keyword.toLowerCase())) {
        matchedTerms.push(keyword);
        score += 5;
        matchedCategories.push(category);
      }
    });
  });

  // Check for airport code patterns (medium weight)
  AIRPORT_PATTERNS.forEach(pattern => {
    const matches = normalizedMessage.match(pattern);
    if (matches) {
      matches.forEach(match => {
        matchedTerms.push(match);
        score += 3;
        matchedCategories.push('airports');
      });
    }
  });

  // Calculate confidence based on score and message length
  const messageLength = normalizedMessage.split(' ').length;
  const confidence = Math.min(score / Math.max(messageLength * 0.3, 5), 1);

  // Determine if aviation-related based on confidence threshold
  const isAviation = confidence >= 0.3 || matchedTerms.length >= 2;

  // Generate reason
  let reason = '';
  if (isAviation) {
    reason = `Aviation content detected: ${matchedTerms.slice(0, 3).join(', ')}${matchedTerms.length > 3 ? ` and ${matchedTerms.length - 3} more` : ''}`;
  } else {
    reason = matchedTerms.length > 0 
      ? `Low aviation relevance: only found ${matchedTerms.join(', ')}`
      : 'No aviation-related content detected';
  }

  return {
    isAviation,
    confidence: Math.round(confidence * 100) / 100,
    categories: Array.from(new Set(matchedCategories)),
    matchedTerms: Array.from(new Set(matchedTerms)),
    reason
  };
}

/**
 * Quick check if message is aviation-related (simplified version)
 */
export function isAviationMessage(message: string): boolean {
  const result = classifyAviationMessage(message);
  return result.isAviation;
}

/**
 * Get aviation classification with detailed context
 */
export function getAviationContext(message: string): {
  shouldRoute: boolean;
  routingReason: string;
  suggestedActions: string[];
  classification: ReturnType<typeof classifyAviationMessage>;
} {
  const classification = classifyAviationMessage(message);
  
  const suggestedActions: string[] = [];
  
  if (classification.isAviation) {
    if (classification.categories.includes('companies')) {
      suggestedActions.push('Query Apollo.io and Avinode systems');
    }
    if (classification.categories.includes('aircraft') || classification.categories.includes('services')) {
      suggestedActions.push('Search aviation databases');
    }
    if (classification.categories.includes('airports') || classification.categories.includes('travel')) {
      suggestedActions.push('Provide flight and location information');
    }
    if (classification.categories.includes('business')) {
      suggestedActions.push('Generate business aviation insights');
    }
  }

  return {
    shouldRoute: classification.isAviation,
    routingReason: classification.reason,
    suggestedActions,
    classification
  };
}

// Export types for use in other modules
export type AviationClassification = ReturnType<typeof classifyAviationMessage>;
export type AviationContext = ReturnType<typeof getAviationContext>;