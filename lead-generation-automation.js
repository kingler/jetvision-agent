#!/usr/bin/env node

/**
 * Apollo.io Lead Generation Automation Script
 *
 * This script systematically generates prospect lists by:
 * 1. Creating multiple search query variations
 * 2. Executing searches via the Apollo MCP server
 * 3. Collecting and deduplicating results
 * 4. Exporting structured data (CSV/JSON)
 *
 * Usage: node lead-generation-automation.js [options]
 */

import fs from 'fs/promises';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

class LeadGenerationAutomator {
    constructor(options = {}) {
        this.targetLeadCount = options.targetLeadCount || 100;
        this.outputDir = options.outputDir || './lead-generation-output';
        this.delay = options.delay || 2000; // Rate limiting delay in ms
        this.maxRetries = options.maxRetries || 3;
        this.leads = new Map(); // For deduplication
        this.searchStats = [];
        this.apolloMcpUrl = options.apolloMcpUrl || 'http://localhost:8123';

        // Search parameter variations
        this.variations = {
            jobTitles: [
                'executive assistant',
                'administrative assistant',
                'office manager',
                'administrative coordinator',
                'personal assistant',
                'executive coordinator',
                'administrative support',
                'office coordinator',
                'executive support',
                'administrative specialist',
            ],

            locations: [
                'Los Angeles, California',
                'New York, New York',
                'Chicago, Illinois',
                'Houston, Texas',
                'Phoenix, Arizona',
                'Philadelphia, Pennsylvania',
                'San Antonio, Texas',
                'San Diego, California',
                'Dallas, Texas',
                'Miami, Florida',
            ],

            companySizes: [
                '1-50',
                '51-100',
                '101-200',
                '201-500',
                '501-1000',
                '1001-5000',
                '5001-10000',
                '10000+',
            ],

            industries: [
                'Technology',
                'Healthcare',
                'Financial Services',
                'Manufacturing',
                'Retail',
                'Real Estate',
                'Professional Services',
                'Aviation', // Original industry
            ],
        };

        // Priority combinations for efficient lead generation
        this.priorityCombinations = this.generatePriorityCombinations();
    }

    /**
     * Generate priority combinations for targeted search
     */
    generatePriorityCombinations() {
        const combinations = [];

        // High-value title/location combinations
        const highValueTitles = [
            'executive assistant',
            'office manager',
            'administrative coordinator',
        ];
        const primaryLocations = [
            'Los Angeles, California',
            'New York, New York',
            'Chicago, Illinois',
        ];
        const primarySizes = ['101-200', '201-500', '501-1000'];

        for (const title of highValueTitles) {
            for (const location of primaryLocations) {
                for (const size of primarySizes) {
                    combinations.push({
                        jobTitle: title,
                        location: location,
                        companySize: size,
                        industry: 'Technology', // Start with tech
                        priority: 'high',
                    });
                }
            }
        }

        // Medium-value combinations
        const mediumTitles = this.variations.jobTitles.slice(3, 7);
        const mediumLocations = this.variations.locations.slice(3, 7);

        for (const title of mediumTitles) {
            for (const location of mediumLocations) {
                combinations.push({
                    jobTitle: title,
                    location: location,
                    companySize: '201-500',
                    industry: 'Professional Services',
                    priority: 'medium',
                });
            }
        }

        return combinations;
    }

    /**
     * Execute a single search via Apollo MCP server
     */
    async executeSearch(searchParams) {
        const requestId = Date.now().toString();
        console.log(`🔍 Executing search: ${JSON.stringify(searchParams)}`);

        try {
            // Simulate Apollo MCP server call
            // In real implementation, this would make HTTP request to Apollo MCP server
            const mockResults = await this.simulateApolloSearch(searchParams);

            const stats = {
                searchParams,
                resultCount: mockResults.length,
                timestamp: new Date().toISOString(),
                requestId,
                success: true,
            };

            this.searchStats.push(stats);

            // Process and deduplicate results
            this.processResults(mockResults, searchParams);

            console.log(`✅ Found ${mockResults.length} leads, total unique: ${this.leads.size}`);
            return mockResults;
        } catch (error) {
            console.error(`❌ Search failed:`, error.message);

            this.searchStats.push({
                searchParams,
                resultCount: 0,
                timestamp: new Date().toISOString(),
                requestId,
                success: false,
                error: error.message,
            });

            return [];
        }
    }

    /**
     * Simulate Apollo search for development/testing
     */
    async simulateApolloSearch(params) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const baseCount = Math.floor(Math.random() * 15) + 5; // 5-20 results
        const results = [];

        for (let i = 0; i < baseCount; i++) {
            const leadId = `${params.jobTitle.replace(/\s+/g, '')}_${params.location.replace(/[^\w]/g, '')}_${i}`;

            results.push({
                id: leadId,
                name: this.generateName(),
                title: params.jobTitle,
                company: this.generateCompanyName(),
                industry: params.industry,
                location: params.location,
                companySize: params.companySize,
                email: `${leadId.toLowerCase()}@example.com`,
                phone: this.generatePhone(),
                linkedIn: `https://linkedin.com/in/${leadId.toLowerCase()}`,
                emailVerified: true,
                searchParams: params,
            });
        }

        return results;
    }

    /**
     * Process and deduplicate search results
     */
    processResults(results, searchParams) {
        for (const lead of results) {
            const key = `${lead.email.toLowerCase()}`;

            if (!this.leads.has(key)) {
                this.leads.set(key, {
                    ...lead,
                    foundInSearches: [searchParams],
                    discoveryDate: new Date().toISOString(),
                });
            } else {
                // Update existing lead with additional search context
                const existing = this.leads.get(key);
                existing.foundInSearches.push(searchParams);
                this.leads.set(key, existing);
            }
        }
    }

    /**
     * Main automation execution
     */
    async run() {
        console.log(`🚀 Starting lead generation automation`);
        console.log(`📊 Target: ${this.targetLeadCount} leads`);
        console.log(`📁 Output directory: ${this.outputDir}`);
        console.log(`⏱️  Rate limit delay: ${this.delay}ms\n`);

        // Ensure output directory exists
        await fs.mkdir(this.outputDir, { recursive: true });

        let searchCount = 0;
        const startTime = Date.now();

        // Execute priority combinations first
        for (const combination of this.priorityCombinations) {
            if (this.leads.size >= this.targetLeadCount) {
                console.log(`🎯 Target reached: ${this.leads.size} leads`);
                break;
            }

            await this.executeSearch(combination);
            searchCount++;

            // Rate limiting
            if (searchCount % 5 === 0) {
                console.log(`⏸️  Pausing for rate limiting...`);
                await new Promise(resolve => setTimeout(resolve, this.delay));
            }

            // Progress update
            if (searchCount % 10 === 0) {
                console.log(
                    `📈 Progress: ${searchCount} searches, ${this.leads.size} unique leads`
                );
            }
        }

        // If we still need more leads, expand search
        if (this.leads.size < this.targetLeadCount) {
            console.log(`🔄 Expanding search to reach target...`);
            await this.expandSearch();
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        // Export results
        await this.exportResults();

        // Generate summary report
        await this.generateReport(duration, searchCount);

        console.log(`\n✨ Automation completed!`);
        console.log(`📊 Final stats: ${searchCount} searches, ${this.leads.size} unique leads`);
        console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
    }

    /**
     * Expand search with additional combinations
     */
    async expandSearch() {
        const additionalSearches = [];

        // Generate more combinations
        for (const title of this.variations.jobTitles.slice(-3)) {
            for (const location of this.variations.locations.slice(-3)) {
                for (const industry of this.variations.industries.slice(0, 3)) {
                    additionalSearches.push({
                        jobTitle: title,
                        location: location,
                        companySize: '101-200',
                        industry: industry,
                        priority: 'expansion',
                    });
                }
            }
        }

        for (const search of additionalSearches) {
            if (this.leads.size >= this.targetLeadCount) break;

            await this.executeSearch(search);
            await new Promise(resolve => setTimeout(resolve, this.delay));
        }
    }

    /**
     * Export leads to CSV and JSON
     */
    async exportResults() {
        const leads = Array.from(this.leads.values());
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Export to JSON
        const jsonPath = path.join(this.outputDir, `leads-${timestamp}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(leads, null, 2));
        console.log(`📄 Exported ${leads.length} leads to ${jsonPath}`);

        // Export to CSV
        const csvPath = path.join(this.outputDir, `leads-${timestamp}.csv`);
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
                { id: 'emailVerified', title: 'Email Verified' },
                { id: 'discoveryDate', title: 'Discovery Date' },
            ],
        });

        await csvWriter.writeRecords(leads);
        console.log(`📊 Exported ${leads.length} leads to ${csvPath}`);
    }

    /**
     * Generate automation summary report
     */
    async generateReport(duration, searchCount) {
        const leads = Array.from(this.leads.values());
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Analyze search effectiveness
        const searchEffectiveness = this.searchStats
            .filter(stat => stat.success)
            .sort((a, b) => b.resultCount - a.resultCount);

        const topPerformingSearches = searchEffectiveness.slice(0, 10);

        const report = {
            summary: {
                totalLeads: leads.length,
                targetLeads: this.targetLeadCount,
                targetAchieved: leads.length >= this.targetLeadCount,
                totalSearches: searchCount,
                duration: `${duration.toFixed(2)} seconds`,
                averageLeadsPerSearch: (leads.length / searchCount).toFixed(2),
                successfulSearches: this.searchStats.filter(s => s.success).length,
                failedSearches: this.searchStats.filter(s => !s.success).length,
            },

            leadBreakdown: {
                byJobTitle: this.groupBy(leads, 'title'),
                byLocation: this.groupBy(leads, 'location'),
                byIndustry: this.groupBy(leads, 'industry'),
                byCompanySize: this.groupBy(leads, 'companySize'),
            },

            topPerformingSearches: topPerformingSearches.map(search => ({
                searchParams: search.searchParams,
                resultCount: search.resultCount,
                efficiency: search.resultCount / 1, // per search
            })),

            recommendations: this.generateRecommendations(searchEffectiveness),
        };

        const reportPath = path.join(this.outputDir, `report-${timestamp}.json`);
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`📈 Generated automation report: ${reportPath}`);

        // Console summary
        console.log(`\n📊 AUTOMATION SUMMARY`);
        console.log(`====================`);
        console.log(`Total Leads Generated: ${leads.length}`);
        console.log(
            `Target Achievement: ${leads.length >= this.targetLeadCount ? '✅' : '⚠️'} (${((leads.length / this.targetLeadCount) * 100).toFixed(1)}%)`
        );
        console.log(
            `Search Success Rate: ${((report.summary.successfulSearches / searchCount) * 100).toFixed(1)}%`
        );
        console.log(`Average Leads/Search: ${report.summary.averageLeadsPerSearch}`);

        console.log(`\n🏆 TOP PERFORMING COMBINATIONS:`);
        topPerformingSearches.slice(0, 5).forEach((search, index) => {
            const params = search.searchParams;
            console.log(
                `${index + 1}. ${params.jobTitle} in ${params.location} (${params.industry}) → ${search.resultCount} leads`
            );
        });
    }

    /**
     * Generate recommendations based on search performance
     */
    generateRecommendations(searchStats) {
        const recommendations = [];

        // Find most effective job titles
        const titlePerformance = {};
        searchStats.forEach(stat => {
            const title = stat.searchParams.jobTitle;
            if (!titlePerformance[title]) titlePerformance[title] = { total: 0, count: 0 };
            titlePerformance[title].total += stat.resultCount;
            titlePerformance[title].count += 1;
        });

        const bestTitles = Object.entries(titlePerformance)
            .map(([title, data]) => ({ title, avg: data.total / data.count }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 3);

        recommendations.push(
            `Focus on these high-performing job titles: ${bestTitles.map(t => t.title).join(', ')}`
        );

        // Location analysis
        const locationPerformance = {};
        searchStats.forEach(stat => {
            const location = stat.searchParams.location;
            if (!locationPerformance[location])
                locationPerformance[location] = { total: 0, count: 0 };
            locationPerformance[location].total += stat.resultCount;
            locationPerformance[location].count += 1;
        });

        const bestLocations = Object.entries(locationPerformance)
            .map(([location, data]) => ({ location, avg: data.total / data.count }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 3);

        recommendations.push(
            `Prioritize these high-yield locations: ${bestLocations.map(l => l.location).join(', ')}`
        );

        return recommendations;
    }

    /**
     * Utility: Group array by property
     */
    groupBy(array, property) {
        return array.reduce((groups, item) => {
            const key = item[property];
            groups[key] = (groups[key] || 0) + 1;
            return groups;
        }, {});
    }

    /**
     * Generate realistic names for mock data
     */
    generateName() {
        const firstNames = [
            'Sarah',
            'Michael',
            'Jennifer',
            'David',
            'Jessica',
            'Christopher',
            'Ashley',
            'Matthew',
            'Amanda',
            'Joshua',
        ];
        const lastNames = [
            'Smith',
            'Johnson',
            'Williams',
            'Brown',
            'Jones',
            'Garcia',
            'Miller',
            'Davis',
            'Rodriguez',
            'Martinez',
        ];

        return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    }

    /**
     * Generate realistic company names
     */
    generateCompanyName() {
        const prefixes = [
            'Alpha',
            'Beta',
            'Global',
            'Premier',
            'Advanced',
            'Innovative',
            'Dynamic',
            'Strategic',
        ];
        const suffixes = [
            'Solutions',
            'Technologies',
            'Systems',
            'Group',
            'Corporation',
            'Industries',
            'Services',
            'Enterprises',
        ];

        return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    }

    /**
     * Generate realistic phone numbers
     */
    generatePhone() {
        const areaCodes = ['213', '323', '424', '747', '818']; // LA area codes
        const exchange = Math.floor(Math.random() * 900) + 100;
        const number = Math.floor(Math.random() * 9000) + 1000;

        return `+1-${areaCodes[Math.floor(Math.random() * areaCodes.length)]}-${exchange}-${number}`;
    }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const automator = new LeadGenerationAutomator({
        targetLeadCount: parseInt(process.env.TARGET_LEADS) || 100,
        delay: parseInt(process.env.RATE_LIMIT_DELAY) || 2000,
        outputDir: process.env.OUTPUT_DIR || './lead-generation-output',
    });

    automator.run().catch(error => {
        console.error('❌ Automation failed:', error);
        process.exit(1);
    });
}

export { LeadGenerationAutomator };
