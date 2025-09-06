/**
 * Direct Apollo.io Integration Client
 *
 * Provides backup integration to Apollo.io API when N8N workflows are unavailable.
 * Maintains feature parity with N8N-based Apollo.io integration for seamless fallback.
 */

import { CircuitBreaker } from './circuit-breaker';
import { CacheManager } from './cache-manager';

export interface ApolloConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    enableCaching?: boolean;
    rateLimitDelay?: number;
}

export interface ApolloSearchParams {
    personTitles?: string[];
    companyKeywords?: string[];
    industryKeywords?: string[];
    locations?: string[];
    companySize?: { min?: number; max?: number };
    currentEmployment?: boolean;
    limit?: number;
    offset?: number;
}

export interface ApolloLead {
    id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    title?: string;
    company?: string;
    companyId?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    location?: string;
    employmentHistory?: Array<{
        title: string;
        company: string;
        startDate?: string;
        endDate?: string;
    }>;
    score?: number;
    tags?: string[];
    photoUrl?: string;
}

export interface ApolloSearchResult {
    leads: ApolloLead[];
    total: number;
    page: number;
    hasMore: boolean;
}

export interface ApolloCampaignMetrics {
    campaignId: string;
    campaignName?: string;
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalReplied: number;
    totalBounced: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
    bounceRate: number;
}

export interface ApolloEnrichmentData {
    id: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    company?: string;
    industry?: string;
    companySize?: number;
    location?: string;
    socialProfiles?: {
        linkedin?: string;
        twitter?: string;
        facebook?: string;
    };
    technologies?: string[];
    fundingRounds?: Array<{
        round: string;
        amount: number;
        date: string;
    }>;
}

export class ApolloDirectClient {
    private circuitBreaker: CircuitBreaker;
    private cache?: CacheManager;
    private lastRequestTime = 0;

    constructor(
        private config: ApolloConfig,
        circuitBreaker?: CircuitBreaker,
        cache?: CacheManager
    ) {
        this.circuitBreaker =
            circuitBreaker ||
            new CircuitBreaker('apollo-direct', {
                failureThreshold: 3,
                recoveryTimeout: 60000,
                requestTimeout: 10000,
                halfOpenMaxCalls: 2,
                successThreshold: 2,
                monitoringWindow: 120000,
            });

        if (config.enableCaching && cache) {
            this.cache = cache;
        }
    }

    /**
     * Search for executive assistants and travel coordinators
     */
    async searchExecutiveAssistants(params: {
        companyKeywords?: string[];
        locations?: string[];
        companySize?: { min?: number; max?: number };
        limit?: number;
    }): Promise<ApolloSearchResult> {
        const searchParams: ApolloSearchParams = {
            personTitles: [
                'Executive Assistant',
                'Chief of Staff',
                'Travel Coordinator',
                'Office Manager',
                'Executive Administrator',
                'Personal Assistant',
                'Administrative Assistant',
            ],
            companyKeywords: params.companyKeywords,
            locations: params.locations || [
                'New York',
                'San Francisco',
                'Los Angeles',
                'Miami',
                'London',
            ],
            companySize: params.companySize || { min: 50 },
            currentEmployment: true,
            limit: params.limit || 50,
        };

        return this.searchPeople(searchParams);
    }

    /**
     * Find companies that recently raised funding
     */
    async findFundingCompanies(params: {
        industryKeywords?: string[];
        fundingRounds?: string[];
        timeframe?: 'last_30_days' | 'last_90_days' | 'last_year';
        limit?: number;
    }): Promise<ApolloSearchResult> {
        // For direct API, we'll search for companies and then find decision makers
        const searchParams: ApolloSearchParams = {
            personTitles: [
                'CEO',
                'COO',
                'CFO',
                'President',
                'Vice President',
                'Managing Director',
                'Partner',
                'Founder',
            ],
            industryKeywords: params.industryKeywords || [
                'Technology',
                'Software',
                'Fintech',
                'Healthcare',
                'Real Estate',
                'Private Equity',
                'Venture Capital',
            ],
            companySize: { min: 20 },
            currentEmployment: true,
            limit: params.limit || 30,
        };

        return this.searchPeople(searchParams);
    }

    /**
     * Search for people with recent job changes
     */
    async findJobChangeAlerts(params: {
        timeframe?: 'last_30_days' | 'last_90_days';
        industries?: string[];
        titles?: string[];
        limit?: number;
    }): Promise<ApolloSearchResult> {
        const searchParams: ApolloSearchParams = {
            personTitles: params.titles || [
                'CEO',
                'COO',
                'CFO',
                'Vice President',
                'Director',
                'Managing Director',
                'Partner',
            ],
            industryKeywords: params.industries,
            currentEmployment: true,
            limit: params.limit || 25,
        };

        return this.searchPeople(searchParams);
    }

    /**
     * Generic people search
     */
    async searchPeople(params: ApolloSearchParams): Promise<ApolloSearchResult> {
        const cacheKey = this.cache ? CacheManager.generateKey('apollo-search', params) : null;

        // Check cache first
        if (this.cache && cacheKey) {
            const cached = await this.cache.get<ApolloSearchResult>(cacheKey);
            if (cached) {
                console.log('⚡ Apollo search result from cache');
                return cached;
            }
        }

        return this.circuitBreaker.execute(async () => {
            await this.enforceRateLimit();

            const response = await this.makeRequest('/people/search', {
                method: 'POST',
                body: JSON.stringify(this.buildSearchQuery(params)),
            });

            const result = this.parseSearchResponse(response);

            // Cache the result
            if (this.cache && cacheKey) {
                this.cache.set(cacheKey, result, 'apollo-direct', {
                    ttl: 15 * 60 * 1000, // 15 minutes
                    metadata: { searchParams: params },
                });
            }

            return result;
        });
    }

    /**
     * Get campaign metrics
     */
    async getCampaignMetrics(campaignId: string): Promise<ApolloCampaignMetrics> {
        const cacheKey = this.cache
            ? CacheManager.generateKey('apollo-campaign', { campaignId })
            : null;

        if (this.cache && cacheKey) {
            const cached = await this.cache.get<ApolloCampaignMetrics>(cacheKey);
            if (cached) {
                console.log('⚡ Apollo campaign metrics from cache');
                return cached;
            }
        }

        return this.circuitBreaker.execute(async () => {
            await this.enforceRateLimit();

            const response = await this.makeRequest(`/campaigns/${campaignId}/stats`);
            const metrics = this.parseCampaignMetrics(response, campaignId);

            if (this.cache && cacheKey) {
                this.cache.set(cacheKey, metrics, 'apollo-direct', {
                    ttl: 5 * 60 * 1000, // 5 minutes
                    metadata: { campaignId },
                });
            }

            return metrics;
        });
    }

    /**
     * Enrich contact data
     */
    async enrichContact(identifier: {
        email?: string;
        linkedin?: string;
        domain?: string;
    }): Promise<ApolloEnrichmentData> {
        const cacheKey = this.cache ? CacheManager.generateKey('apollo-enrich', identifier) : null;

        if (this.cache && cacheKey) {
            const cached = await this.cache.get<ApolloEnrichmentData>(cacheKey);
            if (cached) {
                console.log('⚡ Apollo enrichment from cache');
                return cached;
            }
        }

        return this.circuitBreaker.execute(async () => {
            await this.enforceRateLimit();

            const response = await this.makeRequest('/people/enrich', {
                method: 'POST',
                body: JSON.stringify(identifier),
            });

            const enrichment = this.parseEnrichmentResponse(response);

            if (this.cache && cacheKey) {
                this.cache.set(cacheKey, enrichment, 'apollo-direct', {
                    ttl: 60 * 60 * 1000, // 1 hour - enrichment data is stable
                    metadata: identifier,
                });
            }

            return enrichment;
        });
    }

    /**
     * Build Apollo.io search query from params
     */
    private buildSearchQuery(params: ApolloSearchParams): any {
        const query: any = {
            prospected_by_current_team: ['no'],
            page: Math.floor((params.offset || 0) / (params.limit || 25)) + 1,
            per_page: params.limit || 25,
        };

        if (params.personTitles && params.personTitles.length > 0) {
            query.person_titles = params.personTitles;
        }

        if (params.locations && params.locations.length > 0) {
            query.person_locations = params.locations;
        }

        if (params.companyKeywords && params.companyKeywords.length > 0) {
            query.organization_keywords = params.companyKeywords;
        }

        if (params.industryKeywords && params.industryKeywords.length > 0) {
            query.organization_industry_tag_ids = params.industryKeywords;
        }

        if (params.companySize) {
            if (params.companySize.min !== undefined) {
                query.organization_num_employees_ranges = [`${params.companySize.min}+`];
            }
        }

        if (params.currentEmployment) {
            query.person_seniorities = ['senior', 'executive', 'director'];
        }

        return query;
    }

    /**
     * Parse Apollo.io search response
     */
    private parseSearchResponse(response: any): ApolloSearchResult {
        const people = response.people || [];

        const leads: ApolloLead[] = people.map((person: any) => ({
            id: person.id,
            firstName: person.first_name,
            lastName: person.last_name,
            name: person.name || `${person.first_name} ${person.last_name}`.trim(),
            title: person.title,
            company: person.organization?.name,
            companyId: person.organization?.id,
            email: person.email,
            phone: person.sanitized_phone,
            linkedinUrl: person.linkedin_url,
            twitterUrl: person.twitter_url,
            location: person.city,
            employmentHistory: person.employment_history?.map((emp: any) => ({
                title: emp.title,
                company: emp.organization_name,
                startDate: emp.start_date,
                endDate: emp.end_date,
            })),
            score: this.calculateLeadScore(person),
            photoUrl: person.photo_url,
        }));

        return {
            leads,
            total: response.pagination?.total_entries || leads.length,
            page: response.pagination?.page || 1,
            hasMore: response.pagination?.page < response.pagination?.total_pages,
        };
    }

    /**
     * Parse campaign metrics response
     */
    private parseCampaignMetrics(response: any, campaignId: string): ApolloCampaignMetrics {
        const stats = response.stats || response;

        const totalSent = stats.num_sent || 0;
        const totalDelivered = stats.num_delivered || totalSent;
        const totalOpened = stats.num_opened || 0;
        const totalClicked = stats.num_clicked || 0;
        const totalReplied = stats.num_replied || 0;
        const totalBounced = stats.num_bounced || 0;

        return {
            campaignId,
            campaignName: response.name,
            totalSent,
            totalDelivered,
            totalOpened,
            totalClicked,
            totalReplied,
            totalBounced,
            openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
            clickRate: totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0,
            replyRate: totalDelivered > 0 ? (totalReplied / totalDelivered) * 100 : 0,
            bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
        };
    }

    /**
     * Parse enrichment response
     */
    private parseEnrichmentResponse(response: any): ApolloEnrichmentData {
        const person = response.person || response;

        return {
            id: person.id,
            email: person.email,
            phone: person.sanitized_phone,
            jobTitle: person.title,
            company: person.organization?.name,
            industry: person.organization?.industry,
            companySize: person.organization?.estimated_num_employees,
            location: person.city,
            socialProfiles: {
                linkedin: person.linkedin_url,
                twitter: person.twitter_url,
                facebook: person.facebook_url,
            },
            technologies: person.organization?.technologies?.map((tech: any) => tech.name) || [],
            fundingRounds:
                person.organization?.funding_events?.map((event: any) => ({
                    round: event.funding_round_type,
                    amount: event.money_raised,
                    date: event.date,
                })) || [],
        };
    }

    /**
     * Calculate lead score based on JetVision criteria
     */
    private calculateLeadScore(person: any): number {
        let score = 0;

        // Title relevance (0-30 points)
        const title = person.title?.toLowerCase() || '';
        if (title.includes('executive') || title.includes('chief')) score += 30;
        else if (title.includes('assistant') || title.includes('coordinator')) score += 25;
        else if (title.includes('manager') || title.includes('director')) score += 20;

        // Company size (0-25 points)
        const companySize = person.organization?.estimated_num_employees || 0;
        if (companySize >= 500) score += 25;
        else if (companySize >= 100) score += 20;
        else if (companySize >= 50) score += 15;

        // Industry relevance (0-25 points)
        const industry = person.organization?.industry?.toLowerCase() || '';
        const relevantIndustries = [
            'technology',
            'finance',
            'real estate',
            'entertainment',
            'private equity',
        ];
        if (relevantIndustries.some(ind => industry.includes(ind))) score += 25;

        // Location (0-20 points)
        const location = person.city?.toLowerCase() || '';
        const primaryHubs = ['new york', 'san francisco', 'los angeles', 'miami', 'london'];
        if (primaryHubs.some(hub => location.includes(hub))) score += 20;
        else if (location) score += 10;

        return Math.min(score, 100);
    }

    /**
     * Enforce rate limiting
     */
    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minDelay = this.config.rateLimitDelay || 100; // 100ms between requests

        if (timeSinceLastRequest < minDelay) {
            const delayNeeded = minDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delayNeeded));
        }

        this.lastRequestTime = Date.now();
    }

    /**
     * Make HTTP request to Apollo.io API
     */
    private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
        const baseUrl = this.config.baseUrl || 'https://api.apollo.io/v1';
        const url = `${baseUrl}${endpoint}`;

        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': this.config.apiKey,
        };

        const requestOptions: RequestInit = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
            signal: AbortSignal.timeout(this.config.timeout || 10000),
        };

        console.log(`🔗 Apollo.io API request: ${endpoint}`);

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Apollo.io API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log(`✅ Apollo.io API response: ${endpoint}`);

        return data;
    }

    /**
     * Get client health status
     */
    getHealth() {
        return this.circuitBreaker.getHealth();
    }

    /**
     * Get client metrics
     */
    getMetrics() {
        return this.circuitBreaker.getMetrics();
    }
}

/**
 * Factory function to create Apollo.io client with proper dependencies
 */
export function createApolloDirectClient(config: ApolloConfig): ApolloDirectClient {
    const circuitBreaker = new CircuitBreaker('apollo-direct', {
        failureThreshold: 3,
        recoveryTimeout: 60000,
        requestTimeout: config.timeout || 10000,
        halfOpenMaxCalls: 2,
        successThreshold: 2,
        monitoringWindow: 120000,
    });

    return new ApolloDirectClient(config, circuitBreaker);
}
