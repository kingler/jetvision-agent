# JetVision Agent E2E Testing Suite

Comprehensive end-to-end testing suite for the JetVision Agent platform using Playwright. This test suite validates the complete user journey from authentication to aviation-specific workflows, ensuring 98% production readiness.

## Overview

The JetVision Agent E2E test suite is designed to test the critical business workflows of a private aviation platform that integrates with Apollo.io for lead generation and Avinode for aircraft management. The tests ensure that the 95% of user interactions that route through N8N workflows function correctly, with proper fallback mechanisms in place.

## Test Architecture

### Core Components

- **Playwright Configuration** (`playwright.config.ts`) - Multi-browser testing with CI/CD integration
- **Global Setup/Teardown** - Environment preparation and cleanup
- **Test Fixtures** - Aviation-specific test data and mock responses
- **Utilities** - Authentication, N8N mocking, and custom assertions
- **Test Suites** - Comprehensive coverage of all major features

### Test Structure

```
e2e/
├── fixtures/               # Test data and mock responses
│   ├── aviation-queries.ts  # Apollo.io and Avinode query scenarios
│   ├── user-profiles.ts     # User roles and permissions
│   └── n8n-responses.ts     # Expected N8N workflow responses
├── tests/                  # Test specifications
│   ├── chat-interface.spec.ts      # Chat UI and TipTap functionality
│   ├── n8n-workflows.spec.ts       # N8N integration testing
│   ├── apollo-integration.spec.ts  # Apollo.io workflow tests
│   ├── avinode-integration.spec.ts # Avinode workflow tests
│   ├── error-handling.spec.ts      # Fallback and error scenarios
│   ├── authentication.spec.ts      # Clerk authentication flows
│   └── performance.spec.ts         # Performance and reliability
├── utils/                  # Test utilities and helpers
│   ├── auth-helpers.ts     # Authentication test utilities
│   ├── n8n-helpers.ts      # N8N mocking and validation
│   └── assertions.ts       # Aviation-specific assertions
├── global-setup.ts         # Test environment setup
├── global-teardown.ts      # Test environment cleanup
└── README.md               # This file
```

## Test Coverage

### 1. Chat Interface Functionality (`chat-interface.spec.ts`)
- **Basic Chat Input**: Text input, send buttons, keyboard shortcuts
- **Rich Text Editing**: TipTap integration, formatting, lists
- **Message History**: Threading, scrolling, persistence
- **Aviation Prompt Cards**: Industry-specific suggestions
- **Image Attachment**: Upload and drag-and-drop
- **Code Block Rendering**: Syntax highlighting, copy functionality
- **Performance**: Rapid messaging, long chat sessions

### 2. N8N Workflow Integration (`n8n-workflows.spec.ts`)
- **Webhook Connectivity**: Authentication, user context passing
- **Response Processing**: Success handling, streaming, partial responses
- **Error Handling**: Service failures, timeouts, malformed data
- **Performance**: Concurrent requests, response time measurement
- **Business Logic**: Aviation query routing, context maintenance

### 3. Apollo.io Integration (`apollo-integration.spec.ts`)
- **Lead Generation**: Executive assistant searches, industry filtering
- **Campaign Management**: Performance metrics, targeting, optimization
- **Contact Management**: Profile creation, enrichment, deduplication
- **Data Validation**: Email format, accuracy, large datasets
- **Edge Cases**: Rate limits, API consistency

### 4. Avinode Integration (`avinode-integration.spec.ts`)
- **Aircraft Search**: Availability, multi-type queries, radius searches
- **Fleet Management**: Utilization metrics, performance analysis, maintenance
- **Pricing and Quoting**: Charter quotes, cost breakdowns, operator comparison
- **Booking Operations**: History, crew scheduling, flight planning
- **Market Intelligence**: Trends analysis, route demand

### 5. Error Handling and Fallbacks (`error-handling.spec.ts`)
- **N8N Service Failures**: Circuit breaker activation, recovery
- **API Fallbacks**: Direct Apollo.io/Avinode API calls
- **Network Issues**: Disconnection, slow connections, intermittent failures
- **Authentication Errors**: Token expiry, permission denial
- **Data Validation**: Malformed responses, input validation
- **Recovery**: Resilience, user-friendly errors, retry mechanisms

### 6. Authentication Flow (`authentication.spec.ts`)
- **Login Process**: Clerk integration, user types, session persistence
- **Permission Management**: Role-based access, Apollo.io/Avinode permissions
- **Session Management**: Navigation, concurrent sessions, token refresh
- **Security**: XSS prevention, CSRF protection, session validation
- **Error Scenarios**: Service outages, corrupted data

### 7. Performance and Reliability (`performance.spec.ts`)
- **Page Load Performance**: FCP, LCP, concurrent users
- **N8N Response Times**: Apollo.io/Avinode workflow performance
- **Memory Management**: Memory leaks, large payloads, DOM cleanup
- **Network Reliability**: 95% success rate testing, timeout handling
- **Scalability**: Increasing message volume, performance degradation

## Key Features Tested

### Aviation-Specific Workflows
- **Apollo.io Lead Generation**:
  - "Find executive assistants at Fortune 500 companies in California"
  - Campaign performance metrics and optimization
  - Aviation industry executive searches

- **Avinode Aircraft Management**:
  - "Search for Gulfstream G650 availability NYC to London"
  - Fleet utilization metrics and reporting
  - Charter pricing and booking workflows

- **System Integration**:
  - Health checks and API connectivity
  - N8N workflow status monitoring
  - Error recovery and fallback mechanisms

### Critical User Journeys
1. **Executive Assistant Workflow**: Login → Search leads → Review results → Export data
2. **Charter Booking Journey**: Search aircraft → Get quote → Review availability → Initiate booking
3. **Campaign Management**: Create campaign → Monitor metrics → Optimize performance
4. **System Administration**: Health checks → Service status → Error monitoring

## Test Data and Mocking

### User Profiles
- **Admin User**: Full system access, N8N management permissions
- **Sales User**: Apollo.io access, lead generation capabilities
- **Charter Ops User**: Avinode access, aircraft management
- **Demo User**: Limited read-only access for trials

### Aviation Queries
- **Apollo.io Queries**: 5 comprehensive scenarios covering lead generation and campaign management
- **Avinode Queries**: 5 scenarios covering aircraft search, fleet management, and pricing
- **System Queries**: Health checks, workflow monitoring, error recovery

### N8N Response Mocking
- **Success Responses**: Realistic aviation data with proper formatting
- **Error Responses**: Timeout, rate limiting, authentication failures
- **Streaming Support**: Chunk-based responses with progress indicators

## Running the Tests

### Prerequisites
```bash
# Install Playwright browsers
bun run test:e2e:install
```

### Test Commands
```bash
# Run all E2E tests
bun run test:e2e

# Run with browser UI visible
bun run test:e2e:headed

# Run with Playwright UI for debugging
bun run test:e2e:ui

# Run specific test file
bun run test:e2e tests/chat-interface.spec.ts

# Debug specific test
bun run test:e2e:debug tests/apollo-integration.spec.ts

# View test report
bun run test:e2e:report
```

### Environment Setup
```bash
# Ensure the development server is running
bun run dev

# The tests will automatically start the dev server if not running
# Base URL defaults to http://localhost:3000
```

## Test Configuration

### Browser Support
- **Chromium**: Primary testing browser
- **WebKit**: Safari compatibility testing
- **Mobile Chrome**: Mobile responsiveness

### CI/CD Integration
- Automatic retry on failures (2 retries in CI)
- Parallel execution disabled in CI for stability
- HTML, JUnit, and JSON reporters for comprehensive reporting
- Screenshot and video capture on failures

### Performance Thresholds
- **Page Load**: < 3 seconds
- **N8N Response**: < 15 seconds (Apollo.io), < 20 seconds (Avinode)
- **Success Rate**: > 95% for N8N integrations
- **Memory Usage**: < 100MB during long sessions

## Key Testing Strategies

### 1. N8N Workflow Validation
- Mock N8N webhook responses with realistic delays
- Test streaming responses with progress indicators
- Validate business logic for aviation-specific queries
- Error simulation and recovery testing

### 2. Authentication Testing
- Clerk integration with multiple user roles
- Permission-based UI rendering
- Session persistence and security
- Mock authentication for consistent testing

### 3. Performance Monitoring
- Real-time response time measurement
- Memory leak detection
- Concurrent user simulation
- Scalability testing under load

### 4. Aviation Domain Validation
- Industry-specific data formatting
- Aircraft tail number validation (N123AB format)
- Airport code recognition (KJFK format)
- Aviation terminology and metrics

## Expected Outcomes

### Response Times
- **N8N Workflows**: 5-15 seconds average response time
- **Page Load**: < 3 seconds for complete application load
- **Streaming**: First chunk within 3 seconds

### Reliability Metrics
- **Success Rate**: >95% for N8N integrations
- **Circuit Breaker**: Activation after 5 consecutive failures
- **Fallback System**: Direct API fallback within 30 seconds
- **Error Recovery**: Automatic retry with exponential backoff

### User Experience
- Smooth chat interface with proper loading states
- Aviation queries return properly formatted results
- User-friendly error messages with recovery options
- Consistent performance across different user roles

## Monitoring and Reporting

### Test Reports
- **HTML Report**: Visual test results with screenshots
- **JUnit XML**: CI/CD integration format
- **JSON Report**: Detailed test execution data
- **Coverage Report**: Test scenario coverage metrics

### Performance Metrics
- Response time tracking over test runs
- Memory usage monitoring
- Error rate analysis
- N8N workflow performance trends

### Failure Analysis
- Screenshot capture on test failures
- Video recordings for complex scenarios
- Detailed error logs with correlation IDs
- Network request/response logging

## Maintenance and Updates

### Test Data Updates
- Aviation query scenarios should be updated quarterly
- User profiles should reflect actual permission model
- N8N response mocks should match production schemas

### Performance Baselines
- Response time thresholds reviewed monthly
- Memory usage limits adjusted based on production metrics
- Success rate targets updated based on service reliability

### CI/CD Integration
- Tests run on every pull request
- Performance regression detection
- Automated test result notifications
- Integration with deployment pipelines

## Troubleshooting

### Common Issues

1. **Test Timeouts**
   - Increase timeout values in playwright.config.ts
   - Check if dev server is running
   - Verify N8N webhook mocking is active

2. **Authentication Failures**
   - Ensure Clerk configuration is correct
   - Verify user profile fixtures are valid
   - Check session persistence logic

3. **N8N Mock Issues**
   - Verify webhook route matching
   - Check response data structure
   - Ensure correlation IDs are unique

### Debug Commands
```bash
# Run specific test with full output
bun run test:e2e tests/chat-interface.spec.ts --headed --debug

# Generate trace files for analysis
bun run test:e2e --trace on

# Run with network logging
bun run test:e2e --project chromium --headed
```

This comprehensive test suite ensures the JetVision Agent platform meets production-ready standards with thorough coverage of all aviation-specific workflows, robust error handling, and performance validation.