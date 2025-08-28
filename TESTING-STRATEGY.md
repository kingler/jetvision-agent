# JetVision Platform Testing Strategy

This document outlines the comprehensive testing strategy implemented for the JetVision private jet charter services platform, including MCP server integrations and web application UI.

## Overview

Our testing strategy ensures 95%+ code coverage and maintains the high quality standards required for a luxury aviation platform handling sensitive business data. The strategy encompasses:

- **Unit Tests**: Component-level testing with mocks and stubs
- **Integration Tests**: API and service integration testing  
- **End-to-End Tests**: Complete user journey testing
- **Performance Tests**: Load testing and performance regression detection
- **Security Tests**: Vulnerability scanning and compliance checks

## Test Architecture

```
jetvision-agent/
├── apollo-io-mcp-server/
│   ├── tests/
│   │   ├── unit/           # Unit tests for Apollo tools
│   │   ├── integration/    # Apollo API integration tests
│   │   ├── e2e/           # End-to-end MCP server tests
│   │   └── fixtures/      # Mock data and test fixtures
├── avainode-mcp-server/
│   ├── tests/
│   │   ├── unit/           # Unit tests for Avainode tools
│   │   ├── integration/    # Avainode API integration tests
│   │   ├── e2e/           # End-to-end MCP server tests
│   │   └── fixtures/      # Mock data and test fixtures
├── jetvision-agent/
│   └── apps/web/
│       └── __tests__/     # React component and API route tests
├── __tests__/
│   ├── integration/       # Cross-platform integration tests
│   └── performance/       # Performance and load tests
└── .github/workflows/     # CI/CD automation
```

## Testing Standards

### Coverage Requirements
- **Minimum Coverage**: 95% for statements, branches, functions, and lines
- **Critical Paths**: 100% coverage for payment, booking, and safety-critical features
- **Error Handling**: All error scenarios must be tested

### Test Categories

#### 1. Unit Tests
**Purpose**: Test individual functions and components in isolation

**Location**: `{component}/tests/unit/`

**Coverage**:
- All MCP tool handlers
- API client methods
- Utility functions
- React components
- Business logic validation

**Example**:
```bash
# Run Apollo unit tests
cd apollo-io-mcp-server
npm run test:unit

# Run with coverage
npm run test:coverage
```

#### 2. Integration Tests
**Purpose**: Test interactions between services and APIs

**Location**: `{component}/tests/integration/`

**Coverage**:
- MCP server to external API communication
- Database operations
- Authentication flows
- Rate limiting
- Error propagation

**Example**:
```bash
# Run integration tests
cd apollo-io-mcp-server  
npm run test:integration
```

#### 3. End-to-End Tests
**Purpose**: Test complete user workflows and system interactions

**Location**: `{component}/tests/e2e/` and `__tests__/integration/`

**Coverage**:
- Complete lead search to booking flow
- MCP proxy communication
- Session management
- Error handling scenarios
- Cross-platform workflows

**Example**:
```bash
# Run E2E tests
cd apollo-io-mcp-server
npm run test:e2e
```

#### 4. Performance Tests
**Purpose**: Ensure system performance under load and detect regressions

**Location**: `__tests__/performance/`

**Coverage**:
- Load testing MCP endpoints
- Response time benchmarking
- Concurrent connection handling
- Memory usage monitoring
- Performance regression detection

**Example**:
```bash
# Run performance tests
cd __tests__/performance
node mcp-load-test.js http://localhost:8123 --concurrency=20 --iterations=100
```

## Test Automation

### Pre-commit Hooks
Automated quality checks run before each commit:

```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Run hooks manually
pre-commit run --all-files
```

**Hooks include**:
- ✅ Code formatting (Prettier)
- ✅ Linting (ESLint)
- ✅ TypeScript type checking
- ✅ Unit test execution
- ✅ Security vulnerability scanning
- ✅ MCP schema validation
- ✅ Performance regression check

### CI/CD Pipeline
GitHub Actions workflow runs comprehensive test suite:

**Triggers**:
- Push to main/develop branches
- Pull requests  
- Scheduled daily runs
- Manual triggers

**Jobs**:
1. **Lint and Format Check**: Code quality validation
2. **Unit Tests**: Parallel execution across components
3. **Integration Tests**: Service interaction testing
4. **E2E Tests**: Complete workflow validation
5. **Performance Tests**: Load testing (scheduled/manual)
6. **Security Tests**: Vulnerability scanning
7. **Deployment Tests**: Build validation

## Running Tests

### Local Development

```bash
# Install dependencies
npm install # or bun install for web app

# Run all tests
npm test

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:coverage     # With coverage report

# Quick tests for pre-commit
npm run test:unit:quick
```

### Component-Specific Testing

#### Apollo MCP Server
```bash
cd apollo-io-mcp-server

# Full test suite
npm test

# Test specific tools
npm test -- --testNamePattern="search-leads"

# Coverage report
npm run test:coverage
```

#### Avainode MCP Server
```bash
cd avainode-mcp-server

# Full test suite  
npm test

# Test specific tools
npm test -- --testNamePattern="search-aircraft"

# Coverage report
npm run test:coverage
```

#### JetVision Web App
```bash
cd jetvision-agent/apps/web

# Full test suite
bun run test

# Watch mode
bun run test:watch

# Coverage report
bun run test:coverage
```

### Integration Testing
```bash
# Start all services
./scripts/start-dev-environment.sh

# Run integration tests
cd __tests__/integration
npm test
```

### Performance Testing
```bash
# Start target servers
cd apollo-io-mcp-server && npm start &
cd avainode-mcp-server && PORT=8124 npm start &

# Run performance tests
cd __tests__/performance
node mcp-load-test.js http://localhost:8123
node mcp-load-test.js http://localhost:8124
```

## Test Configuration

### Jest Configuration
Each component has customized Jest configuration:

- **Test Environment**: Node.js for MCP servers, jsdom for web app
- **Coverage Thresholds**: 95% for all metrics
- **Test Patterns**: Automatic discovery of `*.test.{js,ts,tsx}` files
- **Setup Files**: Global test setup and mocks
- **Module Mapping**: Path aliases and asset mocks

### Mock Strategy
- **External APIs**: Mocked with realistic response data
- **Database**: In-memory databases or mock implementations
- **File System**: Virtual file system for testing
- **Network**: HTTP mocks and request interception
- **Time**: Deterministic time mocking for consistent tests

## Performance Benchmarks

### Response Time Targets
- **MCP Tool Calls**: < 2 seconds average, < 5 seconds P99
- **API Endpoints**: < 500ms average, < 2 seconds P95
- **Page Load**: < 3 seconds initial load, < 1 second navigation

### Throughput Targets
- **MCP Servers**: > 50 req/s sustained load
- **Web Application**: > 100 concurrent users
- **Database**: > 1000 queries/second

### Performance Testing Metrics
- ✅ Response time percentiles (P50, P95, P99)
- ✅ Throughput (requests per second)
- ✅ Error rate (< 0.1% in normal conditions)
- ✅ Resource utilization (CPU, memory, network)
- ✅ Concurrent connection handling

## Quality Assurance Checklist

### Before Each Release
- [ ] All tests pass with 95%+ coverage
- [ ] Performance benchmarks met
- [ ] Security scans completed
- [ ] Integration tests with live APIs verified
- [ ] Load testing completed
- [ ] Browser compatibility tested
- [ ] Accessibility compliance verified
- [ ] Error handling scenarios tested

### Continuous Monitoring
- [ ] Daily automated test runs
- [ ] Performance regression monitoring
- [ ] Dependency vulnerability scanning
- [ ] API endpoint health checks
- [ ] User experience monitoring

## Troubleshooting

### Common Test Issues

#### Tests Failing Intermittently
```bash
# Run tests with more verbose output
npm test -- --verbose

# Run single test file
npm test -- tests/unit/specific-test.test.ts

# Debug mode
npm test -- --detectOpenHandles --forceExit
```

#### Coverage Not Meeting Threshold
```bash
# Generate detailed coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

#### Performance Test Issues
```bash
# Check if servers are running
curl -f http://localhost:8123/health
curl -f http://localhost:8124/health

# Run with debug output
DEBUG=* node mcp-load-test.js http://localhost:8123
```

#### Integration Test Failures
```bash
# Check service dependencies
docker ps
redis-cli ping

# Verify API keys
echo $APOLLO_API_KEY
echo $AVAINODE_API_KEY

# Check network connectivity
curl -v https://api.apollo.io/v1/
```

## Best Practices

### Writing Tests
1. **Descriptive Test Names**: Use clear, specific test descriptions
2. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
3. **Single Responsibility**: Each test should verify one specific behavior
4. **Deterministic**: Tests should produce consistent results
5. **Fast Execution**: Unit tests should run quickly (< 1 second each)

### Mock Guidelines
1. **Mock External Dependencies**: Never call real APIs in unit tests
2. **Realistic Data**: Use representative mock data
3. **Error Scenarios**: Mock both success and failure cases
4. **Boundary Conditions**: Test edge cases and limits

### Maintenance
1. **Regular Updates**: Keep tests in sync with code changes
2. **Refactor Tests**: Apply same quality standards as production code
3. **Remove Obsolete Tests**: Clean up tests for removed features
4. **Performance Monitoring**: Track test execution times

## Security Testing

### Vulnerability Scanning
- **Dependencies**: Automated NPM audit checks
- **Code Analysis**: Static analysis with Trivy
- **Container Scanning**: Docker image vulnerability assessment
- **API Security**: Input validation and injection testing

### Compliance Testing
- **Data Privacy**: GDPR/CCPA compliance verification
- **Aviation Standards**: Industry-specific regulatory compliance
- **Security Standards**: SOC 2, ISO 27001 alignment
- **PCI DSS**: Payment processing security validation

## Conclusion

This testing strategy ensures the JetVision platform maintains the highest quality and reliability standards expected in the luxury aviation industry. The comprehensive test coverage, automated quality gates, and continuous monitoring provide confidence in system stability while enabling rapid, safe development iterations.

For questions or improvements to the testing strategy, please refer to the development team or create an issue in the project repository.