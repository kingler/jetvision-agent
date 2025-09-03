# JetVision Agent - Database Implementation

## Overview

This document describes the comprehensive database implementation for JetVision Agent, a private aviation AI platform with Apollo.io and Avinode integrations.

## Architecture

### Dual ORM Strategy
- **Prisma**: Primary ORM for migrations and schema management
- **Drizzle**: TypeScript-first ORM for runtime queries and better performance
- **Supabase**: PostgreSQL database with built-in auth and real-time features

### Database Structure

```
/packages/prisma/
├── schema.prisma          # Prisma schema definition
└── migrations/            # Database migrations

/apps/web/lib/database/
├── schema.ts              # Drizzle schema (mirrors Prisma)
├── client.ts              # Database clients (Supabase + Drizzle)
├── service.ts             # Unified database service
├── repositories/          # Domain-specific repositories
│   ├── user.repository.ts
│   ├── company.repository.ts
│   ├── lead.repository.ts
│   └── aircraft.repository.ts
└── migrations/            # Drizzle migrations
```

## Schema Design

### Core Entities

#### 1. User Management
- **Users**: Extended profiles with aviation preferences and company affiliations
- **Companies**: Business entities with Apollo.io integration
- **Executive Assistants**: User relationships for executive assistant workflows

#### 2. Apollo.io Lead Management
- **Leads**: Contact information with scoring and status tracking
- **Campaigns**: Email sequences and LinkedIn outreach campaigns
- **Campaign Targets**: Individual campaign recipients with engagement tracking

#### 3. Avinode Aircraft & Booking System
- **Aircraft**: Fleet inventory with performance specifications and availability
- **Bookings**: Flight requests and confirmations with pricing

#### 4. Conversation & AI System
- **Conversations**: Chat sessions with context and workflow tracking
- **Messages**: Individual messages with AI metadata and N8N workflow data
- **Integration Logs**: Tracking for all external API interactions

### Key Features

#### Data Protection
- **Soft Deletes**: All critical entities support soft deletion with `deletedAt` timestamps
- **Row Level Security (RLS)**: Comprehensive policies for Supabase multi-tenancy
- **Audit Fields**: Created/updated timestamps with user tracking

#### Performance Optimization
- **Strategic Indexes**: Optimized for common query patterns
- **JSON Fields**: Flexible metadata storage for external API data
- **Foreign Key Constraints**: Proper referential integrity

#### Integration Support
- **Apollo.io**: Contact syncing with enrichment data tracking
- **Avinode**: Aircraft inventory and booking management
- **N8N Workflows**: AI orchestration with execution logging

## Implementation Details

### Database Clients

```typescript
// Supabase clients for different contexts
createSupabaseBrowserClient()     // Client-side operations
createSupabaseServiceClient()     // Server-side with elevated privileges
createSupabaseAnonClient()        // Server-side with user context

// Drizzle client for type-safe queries
getDrizzleClient()                // Connection-pooled PostgreSQL client
```

### Repository Pattern

Each domain has a dedicated repository with comprehensive CRUD operations:

```typescript
// Example: LeadRepository methods
LeadRepository.create(data)
LeadRepository.getByApolloContactId(id)
LeadRepository.getHighScoreLeads(minScore)
LeadRepository.getLeadsRequiringFollowUp()
LeadRepository.updateStatus(id, status)
LeadRepository.getConversionStats()
```

### Unified Service Layer

```typescript
// Access all repositories through DatabaseService
DatabaseService.users.getById(id)
DatabaseService.companies.searchByName(term)
DatabaseService.leads.getConversionStats()
DatabaseService.aircraft.searchWithFilters(filters)

// Service-level operations
DatabaseService.healthCheck()
DatabaseService.getStats()
DatabaseService.cleanupSoftDeleted(days)
```

## Migration Strategy

### Development to Production Path

1. **Schema Updates**: Modify Prisma schema first
2. **Generate Migration**: `prisma migrate dev --name feature_name`
3. **Update Drizzle Schema**: Mirror changes in `schema.ts`
4. **Repository Updates**: Extend repository methods as needed
5. **Testing**: Run comprehensive test suite
6. **Production Deploy**: Apply migrations with `prisma migrate deploy`

### Backward Compatibility

- Legacy `Feedback` model maintained for existing data
- Gradual migration strategy for existing user data
- Database versioning through migration naming

## Security Implementation

### Row Level Security Policies

```sql
-- Users can only access their own data
CREATE POLICY "Users can access own data" ON "users" 
FOR ALL USING (auth.jwt() ->> 'sub' = "clerkId");

-- Company data access for company members
CREATE POLICY "Users can access company data" ON "companies" 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users."companyId" = companies.id 
    AND users."clerkId" = auth.jwt() ->> 'sub'
  )
);
```

### Data Protection
- Sensitive PII encrypted at application layer
- API keys and tokens stored in environment variables
- Integration logs sanitized of sensitive information

## Performance Considerations

### Query Optimization
- Strategic indexes on high-frequency queries
- Proper join patterns in repository methods
- Pagination for large result sets

### Connection Management
- Connection pooling with postgres client
- Separate clients for different access patterns
- Health check monitoring

### Caching Strategy
- Repository-level caching for static data
- Redis integration planned for session data
- IndexedDB client-side caching (90% complete)

## Testing Strategy

### Test Coverage
- Unit tests for all repository methods
- Integration tests for database operations
- Schema validation tests
- Performance benchmarks

### Test Data Management
- Isolated test database environment
- Automated test data cleanup
- Factory pattern for test data generation

## Integration Points

### Apollo.io Sync
- Bulk lead import with conflict resolution
- Enrichment data tracking in `apolloData` JSON field
- Campaign performance metrics aggregation

### Avinode Integration
- Real-time aircraft availability updates
- Booking synchronization with external calendar systems
- Fleet utilization reporting

### N8N Workflow Integration
- Workflow execution logging in `integration_logs`
- Message context preservation
- Error handling and retry logic

## Monitoring and Observability

### Health Checks
- Database connectivity monitoring
- Query performance tracking
- Migration status verification

### Metrics Collection
- Repository method execution times
- Connection pool utilization
- RLS policy effectiveness

## Future Enhancements

### Planned Features
- Read replicas for analytics queries
- Time-series data for usage patterns
- Advanced full-text search with PostgreSQL extensions
- GraphQL API layer over existing repositories

### Scaling Considerations
- Horizontal sharding strategy
- Archive strategy for historical data
- Advanced caching with Redis
- Real-time subscriptions with Supabase channels

## Development Workflow

### Local Development
1. Clone repository and install dependencies
2. Set up environment variables for database connections
3. Run migrations: `npm run db:migrate`
4. Generate clients: `npm run db:generate`
5. Run tests: `npm test`

### Schema Changes
1. Update Prisma schema
2. Generate migration: `npm run db:migrate`
3. Mirror changes in Drizzle schema
4. Update affected repositories
5. Run tests and update as needed

### Code Quality
- TypeScript strict mode enabled
- ESLint rules for database interactions
- Automated testing in CI/CD pipeline
- Regular security audits

## Conclusion

The JetVision Agent database implementation provides a robust, scalable foundation for the private aviation AI platform. The dual ORM strategy ensures both developer productivity and runtime performance, while comprehensive security measures protect sensitive aviation industry data.

The modular repository pattern allows for easy testing and maintenance, while the unified service layer provides a clean API for application components. Integration-ready design supports the critical Apollo.io and Avinode workflows that drive business value.

With proper indexing, RLS policies, and monitoring in place, this database architecture can scale to support thousands of aviation professionals while maintaining sub-second query performance and enterprise-grade security.