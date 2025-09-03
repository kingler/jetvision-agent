# JetVision Agent - Private Aviation Intelligence Platform

![N8N JetVision Agent Workflow](<Screenshot 2025-08-28 at 1.53.22 PM.png>)
![JetVision Chat Interface](<Screenshot 2025-08-28 at 1.42.55 PM.png>)
![Predefined Workflow Prompts](<Screenshot 2025-08-28 at 1.43.22 PM.png>)

## Business Overview

**JetVision Agent** is a sophisticated AI-powered business intelligence platform designed specifically for the luxury private aviation industry. With over 20 years of expertise in jet charter services, JetVision transforms complex operational data into actionable insights that drive exceptional client experiences and sustainable business growth.

Our platform serves as the intelligent bridge between advanced aviation technology and executive decision-making, enabling seamless management of lead generation, fleet operations, and customer relationships in the high-stakes world of private jet charter services.

## Company Mission

At JetVision, we redefine luxury travel through seamless, bespoke private aircraft charters. We specialize in understanding the nuances of private aviation—from personalized itineraries to rigorous safety standards—ensuring each journey meets the highest levels of comfort, efficiency, and exclusivity. Guided by our commitment to reliability, discretion, and client satisfaction, we transform every mile into an effortless, first-class experience.

## Core Business Objectives

### 🎯 **Lead Generation & Sales Intelligence**
- **Apollo.io Integration**: Identify and qualify high-value prospects in the private aviation market
- **Target Audience**: Executive assistants, C-suite executives, travel coordinators at Fortune 500 companies
- **Campaign Management**: Launch, monitor, and optimize email sequences and outreach campaigns
- **Goal**: Increase qualified prospect pipeline by 25% quarterly through targeted campaigns

### ✈️ **Fleet Operations Management**
- **Avinode Platform Integration**: Optimize aircraft availability, pricing, and charter operations
- **Real-time Fleet Status**: Monitor aircraft locations, availability, and utilization rates
- **Dynamic Pricing**: Generate competitive quotes and market-rate analysis
- **Goal**: Maximize aircraft utilization rates and optimize pricing strategies

### 📊 **Business Intelligence & Analytics**
- **Performance Tracking**: Monitor conversion rates, response metrics, and ROI optimization
- **Market Intelligence**: Analyze competitor activities and industry trends
- **Operational Metrics**: Track efficiency indicators and process improvement opportunities
- **Goal**: Achieve 15%+ email response rates and reduce average sales cycle

## Service Portfolio

### **Private Jet Charter Services**
- **Light Jets**: Ideal for short trips (4-7 passengers, 1,000-1,800 miles)
- **Midsize Jets**: Comfort for medium-range flights (6-8 passengers, 2,000-3,000 miles)
- **Heavy Jets**: Ultimate luxury for longer journeys (10-16 passengers, 4,000+ miles)

### **Concierge Services**
- Tailored in-flight dining experiences
- Private ground transportation coordination
- Personalized amenities and special requests
- 24/7 customer support and trip management

### **Membership Programs**
- Priority access to aircraft inventory
- Exclusive rates and pricing tiers
- Personalized service and dedicated account management
- Empty leg flight opportunities at discounted rates

## Technology Stack & Architecture

### **AI-Powered Workflow Orchestration**
Built as a sophisticated monorepo with Next.js, TypeScript, and cutting-edge AI technologies, featuring:

- **n8n Integration**: Custom workflow automation connecting Apollo.io and Avinode operations
- **Multi-Agent System**: Specialized AI agents for different business functions
- **Real-time Processing**: Instant data synchronization and response generation
- **Privacy-Focused**: Local data storage using IndexedDB for sensitive client information

### **System Architecture**
```
├── jetvision-agent/          # Main Next.js application
│   ├── apps/web/            # Web application
│   └── packages/            # Shared packages and utilities
├── apollo-io-mcp-server/    # Apollo.io MCP integration server
├── avinode-mcp-server/     # Avinode MCP integration server
└── llmchat/                 # Advanced chat interface components
```

## Key Features

### **Advanced Business Intelligence**
- **Apollo.io Lead Discovery**: Target executive assistants, travel coordinators, and C-suite executives
- **Campaign Performance Analytics**: Track conversion rates, response metrics, and ROI optimization
- **Market Intelligence**: Monitor competitor activities and industry expansion opportunities
- **Stakeholder Reporting**: Executive dashboards, KPI tracking, and business health indicators

### **Fleet Management Excellence**
- **Aircraft Search & Availability**: Real-time fleet status and optimal aircraft matching
- **Charter Management**: Coordinate booking requests and operational logistics
- **Pricing Optimization**: Dynamic pricing based on market rates and demand
- **Operator Relations**: Maintain relationships with aircraft operators and service providers

### **Seamless Integration**
- **n8n Webhook Automation**: Custom workflows connecting all business systems
- **Real-time Data Sync**: Instant updates across Apollo.io and Avinode platforms
- **Multi-Platform Support**: Web, desktop, and mobile-responsive interfaces
- **API-First Architecture**: Extensible integration capabilities

## Business Impact & Success Metrics

### **Measurable Outcomes**
- **Lead Generation**: 25% quarterly increase in qualified prospect pipeline
- **Conversion Optimization**: 15%+ email response rates (above industry average)
- **Operational Efficiency**: Maximized aircraft utilization and optimized pricing
- **Customer Satisfaction**: 95%+ client satisfaction through proactive service management
- **Revenue Growth**: Sustainable revenue increases through strategic market expansion

### **Competitive Advantages**
- **20+ Years Industry Expertise**: Deep understanding of private aviation nuances
- **AI-Powered Intelligence**: Advanced data analytics and predictive insights
- **Luxury Brand Positioning**: Premium service delivery and client experience
- **Operational Excellence**: Streamlined processes and efficient resource utilization
- **Privacy & Discretion**: Secure handling of high-profile client information

## Getting Started

### Prerequisites
- Ensure you have `bun` installed (recommended) or `yarn`
- Access to Apollo.io and Avinode API credentials
- n8n instance for webhook automation

### Installation

1. Clone the repository:
```bash
git clone https://github.com/kingler/jetvision-agent.git
cd jetvision-agent
```

2. Install dependencies:
```bash
bun install
# or
yarn install
```

3. Configure environment variables:
```bash
cp .env.jetvision.example .env.local
# Edit .env.local with your API keys and webhook URLs
```

4. Start the development server:
```bash
bun dev
# or
yarn dev
```

5. Open your browser and navigate to `http://localhost:3000`

## Usage Examples

### **Apollo.io Queries**
- "Find executive assistants at Fortune 500 companies in California"
- "Show conversion rates for jet charter campaigns this month"
- "Launch campaign for Series B funded companies"
- "Which executive assistants opened our emails the most?"

### **Avinode Operations**
- "Check Gulfstream G650 availability NYC to London next week"
- "Find empty leg flights Miami to New York"
- "Show fleet status and locations"
- "What's our fleet utilization rate this month?"

### **Integration Commands**
- "Sync high-value Apollo leads with Avinode bookings"
- "Check system health and API connections"
- "Show active n8n workflows"
- "Generate Monday morning executive briefing"

---

**JetVision Agent** - Transforming private aviation through intelligent automation and exceptional service delivery. Where luxury meets technology, and every journey becomes an effortless, first-class experience.

*"Whether flying for business or leisure, trust JetVision to elevate your journey with precision, style, and peace of mind."*
│   │   ├── avinode-tools.ts  # Avinode tool handlers
│   │   └── avinode-api-client.ts # API client
│   ├── tests/
│   │   ├── unit/              # Unit tests
│   │   ├── integration/       # Integration tests
│   │   ├── e2e/              # End-to-end tests
│   │   └── fixtures/          # Test data
│   └── package.json
└── README.md

```

## MCP Protocol

Both servers implement the Model Context Protocol (MCP) with:
- HTTP Streaming Transport
- Session management
- Tool discovery and execution
- Real-time notifications
- Structured error handling

### Client Connection Example

```javascript
// Connect to Apollo.io MCP Server
const apolloClient = new MCPClient('http://localhost:8123/mcp');
await apolloClient.initialize();

// List available tools
const tools = await apolloClient.listTools();

// Execute a tool
const result = await apolloClient.callTool('search-leads', {
  jobTitle: 'CEO',
  industry: 'Aviation',
  companySize: '50-200',
  location: 'United States'
});
```

## API Documentation

Detailed API documentation for each server:
- [Apollo.io MCP Server Documentation](./apollo-io-mcp-server/README.md)
- [Avinode MCP Server Documentation](./avinode-mcp-server/README.md)

## Testing

### Quality Standards
- 95%+ test coverage requirement
- Unit, integration, and E2E tests
- Mock data fixtures for consistent testing
- Rate limiting and error handling tests

### Running Tests

```bash
# Run all tests for both servers
npm run test:all

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Deployment

### Docker Support (Coming Soon)
Dockerfiles and docker-compose configuration for containerized deployment.

### Environment Variables

**Apollo.io Server:**
- `APOLLO_API_KEY`: Apollo.io API key
- `PORT`: Server port (default: 8123)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (info/debug/error)

**Avinode Server:**
- `AVAINODE_API_KEY`: Avinode API key
- `PORT`: Server port (default: 8124)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (info/debug/error)

## Security

- API keys stored in environment variables
- Rate limiting implementation
- Input validation on all tool parameters
- Secure session management
- HTTPS support in production

## Performance

- Concurrent request handling
- Exponential backoff for rate limits
- Response caching where appropriate
- Optimized for low latency

## Support

For issues, questions, or contributions, please contact the JetVision development team.

## License

ISC

---

## Deployment

### Deploy to Cloudflare Pages

```bash
# Build and deploy
./UPDATE_DEPLOY.sh

# Quick deploy (skip rebuild)
./QUICK_DEPLOY.sh

# Deploy with MCP servers
./UPDATE_DEPLOY.sh --mcp
```

### Environment Variables

Required environment variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# n8n Integration
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance/webhook/jetvision-agent
NEXT_PUBLIC_N8N_API_KEY=your-api-key

# MCP Servers
APOLLO_API_KEY=your-apollo-key
AVAINODE_API_KEY=your-avainode-key
```

## Common Use Cases

### Search for Available Jets
```
"I need a jet from New York to Miami next Tuesday for 8 passengers"
```

### Get Price Quotes
```
"What's the cost for a light jet from LAX to Las Vegas?"
```

### Compare Aircraft
```
"Show me the differences between a Citation X and a Gulfstream G550"
```

### Plan Multi-Leg Trips
```
"Plan a trip: NYC → London → Dubai → NYC with 2-day stops"
```

## API Integration

### n8n Webhook
The application integrates with n8n for workflow automation:

```javascript
POST /api/n8n-webhook
{
  "action": "search_aircraft",
  "parameters": {
    "from": "KTEB",
    "to": "KMIA",
    "date": "2025-01-30",
    "passengers": 8
  }
}
```

### MCP Server Endpoints

**Apollo.io MCP**:
```
https://apollo-mcp.designthru.ai/search
https://apollo-mcp.designthru.ai/operators
```

**Avainode MCP**:
```
https://avainode-mcp.designthru.ai/availability
https://avainode-mcp.designthru.ai/quotes
```

## Development Workflow

### Making Changes

1. **Standard Update**:
```bash
./UPDATE_DEPLOY.sh
```

2. **Quick Deploy** (for minor changes):
```bash
./QUICK_DEPLOY.sh
```

3. **Force Rebuild**:
```bash
./UPDATE_DEPLOY.sh --force
```

### Monitoring

```bash
# View deployment logs
wrangler pages deployment tail

# Check deployment status
wrangler pages deployment list --project-name=jetvision-agent

# View MCP server logs
wrangler tail
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Support

- **Documentation**: [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md)
- **Issues**: [GitHub Issues](https://github.com/kingler/jetvision-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kingler/jetvision-agent/discussions)

## Acknowledgments

Built on top of the excellent [LLMChat.co](https://llmchat.co) platform by Trendy Design.

---

**Live Demo**: https://jetvision-agent.pages.dev

**Status**: 🟢 Active Development

Built with TypeScript, MCP SDK, and Express.js following TDD best practices.