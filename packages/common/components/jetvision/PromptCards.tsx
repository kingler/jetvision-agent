'use client';
import React from 'react';
import { cn } from '@repo/ui';
import { scrollToChatInputWithFocus } from '@repo/common/utils';
import { 
    IconRocket, 
    IconUsers, 
    IconChartBar,
    IconPlane,
    IconCalendar,
    IconTarget,
    IconTrendingUp,
    IconMail,
    IconSearch,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';

interface PromptCard {
    id: string;
    category: 'charter' | 'apollo' | 'travel' | 'leads' | 'analytics';
    title: string;
    prompt: string;
    fullPrompt: string; // Enhanced full prompt for n8n agent
    description: string;
    icon: React.ElementType;
    parameters?: Record<string, any>; // Optional structured parameters
}

// All 20 enhanced prompt cards with professional prompt engineering
const promptCards: PromptCard[] = [
    // Jet Charter Operations (4 cards)
    {
        id: 'jet-1',
        category: 'charter',
        title: 'Aircraft Availability',
        prompt: 'Check aircraft availability for Miami to New York tomorrow',
        fullPrompt: 'As a JetVision fleet operations specialist, search for available aircraft for tomorrow\'s flight from Miami International Airport (MIA) to New York area airports (JFK, LGA, or TEB). Query the Avinode marketplace to identify: 1) Available aircraft types and tail numbers, 2) Seating capacity and cabin configurations, 3) Operator information and safety ratings, 4) Estimated flight times and fuel stops if required, 5) Hourly rates and total trip costs. Filter results by: Light jets (4-7 passengers), Mid-size jets (6-9 passengers), and Heavy jets (9-16 passengers). Include empty leg opportunities if available. Format the response as a structured comparison table with recommendations based on passenger count and budget requirements.',
        description: 'Check real-time fleet availability for specific routes',
        icon: IconPlane,
        parameters: {
            departure: 'MIA',
            arrival: ['JFK', 'LGA', 'TEB'],
            date: 'tomorrow',
            passengerCount: null,
            aircraftCategories: ['light', 'midsize', 'heavy']
        }
    },
    {
        id: 'jet-2',
        category: 'charter',
        title: 'Empty Legs',
        prompt: 'Find empty leg opportunities for this weekend',
        fullPrompt: 'As a JetVision charter optimization specialist, search the Avinode marketplace for empty leg (repositioning) flights available this weekend (Friday through Sunday). Identify opportunities with: 1) Origin and destination airports with city pairs, 2) Aircraft type, operator, and tail number, 3) Available dates and flexible time windows, 4) Standard retail price vs. empty leg discount percentage, 5) Passenger capacity and baggage allowance. Focus on popular routes: Northeast Corridor (BOS-DCA), Florida routes (MIA-TEB), West Coast (LAX-SFO), and Texas Triangle (DAL-HOU-AUS). Calculate potential savings for clients and highlight opportunities with 40% or greater discounts. Include last-minute availability and one-way options. Provide recommendations ranked by discount percentage and route popularity.',
        description: 'Find discounted repositioning flights and save costs',
        icon: IconPlane,
        parameters: {
            dateRange: 'this_weekend',
            minDiscount: 40,
            routes: ['popular', 'northeast', 'florida', 'westcoast', 'texas'],
            sortBy: 'discount_percentage'
        }
    },
    {
        id: 'jet-3',
        category: 'charter',
        title: 'Fleet Utilization',
        prompt: 'Analyze fleet utilization metrics for this month',
        fullPrompt: 'As a JetVision fleet analytics specialist, generate a comprehensive utilization report for the current month. Analyze: 1) Overall fleet utilization percentage (flight hours / available hours), 2) Individual aircraft performance metrics by tail number, 3) Revenue per flight hour by aircraft category, 4) Maintenance downtime and AOG (Aircraft on Ground) incidents, 5) Peak utilization days and underutilized periods. Compare against: Previous month metrics, Same month last year, and Industry benchmarks (target: 85% for charter operations). Identify optimization opportunities including: Aircraft requiring remarketing, Routes with consistent demand, Pricing adjustments for underutilized aircraft, and Maintenance scheduling improvements. Present findings with visualizations showing daily utilization heat maps and revenue trends.',
        description: 'Monitor aircraft usage metrics and optimization',
        icon: IconPlane,
        parameters: {
            period: 'current_month',
            metrics: ['utilization_rate', 'revenue_per_hour', 'downtime', 'aog'],
            benchmarks: { target: 85, comparison: ['previous_month', 'year_over_year'] }
        }
    },
    {
        id: 'jet-4',
        category: 'charter',
        title: 'Heavy Jet Search',
        prompt: 'Search heavy jets for 12 passengers to London Tuesday',
        fullPrompt: 'As a JetVision international charter specialist, search for heavy jet aircraft capable of transatlantic flight for 12 passengers departing next Tuesday to London (preferably Farnborough or Luton for business aviation). Requirements: 1) Aircraft with 6,000+ nm range for nonstop transatlantic capability, 2) Cabin configuration for 12-14 passengers with sleeping arrangements, 3) Full galley and lavatory facilities for 8+ hour flight, 4) WiFi and productivity amenities for business travelers, 5) Customs and immigration handling at both ends. Preferred aircraft types: Gulfstream G650/G550, Bombardier Global 6000/7500, Dassault Falcon 7X/8X. Include: Operator safety ratings and international experience, Catering options and special meal accommodations, Ground transportation and FBO services, Total trip cost including fuel surcharges and international fees. Provide 3-5 options ranked by aircraft age and passenger comfort.',
        description: 'Search for specific aircraft types by passenger count',
        icon: IconPlane,
        parameters: {
            passengerCount: 12,
            destination: 'London',
            preferredAirports: ['Farnborough', 'Luton'],
            date: 'next_tuesday',
            aircraftTypes: ['Gulfstream G650', 'Gulfstream G550', 'Global 6000', 'Global 7500', 'Falcon 7X', 'Falcon 8X'],
            requirements: ['transatlantic_range', 'wifi', 'sleeping_config']
        }
    },

    // Apollo Campaign Management (4 cards)
    {
        id: 'apollo-1',
        category: 'apollo',
        title: 'Weekly Conversions',
        prompt: 'Analyze prospect to booking conversions this week',
        fullPrompt: 'As a JetVision sales analytics specialist, analyze this week\'s conversion funnel from Apollo.io prospects to confirmed charter bookings. Track: 1) Total prospects engaged via Apollo campaigns, 2) Email open rates and click-through rates by campaign, 3) Meeting/call conversion rate from email engagement, 4) Quote requests generated from meetings, 5) Confirmed bookings with revenue attribution. Segment analysis by: Industry vertical (Finance, Tech, Entertainment, Healthcare), Company size (SMB, Mid-market, Enterprise), Decision maker role (C-suite, EA, Travel Manager), Campaign type (Cold outreach, Nurture, Win-back). Calculate: Cost per acquisition from Apollo spend, Average deal size by segment, Time to conversion (first touch to booking), and ROI by campaign. Compare to previous week and monthly averages. Identify top-performing messages and sequences for scaling.',
        description: 'Track conversion metrics from campaigns to bookings',
        icon: IconRocket,
        parameters: {
            timeframe: 'current_week',
            metrics: ['open_rate', 'ctr', 'meeting_rate', 'quote_rate', 'booking_rate'],
            segments: ['industry', 'company_size', 'role', 'campaign_type'],
            calculations: ['cpa', 'deal_size', 'conversion_time', 'roi']
        }
    },
    {
        id: 'apollo-2',
        category: 'apollo',
        title: 'EA Engagement',
        prompt: 'Identify top engaged executive assistants from campaigns',
        fullPrompt: 'As a JetVision relationship intelligence specialist, identify and analyze the most engaged executive assistants from our Apollo.io email campaigns. Report on: 1) Top 50 EAs by email engagement score (opens, clicks, replies), 2) Their executives\' travel patterns and company profiles, 3) Content topics that drove highest engagement (safety, convenience, time-saving, cost), 4) Optimal send times and follow-up cadence for EAs, 5) Reply sentiment and specific questions/objections raised. Enrich data with: Company revenue and employee count, Industry and headquarters location, Previous charter usage or competitor services, Executive\'s role and travel frequency estimates. Create prioritized outreach list with: Personalized talking points per EA, Recommended next actions (call, demo, executive introduction), Custom content suggestions based on engagement patterns. Flag warm leads showing buying signals for immediate sales follow-up.',
        description: 'Analyze engagement patterns for executive assistants',
        icon: IconMail,
        parameters: {
            role: 'executive_assistant',
            limit: 50,
            engagementMetrics: ['opens', 'clicks', 'replies', 'forwards'],
            enrichment: ['company_data', 'executive_profile', 'travel_patterns'],
            analysis: ['content_performance', 'timing_optimization', 'sentiment']
        }
    },
    {
        id: 'apollo-3',
        category: 'apollo',
        title: 'Finance Campaigns',
        prompt: 'Analyze finance sector campaign performance metrics',
        fullPrompt: 'As a JetVision vertical marketing specialist, provide comprehensive performance analysis of all finance industry campaigns in Apollo.io. Analyze: 1) Response rates by finance subsector (Investment Banking, Private Equity, Hedge Funds, Venture Capital, Family Offices), 2) Message performance by value proposition (time savings, privacy, productivity, deal-making), 3) Title-based response variations (MD, Partner, CFO, COO, EA), 4) Geographic performance (NYC, SF, Chicago, London), 5) Seasonal patterns and earnings season impacts. Benchmark against: Overall JetVision campaign average, Industry-specific benchmarks from Apollo, and Competitor messaging strategies. Identify: Top 3 performing subject lines and email templates, Most effective CTAs for finance professionals, Optimal campaign timing around market hours, and Common objections requiring sales enablement. Recommend campaign optimizations and A/B test priorities for next quarter.',
        description: 'Industry-specific campaign performance metrics',
        icon: IconRocket,
        parameters: {
            industry: 'finance',
            subsectors: ['investment_banking', 'private_equity', 'hedge_funds', 'venture_capital', 'family_offices'],
            metrics: ['response_rate', 'open_rate', 'meeting_rate', 'conversion_rate'],
            geographic: ['NYC', 'SF', 'Chicago', 'London'],
            analysis: ['message_performance', 'timing', 'objections']
        }
    },
    {
        id: 'apollo-4',
        category: 'apollo',
        title: 'VIP Campaign',
        prompt: 'Design VIP campaign for top 100 qualified prospects',
        fullPrompt: 'As a JetVision strategic accounts specialist, design and configure a high-touch VIP campaign in Apollo.io for our top 100 qualified prospects. Campaign strategy: 1) Identify prospects using scoring criteria (company revenue >$500M, C-suite or EA role, high email engagement, competitor usage), 2) Create personalized multi-channel sequence (email, LinkedIn, direct mail), 3) Develop exclusive VIP offers (complimentary first flight, white-glove onboarding, dedicated account management), 4) Design premium content assets (personalized travel analysis, ROI calculator, executive travel guide), 5) Configure advanced tracking and alerts for sales team. Sequence structure: Day 1: Personalized introduction with company research, Day 3: Value proposition with peer success stories, Day 7: Exclusive VIP program invitation, Day 10: Executive assistant resources and support materials, Day 14: Calendly link for executive briefing. Include dynamic personalization tokens and behavioral triggers. Set up real-time Slack notifications for opens and clicks.',
        description: 'Launch targeted campaigns for high-value leads',
        icon: IconTarget,
        parameters: {
            campaignType: 'vip',
            prospectCount: 100,
            scoring: { minRevenue: 500000000, roles: ['c_suite', 'ea'], engagement: 'high' },
            channels: ['email', 'linkedin', 'direct_mail'],
            offers: ['complimentary_flight', 'white_glove_onboarding', 'dedicated_account'],
            sequence: { days: 14, touchpoints: 5, personalization: 'advanced' }
        }
    },

    // Travel Planning & Coordination (4 cards)
    {
        id: 'travel-1',
        category: 'travel',
        title: 'Multi-City Planning',
        prompt: 'Plan tech executive roadshow across 5 cities',
        fullPrompt: 'As a JetVision travel logistics coordinator, plan a comprehensive multi-city roadshow for a technology executive client. Itinerary requirements: 1) 5 cities over 7 days (suggested: SF, Seattle, Austin, NYC, Boston), 2) Morning arrival for afternoon meetings, evening departure when possible, 3) Preferred FBOs with conference facilities and quick customs, 4) Ground transportation with secure, tech-equipped vehicles, 5) Contingency plans for weather or mechanical delays. For each city provide: Optimal aircraft positioning and crew scheduling, FBO selection with amenities and services, Hotel recommendations near meeting venues, Local handlers and concierge services, Time zone optimization and jet lag mitigation. Include: Catering preferences and dietary restrictions, In-flight WiFi and presentation capabilities, Baggage and equipment logistics, Cost breakdown with bundled savings. Generate master itinerary with mobile app integration and real-time updates.',
        description: 'Complex itinerary management across multiple cities',
        icon: IconCalendar,
        parameters: {
            cities: ['San Francisco', 'Seattle', 'Austin', 'New York', 'Boston'],
            duration: '7_days',
            requirements: ['morning_arrival', 'fbo_conference', 'ground_transport'],
            services: ['catering', 'wifi', 'concierge', 'hotels'],
            optimization: ['crew_scheduling', 'positioning', 'timezone']
        }
    },
    {
        id: 'travel-2',
        category: 'travel',
        title: 'Weather Routes',
        prompt: 'Optimize routes to avoid weather delays this week',
        fullPrompt: 'As a JetVision flight operations specialist, analyze weather patterns and recommend optimal routing strategies for this week\'s scheduled flights. Weather analysis: 1) Current and forecasted conditions at major hubs, 2) Frontal systems, thunderstorms, and winter weather threats, 3) Turbulence forecasts and ride quality predictions, 4) Alternate airport selection for weather diversions, 5) Deicing requirements and ground stop probabilities. Route optimization: Primary and alternate routing options, Fuel planning with weather contingencies, Departure time adjustments to avoid weather, Technical stops for weather avoidance, and Cabin altitude optimization for passenger comfort. Provide specific recommendations for: East Coast operations (nor\'easter impact), Midwest connections (thunderstorm activity), Mountain airports (wind and visibility), West Coast (marine layer and fog). Include confidence levels and update triggers for route changes.',
        description: 'Weather-optimized routing for minimal disruption',
        icon: IconCalendar,
        parameters: {
            timeframe: 'this_week',
            analysis: ['current_conditions', 'forecasts', 'turbulence', 'alternates'],
            regions: ['east_coast', 'midwest', 'mountain', 'west_coast'],
            factors: ['fronts', 'thunderstorms', 'winter_weather', 'visibility'],
            outputs: ['primary_routes', 'alternates', 'timing', 'confidence']
        }
    },
    {
        id: 'travel-3',
        category: 'travel',
        title: 'Industry Patterns',
        prompt: 'Analyze entertainment industry seasonal travel trends',
        fullPrompt: 'As a JetVision market intelligence analyst, provide comprehensive analysis of seasonal travel patterns for the entertainment industry. Analyze historical data for: 1) Peak travel periods (award seasons, festivals, production schedules), 2) Popular routes (LA-NYC, LA-Cannes, NYC-London, LA-Toronto), 3) Aircraft preferences by entertainment segment (studio executives, talent, production crews), 4) Booking lead times and last-minute surge patterns, 5) Group travel vs. individual executive movements. Seasonal insights: Award season surge (January-March): Golden Globes, Sundance, Oscars, Festival circuit (May-September): Cannes, Venice, TIFF, Toronto, Production windows: Summer blockbusters, fall prestige, pilot season, Holiday lulls and opportunity periods. Predictive analytics: Upcoming demand spikes based on production schedules, Pricing optimization recommendations, Fleet positioning strategies, and Partnership opportunities with studios and agencies. Create actionable recommendations for sales and operations teams.',
        description: 'Analyze travel trends by industry and season',
        icon: IconTrendingUp,
        parameters: {
            industry: 'entertainment',
            timeframe: 'seasonal',
            events: ['awards', 'festivals', 'production'],
            routes: ['LA-NYC', 'LA-Cannes', 'NYC-London', 'LA-Toronto'],
            analysis: ['peak_periods', 'aircraft_preferences', 'lead_times', 'group_travel'],
            predictions: ['demand_spikes', 'pricing', 'positioning']
        }
    },
    {
        id: 'travel-4',
        category: 'travel',
        title: 'Ground Transport',
        prompt: 'Arrange complete ground transportation for tomorrow\'s flights',
        fullPrompt: 'As a JetVision concierge services coordinator, arrange comprehensive ground transportation for tomorrow\'s charter flights. Service requirements: 1) Luxury vehicle selection matching passenger count and preferences, 2) Professional chauffeurs with security clearance and confidentiality agreements, 3) Real-time flight tracking for adjusted pickup times, 4) Multiple pickup/drop-off points if required, 5) Luggage handling and special cargo accommodations. For each flight leg provide: Origin transport: Hotel/residence to FBO timing and route, FBO meet-and-greet with escort to aircraft, Destination transport: Planeside pickup to final destination, Backup vehicles for group splits or changes, and Communication protocols with crew and dispatch. Special considerations: Executive security requirements, Media discretion for high-profile clients, Pet transportation arrangements, Medical equipment or mobility assistance, and International customs and immigration escort. Confirm all arrangements with 24/7 contact numbers.',
        description: 'End-to-end travel coordination including ground',
        icon: IconCalendar,
        parameters: {
            date: 'tomorrow',
            services: ['luxury_vehicles', 'chauffeurs', 'meet_greet', 'luggage'],
            coordination: ['flight_tracking', 'pickup_timing', 'backup_vehicles'],
            special: ['security', 'pets', 'medical', 'vip_handling'],
            confirmation: ['24_7_contact', 'communication_protocol']
        }
    },

    // Lead Generation & Targeting (4 cards)
    {
        id: 'lead-1',
        category: 'leads',
        title: 'PE Assistants',
        prompt: 'Find executive assistants at NYC private equity firms',
        fullPrompt: 'As a JetVision lead generation specialist, use Apollo.io to identify and qualify 20 executive assistants at New York City private equity firms. Search criteria: 1) Private equity firms with $1B+ AUM in Manhattan, 2) Executive assistants supporting Partners, MDs, or C-suite, 3) Tenure of 6+ months for relationship stability, 4) Direct email and LinkedIn profiles available, 5) No recent outreach in past 90 days. Enrichment requirements: Executive they support and their travel frequency, Firm\'s portfolio companies and geographic spread, Current travel management solution if identifiable, Previous engagement with JetVision content, and Social media activity indicating travel coordination. Scoring factors: Firm prestige and deal activity level, International office locations requiring travel, Executive\'s board positions requiring travel, EA\'s seniority and decision-making authority. Export list with personalized email templates based on firm focus and recent deals.',
        description: 'Target high-value segments in private equity',
        icon: IconUsers,
        parameters: {
            location: 'New York City',
            industry: 'private_equity',
            minimumAUM: 1000000000,
            role: 'executive_assistant',
            supporting: ['Partner', 'MD', 'C-suite'],
            count: 20,
            filters: ['tenure_6m+', 'no_recent_outreach', 'email_available']
        }
    },
    {
        id: 'lead-2',
        category: 'leads',
        title: 'Job Changes',
        prompt: 'Track job changes in target accounts last 30 days',
        fullPrompt: 'As a JetVision trigger-based marketing specialist, identify all job changes in our target market over the past 30 days using Apollo.io\'s intent data. Monitor for: 1) New executives joining target companies (VP+ level), 2) Executive assistants changing roles or companies, 3) Travel managers or procurement leads in new positions, 4) Promotions to decision-making roles, 5) Executives moving from commercial to private aviation companies. Prioritization criteria: Moving to companies with existing JetVision relationships, Joining high-growth companies with fresh funding, Taking roles with increased travel requirements, Coming from companies with private aviation experience, and Located in key markets (NYC, SF, LA, Chicago, Dallas). Engagement strategy: Day 1-3: Congratulations and welcome message, Day 7: Introduction to JetVision services, Day 14: Relevant case study or success story, Day 21: Invitation for introductory call. Create segmented campaigns based on role and industry.',
        description: 'Track career transitions for timely outreach',
        icon: IconUsers,
        parameters: {
            timeframe: 'last_30_days',
            changes: ['new_hire', 'promotion', 'role_change'],
            levels: ['VP+', 'executive_assistant', 'travel_manager'],
            prioritization: ['existing_accounts', 'funded_companies', 'key_markets'],
            engagement: { sequence: '21_day', touchpoints: 4 }
        }
    },
    {
        id: 'lead-3',
        category: 'leads',
        title: 'Decision Makers',
        prompt: 'Map decision makers at Fortune 500 companies',
        fullPrompt: 'As a JetVision enterprise account strategist, map the complete decision-making unit for private aviation at Fortune 500 companies. Identify: 1) Economic buyers (CFO, CPO, VP Finance) with budget authority, 2) User buyers (CEO, President, Division heads) who fly frequently, 3) Technical buyers (Travel Manager, Aviation Director) who evaluate services, 4) Influencers (Executive Assistants, Chiefs of Staff) who coordinate travel, 5) Champions (current users of private aviation) who can advocate internally. Organization mapping: Reporting structure and decision hierarchy, Budget approval process and limits, Current travel policy and preferred vendors, Annual travel spend and flight volume estimates, and Sustainability initiatives affecting travel decisions. Account intelligence: Recent leadership changes or reorganizations, Upcoming events requiring executive travel (earnings, conferences, M&A), Competitor service usage and satisfaction levels, and Contract renewal dates with current providers. Build account plans with multi-threaded engagement strategies.',
        description: 'Executive targeting at major corporations',
        icon: IconTarget,
        parameters: {
            companyType: 'fortune_500',
            roles: ['economic_buyer', 'user_buyer', 'technical_buyer', 'influencer', 'champion'],
            mapping: ['hierarchy', 'budget_process', 'travel_policy', 'spend'],
            intelligence: ['leadership_changes', 'events', 'competitors', 'renewals'],
            output: 'account_plan'
        }
    },
    {
        id: 'lead-4',
        category: 'leads',
        title: 'Web Visitors',
        prompt: 'Identify high-intent visitors from pricing page',
        fullPrompt: 'As a JetVision digital intelligence specialist, analyze website visitor data to identify high-intent prospects who visited our pricing page this week. Track and score: 1) Identified visitors from target accounts via reverse IP lookup, 2) Page flow analysis (landing > features > pricing > contact), 3) Time spent on pricing and calculator interactions, 4) Download behavior (pricing guides, comparison sheets), 5) Return visits and progressive engagement depth. Lead scoring model: Pricing page views (20 points), Calculator usage (30 points), Multiple sessions (15 points), Company size match (25 points), and Contact form started (40 points). Enrichment and activation: Match visitors to Apollo.io profiles, Identify company and visitor role when possible, Check for existing CRM records or past engagement, Score intent level (High: 70+, Medium: 40-69, Low: <40), and Trigger automated nurture or sales alerts for high-intent. Provide prioritized list with recommended outreach timing and messaging.',
        description: 'Intent-based lead scoring from web activity',
        icon: IconSearch,
        parameters: {
            page: 'pricing',
            timeframe: 'this_week',
            tracking: ['page_flow', 'time_spent', 'downloads', 'return_visits'],
            scoring: {
                pricing_view: 20,
                calculator: 30,
                multiple_sessions: 15,
                company_match: 25,
                form_started: 40
            },
            enrichment: ['apollo_match', 'crm_check', 'intent_score']
        }
    },

    // Analytics & Insights (4 cards)
    {
        id: 'analytics-1',
        category: 'analytics',
        title: 'Conversion Trends',
        prompt: 'Compare conversion rates with last quarter',
        fullPrompt: 'As a JetVision revenue operations analyst, provide comprehensive conversion rate analysis comparing current quarter to last quarter performance. Analyze conversion funnel: 1) Lead to MQL conversion (marketing qualified), 2) MQL to SQL conversion (sales qualified), 3) SQL to Opportunity conversion, 4) Opportunity to Closed Won rate, 5) Overall lead to customer conversion. Breakdown by source: Apollo.io outbound campaigns, Inbound website leads, Partner and referral channels, Event and webinar leads, and Existing customer expansion. Segment analysis: By industry (Finance, Tech, Healthcare, Entertainment), By deal size (< $50k, $50-150k, > $150k), By aircraft type (Light, Mid, Heavy, Ultra-long), By sales rep and territory, and By lead response time impact. Statistical insights: Identify statistically significant changes, Calculate confidence intervals, Determine seasonal adjustments, and Project end-of-quarter performance. Provide actionable recommendations for improvement with expected impact.',
        description: 'Performance benchmarking across time periods',
        icon: IconChartBar,
        parameters: {
            comparison: 'last_quarter',
            funnel: ['lead_to_mql', 'mql_to_sql', 'sql_to_opp', 'opp_to_won', 'overall'],
            sources: ['apollo', 'inbound', 'partner', 'event', 'expansion'],
            segments: ['industry', 'deal_size', 'aircraft_type', 'rep', 'response_time'],
            analysis: ['significance', 'confidence', 'seasonality', 'projection']
        }
    },
    {
        id: 'analytics-2',
        category: 'analytics',
        title: 'Campaign ROI',
        prompt: 'Calculate ROI by campaign type and industry vertical',
        fullPrompt: 'As a JetVision marketing analytics specialist, calculate detailed ROI analysis for all campaign types across industry verticals. ROI calculation methodology: 1) Total campaign costs (Apollo credits, content creation, sales time), 2) Attributed revenue (first-touch, last-touch, and multi-touch models), 3) Customer lifetime value for new acquisitions, 4) Indirect value (brand awareness, database growth), 5) Time to ROI positive by campaign type. Campaign type analysis: Cold email sequences (Apollo.io), LinkedIn outreach campaigns, Webinar and virtual event programs, Direct mail and gift campaigns, and Paid advertising (if applicable). Industry vertical breakdown: Financial Services (IB, PE, HF, VC), Technology (SaaS, Hardware, Services), Healthcare (Pharma, Biotech, Providers), Entertainment (Studios, Talent, Production), and Manufacturing and Logistics. Advanced metrics: Customer acquisition cost (CAC) by segment, Payback period analysis, LTV:CAC ratio trends, and Revenue velocity by campaign. Optimization recommendations with projected ROI impact.',
        description: 'Revenue attribution analysis by segment',
        icon: IconChartBar,
        parameters: {
            metrics: ['costs', 'revenue', 'ltv', 'indirect_value', 'time_to_roi'],
            campaignTypes: ['email', 'linkedin', 'webinar', 'direct_mail', 'paid'],
            industries: ['financial', 'technology', 'healthcare', 'entertainment', 'manufacturing'],
            attribution: ['first_touch', 'last_touch', 'multi_touch'],
            calculations: ['cac', 'payback', 'ltv_cac', 'velocity']
        }
    },
    {
        id: 'analytics-3',
        category: 'analytics',
        title: 'Message Performance',
        prompt: 'Analyze top performing email templates and messaging',
        fullPrompt: 'As a JetVision content optimization specialist, analyze all message templates to identify top performers and optimization opportunities. Performance metrics: 1) Open rates by subject line variations, 2) Click-through rates by CTA placement and copy, 3) Reply rates by message length and tone, 4) Meeting acceptance rates by value proposition, 5) Unsubscribe rates and spam complaints. Template categories: Initial outreach (cold), Follow-up sequences (2nd, 3rd, 4th touch), Re-engagement campaigns, Event invitations, and Case study shares. A/B test results: Subject line tests (urgency, personalization, questions), Message length (short vs. detailed), Value proposition framing (time, money, safety, prestige), Social proof placement (beginning vs. end), and CTA variations (soft vs. hard ask). Content insights: Power words that drive engagement, Optimal message length by audience, Personalization impact on performance, Best time and day for sends, and Mobile vs. desktop optimization. Provide template optimization roadmap with expected lift.',
        description: 'Content optimization through A/B testing',
        icon: IconMail,
        parameters: {
            metrics: ['open_rate', 'ctr', 'reply_rate', 'meeting_rate', 'unsub_rate'],
            templates: ['cold_outreach', 'follow_up', 're_engagement', 'event', 'case_study'],
            tests: ['subject_line', 'length', 'value_prop', 'social_proof', 'cta'],
            insights: ['power_words', 'personalization', 'timing', 'device_optimization'],
            output: 'optimization_roadmap'
        }
    },
    {
        id: 'analytics-4',
        category: 'analytics',
        title: 'Executive Briefing',
        prompt: 'Generate comprehensive Monday executive briefing',
        fullPrompt: 'As a JetVision business intelligence specialist, generate a comprehensive Monday morning executive briefing with actionable insights. Weekend highlights: 1) New bookings and revenue generated, 2) Critical customer communications or issues, 3) Aircraft availability changes or AOG situations, 4) Competitor movements and market intelligence, 5) Team member updates or urgent items. Week ahead preview: Confirmed flights and operational readiness, High-priority sales opportunities to close, Marketing campaigns launching this week, Customer meetings and presentations scheduled, and Industry events or important dates. Key performance metrics: Week-over-week booking trends, Sales pipeline movement and forecast, Fleet utilization and revenue per hour, Customer satisfaction scores and NPS, and Cash position and collections status. Strategic initiatives update: Progress on quarterly objectives, Blockers requiring executive attention, Resource needs or approvals required, and Competitive threats or opportunities. Action items with owners and deadlines. Format for 5-minute executive review.',
        description: 'Automated reporting and insights summary',
        icon: IconTrendingUp,
        parameters: {
            sections: ['weekend_highlights', 'week_ahead', 'kpis', 'strategic_updates', 'action_items'],
            metrics: ['bookings', 'revenue', 'utilization', 'nps', 'pipeline'],
            timeframe: 'monday_morning',
            format: 'executive_5min',
            delivery: ['email', 'slack', 'dashboard']
        }
    },
];

// Category configurations
const categoryConfig = {
    charter: {
        label: 'Jet Charter Operations',
        icon: IconPlane,
        description: 'Fleet management and aircraft availability',
    },
    apollo: {
        label: 'Apollo Campaign Management', 
        icon: IconRocket,
        description: 'Sales intelligence and email campaigns',
    },
    travel: {
        label: 'Travel Planning & Coordination',
        icon: IconCalendar,
        description: 'Multi-city itineraries and logistics',
    },
    leads: {
        label: 'Lead Generation & Targeting',
        icon: IconUsers,
        description: 'Prospect identification and scoring',
    },
    analytics: {
        label: 'Analytics & Insights',
        icon: IconChartBar,
        description: 'Performance metrics and reporting',
    },
};

interface PromptCardsProps {
    onSelectPrompt: (prompt: string, fullPrompt: string, parameters?: Record<string, any>) => void;
    className?: string;
}

export const PromptCards: React.FC<PromptCardsProps> = ({ onSelectPrompt, className }) => {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.02
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    // Group cards by category
    const groupedCards = promptCards.reduce((acc, card) => {
        if (!acc[card.category]) {
            acc[card.category] = [];
        }
        acc[card.category].push(card);
        return acc;
    }, {} as Record<string, typeof promptCards>);

    return (
        <motion.div 
            className={cn("w-full", className)}
            variants={container}
            initial="hidden"
            animate="show"
        >
            {/* Category Sections */}
            <div className="space-y-8">
                {Object.entries(groupedCards).map(([category, cards]) => {
                    const config = categoryConfig[category as keyof typeof categoryConfig];
                    return (
                        <div key={category} className="space-y-4">
                            {/* Category Header */}
                            <div className="border-b border-gray-200 dark:border-gray-800 pb-3">
                                <div className="flex items-center gap-3">
                                    <config.icon size={20} className="text-gray-600 dark:text-gray-400" />
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {config.label}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-500">
                                            {config.description}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Cards Grid */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {cards.map((card) => (
                                    <motion.div
                                        key={card.id}
                                        variants={item}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <button
                                            onClick={() => {
                                                onSelectPrompt(card.fullPrompt, card.fullPrompt, card.parameters);
                                                // Trigger smooth scroll to chat input after prompt selection
                                                scrollToChatInputWithFocus(100);
                                            }}
                                            className={cn(
                                                "group relative w-full rounded-lg p-4 text-left transition-all",
                                                "bg-white dark:bg-gray-900",
                                                "border border-gray-200 dark:border-gray-800",
                                                "shadow-md hover:shadow-lg",
                                                "hover:border-gray-300 dark:hover:border-gray-700",
                                                "focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                                            )}
                                        >
                                            <div className="flex h-full flex-col gap-2">
                                                {/* Icon */}
                                                <div className="mb-1">
                                                    <card.icon 
                                                        size={20} 
                                                        className="text-gray-600 dark:text-gray-400" 
                                                    />
                                                </div>
                                                
                                                {/* Title */}
                                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                                                    {card.title}
                                                </h4>
                                                
                                                {/* Prompt preview - max 3 lines */}
                                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                                                    {card.prompt}
                                                </p>
                                            </div>
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};