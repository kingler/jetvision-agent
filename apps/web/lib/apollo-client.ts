import { Redis } from '@upstash/redis';

/**
 * Apollo.io API Client for JetVision Agent
 * Handles authentication, rate limiting, and API interactions
 */

interface RateLimitState {
    requests: number[];
    lastReset: number;
}

interface ApolloLeadSearchParams {
    jobTitle?: string;
    industry?: string;
    companySize?: string;
    location?: string;
    limit?: number;
}

interface ApolloContactEnrichParams {
    email: string;
    linkedinUrl?: string;
}

interface ApolloEmailSequenceParams {
    name: string;
    contacts: string[];
    templateIds?: string[];
    delayDays?: number[];
}

interface ApolloAccountParams {
    domain: string;
    includeContacts?: boolean;
}

interface ApolloTrackingParams {
    sequenceId: string;
    startDate?: string;
    endDate?: string;
}

interface ApolloLead {
    id: string;
    name: string;
    title: string;
    company: string;
    industry: string;
    size: string;
    location: string;
    email: string;
    phone?: string;
    linkedIn?: string;
    confidence: number;
}

interface ApolloContact {
    email: string;
    name?: string;
    title?: string;
    company?: string;
    phone?: string;
    linkedIn?: string;
    twitter?: string;
    verified: boolean;
}

interface ApolloSequence {
    id: string;
    name: string;
    status: string;
    contactsCount: number;
    templatesCount: number;
    createdAt: string;
}

interface ApolloAccount {
    domain: string;
    companyName: string;
    industry: string;
    employeeCount: number;
    revenue?: string;
    headquarters?: string;
    contacts?: ApolloContact[];
}

interface ApolloMetrics {
    sequenceId: string;
    period: string;
    emailsSent: number;
    opens: number;
    openRate: string;
    clicks: number;
    clickRate: string;
    replies: number;
    replyRate: string;
    meetings: number;
}

export class ApolloClient {
    private apiKey: string;
    private baseUrl = 'https://api.apollo.io/v1';
    private redis?: Redis;
    private rateLimitTracker = new Map<string, RateLimitState>();
    private readonly MAX_REQUESTS_PER_MINUTE = 60;
    private readonly CACHE_TTL = 300; // 5 minutes

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.APOLLO_API_KEY || '';
        
        if (!this.apiKey) {
            console.warn('APOLLO_API_KEY not provided. API calls will fail.');
        }

        // Initialize Redis for caching if available
        if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
            this.redis = new Redis({
                url: process.env.KV_REST_API_URL,
                token: process.env.KV_REST_API_TOKEN,
            });
        }
    }

    /**
     * Check rate limits before making API calls
     */
    private checkRateLimit(endpoint: string): void {
        const now = Date.now();
        const windowStart = now - 60000; // 1 minute window
        
        const state = this.rateLimitTracker.get(endpoint) || {
            requests: [],
            lastReset: now
        };
        
        // Clean old requests outside the window
        state.requests = state.requests.filter(time => time > windowStart);
        
        if (state.requests.length >= this.MAX_REQUESTS_PER_MINUTE) {
            throw new Error(`Rate limit exceeded for ${endpoint}. Maximum ${this.MAX_REQUESTS_PER_MINUTE} requests per minute.`);
        }
        
        state.requests.push(now);
        this.rateLimitTracker.set(endpoint, state);
    }

    /**
     * Make authenticated API request to Apollo.io
     */
    private async makeRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        data?: any
    ): Promise<T> {
        this.checkRateLimit(endpoint);

        if (!this.apiKey) {
            throw new Error('Apollo.io API key is required');
        }

        // Check cache for GET requests
        if (method === 'GET' && this.redis) {
            const cacheKey = `apollo:${endpoint}:${JSON.stringify(data || {})}`;
            try {
                const cached = await this.redis.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached as string);
                }
            } catch (error) {
                console.warn('Cache read error:', error);
            }
        }

        let url = `${this.baseUrl}${endpoint}`;
        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': this.apiKey,
            },
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        } else if (data && method === 'GET') {
            const params = new URLSearchParams(data);
            url += `?${params}`;
        }

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Apollo API error (${response.status}): ${errorText}`);
            }

            const result = await response.json();

            // Cache successful GET responses
            if (method === 'GET' && this.redis && result) {
                const cacheKey = `apollo:${endpoint}:${JSON.stringify(data || {})}`;
                try {
                    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
                } catch (error) {
                    console.warn('Cache write error:', error);
                }
            }

            return result;
        } catch (error) {
            console.error(`Apollo API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Search for leads using Apollo.io People Search API
     */
    async searchLeads(params: ApolloLeadSearchParams): Promise<ApolloLead[]> {
        const searchData: any = {};
        
        if (params.jobTitle) {
            searchData.person_titles = [params.jobTitle];
        }
        
        if (params.industry) {
            searchData.organization_industry_tag_ids = [params.industry];
        }
        
        if (params.companySize) {
            searchData.organization_num_employees_ranges = [params.companySize];
        }
        
        if (params.location) {
            searchData.person_locations = [params.location];
        }

        searchData.page = 1;
        searchData.per_page = Math.min(params.limit || 25, 100);

        try {
            const response = await this.makeRequest<any>('/mixed_people/search', 'POST', searchData);
            
            return response.people?.map((person: any) => ({
                id: person.id,
                name: `${person.first_name} ${person.last_name}`,
                title: person.title || '',
                company: person.organization?.name || '',
                industry: person.organization?.industry || '',
                size: person.organization?.estimated_num_employees?.toString() || '',
                location: person.city || '',
                email: person.email || '',
                phone: person.phone_numbers?.[0]?.sanitized_number || '',
                linkedIn: person.linkedin_url || '',
                confidence: person.email_status === 'verified' ? 100 : 75
            })) || [];
        } catch (error) {
            console.error('Apollo lead search failed:', error);
            throw new Error('Failed to search leads in Apollo.io');
        }
    }

    /**
     * Enrich contact information using Apollo.io Enrichment API
     */
    async enrichContact(params: ApolloContactEnrichParams): Promise<ApolloContact> {
        const enrichData: any = {};
        
        if (params.email) {
            enrichData.email = params.email;
        }
        
        if (params.linkedinUrl) {
            enrichData.linkedin_url = params.linkedinUrl;
        }

        try {
            const response = await this.makeRequest<any>('/people/match', 'POST', enrichData);
            
            const person = response.person;
            if (!person) {
                throw new Error('Contact not found');
            }

            return {
                email: person.email || params.email,
                name: person.first_name && person.last_name ? 
                    `${person.first_name} ${person.last_name}` : '',
                title: person.title || '',
                company: person.organization?.name || '',
                phone: person.phone_numbers?.[0]?.sanitized_number || '',
                linkedIn: person.linkedin_url || params.linkedinUrl || '',
                twitter: person.twitter_url || '',
                verified: person.email_status === 'verified'
            };
        } catch (error) {
            console.error('Apollo contact enrichment failed:', error);
            throw new Error('Failed to enrich contact in Apollo.io');
        }
    }

    /**
     * Create email sequence using Apollo.io Sequences API
     */
    async createEmailSequence(params: ApolloEmailSequenceParams): Promise<ApolloSequence> {
        const sequenceData = {
            name: params.name,
            contact_ids: params.contacts,
            email_template_ids: params.templateIds || [],
            delay_days: params.delayDays || [1, 3, 7]
        };

        try {
            const response = await this.makeRequest<any>('/emailer_campaigns', 'POST', sequenceData);
            
            return {
                id: response.emailer_campaign.id,
                name: response.emailer_campaign.name,
                status: response.emailer_campaign.status,
                contactsCount: params.contacts.length,
                templatesCount: params.templateIds?.length || 0,
                createdAt: response.emailer_campaign.created_at
            };
        } catch (error) {
            console.error('Apollo email sequence creation failed:', error);
            throw new Error('Failed to create email sequence in Apollo.io');
        }
    }

    /**
     * Get account data using Apollo.io Organizations API
     */
    async getAccountData(params: ApolloAccountParams): Promise<ApolloAccount> {
        try {
            const searchData = {
                q_organization_domains: params.domain,
                page: 1,
                per_page: 1
            };

            const response = await this.makeRequest<any>('/organizations/search', 'POST', searchData);
            
            const organization = response.organizations?.[0];
            if (!organization) {
                throw new Error('Account not found');
            }

            const result: ApolloAccount = {
                domain: params.domain,
                companyName: organization.name,
                industry: organization.industry || '',
                employeeCount: organization.estimated_num_employees || 0,
                revenue: organization.estimated_annual_revenue || '',
                headquarters: organization.primary_domain || ''
            };

            // Get contacts if requested
            if (params.includeContacts) {
                try {
                    const contactsData = {
                        organization_ids: [organization.id],
                        page: 1,
                        per_page: 10
                    };

                    const contactsResponse = await this.makeRequest<any>('/mixed_people/search', 'POST', contactsData);
                    
                    result.contacts = contactsResponse.people?.map((person: any) => ({
                        email: person.email || '',
                        name: person.first_name && person.last_name ? 
                            `${person.first_name} ${person.last_name}` : '',
                        title: person.title || '',
                        company: organization.name,
                        phone: person.phone_numbers?.[0]?.sanitized_number || '',
                        linkedIn: person.linkedin_url || '',
                        twitter: person.twitter_url || '',
                        verified: person.email_status === 'verified'
                    })) || [];
                } catch (contactError) {
                    console.warn('Failed to fetch contacts for account:', contactError);
                    result.contacts = [];
                }
            }

            return result;
        } catch (error) {
            console.error('Apollo account data retrieval failed:', error);
            throw new Error('Failed to get account data from Apollo.io');
        }
    }

    /**
     * Track engagement metrics for email sequences
     */
    async trackEngagement(params: ApolloTrackingParams): Promise<ApolloMetrics> {
        try {
            const response = await this.makeRequest<any>(`/emailer_campaigns/${params.sequenceId}/stats`, 'GET');
            
            const stats = response.emailer_campaign_stats || {};
            
            return {
                sequenceId: params.sequenceId,
                period: params.startDate && params.endDate ? 
                    `${params.startDate} to ${params.endDate}` : 'All time',
                emailsSent: stats.num_sent || 0,
                opens: stats.num_opened || 0,
                openRate: stats.num_sent ? `${((stats.num_opened / stats.num_sent) * 100).toFixed(1)}%` : '0%',
                clicks: stats.num_clicked || 0,
                clickRate: stats.num_sent ? `${((stats.num_clicked / stats.num_sent) * 100).toFixed(1)}%` : '0%',
                replies: stats.num_replied || 0,
                replyRate: stats.num_sent ? `${((stats.num_replied / stats.num_sent) * 100).toFixed(1)}%` : '0%',
                meetings: stats.num_meetings_booked || 0
            };
        } catch (error) {
            console.error('Apollo engagement tracking failed:', error);
            throw new Error('Failed to track engagement metrics in Apollo.io');
        }
    }

    /**
     * Get API health status
     */
    async getHealthStatus(): Promise<{ status: string; apiKey: boolean; rateLimit: number }> {
        return {
            status: this.apiKey ? 'ready' : 'misconfigured',
            apiKey: !!this.apiKey,
            rateLimit: this.MAX_REQUESTS_PER_MINUTE
        };
    }
}