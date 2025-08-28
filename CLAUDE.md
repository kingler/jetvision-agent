# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a JetVision private jet charter services platform with MCP (Model Context Protocol) server integrations for Apollo.io (sales intelligence) and Avainode (aviation marketplace), plus a JetVision Agent web application UI.

## Technologies & Stack

- **Package Manager**: Bun (v1.2.21) - Primary package manager for the monorepo
- **Frontend**: Next.js 14+ with TypeScript, React, Tailwind CSS
- **MCP Servers**: TypeScript, Express.js, Model Context Protocol SDK
- **Deployment**: Cloudflare Workers (Wrangler)
- **Testing**: Jest with comprehensive unit/integration/e2e tests
- **Monorepo**: Turbo for build orchestration

## Project Structure

```
jetvision-agent/
├── apollo-io-mcp-server/     # MCP server for Apollo.io integration
├── avainode-mcp-server/      # MCP server for Avainode integration
└── jetvision-agent/          # Web UI application (monorepo)
    ├── apps/web/             # Next.js application
    └── packages/             # Shared packages
```

## Common Commands

### JetVision Agent Web Application
```bash
cd jetvision-agent
bun install              # Install dependencies
bun dev                  # Start development server
bun build                # Build for production
bun lint                 # Run linting
bun format              # Format code with Prettier
bun format:check        # Check formatting
```

### MCP Servers (Apollo.io & Avainode)
```bash
cd apollo-io-mcp-server  # or avainode-mcp-server
npm install              # Install dependencies
npm run dev              # Start development server
npm run build            # Build TypeScript
npm start                # Start production server
npm test                 # Run all tests
npm test:coverage        # Generate coverage report
npm run lint             # Run ESLint
npm run format           # Format with Prettier
```

### Cloudflare Deployment
```bash
npm run dev:worker       # Local development with Wrangler
npm run deploy           # Deploy to Cloudflare Workers
npm run deploy:staging   # Deploy to staging environment
npm run deploy:production # Deploy to production
npm run tail             # Monitor logs
```

## Architecture

### MCP Server Architecture
- Each MCP server implements the Model Context Protocol with HTTP Streaming Transport
- Servers expose tools for integration with respective platforms (Apollo.io/Avainode)
- Built with Express.js and TypeScript, deployable to Cloudflare Workers
- Session management and real-time notifications support
- Comprehensive error handling and rate limiting

### JetVision Agent Application
- Next.js app with App Router pattern
- MCP proxy integration at `/api/mcp/proxy` for connecting to MCP servers
- Chat interface with streaming responses
- Authentication and session management
- Sentry integration for error tracking

### Testing Strategy
- TDD approach with 95%+ coverage requirement
- Three test levels: unit, integration, e2e
- Mock fixtures in `tests/fixtures/` directories
- Jest configuration in each server directory

## Key Integration Points

1. **MCP Server Endpoints**:
   - Apollo.io Server: Port 8123 (default)
   - Avainode Server: Port 8124 (default)
   - HTTP streaming transport at `/mcp` endpoint

2. **Environment Variables**:
   - `APOLLO_API_KEY`: Apollo.io API key
   - `AVAINODE_API_KEY`: Avainode API key
   - `PORT`: Server port
   - `NODE_ENV`: Environment (development/production)

3. **API Routes in JetVision Agent**:
   - `/api/completion`: AI completion endpoint
   - `/api/mcp/proxy`: MCP server proxy
   - `/api/mcp/messages`: MCP message handling

## Development Workflow

1. Start the development environment with `bun dev` in the jetvision-agent directory
2. MCP servers can be started independently with `npm run dev` in their respective directories
3. Use environment variables from `.env` files (create from `.env.example` if not present)
4. Tests should pass before committing: run `npm test` in MCP servers or `bun test` in jetvision-agent