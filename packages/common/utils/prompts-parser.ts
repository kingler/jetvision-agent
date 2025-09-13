/**
 * Prompts Parser Utility
 * Parses the prompts.md file and structures data for UI consumption
 */

import React from 'react';
import { IconPlane, IconMail, IconMap, IconTarget, IconChartBar } from '@tabler/icons-react';

export interface PromptCard {
    id: string;
    category: string;
    title: string;
    prompt: string;
    fullPrompt: string;
    description: string;
    parameters?: Record<string, any>;
}

export interface PromptCategory {
    name: string;
    slug: string;
    count: number;
    prompts: PromptCard[];
    icon: React.ElementType;
    color: string;
}

const CATEGORY_ICONS = {
    'Jet Charter Operations': IconPlane,
    'Apollo Campaign Management': IconMail,
    'Travel Planning & Coordination': IconMap,
    'Lead Generation & Targeting': IconTarget,
    'Analytics & Insights': IconChartBar,
};

const CATEGORY_COLORS = {
    'Jet Charter Operations': 'bg-blue-50 text-blue-700 border-blue-200',
    'Apollo Campaign Management': 'bg-purple-50 text-purple-700 border-purple-200',
    'Travel Planning & Coordination': 'bg-green-50 text-green-700 border-green-200',
    'Lead Generation & Targeting': 'bg-orange-50 text-orange-700 border-orange-200',
    'Analytics & Insights': 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

/**
 * Parses the raw prompts markdown content into structured data
 */
export function parsePromptsMarkdown(content: string): PromptCategory[] {
    const lines = content.split('\n');
    const categories: PromptCategory[] = [];
    let currentCategory: PromptCategory | null = null;
    let currentPrompt: Partial<PromptCard> | null = null;
    let isFullPromptSection = false;
    let fullPromptLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Category header (## Category Name (X cards))
        if (line.startsWith('## ') && line.includes('cards)')) {
            if (currentCategory) {
                categories.push(currentCategory);
            }

            const categoryName = line.replace(/^## /, '').replace(/ \(\d+ cards?\)$/, '');
            const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

            currentCategory = {
                name: categoryName,
                slug,
                count: 0,
                prompts: [],
                icon: CATEGORY_ICONS[categoryName as keyof typeof CATEGORY_ICONS] || IconChartBar,
                color:
                    CATEGORY_COLORS[categoryName as keyof typeof CATEGORY_COLORS] ||
                    'bg-gray-50 text-gray-700 border-gray-200',
            };
        }

        // Prompt title (### Title)
        else if (line.startsWith('### ')) {
            if (currentPrompt && currentCategory) {
                // Finalize previous prompt
                if (fullPromptLines.length > 0) {
                    currentPrompt.fullPrompt = fullPromptLines.join('\n').trim();
                    fullPromptLines = [];
                }

                currentCategory.prompts.push(currentPrompt as PromptCard);
                currentCategory.count++;
            }

            currentPrompt = {
                title: line.replace('### ', ''),
                category: currentCategory?.name || '',
            };
            isFullPromptSection = false;
        }

        // Prompt fields
        else if (line.startsWith('- **ID:**')) {
            if (currentPrompt) {
                currentPrompt.id = line.replace('- **ID:** `', '').replace('`', '');
            }
        } else if (line.startsWith('- **Prompt:**')) {
            if (currentPrompt) {
                currentPrompt.prompt = line.replace('- **Prompt:** ', '');
            }
        } else if (line.startsWith('- **Description:**')) {
            if (currentPrompt) {
                currentPrompt.description = line.replace('- **Description:** ', '');
            }
        } else if (line.startsWith('- **Full Prompt:**')) {
            isFullPromptSection = true;
            fullPromptLines = [];
        } else if (line.startsWith('- **Parameters:**')) {
            isFullPromptSection = false;
            // Parameters parsing could be enhanced if needed
            if (currentPrompt) {
                currentPrompt.parameters = {};
            }
        }

        // Collect full prompt lines
        else if (
            isFullPromptSection &&
            line &&
            !line.startsWith('---') &&
            !line.startsWith('- **')
        ) {
            fullPromptLines.push(line);
        }
    }

    // Finalize last prompt and category
    if (currentPrompt && currentCategory) {
        if (fullPromptLines.length > 0) {
            currentPrompt.fullPrompt = fullPromptLines.join('\n').trim();
        }
        currentCategory.prompts.push(currentPrompt as PromptCard);
        currentCategory.count++;
    }

    if (currentCategory) {
        categories.push(currentCategory);
    }

    return categories;
}

/**
 * Parse people search parameters from manual prompt text with enhanced Apollo.io parameter extraction
 */
export function parsePeopleSearchPrompt(prompt: string): Record<string, any> {
    const params: Record<string, any> = {};
    const lowerPrompt = prompt.toLowerCase();

    // Enhanced job title extraction with more comprehensive patterns
    const titlePatterns = [
        /(?:search apollo\.io for|execute apollo search with|find|search for|looking for)\s+([^,\n]+?)(?:\s+at|\s+in|\s+from|\s+with|$)/i,
        /(executive assistant|ea|ceo|chief executive officer|cfo|chief financial officer|cto|chief technology officer)/gi,
        /(vp|vice president|director|manager|president|partner|principal|chief|founder|co-founder)/gi,
        /(managing director|general partner|senior partner|head of|senior vice president|evp|executive vice president)/gi,
        /(chief development officer|chief investment officer|chief operating officer|coo|chief marketing officer|cmo)/gi,
        /(managing partner|limited partner|portfolio manager|asset manager|investment director)/gi,
    ];

    const titles: string[] = [];
    titlePatterns.forEach(pattern => {
        const matches = prompt.match(pattern);
        if (matches) {
            matches.forEach(match => {
                const cleaned = match
                    .replace(
                        /^(search apollo\.io for|execute apollo search with|find|search for|looking for)\s+/i,
                        ''
                    )
                    .trim();
                if (cleaned && !titles.includes(cleaned)) {
                    titles.push(cleaned);
                }
            });
        }
    });

    // Extract job titles from structured parameter mentions
    const jobTitleMatch = prompt.match(/job_titles[:\s]+\[([^\]]+)\]/i);
    if (jobTitleMatch) {
        const extractedTitles = jobTitleMatch[1]
            .split(',')
            .map(t => t.replace(/["']/g, '').trim())
            .filter(t => t.length > 0);
        titles.push(...extractedTitles);
    }

    if (titles.length > 0) {
        params.job_titles = Array.from(new Set(titles)); // Remove duplicates
        params.include_similar_titles = true;
    }

    // Enhanced location extraction
    const locationPatterns = [
        /(?:in|at|from|based in|located in)\s+([\w\s]+,\s*[A-Z]{2})/gi, // City, STATE format
        /(?:in|at|from|based in)\s+(new york|nyc|san francisco|sf|los angeles|la|chicago|boston|miami|atlanta|dallas|houston|seattle|austin|nashville|phoenix|denver|san diego|washington dc|dc)/gi,
        /(?:silicon valley|wall street|manhattan|brooklyn|bay area|orange county|beverly hills)/gi,
    ];

    const locations: string[] = [];
    locationPatterns.forEach(pattern => {
        const matches = prompt.match(pattern);
        if (matches) {
            matches.forEach(match => {
                const location = match.replace(/^(in|at|from|based in|located in)\s+/i, '').trim();
                if (location && !locations.includes(location)) {
                    locations.push(location);
                }
            });
        }
    });

    // Extract locations from structured parameter mentions
    const locationMatch = prompt.match(/locations[:\s]+\[([^\]]+)\]/i);
    if (locationMatch) {
        const extractedLocations = locationMatch[1]
            .split(',')
            .map(l => l.replace(/["']/g, '').trim())
            .filter(l => l.length > 0);
        locations.push(...extractedLocations);
    }

    if (locations.length > 0) {
        params.locations = Array.from(new Set(locations)); // Remove duplicates
    }

    // Enhanced industry extraction
    const industryPatterns = [
        /(real estate|commercial real estate|real estate development|real estate investment)/gi,
        /(private equity|venture capital|investment management|hedge fund|investment banking)/gi,
        /(technology|software|saas|fintech|biotech|medtech|edtech|proptech)/gi,
        /(healthcare|pharmaceutical|medical device|hospital|health system)/gi,
        /(entertainment|media|film|television|streaming|gaming|sports)/gi,
        /(finance|banking|insurance|financial services|wealth management)/gi,
        /(manufacturing|automotive|aerospace|defense|industrial)/gi,
        /(energy|oil and gas|renewable energy|utilities|clean energy)/gi,
        /(hospitality|hotels|restaurants|tourism|travel|leisure)/gi,
        /(retail|e-commerce|consumer goods|fashion|luxury goods)/gi,
    ];

    const industries: string[] = [];
    industryPatterns.forEach(pattern => {
        const matches = prompt.match(pattern);
        if (matches) {
            matches.forEach(match => {
                if (!industries.includes(match.toLowerCase())) {
                    industries.push(match);
                }
            });
        }
    });

    // Extract industries from structured parameter mentions
    const industryMatch = prompt.match(/industries[:\s]+\[([^\]]+)\]/i);
    if (industryMatch) {
        const extractedIndustries = industryMatch[1]
            .split(',')
            .map(i => i.replace(/["']/g, '').trim())
            .filter(i => i.length > 0);
        industries.push(...extractedIndustries);
    }

    if (industries.length > 0) {
        params.industries = Array.from(new Set(industries)); // Remove duplicates
    }

    // Enhanced company size extraction
    const sizeMatch = prompt.match(
        /company_size[:\s]+\{[^}]*min_employees[:\s]+(\d+)[^}]*max_employees[:\s]+(\d+)/i
    );
    if (sizeMatch) {
        params.company_size = {
            min_employees: parseInt(sizeMatch[1]),
            max_employees: parseInt(sizeMatch[2]),
        };
    } else {
        // Fallback to pattern matching
        const sizePatterns = [
            /(\d+)\s*-\s*(\d+)\s+employees/i,
            /(\d+)\+?\s+employees/i,
            /companies with (\d+) to (\d+) employees/i,
        ];

        for (const pattern of sizePatterns) {
            const match = prompt.match(pattern);
            if (match) {
                if (match[2]) {
                    params.company_size = {
                        min_employees: parseInt(match[1]),
                        max_employees: parseInt(match[2]),
                    };
                } else {
                    const size = parseInt(match[1]);
                    if (size >= 1000) {
                        params.company_size = { min_employees: 1000, max_employees: 10000 };
                    } else if (size >= 500) {
                        params.company_size = { min_employees: 500, max_employees: 5000 };
                    } else {
                        params.company_size = { min_employees: size, max_employees: size * 5 };
                    }
                }
                break;
            }
        }
    }

    // Extract minimum lead count requirement
    const leadCountMatch = prompt.match(/(?:minimum|at least|return)\s+(\d+)\s+leads/i);
    if (leadCountMatch) {
        params.per_page = Math.max(100, parseInt(leadCountMatch[1]));
    } else {
        params.per_page = 100; // Default to 100 leads minimum
    }

    // Enhanced default parameters
    params.contact_email_status = ['verified', 'likely to engage'];
    params.include_similar_companies = true;
    params.include_intent_signals = true;

    return params;
}

/**
 * Static prompts data - this would normally be loaded from the markdown file
 * For now, including the key prompts for immediate functionality
 */
export const STATIC_PROMPTS_DATA: PromptCategory[] = [
    {
        name: 'Jet Charter Operations',
        slug: 'jet-charter',
        count: 4,
        icon: IconPlane,
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        prompts: [
            {
                id: 'jet-1',
                category: 'Charter',
                title: 'Aircraft Availability',
                prompt: 'Check aircraft availability for Miami to New York tomorrow',
                fullPrompt:
                    "Search for available aircraft for tomorrow's flight from Miami International Airport (MIA) to New York area airports (JFK, LGA, or TEB). Query the Avinode marketplace to identify available aircraft types, seating capacity, operator information, estimated flight times, and hourly rates.",
                description: 'Check real-time fleet availability for specific routes',
            },
            {
                id: 'jet-2',
                category: 'Charter',
                title: 'Empty Legs',
                prompt: 'Find empty leg opportunities for this weekend',
                fullPrompt:
                    'Search the Avinode marketplace for empty leg (repositioning) flights available this weekend (Friday through Sunday). Identify opportunities with origin/destination airports, aircraft types, available dates, discount percentages, and passenger capacity.',
                description: 'Find discounted repositioning flights and save costs',
            },
            {
                id: 'jet-3',
                category: 'Charter',
                title: 'Fleet Utilization',
                prompt: 'Analyze fleet utilization metrics for this month',
                fullPrompt:
                    'Generate a comprehensive fleet utilization report for the current month. Analyze overall utilization percentage, individual aircraft performance metrics, revenue per flight hour, maintenance downtime, and peak utilization periods.',
                description: 'Monitor aircraft usage metrics and optimization',
            },
            {
                id: 'jet-4',
                category: 'Charter',
                title: 'Heavy Jet Search',
                prompt: 'Search heavy jets for 12 passengers to London Tuesday',
                fullPrompt:
                    'Search for heavy jet aircraft capable of transatlantic flight for 12 passengers departing next Tuesday to London. Requirements: 6,000+ nm range for nonstop capability, cabin configuration for 12-14 passengers, full galley facilities, WiFi, and customs handling.',
                description: 'Search for specific aircraft types by passenger count',
            },
        ],
    },
    {
        name: 'Apollo Campaign Management',
        slug: 'apollo-campaigns',
        count: 4,
        icon: IconMail,
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        prompts: [
            {
                id: 'apollo-1',
                category: 'Apollo',
                title: 'Weekly Conversions',
                prompt: 'Analyze prospect to booking conversions this week',
                fullPrompt:
                    "Analyze this week's conversion funnel from Apollo.io prospects to confirmed charter bookings. Track metrics including lead volume, email open rates, response rates, meeting conversions, and booking confirmations.",
                description: 'Track conversion metrics from campaigns to bookings',
            },
            {
                id: 'apollo-2',
                category: 'Apollo',
                title: 'EA Engagement',
                prompt: 'Identify top engaged executive assistants from campaigns',
                fullPrompt:
                    'Identify and analyze the most engaged executive assistants from Apollo.io email campaigns. Review engagement metrics including email opens, clicks, replies, and meeting bookings. Generate a prioritized list for follow-up.',
                description: 'Analyze engagement patterns for executive assistants',
            },
            {
                id: 'apollo-3',
                category: 'Apollo',
                title: 'Finance Campaigns',
                prompt: 'Analyze finance sector campaign performance metrics',
                fullPrompt:
                    'Provide comprehensive performance analysis of all finance industry campaigns in Apollo.io. Include metrics for open rates, response rates, conversion rates, and ROI by campaign type and messaging variant.',
                description: 'Industry-specific campaign performance metrics',
            },
            {
                id: 'apollo-4',
                category: 'Apollo',
                title: 'VIP Campaign',
                prompt: 'Design VIP campaign for top 100 qualified prospects',
                fullPrompt:
                    'Design and configure a high-touch VIP campaign in Apollo.io for the top 100 qualified prospects. Include personalized messaging sequences, multi-channel touchpoints, and custom follow-up cadences.',
                description: 'Launch targeted campaigns for high-value leads',
            },
        ],
    },
    {
        name: 'Lead Generation & Targeting',
        slug: 'lead-generation',
        count: 44,
        icon: IconTarget,
        color: 'bg-orange-50 text-orange-700 border-orange-200',
        prompts: [
            // Apollo Search Directives - Priority Targets
            {
                id: 'directive-01',
                category: 'Leads',
                title: 'Private Equity CEOs - New York',
                prompt: 'Find CEOs at private equity firms in New York',
                fullPrompt:
                    'Search Apollo.io for Chief Executive Officers, Founders, and Owners at private equity and venture capital firms in the Greater New York City Area. Filter by job_titles: ["CEO", "CEO and Founder", "CEO Owner"], industries: ["Venture Capital & Private Equity", "Investment Banking"], company_size: {min_employees: 11, max_employees: 20}, locations: ["Greater New York City Area", "New York, New York"]. Expected 75 verified leads.',
                description: 'PE/VC CEOs in NYC - prime targets for private aviation',
            },
            {
                id: 'directive-02',
                category: 'Leads',
                title: 'Executive Assistants to CEOs - Major Markets',
                prompt: 'Find executive assistants to CEOs in LA, NYC, and Miami',
                fullPrompt:
                    'Execute Apollo search for executive assistants to C-suite executives in major markets. Use job_titles: ["Executive Assistant to CEO", "Executive Assistant to the President"], industries: ["Venture Capital & Private Equity", "Investment Management"], company_size: {min_employees: 21, max_employees: 50}, locations: ["Los Angeles, California", "New York, New York", "Miami, Florida"]. Expected 50 verified leads.',
                description: 'EAs are key decision influencers for travel arrangements',
            },
            {
                id: 'directive-03',
                category: 'Leads',
                title: 'Real Estate Executives - Miami/LA',
                prompt: 'Search for real estate CEOs and owners in Miami and Los Angeles',
                fullPrompt:
                    'Search Apollo.io for real estate industry leaders in Miami and LA markets. Parameters: job_titles: ["CEO", "CEO President", "Owner"], industries: ["Commercial Real Estate", "Real Estate"], company_size: {min_employees: 11, max_employees: 20}, locations: ["Miami, Florida", "Los Angeles, California"]. Expected 65 verified leads.',
                description: 'Real estate executives frequently travel for property viewings',
            },
            {
                id: 'directive-04',
                category: 'Leads',
                title: 'Investment Banking Directors - Chicago/Dallas',
                prompt: 'Find investment banking directors in Chicago and Dallas',
                fullPrompt:
                    'Execute Apollo search for investment banking leadership in midwest markets. Use job_titles: ["Director", "Manager"], industries: ["Investment Banking", "Investment Management"], company_size: {min_employees: 21, max_employees: 50}, locations: ["Chicago, Illinois", "Dallas, Texas"]. Expected 80 verified leads.',
                description: 'IB directors in secondary markets need quick NYC/SF access',
            },
            {
                id: 'directive-05',
                category: 'Leads',
                title: 'Tech CEOs & Founders - Small Companies',
                prompt: 'Search for tech startup founders and CEOs in LA and NYC',
                fullPrompt:
                    'Search Apollo.io for technology company founders in major markets. Apply filters job_titles: ["CEO and Founder", "CEO and Co-Founder", "CEO Founder"], industries: ["Information Technology & Services", "Computer Software"], company_size: {min_employees: 1, max_employees: 10}, locations: ["Los Angeles, California", "New York, New York"]. Expected 55 verified leads.',
                description: 'Early-stage tech founders use private jets for investor roadshows',
            },
            {
                id: 'directive-06',
                category: 'Leads',
                title: 'Administrative Assistants - Finance Sector',
                prompt: 'Find administrative assistants at finance firms in NYC',
                fullPrompt:
                    'Execute Apollo search for administrative staff in NYC finance sector. Parameters: job_titles: ["Administrative Assistant", "Executive Assistant"], industries: ["Investment Banking", "Venture Capital & Private Equity"], company_size: {min_employees: 11, max_employees: 20}, locations: ["Greater New York City Area"]. Expected 60 verified leads.',
                description: 'Admin staff in finance handle travel logistics',
            },
            {
                id: 'directive-07',
                category: 'Leads',
                title: 'Architecture & Planning Leaders - Vegas/Miami',
                prompt: 'Search for architecture firm executives in Vegas and Miami',
                fullPrompt:
                    'Search Apollo.io for architecture industry leaders in luxury markets. Use job_titles: ["CEO", "Owner", "Director"], industries: ["Architecture & Planning"], company_size: {min_employees: 21, max_employees: 50}, locations: ["Vegas", "Miami, Florida"]. Expected 45 verified leads.',
                description: 'Architecture firms working on luxury projects require site visits',
            },
            {
                id: 'directive-08',
                category: 'Leads',
                title: 'VC Partners & Owners - California',
                prompt: 'Find venture capital partners and owners in Los Angeles',
                fullPrompt:
                    'Execute Apollo search for VC leadership in California. Parameters: job_titles: ["Owner", "CEO Owner"], industries: ["Venture Capital & Private Equity"], company_size: {min_employees: 1, max_employees: 10}, locations: ["Los Angeles, California"]. Expected 70 verified leads.',
                description: 'Small VC firms in LA frequently travel to Silicon Valley and NYC',
            },
            {
                id: 'directive-09',
                category: 'Leads',
                title: 'Real Estate Investment Managers - NYC',
                prompt: 'Search for real estate investment managers in New York',
                fullPrompt:
                    'Search Apollo.io for RE investment leadership in NYC. Apply filters job_titles: ["Manager", "Director"], industries: ["Real Estate", "Investment Management"], company_size: {min_employees: 21, max_employees: 50}, locations: ["New York, New York", "Greater New York City Area"]. Expected 85 verified leads.',
                description: 'RE investment managers oversee multiple properties',
            },
            {
                id: 'directive-10',
                category: 'Leads',
                title: 'Tech Company Presidents - Multi-City',
                prompt: 'Find tech company presidents in Chicago, Dallas, and Miami',
                fullPrompt:
                    'Execute Apollo search for technology executives in secondary markets. Use job_titles: ["CEO President", "CEO and President"], industries: ["Computer Software", "Information Technology & Services"], company_size: {min_employees: 11, max_employees: 20}, locations: ["Chicago, Illinois", "Dallas, Texas", "Miami, Florida"]. Expected 50 verified leads.',
                description: 'Tech presidents in secondary markets need efficient travel',
            },
            {
                id: 'directive-11',
                category: 'Leads',
                title: 'Investment Banking CEOs - Small Firms',
                prompt: 'Search for CEOs at boutique investment banks in NYC and Chicago',
                fullPrompt:
                    'Search Apollo.io for boutique IB firm leaders. Parameters: job_titles: ["CEO", "CEO and Founder"], industries: ["Investment Banking"], company_size: {min_employees: 1, max_employees: 10}, locations: ["New York, New York", "Chicago, Illinois"]. Expected 55 verified leads.',
                description: 'Boutique IB firm leaders need flexible travel for deals',
            },
            {
                id: 'directive-12',
                category: 'Leads',
                title: 'Executive Assistants - Real Estate',
                prompt: 'Find executive assistants at real estate companies in LA, Miami, Dallas',
                fullPrompt:
                    'Execute Apollo search for real estate EAs in major markets. Use job_titles: ["Executive Assistant", "Executive Assistant to CEO"], industries: ["Commercial Real Estate", "Real Estate"], company_size: {min_employees: 21, max_employees: 50}, locations: ["Los Angeles, California", "Miami, Florida", "Dallas, Texas"]. Expected 65 verified leads.',
                description: 'Real estate EAs coordinate property tours and investor meetings',
            },
            {
                id: 'directive-13',
                category: 'Leads',
                title: 'Consulting Firm Leaders - Vegas',
                prompt: 'Search for consulting firm executives in Las Vegas',
                fullPrompt:
                    'Search Apollo.io for consulting leaders in Vegas. Apply filters job_titles: ["CEO", "Owner", "Director"], industries: ["Information Technology & Services", "Architecture & Planning"], company_size: {min_employees: 11, max_employees: 20}, locations: ["Vegas"]. Expected 40 verified leads.',
                description: 'Vegas consultants serve high-net-worth clients',
            },
            {
                id: 'directive-14',
                category: 'Leads',
                title: 'PE/VC Directors - Multi-Market',
                prompt: 'Find PE and VC directors in LA, Chicago, and Miami',
                fullPrompt:
                    'Execute Apollo search for PE/VC directors across markets. Parameters: job_titles: ["Director"], industries: ["Venture Capital & Private Equity", "Investment Management"], company_size: {min_employees: 21, max_employees: 50}, locations: ["Los Angeles, California", "Chicago, Illinois", "Miami, Florida"]. Expected 75 verified leads.',
                description: 'PE/VC directors travel extensively for due diligence',
            },
            {
                id: 'directive-15',
                category: 'Leads',
                title: 'Software Company Owners - Small Teams',
                prompt: 'Search for software company owners in NYC and LA',
                fullPrompt:
                    'Search Apollo.io for software company owners. Use job_titles: ["Owner", "CEO Owner"], industries: ["Computer Software"], company_size: {min_employees: 1, max_employees: 10}, locations: ["New York, New York", "Los Angeles, California"]. Expected 60 verified leads.',
                description:
                    'Software owners with successful exits have means for private aviation',
            },
            {
                id: 'directive-16',
                category: 'Leads',
                title: 'Commercial Real Estate Managers',
                prompt: 'Find commercial real estate managers in Dallas and Chicago',
                fullPrompt:
                    'Execute Apollo search for CRE managers in midwest. Parameters: job_titles: ["Manager"], industries: ["Commercial Real Estate"], company_size: {min_employees: 11, max_employees: 20}, locations: ["Dallas, Texas", "Chicago, Illinois"]. Expected 55 verified leads.',
                description: 'CRE managers oversee multiple properties across regions',
            },
            {
                id: 'directive-17',
                category: 'Leads',
                title: 'Investment Management Presidents',
                prompt: 'Search for investment management presidents in NYC and Miami',
                fullPrompt:
                    'Search Apollo.io for investment management leadership. Apply filters job_titles: ["CEO President", "Executive Assistant to the President"], industries: ["Investment Management"], company_size: {min_employees: 21, max_employees: 50}, locations: ["Greater New York City Area", "Miami, Florida"]. Expected 70 verified leads.',
                description: 'Investment management leaders need rapid travel for opportunities',
            },
            {
                id: 'directive-18',
                category: 'Leads',
                title: 'Tech Services Directors - Secondary Markets',
                prompt: 'Find IT services directors in Dallas, Chicago, and Vegas',
                fullPrompt:
                    'Execute Apollo search for tech services directors. Use job_titles: ["Director"], industries: ["Information Technology & Services"], company_size: {min_employees: 21, max_employees: 50}, locations: ["Dallas, Texas", "Chicago, Illinois", "Vegas"]. Expected 65 verified leads.',
                description: 'IT services directors manage distributed teams',
            },
            {
                id: 'directive-19',
                category: 'Leads',
                title: 'Finance Sector Co-Founders',
                prompt: 'Search for finance startup co-founders in NYC and LA',
                fullPrompt:
                    'Search Apollo.io for finance startup founders. Parameters: job_titles: ["CEO and Co-Founder", "CEO Founder"], industries: ["Investment Banking", "Venture Capital & Private Equity"], company_size: {min_employees: 1, max_employees: 10}, locations: ["New York, New York", "Los Angeles, California"]. Expected 50 verified leads.',
                description:
                    'Finance startup founders with funding are prime jet charter prospects',
            },
            {
                id: 'directive-20',
                category: 'Leads',
                title: 'Architecture Firm Executives - Coastal',
                prompt: 'Find architecture executives in LA, Miami, and NYC',
                fullPrompt:
                    'Execute Apollo search for architecture firm leadership in coastal markets. Use job_titles: ["CEO", "Owner", "Executive Assistant"], industries: ["Architecture & Planning"], company_size: {min_employees: 11, max_employees: 20}, locations: ["Los Angeles, California", "Miami, Florida", "New York, New York"]. Expected 80 verified leads.',
                description: 'Coastal architecture firms work on luxury projects',
            },
            // Original lead generation prompts continue below
            {
                id: 'lead-1',
                category: 'Leads',
                title: 'Miami Real Estate Executives',
                prompt: 'Search Apollo.io for real estate executives in Miami',
                fullPrompt:
                    'Search Apollo.io for Chief Executive Officers, Presidents, and Chief Development Officers at real estate companies in Miami, FL. Filter by job_titles: ["Chief Executive Officer", "President", "Chief Development Officer", "Managing Partner"], industries: ["Real Estate", "Commercial Real Estate", "Real Estate Development"], company_size: {min_employees: 50, max_employees: 1000}, locations: ["Miami, FL", "Fort Lauderdale, FL", "West Palm Beach, FL"]. Return minimum 100 leads with verified email addresses.',
                description: 'Target real estate executives in South Florida market',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'President',
                        'Chief Development Officer',
                        'Managing Partner',
                    ],
                    industries: [
                        'Real Estate',
                        'Commercial Real Estate',
                        'Real Estate Development',
                    ],
                    company_size: { min_employees: 50, max_employees: 1000 },
                    locations: ['Miami, FL', 'Fort Lauderdale, FL', 'West Palm Beach, FL'],
                },
            },
            {
                id: 'lead-2',
                category: 'Leads',
                title: 'NYC Private Equity Partners',
                prompt: 'Execute Apollo search for private equity partners in New York',
                fullPrompt:
                    'Execute Apollo search with parameters for private equity decision makers in New York. Use job_titles: ["Managing Partner", "General Partner", "Managing Director", "Principal"], industries: ["Private Equity", "Venture Capital", "Investment Management"], company_size: {min_employees: 20, max_employees: 500}, locations: ["New York, NY", "Manhattan, NY", "Greenwich, CT"]. Return minimum 100 leads with engagement scoring.',
                description: 'Private equity leadership in NYC financial district',
                parameters: {
                    job_titles: [
                        'Managing Partner',
                        'General Partner',
                        'Managing Director',
                        'Principal',
                    ],
                    industries: ['Private Equity', 'Venture Capital', 'Investment Management'],
                    company_size: { min_employees: 20, max_employees: 500 },
                    locations: ['New York, NY', 'Manhattan, NY', 'Greenwich, CT'],
                },
            },
            {
                id: 'lead-3',
                category: 'Leads',
                title: 'Texas Tech Founders',
                prompt: 'Find technology company founders and CEOs in Austin and Dallas',
                fullPrompt:
                    'Search Apollo.io for technology company founders and executives in Texas markets. Apply filters job_titles: ["Founder", "Co-Founder", "Chief Executive Officer", "Chief Technology Officer"], industries: ["Software", "SaaS", "Fintech", "Enterprise Software"], company_size: {min_employees: 100, max_employees: 5000}, locations: ["Austin, TX", "Dallas, TX", "Houston, TX", "San Antonio, TX"]. Return minimum 100 verified leads.',
                description: 'Tech leadership in Texas innovation hubs',
                parameters: {
                    job_titles: [
                        'Founder',
                        'Co-Founder',
                        'Chief Executive Officer',
                        'Chief Technology Officer',
                    ],
                    industries: ['Software', 'SaaS', 'Fintech', 'Enterprise Software'],
                    company_size: { min_employees: 100, max_employees: 5000 },
                    locations: ['Austin, TX', 'Dallas, TX', 'Houston, TX', 'San Antonio, TX'],
                },
            },
            {
                id: 'lead-4',
                category: 'Leads',
                title: 'California Healthcare Executives',
                prompt: 'Search for healthcare and biotech executives in California',
                fullPrompt:
                    'Execute Apollo.io search for healthcare industry leaders in California. Parameters: job_titles: ["Chief Executive Officer", "Chief Medical Officer", "Chief Operating Officer", "President"], industries: ["Healthcare", "Biotechnology", "Medical Device", "Pharmaceutical"], company_size: {min_employees: 200, max_employees: 10000}, locations: ["San Francisco, CA", "San Diego, CA", "Los Angeles, CA", "Palo Alto, CA"]. Return minimum 100 qualified leads.',
                description: 'Healthcare and life sciences executives on West Coast',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'Chief Medical Officer',
                        'Chief Operating Officer',
                        'President',
                    ],
                    industries: ['Healthcare', 'Biotechnology', 'Medical Device', 'Pharmaceutical'],
                    company_size: { min_employees: 200, max_employees: 10000 },
                    locations: [
                        'San Francisco, CA',
                        'San Diego, CA',
                        'Los Angeles, CA',
                        'Palo Alto, CA',
                    ],
                },
            },
            {
                id: 'lead-5',
                category: 'Leads',
                title: 'Entertainment Industry Leaders LA',
                prompt: 'Find entertainment and media executives in Los Angeles',
                fullPrompt:
                    'Search Apollo.io for entertainment industry executives in Los Angeles area. Use job_titles: ["Chief Executive Officer", "President", "Studio Head", "Chief Creative Officer"], industries: ["Entertainment", "Media Production", "Film", "Television", "Streaming Media"], company_size: {min_employees: 50, max_employees: 5000}, locations: ["Los Angeles, CA", "Beverly Hills, CA", "Burbank, CA", "Santa Monica, CA"]. Return minimum 100 leads.',
                description: 'Entertainment and media leadership in Hollywood',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'President',
                        'Studio Head',
                        'Chief Creative Officer',
                    ],
                    industries: [
                        'Entertainment',
                        'Media Production',
                        'Film',
                        'Television',
                        'Streaming Media',
                    ],
                    company_size: { min_employees: 50, max_employees: 5000 },
                    locations: [
                        'Los Angeles, CA',
                        'Beverly Hills, CA',
                        'Burbank, CA',
                        'Santa Monica, CA',
                    ],
                },
            },
            {
                id: 'lead-6',
                category: 'Leads',
                title: 'Chicago Finance Executives',
                prompt: 'Execute search for financial services executives in Chicago',
                fullPrompt:
                    'Execute Apollo search for finance industry leaders in Chicago metropolitan area. Parameters: job_titles: ["Chief Executive Officer", "Chief Financial Officer", "Managing Director", "Partner"], industries: ["Banking", "Investment Banking", "Asset Management", "Financial Services"], company_size: {min_employees: 100, max_employees: 10000}, locations: ["Chicago, IL", "Northbrook, IL", "Oak Brook, IL"]. Minimum 100 verified leads required.',
                description: 'Financial services leadership in Chicago',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'Chief Financial Officer',
                        'Managing Director',
                        'Partner',
                    ],
                    industries: [
                        'Banking',
                        'Investment Banking',
                        'Asset Management',
                        'Financial Services',
                    ],
                    company_size: { min_employees: 100, max_employees: 10000 },
                    locations: ['Chicago, IL', 'Northbrook, IL', 'Oak Brook, IL'],
                },
            },
            {
                id: 'lead-7',
                category: 'Leads',
                title: 'Boston Biotech Founders',
                prompt: 'Search for biotech company founders and CEOs in Boston',
                fullPrompt:
                    'Search Apollo.io for biotechnology company leadership in Boston area. Apply filters job_titles: ["Founder", "Chief Executive Officer", "Chief Scientific Officer", "President"], industries: ["Biotechnology", "Pharmaceutical", "Life Sciences", "Medical Research"], company_size: {min_employees: 25, max_employees: 1000}, locations: ["Boston, MA", "Cambridge, MA", "Waltham, MA"]. Return minimum 100 leads.',
                description: 'Biotech innovation leaders in Boston hub',
                parameters: {
                    job_titles: [
                        'Founder',
                        'Chief Executive Officer',
                        'Chief Scientific Officer',
                        'President',
                    ],
                    industries: [
                        'Biotechnology',
                        'Pharmaceutical',
                        'Life Sciences',
                        'Medical Research',
                    ],
                    company_size: { min_employees: 25, max_employees: 1000 },
                    locations: ['Boston, MA', 'Cambridge, MA', 'Waltham, MA'],
                },
            },
            {
                id: 'lead-8',
                category: 'Leads',
                title: 'Atlanta Corporate Presidents',
                prompt: 'Find corporate presidents and CEOs in Atlanta',
                fullPrompt:
                    'Execute Apollo.io search for corporate executives in Atlanta market. Use job_titles: ["President", "Chief Executive Officer", "Chief Operating Officer", "Executive Vice President"], industries: ["Logistics", "Transportation", "Retail", "Telecommunications"], company_size: {min_employees: 500, max_employees: 20000}, locations: ["Atlanta, GA", "Alpharetta, GA", "Sandy Springs, GA"]. Return minimum 100 qualified leads.',
                description: 'Corporate leadership in Atlanta business hub',
                parameters: {
                    job_titles: [
                        'President',
                        'Chief Executive Officer',
                        'Chief Operating Officer',
                        'Executive Vice President',
                    ],
                    industries: ['Logistics', 'Transportation', 'Retail', 'Telecommunications'],
                    company_size: { min_employees: 500, max_employees: 20000 },
                    locations: ['Atlanta, GA', 'Alpharetta, GA', 'Sandy Springs, GA'],
                },
            },
            {
                id: 'lead-9',
                category: 'Leads',
                title: 'Phoenix Real Estate Developers',
                prompt: 'Search for real estate developers and investors in Phoenix',
                fullPrompt:
                    'Search Apollo.io for real estate development executives in Phoenix metro. Parameters: job_titles: ["Chief Executive Officer", "President", "Chief Development Officer", "Principal"], industries: ["Real Estate Development", "Real Estate Investment", "Property Management"], company_size: {min_employees: 25, max_employees: 500}, locations: ["Phoenix, AZ", "Scottsdale, AZ", "Tempe, AZ", "Mesa, AZ"]. Minimum 100 leads required.',
                description: 'Real estate development leaders in Phoenix market',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'President',
                        'Chief Development Officer',
                        'Principal',
                    ],
                    industries: [
                        'Real Estate Development',
                        'Real Estate Investment',
                        'Property Management',
                    ],
                    company_size: { min_employees: 25, max_employees: 500 },
                    locations: ['Phoenix, AZ', 'Scottsdale, AZ', 'Tempe, AZ', 'Mesa, AZ'],
                },
            },
            {
                id: 'lead-10',
                category: 'Leads',
                title: 'Nashville Music Industry Executives',
                prompt: 'Find music and entertainment executives in Nashville',
                fullPrompt:
                    'Execute Apollo search for music industry leadership in Nashville. Use job_titles: ["Chief Executive Officer", "President", "Label Head", "Chief Creative Officer"], industries: ["Music", "Entertainment", "Media", "Recording"], company_size: {min_employees: 20, max_employees: 1000}, locations: ["Nashville, TN", "Franklin, TN", "Brentwood, TN"]. Return minimum 100 verified leads.',
                description: 'Music industry executives in Nashville',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'President',
                        'Label Head',
                        'Chief Creative Officer',
                    ],
                    industries: ['Music', 'Entertainment', 'Media', 'Recording'],
                    company_size: { min_employees: 20, max_employees: 1000 },
                    locations: ['Nashville, TN', 'Franklin, TN', 'Brentwood, TN'],
                },
            },
            {
                id: 'lead-11',
                category: 'Leads',
                title: 'Seattle Tech VPs',
                prompt: 'Search for VP-level tech executives in Seattle',
                fullPrompt:
                    'Search Apollo.io for VP-level technology executives in Seattle area. Apply filters job_titles: ["Vice President", "Senior Vice President", "Executive Vice President", "VP of Engineering"], industries: ["Technology", "Software", "Cloud Computing", "E-commerce"], company_size: {min_employees: 200, max_employees: 10000}, locations: ["Seattle, WA", "Bellevue, WA", "Redmond, WA"]. Minimum 100 leads.',
                description: 'Senior tech leadership in Seattle region',
                parameters: {
                    job_titles: [
                        'Vice President',
                        'Senior Vice President',
                        'Executive Vice President',
                        'VP of Engineering',
                    ],
                    industries: ['Technology', 'Software', 'Cloud Computing', 'E-commerce'],
                    company_size: { min_employees: 200, max_employees: 10000 },
                    locations: ['Seattle, WA', 'Bellevue, WA', 'Redmond, WA'],
                },
            },
            {
                id: 'lead-12',
                category: 'Leads',
                title: 'Denver Energy Executives',
                prompt: 'Find energy and utilities executives in Denver',
                fullPrompt:
                    'Execute Apollo.io search for energy sector leadership in Denver. Parameters: job_titles: ["Chief Executive Officer", "President", "Chief Operating Officer", "Vice President"], industries: ["Energy", "Oil and Gas", "Renewable Energy", "Utilities"], company_size: {min_employees: 100, max_employees: 5000}, locations: ["Denver, CO", "Boulder, CO", "Aurora, CO"]. Return minimum 100 qualified leads.',
                description: 'Energy industry executives in Colorado',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'President',
                        'Chief Operating Officer',
                        'Vice President',
                    ],
                    industries: ['Energy', 'Oil and Gas', 'Renewable Energy', 'Utilities'],
                    company_size: { min_employees: 100, max_employees: 5000 },
                    locations: ['Denver, CO', 'Boulder, CO', 'Aurora, CO'],
                },
            },
            {
                id: 'lead-13',
                category: 'Leads',
                title: 'DC Government Contractors',
                prompt: 'Search for executives at government contracting firms in DC',
                fullPrompt:
                    'Search Apollo.io for government contractor executives in Washington DC area. Use job_titles: ["Chief Executive Officer", "President", "Chief Growth Officer", "Executive Vice President"], industries: ["Defense", "Government Services", "Consulting", "Aerospace"], company_size: {min_employees: 100, max_employees: 10000}, locations: ["Washington, DC", "Arlington, VA", "McLean, VA", "Bethesda, MD"]. Minimum 100 leads.',
                description: 'Federal contractor leadership in DC metro',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'President',
                        'Chief Growth Officer',
                        'Executive Vice President',
                    ],
                    industries: ['Defense', 'Government Services', 'Consulting', 'Aerospace'],
                    company_size: { min_employees: 100, max_employees: 10000 },
                    locations: ['Washington, DC', 'Arlington, VA', 'McLean, VA', 'Bethesda, MD'],
                },
            },
            {
                id: 'lead-14',
                category: 'Leads',
                title: 'Charlotte Banking Executives',
                prompt: 'Find banking and finance executives in Charlotte',
                fullPrompt:
                    'Execute Apollo search for banking industry leaders in Charlotte. Parameters: job_titles: ["Chief Executive Officer", "Chief Financial Officer", "Managing Director", "Executive Vice President"], industries: ["Banking", "Commercial Banking", "Investment Banking", "Wealth Management"], company_size: {min_employees: 200, max_employees: 50000}, locations: ["Charlotte, NC", "Raleigh, NC", "Durham, NC"]. Return minimum 100 leads.',
                description: 'Banking sector leadership in Charlotte financial center',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'Chief Financial Officer',
                        'Managing Director',
                        'Executive Vice President',
                    ],
                    industries: [
                        'Banking',
                        'Commercial Banking',
                        'Investment Banking',
                        'Wealth Management',
                    ],
                    company_size: { min_employees: 200, max_employees: 50000 },
                    locations: ['Charlotte, NC', 'Raleigh, NC', 'Durham, NC'],
                },
            },
            {
                id: 'lead-15',
                category: 'Leads',
                title: 'Las Vegas Hospitality Leaders',
                prompt: 'Search for hospitality and gaming executives in Las Vegas',
                fullPrompt:
                    'Search Apollo.io for hospitality industry executives in Las Vegas. Apply filters job_titles: ["Chief Executive Officer", "President", "Chief Operating Officer", "General Manager"], industries: ["Hospitality", "Hotels", "Gaming", "Entertainment", "Restaurants"], company_size: {min_employees: 100, max_employees: 10000}, locations: ["Las Vegas, NV", "Henderson, NV", "Paradise, NV"]. Minimum 100 verified leads.',
                description: 'Hospitality and gaming executives in Vegas',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'President',
                        'Chief Operating Officer',
                        'General Manager',
                    ],
                    industries: ['Hospitality', 'Hotels', 'Gaming', 'Entertainment', 'Restaurants'],
                    company_size: { min_employees: 100, max_employees: 10000 },
                    locations: ['Las Vegas, NV', 'Henderson, NV', 'Paradise, NV'],
                },
            },
            {
                id: 'lead-16',
                category: 'Leads',
                title: 'Detroit Manufacturing CEOs',
                prompt: 'Find manufacturing and automotive executives in Detroit',
                fullPrompt:
                    'Execute Apollo.io search for manufacturing executives in Detroit region. Use job_titles: ["Chief Executive Officer", "President", "Chief Operating Officer", "Plant Manager"], industries: ["Manufacturing", "Automotive", "Industrial", "Aerospace"], company_size: {min_employees: 200, max_employees: 20000}, locations: ["Detroit, MI", "Troy, MI", "Auburn Hills, MI", "Dearborn, MI"]. Return minimum 100 qualified leads.',
                description: 'Manufacturing leadership in Detroit industrial base',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'President',
                        'Chief Operating Officer',
                        'Plant Manager',
                    ],
                    industries: ['Manufacturing', 'Automotive', 'Industrial', 'Aerospace'],
                    company_size: { min_employees: 200, max_employees: 20000 },
                    locations: ['Detroit, MI', 'Troy, MI', 'Auburn Hills, MI', 'Dearborn, MI'],
                },
            },
            {
                id: 'lead-17',
                category: 'Leads',
                title: 'Orlando Tourism Executives',
                prompt: 'Search for tourism and theme park executives in Orlando',
                fullPrompt:
                    'Search Apollo.io for tourism industry leadership in Orlando. Parameters: job_titles: ["Chief Executive Officer", "President", "Vice President", "General Manager"], industries: ["Tourism", "Theme Parks", "Hospitality", "Travel", "Entertainment"], company_size: {min_employees: 100, max_employees: 50000}, locations: ["Orlando, FL", "Kissimmee, FL", "Lake Buena Vista, FL"]. Minimum 100 leads required.',
                description: 'Tourism and entertainment executives in Orlando',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'President',
                        'Vice President',
                        'General Manager',
                    ],
                    industries: [
                        'Tourism',
                        'Theme Parks',
                        'Hospitality',
                        'Travel',
                        'Entertainment',
                    ],
                    company_size: { min_employees: 100, max_employees: 50000 },
                    locations: ['Orlando, FL', 'Kissimmee, FL', 'Lake Buena Vista, FL'],
                },
            },
            {
                id: 'lead-18',
                category: 'Leads',
                title: 'San Diego Defense Contractors',
                prompt: 'Find defense and aerospace executives in San Diego',
                fullPrompt:
                    'Execute Apollo search for defense industry executives in San Diego. Use job_titles: ["Chief Executive Officer", "President", "Vice President", "Program Director"], industries: ["Defense", "Aerospace", "Military Technology", "Maritime"], company_size: {min_employees: 50, max_employees: 10000}, locations: ["San Diego, CA", "La Jolla, CA", "Carlsbad, CA"]. Return minimum 100 verified leads.',
                description: 'Defense and aerospace leadership in San Diego',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'President',
                        'Vice President',
                        'Program Director',
                    ],
                    industries: ['Defense', 'Aerospace', 'Military Technology', 'Maritime'],
                    company_size: { min_employees: 50, max_employees: 10000 },
                    locations: ['San Diego, CA', 'La Jolla, CA', 'Carlsbad, CA'],
                },
            },
            {
                id: 'lead-19',
                category: 'Leads',
                title: 'Philadelphia Healthcare Systems',
                prompt: 'Search for hospital and health system executives in Philadelphia',
                fullPrompt:
                    'Search Apollo.io for healthcare system executives in Philadelphia region. Apply filters job_titles: ["Chief Executive Officer", "Chief Medical Officer", "Chief Operating Officer", "President"], industries: ["Healthcare", "Hospitals", "Health Systems", "Medical"], company_size: {min_employees: 500, max_employees: 50000}, locations: ["Philadelphia, PA", "King of Prussia, PA", "Cherry Hill, NJ"]. Minimum 100 leads.',
                description: 'Healthcare system leadership in Philadelphia',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'Chief Medical Officer',
                        'Chief Operating Officer',
                        'President',
                    ],
                    industries: ['Healthcare', 'Hospitals', 'Health Systems', 'Medical'],
                    company_size: { min_employees: 500, max_employees: 50000 },
                    locations: ['Philadelphia, PA', 'King of Prussia, PA', 'Cherry Hill, NJ'],
                },
            },
            {
                id: 'lead-20',
                category: 'Leads',
                title: 'Minneapolis Retail Executives',
                prompt: 'Find retail and consumer goods executives in Minneapolis',
                fullPrompt:
                    'Execute Apollo.io search for retail industry leaders in Minneapolis. Parameters: job_titles: ["Chief Executive Officer", "President", "Chief Merchandising Officer", "Chief Marketing Officer"], industries: ["Retail", "E-commerce", "Consumer Goods", "Fashion"], company_size: {min_employees: 200, max_employees: 50000}, locations: ["Minneapolis, MN", "St. Paul, MN", "Bloomington, MN"]. Return minimum 100 qualified leads.',
                description: 'Retail leadership in Minneapolis market',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'President',
                        'Chief Merchandising Officer',
                        'Chief Marketing Officer',
                    ],
                    industries: ['Retail', 'E-commerce', 'Consumer Goods', 'Fashion'],
                    company_size: { min_employees: 200, max_employees: 50000 },
                    locations: ['Minneapolis, MN', 'St. Paul, MN', 'Bloomington, MN'],
                },
            },
            {
                id: 'lead-21',
                category: 'Leads',
                title: 'Tampa Bay Finance Leaders',
                prompt: 'Search for financial services executives in Tampa Bay',
                fullPrompt:
                    'Search Apollo.io for finance executives in Tampa Bay area. Use job_titles: ["Chief Executive Officer", "Chief Financial Officer", "Managing Partner", "Senior Vice President"], industries: ["Financial Services", "Insurance", "Investment Management", "Banking"], company_size: {min_employees: 100, max_employees: 10000}, locations: ["Tampa, FL", "St. Petersburg, FL", "Clearwater, FL", "Sarasota, FL"]. Minimum 100 verified leads.',
                description: 'Financial services leadership in Tampa Bay',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'Chief Financial Officer',
                        'Managing Partner',
                        'Senior Vice President',
                    ],
                    industries: [
                        'Financial Services',
                        'Insurance',
                        'Investment Management',
                        'Banking',
                    ],
                    company_size: { min_employees: 100, max_employees: 10000 },
                    locations: [
                        'Tampa, FL',
                        'St. Petersburg, FL',
                        'Clearwater, FL',
                        'Sarasota, FL',
                    ],
                },
            },
            {
                id: 'lead-22',
                category: 'Leads',
                title: 'Salt Lake City Tech Founders',
                prompt: 'Find tech startup founders and CEOs in Salt Lake City',
                fullPrompt:
                    'Execute Apollo search for technology startup leaders in Salt Lake City. Parameters: job_titles: ["Founder", "Co-Founder", "Chief Executive Officer", "Chief Technology Officer"], industries: ["Software", "SaaS", "Technology", "Fintech"], company_size: {min_employees: 10, max_employees: 500}, locations: ["Salt Lake City, UT", "Park City, UT", "Provo, UT", "Lehi, UT"]. Return minimum 100 leads.',
                description: 'Tech startup leadership in Utah Silicon Slopes',
                parameters: {
                    job_titles: [
                        'Founder',
                        'Co-Founder',
                        'Chief Executive Officer',
                        'Chief Technology Officer',
                    ],
                    industries: ['Software', 'SaaS', 'Technology', 'Fintech'],
                    company_size: { min_employees: 10, max_employees: 500 },
                    locations: ['Salt Lake City, UT', 'Park City, UT', 'Provo, UT', 'Lehi, UT'],
                },
            },
            {
                id: 'lead-23',
                category: 'Leads',
                title: 'Portland Creative Executives',
                prompt: 'Search for creative and advertising executives in Portland',
                fullPrompt:
                    'Search Apollo.io for creative industry executives in Portland. Apply filters job_titles: ["Chief Executive Officer", "Chief Creative Officer", "President", "Creative Director"], industries: ["Advertising", "Marketing", "Design", "Digital Media"], company_size: {min_employees: 25, max_employees: 1000}, locations: ["Portland, OR", "Beaverton, OR", "Lake Oswego, OR"]. Minimum 100 verified leads.',
                description: 'Creative and advertising leadership in Portland',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'Chief Creative Officer',
                        'President',
                        'Creative Director',
                    ],
                    industries: ['Advertising', 'Marketing', 'Design', 'Digital Media'],
                    company_size: { min_employees: 25, max_employees: 1000 },
                    locations: ['Portland, OR', 'Beaverton, OR', 'Lake Oswego, OR'],
                },
            },
            {
                id: 'lead-24',
                category: 'Leads',
                title: 'Columbus Insurance Executives',
                prompt: 'Find insurance industry executives in Columbus',
                fullPrompt:
                    'Execute Apollo.io search for insurance executives in Columbus. Use job_titles: ["Chief Executive Officer", "President", "Chief Underwriting Officer", "Chief Risk Officer"], industries: ["Insurance", "Reinsurance", "Financial Services"], company_size: {min_employees: 100, max_employees: 20000}, locations: ["Columbus, OH", "Dublin, OH", "Westerville, OH"]. Return minimum 100 qualified leads.',
                description: 'Insurance industry leadership in Columbus',
                parameters: {
                    job_titles: [
                        'Chief Executive Officer',
                        'President',
                        'Chief Underwriting Officer',
                        'Chief Risk Officer',
                    ],
                    industries: ['Insurance', 'Reinsurance', 'Financial Services'],
                    company_size: { min_employees: 100, max_employees: 20000 },
                    locations: ['Columbus, OH', 'Dublin, OH', 'Westerville, OH'],
                },
            },
        ],
    },
    {
        name: 'Analytics & Insights',
        slug: 'analytics',
        count: 4,
        icon: IconChartBar,
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        prompts: [
            {
                id: 'analytics-1',
                category: 'Analytics',
                title: 'Conversion Trends',
                prompt: 'Compare conversion rates with last quarter',
                fullPrompt:
                    'Provide comprehensive conversion rate analysis comparing current quarter to last quarter performance. Include lead-to-opportunity rates, opportunity-to-booking rates, average sales cycle duration, and win rate trends.',
                description: 'Performance benchmarking across time periods',
            },
            {
                id: 'analytics-2',
                category: 'Analytics',
                title: 'Campaign ROI',
                prompt: 'Calculate ROI by campaign type and industry vertical',
                fullPrompt:
                    'Calculate detailed ROI analysis for all campaign types across industry verticals. Break down cost per lead, cost per acquisition, lifetime value, and return on ad spend by campaign channel and industry segment.',
                description: 'Revenue attribution analysis by segment',
            },
            {
                id: 'analytics-3',
                category: 'Analytics',
                title: 'Message Performance',
                prompt: 'Analyze top performing email templates and messaging',
                fullPrompt:
                    'Analyze all message templates to identify top performers and optimization opportunities. Compare open rates, click rates, response rates, and conversion rates across different messaging variations and subject lines.',
                description: 'Content optimization through A/B testing',
            },
            {
                id: 'analytics-4',
                category: 'Analytics',
                title: 'Executive Briefing',
                prompt: 'Generate comprehensive Monday executive briefing',
                fullPrompt:
                    'Generate a comprehensive Monday morning executive briefing with actionable insights. Include weekly performance metrics, pipeline updates, conversion trends, and prioritized action items for the week.',
                description: 'Automated reporting and insights summary',
            },
        ],
    },
];
