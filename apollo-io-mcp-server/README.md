# Apollo.io MCP Server

MCP server for Apollo.io 


## Features

- **Lead Search**: Search for prospects based on job title, industry, company size, and location
- **Contact Enrichment**: Enrich contact information with additional data from Apollo.io
- **Email Sequences**: Create and manage automated email sequences for lead nurturing
- **Account Data**: Retrieve account-based marketing data for companies
- **Engagement Tracking**: Track email and call engagement metrics for campaigns

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Add your Apollo.io API key to `.env`:
```
APOLLO_API_KEY=your_actual_api_key_here
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Custom Port
```bash
npm start -- --port=8080
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Available MCP Tools

### search-leads
Search for prospects based on various criteria.

**Parameters:**
- `jobTitle`: Job title to search for (e.g., CEO, CFO, CTO)
- `industry`: Industry sector (e.g., Aviation, Technology, Finance)
- `companySize`: Company size range (e.g., 50-200, 200-500, 500+)
- `location`: Geographic location (country, state, or city)
- `limit`: Maximum number of results (default: 25)

### enrich-contact
Enrich contact information with additional data.

**Parameters:**
- `email`: Email address of the contact (required)
- `linkedinUrl`: LinkedIn profile URL (optional)

### create-email-sequence
Create an automated email sequence for lead nurturing.

**Parameters:**
- `name`: Name of the email sequence (required)
- `contacts`: List of contact emails (required)
- `templateIds`: List of email template IDs
- `delayDays`: Days to wait between each email

### get-account-data
Retrieve account-based marketing data for a company.

**Parameters:**
- `domain`: Company domain (required)
- `includeContacts`: Include contact information (default: true)

### track-engagement
Track email and call engagement metrics.

**Parameters:**
- `sequenceId`: ID of the sequence to track (required)
- `startDate`: Start date for metrics (YYYY-MM-DD)
- `endDate`: End date for metrics (YYYY-MM-DD)

## API Rate Limits

The server implements rate limiting to comply with Apollo.io API restrictions:
- Maximum 60 requests per minute per tool
- Automatic exponential backoff on rate limit errors
- Concurrent request limiting (max 10 simultaneous requests)

## Architecture

The server follows MCP (Model Context Protocol) standards with:
- HTTP Streaming Transport for real-time communication
- Session management for multiple concurrent connections
- Structured error handling and logging
- TypeScript for type safety

## License

ISC