# Apollo.io MCP Server - Complete API Tools Documentation

## Overview
The Apollo.io MCP Server now provides comprehensive coverage of Apollo.io API endpoints through 20 specialized tools organized into the following categories:

## Available Tools

### Lead Generation & Enrichment
1. **search-leads** - Search for prospects by job title, industry, company size, and location
2. **enrich-contact** - Enrich individual contact with additional data
3. **bulk-enrich-contacts** - Enrich up to 10 contacts in a single request
4. **search-organizations** - Search companies by industry, size, revenue, location, and technologies
5. **bulk-enrich-organizations** - Enrich up to 10 organizations in a single request

### Contact Management
6. **create-contact** - Create new contacts in Apollo CRM
7. **update-contact** - Update existing contact information
8. **search-contacts** - Search and filter existing contacts

### Account Intelligence
9. **get-account-data** - Retrieve account-based marketing data for companies
10. **search-news** - Search for news articles related to companies or industries
11. **search-job-postings** - Find job postings to identify expansion/hiring trends

### Sales Operations
12. **create-email-sequence** - Create automated email sequences for nurturing
13. **track-engagement** - Track email and call engagement metrics
14. **create-deal** - Create new sales deals
15. **update-deal** - Update deal status and information
16. **search-deals** - Search and filter sales deals

### Activity Tracking
17. **create-task** - Create follow-up tasks
18. **log-call** - Log call activities with contacts

### Administration
19. **get-api-usage** - Monitor API usage statistics and credit consumption

## Implementation Status

### Completed Features
✅ All 20 tools defined in server.ts with proper input schemas
✅ Complete implementation in apollo-tools.ts with both mock and real API support
✅ Apollo API client updated with all necessary endpoint methods
✅ Rate limiting implemented (60 req/min for regular, 30 req/min for bulk operations)
✅ Error handling and validation for all tools
✅ TypeScript types and interfaces

### API Integration
- **Mock Mode**: Runs without API key for testing/development
- **Production Mode**: Connects to real Apollo.io API when APOLLO_API_KEY is set
- **Hybrid Support**: Seamless switching between mock and real data

## Rate Limits
- Standard endpoints: 60 requests per minute
- Bulk endpoints: 30 requests per minute (50% of standard rate)
- Automatic rate limit tracking and enforcement

## Usage Example

```typescript
// Set API key for production use
export APOLLO_API_KEY="your-api-key-here"

// Or run in mock mode without API key for development
npm run dev
```

## Testing
Run tests with: `npm test`

Current test coverage includes:
- Unit tests for all tool implementations
- Integration tests for API client
- E2E tests for MCP server functionality

## Next Steps for Production

1. **Add Real API Key**: Set `APOLLO_API_KEY` environment variable
2. **Test with Live Data**: Verify all endpoints work with actual Apollo.io API
3. **Monitor Usage**: Use `get-api-usage` tool to track credit consumption
4. **Deploy to Cloudflare**: Use `npm run deploy` for production deployment

## Notes

- All tools include proper error handling and validation
- Mock data is aviation-industry focused for JetVision use case
- Credit consumption warnings are built into the implementation
- Bulk operations are limited to 10 items per request as per Apollo.io limits