# Project Structure Analysis

## Directory Tree Overview

The JetVision Agent is structured as a Turbo monorepo with the following architecture:

```
jetvision-agent/
├── .claude/                     # Claude Code command definitions (20+ analysis commands)
├── apps/web/                    # Main Next.js application
│   ├── __tests__/              # API and integration tests
│   ├── app/                    # Next.js App Router structure
│   │   └── api/               # API routes (feedback, test, user sync)
│   ├── components/            # Web-specific components
│   ├── lib/                   # Database and utility libraries
│   │   └── database/          # Prisma schema, migrations, repositories
│   ├── middleware.ts          # Next.js middleware
│   ├── public/                # Static assets including compiled worker
│   └── scripts/               # Testing and verification scripts
├── packages/                   # Shared monorepo packages
│   ├── actions/               # Server actions and business logic
│   ├── ai/                    # AI providers and workflow management
│   │   ├── config/           # Provider configurations
│   │   ├── providers/        # N8N, hybrid, and multi-provider implementations
│   │   ├── tools/            # MCP tools and configurations
│   │   ├── worker/           # Background workers
│   │   └── workflow/         # Task definitions and flow control
│   ├── common/               # Shared components and utilities
│   │   ├── components/       # Reusable React components
│   │   │   ├── booking-wizard/  # Aircraft booking workflow
│   │   │   ├── chat-input/      # Chat interface components
│   │   │   ├── dashboard/       # Analytics dashboard components
│   │   │   ├── jetvision/       # Aviation-specific components
│   │   │   └── thread/          # Chat thread management
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API service layers
│   │   ├── store/            # Zustand state management
│   │   └── utils/            # Utility functions
│   ├── orchestrator/         # Multi-agent orchestration engine
│   ├── prisma/               # Database schema and client
│   ├── shared/               # Shared configurations and types
│   ├── tailwind-config/      # Tailwind CSS configuration
│   ├── typescript-config/    # TypeScript configurations
│   └── ui/                   # Design system components
└── Configuration Files
    ├── .env.local            # Environment variables
    ├── .github/workflows/    # GitHub Actions (deploy, test automation)
    ├── .husky/               # Git hooks
    ├── .prettierrc           # Code formatting
    ├── bun.lock              # Package lock file
    ├── package.json          # Root workspace configuration
    └── turbo.json            # Turbo build configuration
```

## Key Architecture Patterns

### Monorepo Structure

- **Build System**: Turbo for optimized builds and caching
- **Package Manager**: Bun 1.2.21 (required)
- **Workspaces**: Apps and packages with internal dependencies

### Component Organization

- **UI Components**: Centralized design system in `/packages/ui/`
- **Business Components**: Aviation-specific logic in `/packages/common/components/jetvision/`
- **Shared Utilities**: Cross-package utilities and hooks

### State Management

- **Client State**: Zustand stores with IndexedDB persistence
- **Database**: Prisma + Drizzle ORM with PostgreSQL
- **Real-time Sync**: SharedWorker-based synchronization

### AI and Workflow Integration

- **Primary AI Route**: All requests route through N8N webhook
- **Providers**: Multi-provider fallback architecture
- **Orchestration**: Task-based workflow engine

## New Files Since Last Analysis

_(No previous analysis found)_

## Critical File Locations

### Configuration

- `/apps/web/.env.local` - Production environment variables
- `/apps/web/next.config.js` - Next.js configuration with external packages
- `/packages/ai/config/provider-config.ts` - AI provider configurations

### Core Implementation

- `/packages/ai/providers/jetvision-hybrid-provider.ts` - Main AI routing logic
- `/packages/common/store/chat.store.ts` - Chat state management
- `/packages/orchestrator/engine.ts` - Multi-agent orchestration
- `/apps/web/lib/database/schema.ts` - Database schema (minimal implementation)

### Integration Points

- `/packages/common/services/n8n-webhook.service.ts` - N8N integration service
- `/packages/ai/tools/mcp.ts` - Model Context Protocol implementation
- `/packages/common/components/jetvision/` - Aviation business logic

## Build and Development Files

- **Worker Compilation**: Custom TypeScript compilation for SharedWorker
- **Prisma Generation**: Database client generation in build process
- **Turbo Caching**: Build optimization and dependency management
- **Testing Infrastructure**: Jest configuration with coverage reporting

This structure indicates a mature monorepo setup with clear separation of concerns, though some areas (particularly database schema) remain incomplete.
