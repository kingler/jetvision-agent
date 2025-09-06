# Apollo.io Lead Generation Automation

A comprehensive lead generation automation system that interfaces with Apollo.io through the Apollo MCP server to systematically generate qualified prospect lists.

## 🚀 Features

### Core Lead Generation

- **Systematic Search Variations**: Automatically tests multiple combinations of job titles, locations, company sizes, and industries
- **Smart Deduplication**: Eliminates duplicate leads across multiple searches
- **Rate Limiting**: Respects Apollo.io API limits with configurable delays
- **Export Formats**: Outputs leads in both CSV and JSON formats
- **Performance Analytics**: Detailed reporting on search effectiveness

### Advanced Capabilities

- **Apollo MCP Integration**: Direct integration with the Apollo MCP server
- **Bulk Enrichment**: Enhances lead data with additional contact information
- **Account-Based Targeting**: Discovers contacts at specific target companies
- **Email Sequence Creation**: Automatically creates follow-up email campaigns
- **Real-time Monitoring**: Live progress tracking and health checks

## 📋 Search Parameter Analysis

The automation script analyzes this Apollo.io search URL:

```
https://app.apollo.io/#/people?sortAscending=false&sortByField=recommendations_score&contactEmailStatusV2[]=verified&personTitles[]=executive%20assistant&includeSimilarTitles=false&personNotTitles[]=teacher&personLocations[]=Los%20Angeles,%20California&organizationNumEmployeesRanges[]=101,200&organizationNumEmployeesRanges[]=501,1000&organizationNumEmployeesRanges[]=201,500&organizationIndustryTagIds[]=5567cd4773696439b10b0000&page=1
```

### Extracted Parameters:

- **Job Title**: "executive assistant"
- **Location**: "Los Angeles, California"
- **Company Sizes**: 101-200, 201-500, 501-1000 employees
- **Industry ID**: 5567cd4773696439b10b0000
- **Email Status**: Verified only
- **Exclusions**: teachers

### Search Variations Generated:

- **10 Job Titles**: executive assistant, office manager, administrative coordinator, etc.
- **10 Locations**: Major US metropolitan areas
- **8 Company Sizes**: From 1-50 to 10,000+ employees
- **8 Industries**: Technology, Healthcare, Financial Services, etc.

**Total Combinations**: 6,400 possible search variations

## 🛠️ Installation

### Prerequisites

- Node.js 18.0.0+
- Apollo MCP Server running (optional for mock mode)

### Setup

```bash
# Clone or navigate to project directory
cd jetvision-agent-project

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit configuration as needed
nano .env
```

## ⚙️ Configuration

### Environment Variables

```bash
# Target Settings
TARGET_LEADS=100                    # Minimum leads to generate
RATE_LIMIT_DELAY=2000              # Delay between requests (ms)
OUTPUT_DIR=./lead-generation-output # Output directory

# Apollo MCP Server
APOLLO_MCP_URL=http://localhost:8123 # MCP server endpoint
USE_REAL_APOLLO=false               # Use real Apollo.io API

# Advanced Features
CAMPAIGN_TYPE=standard              # standard|advanced
TARGET_DOMAINS=example.com          # For account-based targeting
USE_SEQUENCES=false                 # Create email sequences
```

### Apollo MCP Server Setup

1. **Start Apollo MCP Server**:

    ```bash
    cd apollo-io-mcp-server
    npm run dev
    ```

2. **Verify Server Health**:
    ```bash
    curl http://localhost:8123/health
    ```

## 🚀 Usage

### Basic Lead Generation

```bash
# Standard automation with mock data
npm run generate-leads

# Or directly with node
node lead-generation-automation.js
```

### Apollo MCP Integration

```bash
# With MCP server integration
node apollo-mcp-integration.js

# Advanced campaign with multiple strategies
CAMPAIGN_TYPE=advanced node apollo-mcp-integration.js
```

### Environment Variable Overrides

```bash
# Generate 200 leads with faster execution
TARGET_LEADS=200 RATE_LIMIT_DELAY=1000 npm run generate-leads

# Use real Apollo.io API (requires API key)
USE_REAL_APOLLO=true APOLLO_API_KEY=your_key npm run generate-leads

# Advanced campaign with sequences
CAMPAIGN_TYPE=advanced USE_SEQUENCES=true node apollo-mcp-integration.js
```

## 📊 Output Files

The automation generates several output files in the configured directory:

### Lead Data

- `leads-YYYY-MM-DDTHH-mm-ss.json` - Complete lead data in JSON format
- `leads-YYYY-MM-DDTHH-mm-ss.csv` - Lead data in CSV format for spreadsheet import

### Analytics Report

- `report-YYYY-MM-DDTHH-mm-ss.json` - Comprehensive automation report including:
    - Summary statistics (total leads, success rate, duration)
    - Lead breakdown by job title, location, industry, company size
    - Top-performing search combinations
    - Recommendations for future campaigns

### Sample CSV Output

```csv
Name,Job Title,Company,Industry,Location,Company Size,Email,Phone,LinkedIn,Email Verified,Discovery Date
Sarah Johnson,executive assistant,Alpha Technologies,Technology,Los Angeles California,201-500,sarah.johnson@alphatech.com,+1-213-555-0123,https://linkedin.com/in/sarah-johnson,true,2024-01-15T10:30:00Z
```

## 📈 Search Strategy

### Priority-Based Approach

The automation uses a smart search strategy:

1. **High-Priority Combinations**:
    - Top-performing job titles (executive assistant, office manager, administrative coordinator)
    - Primary locations (LA, NYC, Chicago)
    - Medium-large companies (101-1000 employees)

2. **Medium-Priority Expansion**:
    - Additional job titles and locations
    - Different industry sectors

3. **Dynamic Expansion**:
    - If target not reached, expands to more combinations
    - Prioritizes based on performance data

### Rate Limiting & Compliance

- Respects Apollo.io API rate limits (60 requests/minute)
- Configurable delays between requests
- Automatic exponential backoff on errors
- Circuit breaker patterns for reliability

## 🔧 Advanced Features

### Account-Based Lead Generation

Target specific companies by domain:

```bash
TARGET_DOMAINS="company1.com,company2.com" CAMPAIGN_TYPE=advanced node apollo-mcp-integration.js
```

### Email Sequence Automation

Automatically create follow-up sequences:

```bash
USE_SEQUENCES=true CAMPAIGN_TYPE=advanced node apollo-mcp-integration.js
```

### Bulk Contact Enrichment

Enhance leads with additional data:

- Personal email addresses
- Phone numbers
- LinkedIn profiles
- Company information

## 📋 Example Output

### Console Output

```
🚀 Starting Apollo MCP Lead Generation Automation
🔗 MCP Server: http://localhost:8123
✅ Apollo MCP server is healthy
📊 Apollo API Status: connected
💾 Database Status: operational

🔍 MCP Search: {"jobTitle":"executive assistant","location":"Los Angeles, California","companySize":"101-200","industry":"Technology"}
✅ MCP returned 12 leads, total unique: 12

📈 Progress: 10 searches, 85 unique leads
🎯 Target reached: 103 leads

📄 Exported 103 leads to ./lead-generation-output/leads-2024-01-15T10-30-45.json
📊 Exported 103 leads to ./lead-generation-output/leads-2024-01-15T10-30-45.csv
📈 Generated automation report: ./lead-generation-output/report-2024-01-15T10-30-45.json

✨ Automation completed!
📊 Final stats: 45 searches, 103 unique leads
⏱️  Duration: 127.34 seconds
```

### Summary Report

```
📊 AUTOMATION SUMMARY
====================
Total Leads Generated: 103
Target Achievement: ✅ (103.0%)
Search Success Rate: 95.6%
Average Leads/Search: 2.29

🏆 TOP PERFORMING COMBINATIONS:
1. executive assistant in Los Angeles, California (Technology) → 15 leads
2. office manager in New York, New York (Professional Services) → 12 leads
3. administrative coordinator in Chicago, Illinois (Healthcare) → 11 leads
```

## 🔍 Troubleshooting

### Common Issues

**MCP Server Connection Failed**

```bash
# Check if Apollo MCP server is running
curl http://localhost:8123/health

# Start the server if needed
cd apollo-io-mcp-server && npm run dev
```

**Rate Limit Errors**

- Increase `RATE_LIMIT_DELAY` in environment variables
- Check Apollo.io API quota usage
- Use mock mode for testing: `USE_REAL_APOLLO=false`

**Low Lead Count**

- Review search parameters for your target market
- Expand geographic locations
- Include more job title variations
- Check industry targeting relevance

## 📜 Compliance & Ethics

### Apollo.io Terms of Service

- Respects rate limits and usage guidelines
- Implements appropriate delays between requests
- Uses official Apollo.io API endpoints through MCP server
- Maintains data privacy and security standards

### Best Practices

- Regular monitoring of API usage
- Responsible data collection and storage
- Compliance with data protection regulations
- Ethical lead generation practices

## 🔗 Integration

This automation system integrates with:

- **Apollo MCP Server**: Primary data source for lead information
- **Apollo.io API**: Real prospect data (when API key provided)
- **Supabase**: Optional database persistence through MCP server
- **CSV Export**: Compatible with CRM systems and spreadsheet applications
- **Email Sequences**: Automated follow-up campaign creation

## 📞 Support

For issues with:

- **Lead Generation Script**: Check this documentation and console output
- **Apollo MCP Server**: See apollo-io-mcp-server/README.md
- **Apollo.io API**: Consult Apollo.io documentation and support
