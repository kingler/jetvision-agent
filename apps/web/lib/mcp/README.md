# JetVision MCP Integration System

This directory contains the comprehensive integration system for connecting JetVision's main application with multiple Model Context Protocol (MCP) servers, specifically:

- **Apollo.io MCP Server** (Port 8123) - Sales intelligence and lead management
- **Avainode MCP Server** (Port 8124) - Aviation marketplace and charter booking
- **N8N MCP Server** (Port 8125) - Workflow automation and orchestration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    JetVision Main App                       │
├─────────────────────────────────────────────────────────────┤
│                Integration Manager                          │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐ │
│  │ Apollo Service│ │Avainode Service│ │   N8N Service     │ │
│  └───────────────┘ └───────────────┘ └───────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   MCP Client Core                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Connection Pool Manager                   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐               │   │
│  │  │Apollo   │ │Avainode │ │  N8N    │               │   │
│  │  │Pool     │ │Pool     │ │Pool     │               │   │
│  │  └─────────┘ └─────────┘ └─────────┘               │   │
│  └─────────────────────────────────────────────────────┐   │
├─────────────────────────────────────────────────────────┤   │
│                Data Sync Service                        │   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Auto Sync │ Webhook Sync │ Manual Sync │ Audit Log│   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
┌───▼────┐              ┌────▼────┐              ┌─────▼──┐
│Apollo  │              │Avainode │              │  N8N   │
│MCP     │              │MCP      │              │  MCP   │
│Server  │              │Server   │              │ Server │
│:8123   │              │:8124    │              │ :8125  │
└────────┘              └─────────┘              └────────┘
```

## Core Components

### 1. Type Definitions (`types.ts`)
Comprehensive TypeScript interfaces for:
- MCP protocol messages and responses
- Service-specific data structures
- Integration flow types
- Error handling types

### 2. MCP Client (`client.ts`)
Low-level MCP protocol client with:
- Connection pooling and session management
- HTTP streaming transport support
- Request/response handling with retries
- Event emission system
- Graceful error handling and timeouts

### 3. Service Abstraction Layer

#### Apollo Service (`services/apollo-service.ts`)
- **Lead Search**: Find prospects based on job title, industry, company size
- **Contact Enrichment**: Enrich contact details with Apollo.io data
- **Email Sequences**: Create and manage email campaigns
- **Account Intelligence**: Get company information by domain
- **Engagement Tracking**: Monitor campaign performance metrics

#### Avainode Service (`services/avainode-service.ts`)
- **Aircraft Search**: Find available aircraft for specific routes/dates
- **Charter Requests**: Create booking requests with operator details
- **Pricing Quotes**: Get comprehensive pricing breakdowns
- **Booking Management**: Confirm, cancel, or modify bookings
- **Operator Information**: Get safety records and fleet details

#### N8N Service (`services/n8n-service.ts`)
- **Workflow Management**: Create, execute, and monitor workflows
- **Lead-to-Booking Pipeline**: Automated Apollo→Avainode integration
- **Execution Monitoring**: Track workflow status and results
- **Webhook Triggers**: Handle real-time workflow events

### 4. Integration Manager (`integration-manager.ts`)
Central orchestration layer that:
- Manages connections to all MCP servers
- Coordinates cross-service workflows
- Handles the complete lead-to-booking process
- Provides event system for real-time updates
- Manages error recovery and retry logic

### 5. Data Synchronization (`data-sync.ts`)
Ensures data consistency with:
- **Auto-sync**: Scheduled synchronization of leads and availability
- **Webhook sync**: Real-time updates from external systems
- **Manual sync**: On-demand full synchronization
- **Audit logging**: Complete trail of sync operations
- **Consistency validation**: Health checks across systems

## API Endpoints

The integration system exposes several REST endpoints:

### System Management
- `GET /api/integration/status` - Get system status and connections
- `POST /api/integration/status` - Initialize/reinitialize the system

### Lead Management
- `GET /api/integration/leads` - Search Apollo.io leads
- `POST /api/integration/leads` - Process individual lead through pipeline
- `PUT /api/integration/leads` - Batch process multiple leads

### Aircraft Management
- `GET /api/integration/aircraft` - Search Avainode aircraft
- `POST /api/integration/aircraft` - Create charter requests

### Workflow Management
- `GET /api/integration/workflows` - List N8N workflows
- `POST /api/integration/workflows` - Create/execute workflows
- `PUT /api/integration/workflows` - Activate/deactivate workflows

### Data Synchronization
- `GET /api/integration/sync` - Get sync status and audit logs
- `POST /api/integration/sync` - Control sync operations
- `DELETE /api/integration/sync` - Clear audit logs

### Webhooks
- `POST /api/integration/webhook` - Handle external webhook events
- `GET /api/integration/webhook` - Test webhook functionality

## Usage Examples

### Basic Initialization
```typescript
import { getIntegrationManager } from './lib/mcp/integration-manager';

const manager = getIntegrationManager();
await manager.initialize();
```

### Lead-to-Booking Flow
```typescript
const leadData = {
  name: 'John Doe',
  title: 'CEO',
  company: 'Aviation Corp',
  email: 'john@aviationcorp.com',
  industry: 'Aviation',
  size: '100-500',
  location: 'New York'
};

const flightRequirements = {
  departureAirport: 'KJFK',
  arrivalAirport: 'KLAX', 
  departureDate: '2024-04-01',
  passengers: 8
};

const result = await manager.processLeadToBooking(leadData, flightRequirements);
```

### Direct Service Usage
```typescript
const services = manager.getServices();

// Search leads
const leads = await services.apollo.searchLeads({
  industry: 'Aviation',
  limit: 25
});

// Search aircraft
const aircraft = await services.avainode.searchAircraft({
  departureAirport: 'KJFK',
  arrivalAirport: 'KLAX',
  departureDate: '2024-04-01',
  passengers: 8
});
```

### Data Synchronization
```typescript
import { DataSyncService } from './lib/mcp/data-sync';

const syncService = new DataSyncService(manager);

// Start automatic synchronization
syncService.startAutoSync(15); // Every 15 minutes

// Perform manual sync
await syncService.performFullSync();

// Handle webhook data
await syncService.handleWebhookSync('apollo', webhookData);
```

## Configuration

### Environment Variables
```bash
APOLLO_MCP_SERVER_URL=http://localhost:8123/mcp
AVAINODE_MCP_SERVER_URL=http://localhost:8124/mcp
N8N_MCP_SERVER_URL=http://localhost:8125/mcp
APOLLO_API_KEY=your_apollo_api_key
AVAINODE_API_KEY=your_avainode_api_key
```

### Server Configuration
```typescript
const serverConfigs: MCPServerConfig[] = [
  {
    name: 'apollo-io',
    url: process.env.APOLLO_MCP_SERVER_URL!,
    port: 8123,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  {
    name: 'avainode',
    url: process.env.AVAINODE_MCP_SERVER_URL!,
    port: 8124,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  {
    name: 'n8n',
    url: process.env.N8N_MCP_SERVER_URL!,
    port: 8125,
    timeout: 60000, // N8N workflows may take longer
    retryAttempts: 3,
    retryDelay: 2000
  }
];
```

## Integration Workflows

### Apollo Lead to Avainode Booking Pipeline
1. **Lead Discovery**: Search Apollo.io for prospects matching criteria
2. **Contact Enrichment**: Enhance lead data with additional contact information
3. **Aircraft Search**: Find available aircraft matching flight requirements
4. **Charter Request**: Create booking request with best aircraft option
5. **Workflow Execution**: Trigger N8N workflow for additional processing
6. **Notification**: Send confirmations and updates to stakeholders

### Real-time Data Synchronization
- **Lead Updates**: Sync new Apollo leads to internal database
- **Aircraft Availability**: Update real-time aircraft availability from Avainode
- **Workflow Status**: Monitor N8N execution status and results
- **Audit Trail**: Maintain comprehensive logs of all sync operations

## Error Handling and Resilience

### Connection Management
- Automatic retry with exponential backoff
- Connection pooling for efficient resource usage
- Health checks and automatic reconnection
- Graceful degradation when services are unavailable

### Data Consistency
- Transactional operations where possible
- Idempotency keys for safe retries
- Data validation and sanitization
- Conflict resolution strategies

### Monitoring and Alerting
- Real-time connection status monitoring
- Error rate tracking and alerting
- Performance metrics collection
- Audit log analysis and reporting

## Testing

### Integration Tests
```bash
npm test __tests__/integration/mcp-integration.test.ts
```

### Unit Tests
```bash
npm test __tests__/unit/mcp-client.test.ts
```

### API Testing
Use the test endpoints to verify functionality:
```bash
# Test Apollo webhook
GET /api/integration/webhook?test=apollo

# Check system status
GET /api/integration/status

# Validate data consistency
GET /api/integration/sync?action=validate
```

## Performance Considerations

### Connection Pooling
- Reuse connections to reduce overhead
- Configurable pool sizes per server
- Connection timeout management

### Request Batching
- Batch similar requests to reduce API calls
- Implement request queuing for high throughput
- Rate limiting compliance

### Caching Strategy
- Cache frequently accessed data
- Implement cache invalidation strategies
- Use Redis for distributed caching

### Scalability
- Horizontal scaling of MCP servers
- Load balancing across server instances
- Queue-based processing for high volumes

## Security Considerations

### Authentication
- Secure API key management
- Token rotation strategies
- Environment-specific credentials

### Data Protection
- Encryption in transit and at rest
- PII data handling compliance
- Secure webhook endpoints

### Access Control
- Role-based access to integration features
- API rate limiting and throttling
- Request/response logging for auditing

## Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] MCP servers deployed and accessible
- [ ] SSL certificates in place
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested
- [ ] Load balancing configured
- [ ] Auto-scaling policies defined

### Health Checks
The system provides comprehensive health checks:
```bash
# System health
GET /api/integration/status

# Connection status
GET /api/integration/sync?action=validate

# Individual service health
GET /api/integration/leads (Apollo)
GET /api/integration/aircraft (Avainode) 
GET /api/integration/workflows (N8N)
```

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Check MCP server availability
   - Verify network connectivity
   - Review timeout configurations

2. **Authentication Failures**
   - Validate API keys
   - Check environment variables
   - Verify server configurations

3. **Data Sync Issues**
   - Review audit logs
   - Check webhook configurations
   - Validate data consistency

4. **Performance Degradation**
   - Monitor connection pool usage
   - Check rate limiting status
   - Review error rates and timeouts

### Debugging Tools
- Integration status dashboard
- Comprehensive audit logs
- Real-time event monitoring
- Connection health metrics

## Contributing

When adding new features or modifications:

1. Update type definitions in `types.ts`
2. Add corresponding service methods
3. Include comprehensive error handling
4. Write unit and integration tests
5. Update documentation
6. Test with all MCP servers
7. Verify webhook functionality

## License

This integration system is part of the JetVision private jet charter platform.