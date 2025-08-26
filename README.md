# JetVision Agent - Private Jet Charter AI Assistant

<img width="1512" alt="JetVision Agent Interface" src="https://github.com/user-attachments/assets/b89d1343-7c6f-4685-8bcf-dbcc71ce2229" />

## Introduction

JetVision Agent is an AI-powered private jet charter assistant that streamlines the process of booking private flights. Built on top of the LLMChat.co platform, it provides intelligent assistance for aircraft availability, routing, pricing, and charter management through natural language conversations.

## Key Features

**Private Jet Charter Capabilities**
- **Aircraft Availability Search**: Real-time aircraft availability through Apollo.io and Avainode integration
- **Smart Routing**: Intelligent flight planning and route optimization
- **Instant Quotes**: Quick pricing estimates for charter flights
- **Fleet Management**: Browse and compare different aircraft types
- **Trip Planning**: Comprehensive itinerary management

**AI-Powered Features**
- **Natural Language Processing**: Communicate naturally about your travel needs
- **Context-Aware Responses**: Understands complex charter requirements
- **Multi-Step Workflows**: Handles complete booking processes
- **Smart Recommendations**: Suggests optimal aircraft and routes

**Integration Platform**
- **n8n Webhook Integration**: Automated workflow processing
- **MCP Server Architecture**: Apollo.io and Avainode MCP servers
- **Cloudflare Deployment**: Global edge network for fast performance
- **Clerk Authentication**: Secure user authentication

## Quick Start

### Prerequisites
- Node.js 18+ or Bun
- Cloudflare account (for deployment)
- Clerk account (for authentication)
- n8n instance (for workflow automation)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/kingler/jetvision-agent.git
cd jetvision-agent
```

2. Install dependencies:
```bash
cd jetvision-agent
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

4. Run development server:
```bash
bun dev
```

5. Open http://localhost:3000

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

## Architecture

JetVision Agent extends the LLMChat.co monorepo architecture:

```
├── apps/
│   └── web/                 # Next.js web application
│       ├── app/             # App router pages
│       │   ├── chat/        # Main chat interface
│       │   └── api/         # API routes
│       └── components/      # React components
│
├── packages/
│   ├── ai/                 # AI models and providers
│   │   └── providers/      # n8n provider integration
│   ├── common/             # Shared components
│   │   └── components/
│   │       └── jetvision/  # JetVision-specific UI
│   └── shared/             # Shared utilities
│
├── apollo-io-mcp-server/   # Apollo.io MCP server
├── avainode-mcp-server/    # Avainode MCP server
│
└── deployment-scripts/
    ├── UPDATE_DEPLOY.sh    # Main deployment script
    ├── QUICK_DEPLOY.sh     # Quick deployment
    └── BUILD_FOR_CLOUDFLARE.sh # Build script
```

## MCP Servers

### Apollo.io MCP Server
- Handles business jet operator data
- Provides charter company information
- Manages fleet availability

### Avainode MCP Server
- Real-time aircraft availability
- Charter marketplace integration
- Instant pricing quotes

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

4. **Update with Version**:
```bash
./UPDATE_DEPLOY.sh --version v1.0.0
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

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Support

- **Documentation**: [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md)
- **Issues**: [GitHub Issues](https://github.com/kingler/jetvision-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kingler/jetvision-agent/discussions)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Built on top of the excellent [LLMChat.co](https://llmchat.co) platform by Trendy Design.

---

**Live Demo**: https://jetvision-agent.pages.dev

**Status**: 🟢 Active Development