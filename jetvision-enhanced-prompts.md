# JetVision Enhanced Stakeholder Prompts

*"This is your last chance. After this, there is no going back."*

## Quick Access Prompt Badges

### 🛩️ Jet Charter
- "Which aircraft are available for tomorrow's Miami to New York flight?"
- "Show me empty leg opportunities for this weekend"
- "What's our fleet utilization rate this month?"
- "Find me a heavy jet for 12 passengers to London next Tuesday"

### 🚀 Apollo Campaigns
- "How many prospects converted to bookings this week?"
- "Which executive assistants opened our emails the most?"
- "Show me response rates for my finance industry campaigns"
- "Create a VIP campaign for our hottest prospects"

### ✈️ Travel Planning
- "Plan a multi-city roadshow for our tech executive client"
- "What are the best routes for avoiding weather delays this week?"
- "Show me seasonal travel patterns for entertainment industry"
- "Coordinate ground transportation for tomorrow's charter"

### 👥 Lead Generation
- "Find 20 executive assistants at NYC private equity firms"
- "Who changed jobs in our target market last 30 days?"
- "Identify decision makers at Fortune 500 companies"
- "Which prospects visited our pricing page this week?"

### 📊 Analytics
- "What's our conversion rate compared to last quarter?"
- "Show me ROI by campaign type and industry"
- "Which message templates get the best response rates?"
- "Generate my Monday morning executive briefing"

## Stakeholder-Specific Quick Prompts

### Executive Dashboard
- **"What's our weekly revenue pipeline looking like?"** - Executive revenue forecast
- **"How are we performing against quarterly targets?"** - KPI performance tracking
- **"Show me our top opportunities this week"** - High-value deal pipeline
- **"What's our market share vs competitors?"** - Competitive positioning analysis

### Sales Team Prompts
- **"Who are my hottest leads to call today?"** - Daily priority contact list
- **"Which accounts need follow-up this week?"** - Follow-up task management
- **"Show me prospects ready to book"** - High-intent prospect identification
- **"What objections are we hearing most?"** - Sales obstacle analysis

### Operations Team Prompts
- **"What's our aircraft availability next week?"** - Fleet scheduling overview
- **"Any maintenance issues affecting bookings?"** - Operational constraint tracking
- **"Show me crew scheduling for upcoming flights"** - Resource allocation status
- **"Which routes have the highest demand?"** - Route optimization analysis

### Marketing Team Prompts
- **"Launch campaign for summer travel season"** - Seasonal campaign deployment
- **"Which content is driving most engagement?"** - Content performance metrics
- **"Set up nurture sequence for new leads"** - Marketing automation setup
- **"Show me this month's lead generation stats"** - Marketing funnel analytics

### Emergency Response Prompts
- **"Send emergency travel offers to hurricane-affected areas"** - Crisis response activation
- **"Find available jets for medical emergency transport"** - Urgent charter sourcing
- **"Alert clients about airport closure alternatives"** - Travel disruption management
- **"Deploy weather contingency communications"** - Emergency notification system

## Industry-Specific Quick Queries

### Finance & Private Equity
- **"Show me all PE partners traveling next month"** - Industry travel planning
- **"Which investment firms are expanding?"** - Growth opportunity identification
- **"Find decision makers at hedge funds over $1B AUM"** - High-value targeting
- **"Track deal roadshow travel patterns"** - Industry behavior analysis

### Technology & Startups
- **"Identify funded startups needing charter services"** - New market opportunities
- **"Which tech executives travel most frequently?"** - High-frequency user targeting
- **"Show me Silicon Valley to NYC travel demand"** - Route demand analysis
- **"Find CTOs attending upcoming conferences"** - Event-based targeting

### Entertainment & Media
- **"Which production companies have active projects?"** - Industry activity monitoring
- **"Show me film festival travel demand forecasts"** - Event planning support
- **"Find talent agencies needing group charters"** - Bulk booking opportunities
- **"Track award season travel patterns"** - Seasonal demand planning

### Real Estate & Development
- **"Identify developers with multiple projects"** - Multi-site travel needs
- **"Show me site visit charter requests"** - Industry-specific demand
- **"Which REITs have expanding portfolios?"** - Growth market identification
- **"Track property tour travel patterns"** - Client behavior analysis

## Time-Sensitive Action Prompts

### Daily Operations
- **"What's my priority action list for today?"** - Daily task prioritization
- **"Show me leads that need immediate follow-up"** - Urgent response queue
- **"Which proposals expire today?"** - Deal closure urgency
- **"Alert me to any operational issues"** - Real-time problem detection

### Weekly Planning
- **"Generate my weekly performance report"** - Weekly analytics summary
- **"What campaigns should we launch this week?"** - Campaign calendar planning
- **"Show me next week's booking forecast"** - Revenue projection
- **"Which accounts need executive attention?"** - Escalation management

### Monthly Strategy
- **"How did we perform against monthly goals?"** - Monthly performance review
- **"What's our competitor activity this month?"** - Competitive intelligence
- **"Show me market trends and opportunities"** - Strategic planning inputs
- **"Generate board presentation metrics"** - Executive reporting

## 1. Performance Analytics & Benchmarking

### 1.1 Weekly Conversion Analysis
**Original**: "How many conversions did we get this week?"

**Enhanced Prompt Structure**:
```
Analyze JetVision's weekly conversion performance by querying Apollo.io campaign data from [start_date] to [end_date].

DATA SOURCES: Apollo.io (track-engagement, get-account-data)
PARAMETERS:
- Time range: Last 7 days from current date
- Conversion types: Email replies, meeting bookings, charter inquiries
- Lead sources: All active campaigns
- Industry filters: Private equity, technology, finance, real estate

OUTPUT FORMAT:
- Executive summary with key metrics
- Conversion breakdown by lead source and campaign
- Week-over-week comparison with percentage changes
- Industry-specific performance analysis
- Actionable recommendations for optimization

BUSINESS CONTEXT: Critical for weekly sales reviews and resource allocation decisions
URGENCY: High - Required for Monday morning executive briefings
```

**N8N Workflow Integration**:
```json
{
  "webhook_payload": {
    "prompt": "How many conversions did we get this week?",
    "context": {
      "category": "performance_analytics",
      "urgency": "high",
      "audience": "executives",
      "time_range": "last_7_days"
    },
    "mcp_sequence": [
      {
        "tool": "track-engagement",
        "server": "apollo-io",
        "parameters": {
          "sequenceId": "all_active",
          "startDate": "{{$now.minus(7, 'days').format('YYYY-MM-DD')}}",
          "endDate": "{{$now.format('YYYY-MM-DD')}}"
        },
        "output_mapping": "engagement_metrics"
      },
      {
        "tool": "get-account-data",
        "server": "apollo-io",
        "parameters": {
          "domain": "{{engagement_metrics.top_domains}}",
          "includeContacts": false
        },
        "output_mapping": "account_context"
      }
    ],
    "response_format": {
      "executive_summary": true,
      "charts": ["conversion_trends", "source_breakdown"],
      "recommendations": true,
      "next_actions": true
    }
  }
}
```

**Data Flow Mapping**:
1. **Input Processing**: Parse natural language → Extract time parameters → Validate date ranges
2. **MCP Tool Sequence**:
   - `track-engagement` → Retrieve weekly metrics for all active sequences
   - `get-account-data` → Enrich top-performing domains with company context
3. **Response Processing**: Aggregate metrics → Calculate week-over-week changes → Generate executive summary
4. **Output Formatting**: Create dashboard-ready JSON + Executive briefing text

**Error Handling**:
- Rate limit exceeded: Queue request with exponential backoff
- Missing data: Use previous week's data with disclaimer
- API timeout: Return partial results with status indicator

**MCP Tools**: `track-engagement`, `get-account-data`
**Business Value**: Enables data-driven sales strategy adjustments and resource optimization
**Success Metrics**: Conversion rate trends, lead quality scores, campaign ROI
**Natural Language Variations**:
- "What were our conversion numbers this week?"
- "Show me this week's booking performance"
- "How many leads converted to prospects this week?"

### 1.2 Industry Campaign Response Analysis
**Original**: "Show me response rates for my finance industry campaigns"

**Enhanced Prompt Structure**:
```
Generate comprehensive response rate analysis for JetVision's financial services industry campaigns.

DATA SOURCES: Apollo.io (track-engagement, search-leads)
PARAMETERS:
- Industry filter: Financial services, private equity, investment banking, wealth management
- Metrics: Open rates, response rates, click-through rates, meeting bookings
- Time range: Last 30 days with historical comparison
- Segmentation: By job title (EA, CFO, Managing Director), company size, geography

OUTPUT FORMAT:
- Industry benchmark comparison dashboard
- Response rate trends with statistical significance
- Top-performing message templates and subject lines
- Underperforming segments with improvement recommendations
- Competitive positioning analysis

BUSINESS CONTEXT: Essential for industry-specific strategy refinement and budget allocation
URGENCY: Medium - Monthly strategy review requirement
```

**N8N Workflow Integration**:
```json
{
  "webhook_payload": {
    "prompt": "Show me response rates for my finance industry campaigns",
    "context": {
      "category": "performance_analytics",
      "industry_focus": "financial_services",
      "urgency": "medium",
      "audience": "sales_marketing"
    },
    "mcp_sequence": [
      {
        "tool": "search-leads",
        "server": "apollo-io",
        "parameters": {
          "industry": "Financial Services,Private Equity,Investment Banking",
          "jobTitle": "Executive Assistant,CFO,Managing Director",
          "limit": 100
        },
        "output_mapping": "finance_prospects"
      },
      {
        "tool": "track-engagement",
        "server": "apollo-io",
        "parameters": {
          "sequenceId": "finance_campaigns",
          "startDate": "{{$now.minus(30, 'days').format('YYYY-MM-DD')}}",
          "endDate": "{{$now.format('YYYY-MM-DD')}}"
        },
        "output_mapping": "engagement_data"
      },
      {
        "tool": "get-account-data",
        "server": "apollo-io",
        "parameters": {
          "domain": "{{finance_prospects.top_companies}}",
          "includeContacts": true
        },
        "output_mapping": "company_intelligence"
      }
    ],
    "response_format": {
      "industry_benchmarks": true,
      "trend_analysis": true,
      "segmentation_breakdown": true,
      "optimization_recommendations": true
    }
  }
}
```

**Data Flow Mapping**:
1. **Industry Filtering**: Extract industry keywords → Map to Apollo.io industry codes → Validate segments
2. **Multi-Tool Orchestration**:
   - `search-leads` → Identify finance industry prospects and companies
   - `track-engagement` → Retrieve campaign performance metrics
   - `get-account-data` → Enrich with company context and decision-maker insights
3. **Analytics Processing**: Calculate response rates by segment → Compare to benchmarks → Identify trends
4. **Strategic Output**: Generate actionable recommendations → Format for monthly reviews

**Error Handling**:
- Industry filter mismatch: Expand search criteria with related industries
- Insufficient data: Extend time range with notification
- Tool sequence failure: Continue with available data, flag missing components

**MCP Tools**: `track-engagement`, `search-leads`, `get-account-data`
**Business Value**: Optimizes industry-specific messaging and improves campaign ROI
**Success Metrics**: Response rate improvement, industry penetration, message effectiveness
**Natural Language Variations**:
- "How are our finance campaigns performing?"
- "What's the response rate for financial services outreach?"
- "Show me engagement metrics for banking prospects"

### 1.3 Executive Assistant Engagement Ranking
**Original**: "Which executive assistants opened our emails the most?"

**Enhanced Prompt Structure**:
```
Identify and rank top-engaging executive assistants based on email interaction patterns and behavioral signals.

DATA SOURCES: Apollo.io (search-leads, track-engagement, enrich-contact)
PARAMETERS:
- Job titles: Executive Assistant, Chief of Staff, Office Manager, Travel Coordinator
- Engagement metrics: Email opens, clicks, time spent reading, forward actions
- Behavioral scoring: Website visits, content downloads, social media interactions
- Time range: Last 90 days for comprehensive pattern analysis

OUTPUT FORMAT:
- Ranked list of top 50 engaged EAs with engagement scores
- Behavioral pattern analysis and next best actions
- Company context and decision-maker influence mapping
- Personalized outreach recommendations
- Priority contact scheduling suggestions

BUSINESS CONTEXT: EAs are key gatekeepers to C-suite decision makers
URGENCY: High - Immediate follow-up opportunities
```

**MCP Tools**: `search-leads`, `track-engagement`, `enrich-contact`
**Business Value**: Maximizes conversion through strategic EA relationship building
**Success Metrics**: EA response rates, C-suite meeting bookings, referral generation
**Natural Language Variations**:
- "Who are our most engaged executive assistants?"
- "Show me EAs with highest email engagement"
- "Which assistants are opening our messages most?"

## 2. Campaign Management & Launch

### 2.1 Premium Lead Campaign Launch
**Original**: "Kick off a campaign for my best leads with a promo"

**Enhanced Prompt Structure**:
```
Launch targeted promotional campaign for JetVision's highest-scoring prospects with personalized luxury travel offers.

DATA SOURCES: Apollo.io (search-leads, create-email-sequence, get-account-data)
PARAMETERS:
- Lead scoring: Top 10% based on engagement, company size, industry fit
- Promotional offer: Empty leg discounts, membership trial, concierge services
- Personalization: Company news, travel patterns, industry events
- Timing: Optimal send times based on prospect behavior analysis

CAMPAIGN ELEMENTS:
- Subject line A/B testing with luxury positioning
- Personalized video messages for top 20 prospects
- Multi-touch sequence: Email → LinkedIn → Phone → Email follow-up
- Exclusive offer with urgency and scarcity elements

OUTPUT FORMAT:
- Campaign launch confirmation with target metrics
- Prospect list with personalization variables
- Performance tracking dashboard setup
- Expected ROI and conversion projections

BUSINESS CONTEXT: High-value prospect conversion critical for revenue targets
URGENCY: High - Time-sensitive promotional offers
```

**MCP Tools**: `search-leads`, `create-email-sequence`, `get-account-data`
**Business Value**: Maximizes conversion of highest-potential prospects
**Success Metrics**: Campaign response rates, booking conversions, revenue attribution
**Natural Language Variations**:
- "Start a campaign for our hottest prospects"
- "Launch promotional outreach to top leads"
- "Create a VIP campaign for best prospects"

### 2.2 Geographic Holiday Campaign
**Original**: "Start a holiday travel campaign for all tech executives in California"

**Enhanced Prompt Structure**:
```
Deploy geo-targeted holiday travel campaign for California technology executives with seasonal messaging and regional relevance.

DATA SOURCES: Apollo.io (search-leads, create-email-sequence)
PARAMETERS:
- Geographic filter: California (San Francisco, Los Angeles, San Diego, Silicon Valley)
- Industry: Technology, software, startups, venture capital
- Job titles: CEO, CTO, VP Engineering, Founder, Managing Partner
- Company size: 50+ employees or $10M+ funding
- Seasonal context: Holiday travel patterns, year-end business travel

CAMPAIGN STRATEGY:
- Holiday-themed messaging with luxury positioning
- Regional airport preferences (SFO, LAX, SAN, SJC)
- Tech industry pain points: Time efficiency, privacy, productivity
- Seasonal offers: Holiday packages, year-end travel credits

OUTPUT FORMAT:
- Campaign deployment confirmation
- Target audience breakdown by city and company
- Message personalization matrix
- Performance benchmarks and success metrics

BUSINESS CONTEXT: Seasonal campaigns capitalize on increased travel demand
URGENCY: Medium - Holiday booking window optimization
```

**MCP Tools**: `search-leads`, `create-email-sequence`
**Business Value**: Captures seasonal demand with targeted regional messaging
**Success Metrics**: Geographic penetration, seasonal booking lift, campaign ROI
**Natural Language Variations**:
- "Create holiday campaign for California tech leaders"
- "Launch seasonal outreach to West Coast executives"
- "Start year-end travel campaign for Silicon Valley"

## 3. Lead Discovery & Research

### 3.1 Private Equity Executive Assistant Discovery
**Original**: "Find me 20 new executive assistants at private equity firms in NYC"

**Enhanced Prompt Structure**:
```
Identify and qualify 20 high-potential executive assistants at New York City private equity firms with comprehensive prospect intelligence.

DATA SOURCES: Apollo.io (search-leads, enrich-contact, get-account-data)
SEARCH CRITERIA:
- Location: New York City metropolitan area
- Industry: Private equity, venture capital, investment management
- Job titles: Executive Assistant, Chief of Staff, Office Manager, Travel Coordinator
- Company criteria: $100M+ AUM, 10+ employees, established firms
- Qualification filters: Travel budget authority, C-suite access, decision influence

ENRICHMENT REQUIREMENTS:
- Contact verification and data accuracy scoring
- Company intelligence: Recent deals, portfolio companies, travel patterns
- Decision-maker mapping: Which executives they support
- Travel behavior analysis: Frequency, destinations, preferences
- Competitive intelligence: Current service providers

OUTPUT FORMAT:
- Prioritized prospect list with engagement scoring
- Company context and recent news integration
- Personalized outreach recommendations
- Contact verification status and confidence scores
- Next best action recommendations

BUSINESS CONTEXT: PE firms are high-value targets with significant travel budgets
URGENCY: Medium - Pipeline development for quarterly targets
```

**MCP Tools**: `search-leads`, `enrich-contact`, `get-account-data`
**Business Value**: Builds qualified pipeline in high-value market segment
**Success Metrics**: Contact accuracy, response rates, meeting bookings
**Natural Language Variations**:
- "Find executive assistants at NYC private equity firms"
- "Search for EAs at New York investment firms"
- "Identify travel coordinators at Manhattan PE companies"

### 3.2 Job Change Opportunity Monitoring
**Original**: "Show me leads who changed jobs in the last 30 days"

**Enhanced Prompt Structure**:
```
Monitor and analyze recent job changes among target prospects to identify high-opportunity outreach windows.

DATA SOURCES: Apollo.io (search-leads, enrich-contact, track-engagement)
MONITORING PARAMETERS:
- Time range: Last 30 days with daily updates
- Target roles: C-suite, executive assistants, travel coordinators
- Industry focus: Finance, technology, real estate, entertainment
- Change types: New hires, promotions, company transitions
- Opportunity scoring: New role travel requirements, company growth stage

ANALYSIS FRAMEWORK:
- Previous engagement history and relationship status
- New company travel patterns and budget analysis
- Optimal outreach timing based on role transition phase
- Personalized messaging based on career progression
- Competitive landscape at new company

OUTPUT FORMAT:
- Daily job change alerts with opportunity scoring
- Prioritized outreach list with timing recommendations
- Personalized message templates for each transition type
- Historical success rates for similar transitions
- Follow-up sequence automation setup

BUSINESS CONTEXT: Job changes create 3x higher response rates within first 90 days
URGENCY: High - Time-sensitive opportunity windows
```

**MCP Tools**: `search-leads`, `enrich-contact`, `track-engagement`
**Business Value**: Capitalizes on high-conversion opportunity windows
**Success Metrics**: Job change detection accuracy, outreach timing optimization, conversion lift
**Natural Language Variations**:
- "Who changed jobs recently in our target market?"
- "Show me new hires at target companies"
- "Find prospects with recent role changes"

## 4. Market Intelligence

### 4.1 Competitive Hiring Intelligence
**Original**: "Alert me when competitors hire new sales people"

**Enhanced Prompt Structure**:
```
Monitor competitor sales team expansion to identify market opportunities and competitive threats.

DATA SOURCES: Apollo.io (search-leads, get-account-data, track-engagement)
MONITORING SCOPE:
- Competitor list: NetJets, Flexjet, VistaJet, Sentient Jet, XO
- Role monitoring: Sales executives, business development, account managers
- Geographic focus: Key markets (NYC, LA, Miami, Chicago, Dallas)
- Hiring patterns: Team expansion, territory assignments, specialization areas

INTELLIGENCE GATHERING:
- New hire background analysis and previous company relationships
- Territory expansion signals and market entry strategies
- Competitive positioning and messaging analysis
- Client poaching risk assessment
- Market share implications

OUTPUT FORMAT:
- Real-time hiring alerts with competitive impact assessment
- Quarterly competitive landscape reports
- Territory overlap analysis and defensive strategies
- Opportunity identification for displaced prospects
- Strategic response recommendations

BUSINESS CONTEXT: Competitive intelligence drives defensive and offensive strategies
URGENCY: High - Immediate competitive response required
```

**MCP Tools**: `search-leads`, `get-account-data`, `track-engagement`
**Business Value**: Enables proactive competitive positioning and market defense
**Success Metrics**: Competitive threat identification, market share protection, opportunity capture
**Natural Language Variations**:
- "Monitor competitor sales team changes"
- "Track when rivals hire new salespeople"
- "Alert me to competitive hiring activity"

## 5. Real-Time Operations

### 5.1 Emergency Travel Campaign
**Original**: "Send emergency travel offers to prospects in [Hurricane/Weather Event Location]"

**Enhanced Prompt Structure**:
```
Deploy immediate emergency travel assistance campaign for prospects affected by weather events or crisis situations.

DATA SOURCES: Apollo.io (search-leads, create-email-sequence) + Avainode (search-aircraft)
EMERGENCY PARAMETERS:
- Geographic targeting: Affected areas with 50-mile radius
- Prospect prioritization: Existing clients, high-value prospects, VIP contacts
- Aircraft availability: Emergency charter capacity within 2-hour response
- Pricing strategy: Competitive emergency rates with flexible terms

CAMPAIGN ELEMENTS:
- Immediate availability confirmation
- 24/7 emergency contact information
- Flexible booking and payment terms
- Safety and reliability messaging
- Empathetic communication tone

INTEGRATION REQUIREMENTS:
- Real-time aircraft availability from Avainode
- Emergency contact routing to operations team
- Automated follow-up for non-responders
- Crisis communication protocols

OUTPUT FORMAT:
- Campaign deployment confirmation within 30 minutes
- Available aircraft inventory with pricing
- Prospect contact status and response tracking
- Emergency booking pipeline management
- Post-crisis follow-up sequence activation

BUSINESS CONTEXT: Emergency situations create urgent travel needs and brand loyalty opportunities
URGENCY: Critical - Immediate response required
```

**N8N Workflow Integration**:
```json
{
  "webhook_payload": {
    "prompt": "Send emergency travel offers to prospects in Miami due to Hurricane",
    "context": {
      "category": "real_time_operations",
      "emergency_type": "weather_event",
      "location": "Miami, FL",
      "urgency": "critical",
      "response_time_sla": "30_minutes"
    },
    "mcp_sequence": [
      {
        "tool": "search-leads",
        "server": "apollo-io",
        "parameters": {
          "location": "Miami,Fort Lauderdale,West Palm Beach",
          "jobTitle": "Executive Assistant,CEO,CFO,Travel Coordinator",
          "limit": 200
        },
        "priority": "high_value_clients",
        "output_mapping": "emergency_prospects"
      },
      {
        "tool": "search-aircraft",
        "server": "avainode",
        "parameters": {
          "departureAirport": "KMIA,KFLL,KPBI",
          "arrivalAirport": "KJFK,KLAX,KORD",
          "departureDate": "{{$now.format('YYYY-MM-DD')}}",
          "passengers": 8,
          "aircraftCategory": "Heavy Jet,Super Midsize Jet"
        },
        "output_mapping": "available_aircraft"
      },
      {
        "tool": "get-pricing",
        "server": "avainode",
        "parameters": {
          "aircraftId": "{{available_aircraft.top_3_ids}}",
          "departureAirport": "KMIA",
          "arrivalAirport": "KJFK",
          "departureDate": "{{$now.format('YYYY-MM-DD')}}",
          "passengers": 8,
          "includeAllFees": true
        },
        "output_mapping": "emergency_pricing"
      },
      {
        "tool": "create-email-sequence",
        "server": "apollo-io",
        "parameters": {
          "name": "Emergency Travel - Hurricane Miami {{$now.format('YYYY-MM-DD')}}",
          "contacts": "{{emergency_prospects.emails}}",
          "templateIds": ["emergency_travel_template"],
          "delayDays": [0]
        },
        "output_mapping": "campaign_deployment"
      }
    ],
    "response_format": {
      "deployment_status": true,
      "aircraft_inventory": true,
      "pricing_summary": true,
      "contact_tracking": true,
      "emergency_hotline": "+1-800-JET-HELP"
    }
  }
}
```

**Data Flow Mapping**:
1. **Emergency Detection**: Parse location/event → Validate geographic scope → Set urgency flags
2. **Multi-Platform Orchestration**:
   - `search-leads` (Apollo) → Identify prospects in affected areas
   - `search-aircraft` (Avainode) → Find available emergency charter capacity
   - `get-pricing` (Avainode) → Generate competitive emergency rates
   - `create-email-sequence` (Apollo) → Deploy immediate outreach campaign
3. **Real-Time Processing**: Parallel tool execution → Aggregate results → Deploy within SLA
4. **Crisis Communication**: Format empathetic messaging → Include availability/pricing → Activate emergency protocols

**Error Handling**:
- Aircraft unavailable: Expand search radius, alert operations team
- Prospect data incomplete: Use partial data with manual follow-up flag
- Campaign deployment failure: Switch to manual outreach, notify sales team
- Pricing API timeout: Use standard emergency rates with approval workflow

**MCP Tools**: `search-leads`, `create-email-sequence`, `search-aircraft`, `get-pricing`
**Business Value**: Captures emergency travel demand while building brand loyalty
**Success Metrics**: Response time, booking conversion, client satisfaction, brand perception
**Natural Language Variations**:
- "Launch emergency travel campaign for storm-affected areas"
- "Send crisis travel assistance to impacted prospects"
- "Deploy weather emergency outreach campaign"

## 6. Workflow Automation

### 6.1 Hot Lead Auto-Prioritization
**Original**: "Automatically add hot leads to my priority sequence"

**Enhanced Prompt Structure**:
```
Implement intelligent lead scoring automation that identifies and routes high-potential prospects to priority engagement sequences.

DATA SOURCES: Apollo.io (search-leads, create-email-sequence, track-engagement)
SCORING CRITERIA:
- Engagement signals: Email opens, website visits, content downloads
- Company fit: Industry, size, funding status, growth indicators
- Behavioral patterns: Response timing, interaction frequency, referral sources
- Intent signals: Pricing page visits, competitor research, travel booking patterns

AUTOMATION RULES:
- Score threshold: 85+ for immediate priority routing
- Sequence assignment: VIP outreach with personalized messaging
- Alert triggers: Real-time notifications to sales team
- Follow-up cadence: Accelerated touchpoint schedule

OUTPUT FORMAT:
- Automation rule confirmation and testing results
- Lead scoring model performance metrics
- Priority sequence enrollment tracking
- ROI impact measurement and optimization recommendations

BUSINESS CONTEXT: Automated prioritization ensures no high-value opportunities are missed
URGENCY: Medium - Systematic efficiency improvement
```

**MCP Tools**: `search-leads`, `create-email-sequence`, `track-engagement`
**Business Value**: Maximizes sales team efficiency and conversion rates
**Success Metrics**: Lead scoring accuracy, priority sequence performance, sales velocity
**Natural Language Variations**:
- "Auto-route hot prospects to priority campaigns"
- "Set up automatic lead prioritization"
- "Create smart lead scoring automation"

## 7. Reporting & Insights

### 7.1 Seasonal Demand Analysis
**Original**: "Show me seasonal trends in private jet demand by industry"

**Enhanced Prompt Structure**:
```
Analyze historical booking patterns and engagement data to identify seasonal travel demand trends across target industries.

DATA SOURCES: Apollo.io (get-account-data, track-engagement) + Avainode (search-aircraft historical data)
ANALYSIS PARAMETERS:
- Time range: 3-year historical data with monthly granularity
- Industry segmentation: Finance, technology, entertainment, real estate, healthcare
- Seasonal factors: Holidays, conference seasons, earnings periods, vacation patterns
- Geographic variations: Regional travel preferences and seasonal differences

TREND ANALYSIS:
- Peak demand periods by industry and geography
- Booking lead times and planning patterns
- Price sensitivity variations by season
- Aircraft type preferences by travel purpose
- Competitive landscape changes throughout the year

OUTPUT FORMAT:
- Interactive seasonal demand dashboard
- Industry-specific trend reports with forecasting
- Optimal campaign timing recommendations
- Resource allocation guidance for operations
- Strategic planning insights for annual budgeting

BUSINESS CONTEXT: Seasonal planning drives resource allocation and marketing strategy
URGENCY: Low - Strategic planning and annual review cycles
```

**MCP Tools**: `get-account-data`, `track-engagement`, `search-aircraft`
**Business Value**: Enables data-driven seasonal strategy and resource optimization
**Success Metrics**: Forecast accuracy, seasonal campaign performance, resource utilization
**Natural Language Variations**:
- "Analyze seasonal travel patterns by industry"
- "Show me yearly demand trends"
- "What are the seasonal booking patterns?"

### 7.2 Message Performance Optimization
**Original**: "Which message subject lines get the best open rates?"

**Enhanced Prompt Structure**:
```
Conduct comprehensive analysis of email subject line performance to optimize future campaign messaging.

DATA SOURCES: Apollo.io (track-engagement, create-email-sequence)
ANALYSIS SCOPE:
- Time range: Last 12 months for statistical significance
- Message types: Cold outreach, follow-ups, promotional, event-based
- Audience segmentation: By industry, job title, company size, geography
- Performance metrics: Open rates, response rates, click-through rates, conversion rates

OPTIMIZATION FRAMEWORK:
- A/B testing results and statistical significance
- Subject line length and structure analysis
- Personalization impact measurement
- Industry-specific messaging effectiveness
- Seasonal and timing variations

OUTPUT FORMAT:
- Subject line performance leaderboard
- Best practice guidelines and templates
- Industry-specific messaging recommendations
- A/B testing framework for future campaigns
- Automated subject line optimization suggestions

BUSINESS CONTEXT: Message optimization directly impacts campaign ROI and engagement
URGENCY: Medium - Ongoing campaign improvement
```

**MCP Tools**: `track-engagement`, `create-email-sequence`
**Business Value**: Improves campaign performance through data-driven messaging
**Success Metrics**: Open rate improvement, response rate optimization, conversion lift
**Natural Language Variations**:
- "What subject lines perform best?"
- "Show me top-performing email messages"
- "Analyze message effectiveness data"

## 8. Integration Commands

### 8.1 CRM Lead Synchronization
**Original**: "Sync qualified leads to JetVision CRM and assign to sales team"

**Enhanced Prompt Structure**:
```
Orchestrate seamless lead handoff from marketing automation to sales CRM with intelligent assignment and prioritization.

DATA SOURCES: Apollo.io (search-leads, get-account-data) + JetVision CRM Integration
SYNCHRONIZATION CRITERIA:
- Lead qualification: Engagement score 70+, company fit, budget authority
- Data enrichment: Complete contact information, company intelligence, interaction history
- Assignment logic: Territory, expertise, workload balancing, relationship history
- Priority scoring: Revenue potential, timeline urgency, competitive factors

HANDOFF PROCESS:
- Real-time data validation and cleansing
- Automated lead scoring and prioritization
- Sales team notification with context and recommendations
- Follow-up task creation and timeline establishment
- Performance tracking and feedback loop

OUTPUT FORMAT:
- Synchronization status report with success/failure details
- Lead assignment confirmation and sales team notifications
- Data quality metrics and enrichment success rates
- Handoff performance analytics and optimization recommendations
- Integration health monitoring and error resolution

BUSINESS CONTEXT: Smooth marketing-to-sales handoff critical for conversion optimization
URGENCY: High - Real-time lead processing required
```

**MCP Tools**: `search-leads`, `get-account-data`, `enrich-contact`
**Business Value**: Eliminates lead leakage and optimizes sales team efficiency
**Success Metrics**: Handoff success rate, sales acceptance rate, conversion velocity
**Natural Language Variations**:
- "Transfer qualified leads to sales CRM"
- "Sync marketing leads with sales system"
- "Hand off prospects to sales team"

## Summary: Technical Integration Matrix

| Category | Primary MCP Tools | Data Sources | Output Format | Business Impact |
|----------|------------------|--------------|---------------|-----------------|
| Performance Analytics | track-engagement, get-account-data | Apollo.io | Executive dashboards | Revenue optimization |
| Campaign Management | create-email-sequence, search-leads | Apollo.io | Campaign metrics | Lead generation |
| Lead Discovery | search-leads, enrich-contact | Apollo.io | Prospect lists | Pipeline growth |
| Market Intelligence | get-account-data, track-engagement | Apollo.io | Competitive reports | Strategic advantage |
| Real-Time Operations | search-aircraft, get-pricing | Apollo.io + Avainode | Operational alerts | Customer satisfaction |
| Workflow Automation | create-email-sequence, track-engagement | Apollo.io | Automation rules | Efficiency gains |
| Reporting & Insights | track-engagement, get-account-data | Apollo.io + Historical | Trend analysis | Strategic planning |
| Integration Commands | search-leads, enrich-contact | Apollo.io + CRM | Sync reports | Process optimization |

---

*"Choice is an illusion created between those with power and those without. The power lies in the precision of your prompts and the depth of your business understanding."*
