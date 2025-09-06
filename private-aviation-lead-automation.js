#!/usr/bin/env node

/**
 * Private Charter Jet Lead Generation Automation
 *
 * Specialized system for identifying key decision-makers responsible for
 * booking and scheduling private charter jets for business and personal travel.
 *
 * Targets C-suite executives, travel managers, executive assistants, and
 * family office managers at high-revenue companies with frequent travel needs.
 */

import { ApolloMCPIntegration } from './apollo-mcp-integration.js';

class PrivateAviationLeadAutomator extends ApolloMCPIntegration {
    constructor(options = {}) {
        super(options);

        // Aviation-specific configuration
        this.minCompanyRevenue = options.minCompanyRevenue || 50000000; // $50M+
        this.intentSignalWeight = options.intentSignalWeight || 0.3;
        this.decisionMakerScore = new Map();

        // Override search variations with aviation-focused parameters
        this.variations = {
            // Primary decision-makers for private aviation
            decisionMakerTitles: [
                // C-Suite Executives (Budget Authority)
                'Chief Executive Officer',
                'CEO',
                'Chief Financial Officer',
                'CFO',
                'President',
                'Managing Director',
                'Chairman',

                // Executive Support (Booking Authority)
                'Executive Assistant to CEO',
                'Executive Assistant to President',
                'Executive Assistant to CFO',
                'Executive Assistant',
                'Executive Coordinator',
                'Executive Support Manager',
                'Chief of Staff',

                // Travel Operations (Logistics Authority)
                'Travel Manager',
                'Travel Director',
                'Corporate Travel Manager',
                'Global Travel Manager',
                'Business Travel Coordinator',
                'Travel Operations Manager',
                'Business Operations Manager',

                // High-Net-Worth Individual Support
                'Family Office Manager',
                'Private Wealth Manager',
                'Personal Assistant to CEO',
                'Lifestyle Manager',
                'Concierge Manager',
            ],

            // Geographic markets with high private aviation demand
            highValueMarkets: [
                'New York, New York', // Financial capital
                'Los Angeles, California', // Entertainment/Tech
                'Miami, Florida', // International business
                'Chicago, Illinois', // Corporate headquarters
                'Dallas, Texas', // Oil/Energy/Business
                'San Francisco, California', // Tech/VC
                'Houston, Texas', // Energy sector
                'Atlanta, Georgia', // Transportation hub
                'Boston, Massachusetts', // Healthcare/Finance
                'Denver, Colorado', // Mountain West business
                'Nashville, Tennessee', // Entertainment/Healthcare
                'Austin, Texas', // Tech/Business
                'Seattle, Washington', // Tech headquarters
                'Charlotte, North Carolina', // Banking center
                'Phoenix, Arizona', // Growing business hub
            ],

            // Company size ranges indicating private aviation capacity
            aviationReadyCompanySizes: [
                '201-500', // Mid-size with executive travel needs
                '501-1000', // Large companies with frequent travel
                '1001-5000', // Enterprises with global operations
                '5001-10000', // Major corporations
                '10000+', // Fortune 500 companies
            ],

            // Industries with high private aviation usage
            highAviationIndustries: [
                'Financial Services', // Investment banking, private equity
                'Investment Banking',
                'Private Equity',
                'Hedge Funds',
                'Consulting', // Management consulting firms
                'Professional Services',
                'Technology', // Tech executives and investors
                'Healthcare', // Pharmaceutical, medical devices
                'Pharmaceuticals',
                'Real Estate', // Commercial real estate
                'Entertainment', // Music, film, sports
                'Media',
                'Oil & Gas', // Energy sector executives
                'Energy',
                'Manufacturing', // Industrial companies
                'Aerospace', // Defense and aviation
                'Luxury Goods', // High-end consumer goods
                'Private Wealth Management', // Family offices
            ],
        };

        // Intent signal keywords for enhanced targeting
        this.intentSignals = {
            // Strong intent signals
            strongSignals: [
                'private jet',
                'charter flight',
                'corporate aircraft',
                'executive travel',
                'jet charter',
                'private aviation',
                'aircraft charter',
                'business jet',
                'NetJets',
                'Flexjet',
                'VistaJet',
                'Wheels Up',
                'XO',
                'JetSuite',
                'fractional ownership',
                'jet card',
                'empty leg',
                'positioning flight',
            ],

            // Medium intent signals
            mediumSignals: [
                'business travel',
                'executive transportation',
                'corporate travel',
                'time-sensitive travel',
                'confidential meetings',
                'client visits',
                'roadshow',
                'investor meetings',
                'board meetings',
                'site visits',
                'global operations',
                'international business',
                'multiple locations',
            ],

            // Weak intent signals
            weakSignals: [
                'frequent flyer',
                'first class',
                'business class',
                'priority boarding',
                'airline status',
                'travel expenses',
                'travel policy',
                'T&E',
                'remote locations',
                'executive team',
                'leadership team',
                'C-suite',
            ],
        };
    }

    /**
     * Generate priority search combinations focused on aviation decision-makers
     */
    generateAviationPriorityCombinations() {
        const combinations = [];

        // Tier 1: C-Suite with budget authority
        const cSuiteTitles = this.variations.decisionMakerTitles.slice(0, 7);
        const primaryMarkets = this.variations.highValueMarkets.slice(0, 6);
        const largeCompanies = this.variations.aviationReadyCompanySizes.slice(2); // 1000+ employees

        for (const title of cSuiteTitles) {
            for (const market of primaryMarkets) {
                for (const size of largeCompanies) {
                    combinations.push({
                        jobTitle: title,
                        location: market,
                        companySize: size,
                        industry: 'Financial Services', // Start with highest aviation usage
                        priority: 'tier1-executive',
                        decisionMakerType: 'budget-authority',
                    });
                }
            }
        }

        // Tier 2: Executive Assistants with booking authority
        const executiveAssistants = this.variations.decisionMakerTitles.slice(7, 13);
        for (const title of executiveAssistants) {
            for (const market of primaryMarkets) {
                combinations.push({
                    jobTitle: title,
                    location: market,
                    companySize: '501-1000',
                    industry: 'Consulting',
                    priority: 'tier2-support',
                    decisionMakerType: 'booking-authority',
                });
            }
        }

        // Tier 3: Travel Managers with operational authority
        const travelManagers = this.variations.decisionMakerTitles.slice(13, 19);
        for (const title of travelManagers) {
            for (const market of this.variations.highValueMarkets.slice(0, 8)) {
                combinations.push({
                    jobTitle: title,
                    location: market,
                    companySize: '1001-5000',
                    industry: 'Technology',
                    priority: 'tier3-operations',
                    decisionMakerType: 'logistics-authority',
                });
            }
        }

        // Tier 4: Family Office / High-Net-Worth support
        const familyOfficeTitles = this.variations.decisionMakerTitles.slice(19);
        const wealthyMarkets = ['New York, New York', 'Los Angeles, California', 'Miami, Florida'];
        for (const title of familyOfficeTitles) {
            for (const market of wealthyMarkets) {
                combinations.push({
                    jobTitle: title,
                    location: market,
                    companySize: '51-200', // Smaller but high-value family offices
                    industry: 'Private Wealth Management',
                    priority: 'tier4-wealth',
                    decisionMakerType: 'personal-authority',
                });
            }
        }

        return combinations;
    }

    /**
     * Enhanced search with aviation-specific intent scoring
     */
    async executeAviationSearch(searchParams) {
        const requestId = Date.now().toString();
        console.log(
            `🛩️  Aviation Search: ${searchParams.decisionMakerType} - ${searchParams.jobTitle} in ${searchParams.location}`
        );

        try {
            // Execute base search
            const results = await this.executeSearch(searchParams);

            // Score results based on aviation intent signals
            const scoredResults = results.map(lead => ({
                ...lead,
                aviationScore: this.calculateAviationIntentScore(lead),
                decisionMakerType: searchParams.decisionMakerType,
                priority: searchParams.priority,
            }));

            // Filter for high-scoring prospects only
            const qualifiedLeads = scoredResults.filter(
                lead => lead.aviationScore >= this.getMinimumScoreThreshold(searchParams.priority)
            );

            console.log(
                `✈️  Qualified ${qualifiedLeads.length}/${results.length} leads (aviation score ≥ ${this.getMinimumScoreThreshold(searchParams.priority)})`
            );

            return qualifiedLeads;
        } catch (error) {
            console.error(`❌ Aviation search failed:`, error.message);
            return [];
        }
    }

    /**
     * Calculate aviation intent score based on multiple signals
     */
    calculateAviationIntentScore(lead) {
        let score = 0;
        const profile = `${lead.title} ${lead.company} ${lead.industry}`.toLowerCase();

        // Base score from job title relevance
        if (lead.title) {
            const title = lead.title.toLowerCase();
            if (title.includes('ceo') || title.includes('chief executive')) score += 50;
            else if (title.includes('cfo') || title.includes('chief financial')) score += 45;
            else if (title.includes('president') || title.includes('managing director'))
                score += 40;
            else if (title.includes('executive assistant')) score += 35;
            else if (title.includes('travel manager') || title.includes('travel director'))
                score += 30;
            else if (title.includes('family office') || title.includes('private wealth'))
                score += 25;
            else if (title.includes('chief of staff') || title.includes('executive coordinator'))
                score += 20;
        }

        // Company size multiplier (larger companies = higher aviation probability)
        if (lead.companySize) {
            if (lead.companySize.includes('10000+')) score *= 1.5;
            else if (lead.companySize.includes('5001-10000')) score *= 1.4;
            else if (lead.companySize.includes('1001-5000')) score *= 1.3;
            else if (lead.companySize.includes('501-1000')) score *= 1.2;
            else if (lead.companySize.includes('201-500')) score *= 1.1;
        }

        // Industry multiplier
        if (lead.industry) {
            const industry = lead.industry.toLowerCase();
            if (industry.includes('financial') || industry.includes('investment')) score *= 1.4;
            else if (industry.includes('consulting') || industry.includes('professional'))
                score *= 1.3;
            else if (industry.includes('private equity') || industry.includes('hedge fund'))
                score *= 1.4;
            else if (industry.includes('pharmaceuticals') || industry.includes('healthcare'))
                score *= 1.2;
            else if (industry.includes('energy') || industry.includes('oil')) score *= 1.2;
            else if (industry.includes('entertainment') || industry.includes('media')) score *= 1.3;
        }

        // Intent signal detection
        for (const signal of this.intentSignals.strongSignals) {
            if (profile.includes(signal.toLowerCase())) score += 20;
        }
        for (const signal of this.intentSignals.mediumSignals) {
            if (profile.includes(signal.toLowerCase())) score += 10;
        }
        for (const signal of this.intentSignals.weakSignals) {
            if (profile.includes(signal.toLowerCase())) score += 5;
        }

        // Geographic premium for high-aviation markets
        if (lead.location) {
            const location = lead.location.toLowerCase();
            if (location.includes('new york') || location.includes('manhattan')) score += 15;
            else if (location.includes('los angeles') || location.includes('beverly hills'))
                score += 15;
            else if (location.includes('miami') || location.includes('south beach')) score += 12;
            else if (location.includes('san francisco') || location.includes('palo alto'))
                score += 10;
            else if (location.includes('chicago') || location.includes('dallas')) score += 8;
        }

        return Math.round(score);
    }

    /**
     * Get minimum score threshold by priority tier
     */
    getMinimumScoreThreshold(priority) {
        const thresholds = {
            'tier1-executive': 80, // Highest standards for C-suite
            'tier2-support': 60, // Medium standards for EAs
            'tier3-operations': 50, // Lower standards for travel managers
            'tier4-wealth': 70, // High standards for family offices
        };
        return thresholds[priority] || 50;
    }

    /**
     * Enhanced prospect enrichment with aviation context
     */
    async enrichAviationProspect(lead) {
        const enrichedLead = { ...lead };

        // Add aviation-specific context
        enrichedLead.aviationProfile = {
            decisionMakerLevel: this.assessDecisionMakerLevel(lead),
            budgetAuthority: this.assessBudgetAuthority(lead),
            travelFrequency: this.estimateTravelFrequency(lead),
            aviationReadiness: this.assessAviationReadiness(lead),
            recommendedApproach: this.getRecommendedApproach(lead),
        };

        // Company aviation indicators
        enrichedLead.companyProfile = {
            aviationPotential: this.assessCompanyAviationPotential(lead),
            geographicFootprint: this.assessGeographicFootprint(lead),
            industryFit: this.assessIndustryFit(lead),
            competitorAnalysis: this.getCompetitorInsights(lead),
        };

        return enrichedLead;
    }

    /**
     * Assess decision maker level for aviation purchases
     */
    assessDecisionMakerLevel(lead) {
        const title = lead.title?.toLowerCase() || '';

        if (title.includes('ceo') || title.includes('president') || title.includes('chairman')) {
            return 'ultimate-authority';
        } else if (title.includes('cfo') || title.includes('managing director')) {
            return 'budget-authority';
        } else if (title.includes('executive assistant') || title.includes('chief of staff')) {
            return 'booking-authority';
        } else if (title.includes('travel manager') || title.includes('travel director')) {
            return 'operational-authority';
        } else if (title.includes('family office') || title.includes('private wealth')) {
            return 'personal-authority';
        }
        return 'influencer';
    }

    /**
     * Assess budget authority for private aviation expenses
     */
    assessBudgetAuthority(lead) {
        const score = lead.aviationScore || 0;
        const title = lead.title?.toLowerCase() || '';

        if (title.includes('ceo') || title.includes('president')) {
            return { level: 'unlimited', confidence: 'high' };
        } else if (title.includes('cfo')) {
            return { level: 'high', confidence: 'high' };
        } else if (title.includes('managing director') || title.includes('chairman')) {
            return { level: 'high', confidence: 'medium' };
        } else if (title.includes('executive assistant')) {
            return { level: 'delegated', confidence: 'medium' };
        } else if (title.includes('travel manager')) {
            return { level: 'operational', confidence: 'medium' };
        }
        return { level: 'unknown', confidence: 'low' };
    }

    /**
     * Estimate travel frequency based on role and company
     */
    estimateTravelFrequency(lead) {
        const title = lead.title?.toLowerCase() || '';
        const industry = lead.industry?.toLowerCase() || '';
        const size = lead.companySize || '';

        let frequency = 'low';

        // Role-based frequency
        if (title.includes('ceo') || title.includes('president')) {
            frequency = 'very-high';
        } else if (title.includes('managing director') || title.includes('business development')) {
            frequency = 'high';
        } else if (title.includes('executive assistant') || title.includes('travel manager')) {
            frequency = 'coordinates-high';
        }

        // Industry multiplier
        if (industry.includes('consulting') || industry.includes('investment')) {
            frequency = frequency === 'low' ? 'medium' : 'very-high';
        }

        // Company size impact
        if (size.includes('10000+') || size.includes('5001-10000')) {
            frequency = frequency === 'low' ? 'medium' : 'very-high';
        }

        return frequency;
    }

    /**
     * Assess overall aviation readiness
     */
    assessAviationReadiness(lead) {
        const score = lead.aviationScore || 0;

        if (score >= 100) return 'immediate-prospect';
        else if (score >= 80) return 'high-potential';
        else if (score >= 60) return 'medium-potential';
        else if (score >= 40) return 'nurture-required';
        else return 'low-priority';
    }

    /**
     * Get recommended sales approach
     */
    getRecommendedApproach(lead) {
        const decisionLevel = this.assessDecisionMakerLevel(lead);
        const budgetAuth = this.assessBudgetAuthority(lead);

        const approaches = {
            'ultimate-authority': 'Direct executive approach - focus on time value and convenience',
            'budget-authority':
                'ROI-focused approach - emphasize cost efficiency and productivity gains',
            'booking-authority':
                'Process-focused approach - highlight ease of booking and reliability',
            'operational-authority': 'Service-focused approach - emphasize logistics and support',
            'personal-authority':
                'Luxury-focused approach - emphasize comfort and personalized service',
            influencer:
                'Information-focused approach - provide educational content and build relationship',
        };

        return approaches[decisionLevel] || 'Relationship-building approach';
    }

    /**
     * Run aviation-focused lead generation
     */
    async runAviationCampaign() {
        console.log(`🛩️  Starting Private Aviation Lead Generation Campaign`);
        console.log(`🎯 Target: Decision-makers for private charter jet bookings`);
        console.log(`💰 Focus: Companies with $50M+ revenue and executive travel needs\n`);

        // Generate aviation-specific combinations
        this.priorityCombinations = this.generateAviationPriorityCombinations();
        console.log(
            `📊 Generated ${this.priorityCombinations.length} aviation-focused search combinations\n`
        );

        let searchCount = 0;
        const startTime = Date.now();

        // Execute tiered search approach
        const tierGroups = this.groupByTier(this.priorityCombinations);

        for (const [tier, combinations] of Object.entries(tierGroups)) {
            console.log(
                `\n🏆 Executing ${tier.toUpperCase()} searches (${combinations.length} combinations)`
            );

            for (const combination of combinations) {
                if (this.leads.size >= this.targetLeadCount) {
                    console.log(`🎯 Target reached: ${this.leads.size} qualified aviation leads`);
                    break;
                }

                const qualifiedLeads = await this.executeAviationSearch(combination);
                searchCount++;

                // Process and enrich aviation-specific leads
                for (const lead of qualifiedLeads) {
                    const enrichedLead = await this.enrichAviationProspect(lead);
                    const key = `${lead.email.toLowerCase()}`;
                    this.leads.set(key, enrichedLead);
                }

                // Adaptive rate limiting based on tier priority
                const delay = this.getTierDelay(tier);
                if (searchCount % 3 === 0) {
                    console.log(
                        `⏸️  Rate limiting (${delay}ms) - Progress: ${this.leads.size} qualified leads`
                    );
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        // Export aviation-enhanced results
        await this.exportAviationResults();

        // Generate aviation-specific report
        await this.generateAviationReport(duration, searchCount);

        console.log(`\n✈️  Aviation Campaign Completed!`);
        console.log(
            `📊 Final Results: ${searchCount} searches, ${this.leads.size} qualified aviation leads`
        );
        console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);

        return {
            totalLeads: this.leads.size,
            searchCount,
            duration,
            averageAviationScore: this.getAverageAviationScore(),
        };
    }

    /**
     * Group search combinations by tier for prioritized execution
     */
    groupByTier(combinations) {
        return combinations.reduce((groups, combo) => {
            const tier = combo.priority.split('-')[0];
            if (!groups[tier]) groups[tier] = [];
            groups[tier].push(combo);
            return groups;
        }, {});
    }

    /**
     * Get tier-appropriate delay for rate limiting
     */
    getTierDelay(tier) {
        const delays = {
            tier1: 3000, // Slower for highest value prospects
            tier2: 2500,
            tier3: 2000,
            tier4: 1500, // Faster for family office searches
        };
        return delays[tier] || this.delay;
    }

    /**
     * Export aviation-enhanced results
     */
    async exportAviationResults() {
        const leads = Array.from(this.leads.values());
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Sort by aviation score descending
        const sortedLeads = leads.sort((a, b) => (b.aviationScore || 0) - (a.aviationScore || 0));

        // Enhanced CSV export with aviation-specific fields
        const csvPath = path.join(this.outputDir, `aviation-leads-${timestamp}.csv`);
        const csvWriter = createObjectCsvWriter({
            path: csvPath,
            header: [
                { id: 'name', title: 'Name' },
                { id: 'title', title: 'Job Title' },
                { id: 'company', title: 'Company' },
                { id: 'industry', title: 'Industry' },
                { id: 'location', title: 'Location' },
                { id: 'companySize', title: 'Company Size' },
                { id: 'email', title: 'Email' },
                { id: 'phone', title: 'Phone' },
                { id: 'linkedIn', title: 'LinkedIn' },
                { id: 'aviationScore', title: 'Aviation Score' },
                { id: 'decisionMakerType', title: 'Decision Maker Type' },
                { id: 'priority', title: 'Priority Tier' },
                { id: 'aviationProfile.decisionMakerLevel', title: 'Decision Authority' },
                { id: 'aviationProfile.budgetAuthority.level', title: 'Budget Authority' },
                { id: 'aviationProfile.travelFrequency', title: 'Travel Frequency' },
                { id: 'aviationProfile.aviationReadiness', title: 'Aviation Readiness' },
                { id: 'discoveryDate', title: 'Discovery Date' },
            ],
        });

        await csvWriter.writeRecords(sortedLeads);
        console.log(`✈️  Exported ${sortedLeads.length} aviation leads to ${csvPath}`);

        // Enhanced JSON export
        const jsonPath = path.join(this.outputDir, `aviation-leads-${timestamp}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(sortedLeads, null, 2));
        console.log(`📄 Exported detailed aviation data to ${jsonPath}`);
    }

    /**
     * Generate aviation-specific analytics report
     */
    async generateAviationReport(duration, searchCount) {
        const leads = Array.from(this.leads.values());
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        const report = {
            aviationCampaignSummary: {
                totalQualifiedLeads: leads.length,
                averageAviationScore: this.getAverageAviationScore(),
                highPotentialLeads: leads.filter(l => l.aviationScore >= 80).length,
                immediateCandidates: leads.filter(
                    l => l.aviationProfile?.aviationReadiness === 'immediate-prospect'
                ).length,
                searchCount,
                duration: `${duration.toFixed(2)} seconds`,
                successRate: `${((leads.length / searchCount) * 100).toFixed(1)}%`,
            },

            decisionMakerBreakdown: {
                byAuthority: this.groupBy(leads, lead => lead.aviationProfile?.decisionMakerLevel),
                byBudgetLevel: this.groupBy(
                    leads,
                    lead => lead.aviationProfile?.budgetAuthority?.level
                ),
                byTravelFrequency: this.groupBy(
                    leads,
                    lead => lead.aviationProfile?.travelFrequency
                ),
                byReadiness: this.groupBy(leads, lead => lead.aviationProfile?.aviationReadiness),
            },

            marketAnalysis: {
                byIndustry: this.groupBy(leads, 'industry'),
                byLocation: this.groupBy(leads, 'location'),
                byCompanySize: this.groupBy(leads, 'companySize'),
                byPriorityTier: this.groupBy(leads, 'priority'),
            },

            topProspects: leads
                .sort((a, b) => (b.aviationScore || 0) - (a.aviationScore || 0))
                .slice(0, 20)
                .map(lead => ({
                    name: lead.name,
                    title: lead.title,
                    company: lead.company,
                    aviationScore: lead.aviationScore,
                    decisionMakerType: lead.decisionMakerType,
                    recommendedApproach: lead.aviationProfile?.recommendedApproach,
                })),

            aviationInsights: this.generateAviationInsights(leads),
        };

        const reportPath = path.join(this.outputDir, `aviation-campaign-report-${timestamp}.json`);
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`📈 Generated aviation campaign report: ${reportPath}`);

        this.printAviationSummary(report);
    }

    /**
     * Generate aviation-specific insights
     */
    generateAviationInsights(leads) {
        const insights = [];

        // Industry insights
        const industryScores = {};
        leads.forEach(lead => {
            if (!industryScores[lead.industry]) industryScores[lead.industry] = [];
            industryScores[lead.industry].push(lead.aviationScore || 0);
        });

        const topIndustries = Object.entries(industryScores)
            .map(([industry, scores]) => ({
                industry,
                avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
                count: scores.length,
            }))
            .sort((a, b) => b.avgScore - a.avgScore)
            .slice(0, 5);

        insights.push(
            `Top aviation industries: ${topIndustries.map(i => `${i.industry} (${i.avgScore.toFixed(1)})`).join(', ')}`
        );

        // Decision maker insights
        const executiveCount = leads.filter(
            l => l.aviationProfile?.decisionMakerLevel === 'ultimate-authority'
        ).length;
        const assistantCount = leads.filter(
            l => l.aviationProfile?.decisionMakerLevel === 'booking-authority'
        ).length;

        insights.push(
            `Decision maker mix: ${executiveCount} executives with ultimate authority, ${assistantCount} with booking authority`
        );

        // Readiness insights
        const immediate = leads.filter(
            l => l.aviationProfile?.aviationReadiness === 'immediate-prospect'
        ).length;
        const highPot = leads.filter(
            l => l.aviationProfile?.aviationReadiness === 'high-potential'
        ).length;

        insights.push(
            `Sales readiness: ${immediate} immediate prospects, ${highPot} high-potential leads ready for engagement`
        );

        return insights;
    }

    /**
     * Calculate average aviation score
     */
    getAverageAviationScore() {
        const leads = Array.from(this.leads.values());
        const totalScore = leads.reduce((sum, lead) => sum + (lead.aviationScore || 0), 0);
        return leads.length > 0 ? (totalScore / leads.length).toFixed(1) : 0;
    }

    /**
     * Print aviation campaign summary
     */
    printAviationSummary(report) {
        const summary = report.aviationCampaignSummary;

        console.log(`\n🛩️  PRIVATE AVIATION CAMPAIGN SUMMARY`);
        console.log(`=========================================`);
        console.log(`Qualified Aviation Leads: ${summary.totalQualifiedLeads}`);
        console.log(`Average Aviation Score: ${summary.averageAviationScore}`);
        console.log(`Immediate Prospects: ${summary.immediateCandidates}`);
        console.log(`High-Potential Leads: ${summary.highPotentialLeads}`);
        console.log(`Success Rate: ${summary.successRate}`);

        console.log(`\n🎯 TOP DECISION MAKER CATEGORIES:`);
        const breakdown = report.decisionMakerBreakdown.byAuthority;
        Object.entries(breakdown).forEach(([level, count]) => {
            console.log(`- ${level}: ${count} leads`);
        });

        console.log(`\n✈️  AVIATION INSIGHTS:`);
        report.aviationInsights.forEach((insight, i) => {
            console.log(`${i + 1}. ${insight}`);
        });
    }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const aviationAutomator = new PrivateAviationLeadAutomator({
        targetLeadCount: parseInt(process.env.TARGET_LEADS) || 100,
        delay: parseInt(process.env.RATE_LIMIT_DELAY) || 2000,
        outputDir: process.env.OUTPUT_DIR || './aviation-leads-output',
        mcpServerUrl: process.env.APOLLO_MCP_URL || 'http://localhost:8123',
        minCompanyRevenue: parseInt(process.env.MIN_COMPANY_REVENUE) || 50000000,
        useRealApollo: process.env.USE_REAL_APOLLO === 'true',
    });

    aviationAutomator.runAviationCampaign().catch(error => {
        console.error('❌ Aviation campaign failed:', error);
        process.exit(1);
    });
}

export { PrivateAviationLeadAutomator };
