# JetVision MCP Server Development Instructions

You will implement two Model Context Protocol (MCP) servers using rigorous Test-Driven Development (TDD) methodology and strict adherence to MCP coding standards.

## JetVision Business Description

JetVision is a leading provider of private jet charter services, offering clients unparalleled luxury, convenience, and personalized experiences. With a fleet of meticulously maintained aircraft and a team of experienced aviation professionals, JetVision ensures every journey is seamless, efficient, and tailored to individual preferences. Whether for business trips, leisure travel, or special occasions, JetVision's commitment to excellence and client satisfaction sets it apart as a premier choice in the private aviation industry.

A full description for more context is located in this file: jetvision.md

## Objective

Create two Model Context Protocol (MCP) servers for JetVision's private jet charter services:

1. **apollo-io-mcp-server** - Integration with Apollo.io sales intelligence platform

2. **avainode-mcp-server** - Integration with Avainode aviation marketplace platform

## Prerequisites & Setup

### 1. Install Required Tools

```bash
npm install -g yo generator-mcp
```

### 2. Generate MCP Server Projects

Execute the following commands in your current working directory:

```bash
# Generate Apollo.io MCP Server
yo mcp
# When prompted:
# - Name: "apollo-io-mcp-server"
# - Description: "MCP server for Apollo.io sales intelligence and lead generation platform integration"

# Generate Avainode MCP Server  
yo mcp
# When prompted:
# - Name: "avainode-mcp-server"
# - Description: "MCP server for Avainode aviation marketplace and aircraft charter platform integration"
```

## Implementation Requirements

### 3. Transport Protocol

Both servers must implement **HTTP Streaming Transport** for real-time communication with their respective APIs.

### 4. API Integration Specifications

#### Apollo.io Integration

- **Base URL**: Use Apollo.io's REST API endpoints
- **Documentation**: https://docs.apollo.io/reference/how-to-test-api-endpoints
- **Required Tools**: Implement MCP tools for:
  - Lead search and prospecting
  - Contact enrichment
  - Email sequence management
  - Account-based marketing data

#### Avainode Integration

- **Base URL**: Use Avainode's API endpoints
- **Documentation**: https://developer.avinodegroup.com/reference/introduction-api-reference
- **Required Tools**: Implement MCP tools for:
  - Aircraft availability search
  - Charter request management
  - Pricing and quote generation
  - Booking management

### 5. Code Structure Requirements

#### Replace Weather API Example Code

The provided TypeScript example contains weather API code that must be replaced with:

**For apollo-io-mcp-server:**

- Replace `NWS_API_BASE` with Apollo.io API base URL
- Replace `USER_AGENT` with "jetvision-apollo-mcp/1.0"
- Replace weather-related interfaces with Apollo.io data models
- Replace `makeNWSRequest` with `makeApolloRequest`
- Implement Apollo.io-specific tools (replace get-alerts and get-forecast)

**For avainode-mcp-server:**

- Replace `NWS_API_BASE` with Avainode API base URL  
- Replace `USER_AGENT` with "jetvision-avainode-mcp/1.0"
- Replace weather-related interfaces with Avainode data models
- Replace `makeNWSRequest` with `makeAvinodeRequest`
- Implement Avainode-specific tools (replace get-alerts and get-forecast)

### 6. Testing Requirements

- Follow API documentation testing procedures for both platforms
- Implement proper error handling for API rate limits
- Add authentication handling as specified in each API's documentation
- Test all MCP tools with realistic JetVision use cases

### 7. Configuration

- Default port: 8123 (configurable via --port argument)
- Support multiple simultaneous client connections
- Implement proper session management
- Add logging for debugging and monitoring

## Deliverables

1. Two fully functional MCP servers in separate directories
2. Updated TypeScript code with platform-specific implementations
3. Proper API integration following official documentation
4. Test cases demonstrating successful API connectivity
5. Documentation for JetVision team on using the MCP tools

## Success Criteria

- Both servers start without errors
- API connections are established successfully
- MCP tools return valid data from respective platforms
- Code follows TypeScript best practices and error handling patterns


```typescript
// index.ts
import express, { Request, Response } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { MCPServer } from "./server.js";

// Default port
let PORT = 8123;

// Parse command-line arguments for --port=XXXX
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith("--port=")) {
    const value = parseInt(arg.split("=")[1], 10);
    if (!isNaN(value)) {
      PORT = value;
    } else {
      console.error("Invalid value for --port");
      process.exit(1);
    }
  }
}

const server = new MCPServer(
  new Server(
    {
      name: "mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    }
  )
);

const app = express();
app.use(express.json());

const router = express.Router();

// single endpoint for the client to send messages to
const MCP_ENDPOINT = "/mcp";

router.post(MCP_ENDPOINT, async (req: Request, res: Response) => {
  await server.handlePostRequest(req, res);
});

router.get(MCP_ENDPOINT, async (req: Request, res: Response) => {
  await server.handleGetRequest(req, res);
});

app.use("/", router);

app.listen(PORT, () => {
  console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  await server.cleanup();
  process.exit(0);
});
```

```typescript
// server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  Notification,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  LoggingMessageNotification,
  ToolListChangedNotification,
  JSONRPCNotification,
  JSONRPCError,
  InitializeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "crypto";
import { Request, Response } from "express";

const SESSION_ID_HEADER_NAME = "mcp-session-id";
const JSON_RPC = "2.0";
const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

// Helper function for making NWS API requests
async function makeNWSRequest<T>(url: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making NWS request:", error);
    return null;
  }
}

interface AlertFeature {
  properties: {
    event?: string;
    areaDesc?: string;
    severity?: string;
    status?: string;
    headline?: string;
  };
}

// Format alert data
function formatAlert(feature: AlertFeature): string {
  const props = feature.properties;
  return [
    `Event: ${props.event || "Unknown"}`,
    `Area: ${props.areaDesc || "Unknown"}`,
    `Severity: ${props.severity || "Unknown"}`,
    `Status: ${props.status || "Unknown"}`,
    `Headline: ${props.headline || "No headline"}`,
    "---",
  ].join("\n");
}

interface ForecastPeriod {
  name?: string;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string;
  windDirection?: string;
  shortForecast?: string;
}

interface AlertsResponse {
  features: AlertFeature[];
}

interface PointsResponse {
  properties: {
    forecast?: string;
  };
}

interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}

export class MCPServer {
  server: Server;

  // to support multiple simultaneous connections
  transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  private toolInterval: NodeJS.Timeout | undefined;
  private getAlertsToolName = "get-alerts";
  private getForecastToolName = "get-forecast";

  constructor(server: Server) {
    this.server = server;
    this.setupTools();
  }

  async handleGetRequest(req: Request, res: Response) {
    // if server does not offer an SSE stream at this endpoint.
    // res.status(405).set('Allow', 'POST').send('Method Not Allowed')

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !this.transports[sessionId]) {
      res
        .status(400)
        .json(
          this.createErrorResponse("Bad Request: invalid session ID or method.")
        );
      return;
    }

    console.log(`Establishing SSE stream for session ${sessionId}`);
    const transport = this.transports[sessionId];
    await transport.handleRequest(req, res);
    await this.streamMessages(transport);

    return;
  }

  async handlePostRequest(req: Request, res: Response) {
    const sessionId = req.headers[SESSION_ID_HEADER_NAME] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    try {
      // reuse existing transport
      if (sessionId && this.transports[sessionId]) {
        transport = this.transports[sessionId];
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // create new transport
      if (!sessionId && this.isInitializeRequest(req.body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        await this.server.connect(transport);
        await transport.handleRequest(req, res, req.body);

        // session ID will only be available (if in not Stateless-Mode)
        // after handling the first request
        const sessionId = transport.sessionId;
        if (sessionId) {
          this.transports[sessionId] = transport;
        }

        return;
      }

      res
        .status(400)
        .json(
          this.createErrorResponse("Bad Request: invalid session ID or method.")
        );
      return;
    } catch (error) {
      console.error("Error handling MCP request:", error);
      res.status(500).json(this.createErrorResponse("Internal server error."));
      return;
    }
  }

  async cleanup() {
    this.toolInterval?.close();
    await this.server.close();
  }

  private setupTools() {
    // Define available tools
    const setToolSchema = () =>
      this.server.setRequestHandler(ListToolsRequestSchema, async () => {
        const getAlertsTool = {
          name: this.getAlertsToolName,
          description: "Get weather alerts for a state",
          inputSchema: {
            type: "object",
            properties: {
              state: {
                type: "string",
                description: "Two-letter state code (e.g. CA, NY)",
              },
            },
            required: ["state"],
          },
        };

        const getForecastTool = {
          name: this.getForecastToolName,
          description: "Get weather forecast for a location",
          inputSchema: {
            type: "object",
            properties: {
              latitude: {
                type: "number",
                description: "Latitude of the location",
              },
              longitude: {
                type: "number",
                description: "Longitude of the location",
              },
            },
            required: ["latitude", "longitude"],
          },
        };

        return {
          tools: [getAlertsTool, getForecastTool],
        };
      });

    setToolSchema();

    // set tools dynamically, changing 5 second
    this.toolInterval = setInterval(async () => {
      setToolSchema();
      // to notify client that the tool changed
      Object.values(this.transports).forEach((transport) => {
        const notification: ToolListChangedNotification = {
          method: "notifications/tools/list_changed",
        };
        this.sendNotification(transport, notification);
      });
    }, 5000);

    // handle tool calls
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request, extra) => {
        const args = request.params.arguments;
        const toolName = request.params.name;
        console.log("Received request for tool with argument:", toolName, args);

        if (!args) {
          throw new Error("arguments undefined");
        }

        if (!toolName) {
          throw new Error("tool name undefined");
        }

        if (toolName === this.getAlertsToolName) {
          const state = args.state as string;
          const stateCode = state.toUpperCase();
          const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
          const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

          if (!alertsData) {
            return {
              content: [
                {
                  type: "text",
                  text: "Failed to retrieve alerts data",
                },
              ],
            };
          }

          const features = alertsData.features || [];
          if (features.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `No active alerts for ${stateCode}`,
                },
              ],
            };
          }

          const formattedAlerts = features.map(formatAlert);
          const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join(
            "\n"
          )}`;

          return {
            content: [
              {
                type: "text",
                text: alertsText,
              },
            ],
          };
        }

        if (toolName === this.getForecastToolName) {
          const latitude = args.latitude as number;
          const longitude = args.longitude as number;
          // Get grid point data
          const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(
            4
          )},${longitude.toFixed(4)}`;
          const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

          if (!pointsData) {
            return {
              content: [
                {
                  type: "text",
                  text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
                },
              ],
            };
          }

          const forecastUrl = pointsData.properties?.forecast;
          if (!forecastUrl) {
            return {
              content: [
                {
                  type: "text",
                  text: "Failed to get forecast URL from grid point data",
                },
              ],
            };
          }

          // Get forecast data
          const forecastData = await makeNWSRequest<ForecastResponse>(
            forecastUrl
          );
          if (!forecastData) {
            return {
              content: [
                {
                  type: "text",
                  text: "Failed to retrieve forecast data",
                },
              ],
            };
          }

          const periods = forecastData.properties?.periods || [];
          if (periods.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "No forecast periods available",
                },
              ],
            };
          }

          // Format forecast periods
          const formattedForecast = periods.map((period: ForecastPeriod) =>
            [
              `${period.name || "Unknown"}:`,
              `Temperature: ${period.temperature || "Unknown"}°${
                period.temperatureUnit || "F"
              }`,
              `Wind: ${period.windSpeed || "Unknown"} ${
                period.windDirection || ""
              }`,
              `${period.shortForecast || "No forecast available"}`,
              "---",
            ].join("\n")
          );

          const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join(
            "\n"
          )}`;

          return {
            content: [
              {
                type: "text",
                text: forecastText,
              },
            ],
          };
        }

        throw new Error("Tool not found");
      }
    );
  }

  // send message streaming message every second
  private async streamMessages(transport: StreamableHTTPServerTransport) {
    try {
      // based on LoggingMessageNotificationSchema to trigger setNotificationHandler on client
      const message: LoggingMessageNotification = {
        method: "notifications/message",
        params: { level: "info", data: "SSE Connection established" },
      };

      this.sendNotification(transport, message);

      let messageCount = 0;

      const interval = setInterval(async () => {
        messageCount++;

        const data = `Message ${messageCount} at ${new Date().toISOString()}`;

        const message: LoggingMessageNotification = {
          method: "notifications/message",
          params: { level: "info", data: data },
        };

        try {
          this.sendNotification(transport, message);

          if (messageCount === 2) {
            clearInterval(interval);

            const message: LoggingMessageNotification = {
              method: "notifications/message",
              params: { level: "info", data: "Streaming complete!" },
            };

            this.sendNotification(transport, message);
          }
        } catch (error) {
          console.error("Error sending message:", error);
          clearInterval(interval);
        }
      }, 1000);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  private async sendNotification(
    transport: StreamableHTTPServerTransport,
    notification: Notification
  ) {
    const rpcNotificaiton: JSONRPCNotification = {
      ...notification,
      jsonrpc: JSON_RPC,
    };
    await transport.send(rpcNotificaiton);
  }

  private createErrorResponse(message: string): JSONRPCError {
    return {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: message,
      },
      id: randomUUID(),
    };
  }

  private isInitializeRequest(body: any): boolean {
    const isInitial = (data: any) => {
      const result = InitializeRequestSchema.safeParse(data);
      return result.success;
    };
    if (Array.isArray(body)) {
      return body.some((request) => isInitial(request));
    }
    return isInitial(body);
  }
}
```

# JetVision MCP Server Development Instructions - Test-Driven Development Approach

You will implement two Model Context Protocol (MCP) servers using rigorous Test-Driven Development (TDD) methodology and strict adherence to MCP coding standards.

## Test-Driven Development Requirements

### TDD Cycle Implementation
Follow the Red-Green-Refactor cycle for ALL code:

1. **RED**: Write failing tests first
   - Unit tests for each MCP tool function
   - Integration tests for API endpoints
   - Error handling test cases
   - Authentication/authorization tests

2. **GREEN**: Write minimal code to pass tests
   - Implement only what's needed to make tests pass
   - Focus on functionality over optimization

3. **REFACTOR**: Improve code quality while maintaining test coverage
   - Apply MCP best practices
   - Optimize performance
   - Ensure code maintainability

### Testing Framework Setup
```bash
# Install testing dependencies
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
npm install --save-dev @jest/globals jest-environment-node
```

### Test Structure Requirements
Create comprehensive test suites:

```
/tests
├── unit/
│   ├── apollo-tools.test.ts
│   ├── avainode-tools.test.ts
│   └── server-utils.test.ts
├── integration/
│   ├── apollo-api.test.ts
│   ├── avainode-api.test.ts
│   └── mcp-transport.test.ts
├── e2e/
│   ├── apollo-server.test.ts
│   └── avainode-server.test.ts
└── fixtures/
    ├── apollo-mock-data.json
    └── avainode-mock-data.json
```

## MCP Server Coding Standards & Best Practices

### 1. Code Quality Standards
- **TypeScript strict mode**: Enable all strict compiler options
- **ESLint configuration**: Use @typescript-eslint/recommended
- **Prettier formatting**: Consistent code formatting
- **100% test coverage**: All functions must have corresponding tests
- **Error handling**: Comprehensive try-catch blocks with specific error types
- **Logging**: Structured logging with appropriate log levels

### 2. MCP-Specific Best Practices
- **Tool naming**: Use kebab-case (e.g., `search-leads`, `get-aircraft-availability`)
- **Input validation**: Validate all tool parameters using JSON Schema
- **Response formatting**: Consistent response structure with proper error codes
- **Session management**: Proper cleanup of transport connections
- **Rate limiting**: Implement client-side rate limiting for API calls
- **Caching**: Cache API responses where appropriate (with TTL)

### 3. API Integration Standards
- **Authentication**: Secure API key management using environment variables
- **Request retry logic**: Exponential backoff for failed requests
- **Response validation**: Validate API responses against expected schemas
- **Error mapping**: Map API errors to appropriate MCP error responses
- **Timeout handling**: Set appropriate timeouts for all API calls

## Implementation Specifications

### Apollo.io MCP Server Requirements

#### Test Cases to Implement First:
```typescript
describe('Apollo.io MCP Tools', () => {
  test('search-leads tool validates required parameters')
  test('search-leads returns formatted lead data')
  test('enrich-contact handles missing contact gracefully')
  test('create-email-sequence validates sequence parameters')
  test('get-account-data handles rate limiting')
})
```

#### Required MCP Tools:
1. **search-leads**: Search for prospects based on criteria
2. **enrich-contact**: Enrich contact information
3. **create-email-sequence**: Create automated email sequences
4. **get-account-data**: Retrieve account-based marketing data
5. **track-engagement**: Track email/call engagement metrics

### Avainode MCP Server Requirements

#### Test Cases to Implement First:
```typescript
describe('Avainode MCP Tools', () => {
  test('search-aircraft validates search parameters')
  test('search-aircraft returns available aircraft')
  test('create-charter-request handles booking data')
  test('get-pricing calculates accurate quotes')
  test('manage-booking updates booking status')
})
```

#### Required MCP Tools:
1. **search-aircraft**: Search available aircraft by criteria
2. **create-charter-request**: Submit charter requests
3. **get-pricing**: Generate pricing quotes
4. **manage-booking**: Handle booking lifecycle
5. **get-operator-info**: Retrieve operator details

### Code Replacement Strategy

#### Replace Weather API Components:
1. **Constants**: Replace `NWS_API_BASE` with platform-specific base URLs
2. **User Agents**: Use "jetvision-apollo-mcp/1.0" and "jetvision-avainode-mcp/1.0"
3. **Interfaces**: Replace weather interfaces with platform-specific data models
4. **Request Functions**: Replace `makeNWSRequest` with `makeApolloRequest`/`makeAvinodeRequest`
5. **Tool Handlers**: Replace weather tools with platform-specific implementations

## Validation & Quality Gates

### Pre-commit Hooks
```bash
# Install husky for git hooks
npm install --save-dev husky lint-staged
```

### Quality Checklist (All must pass):
- [ ] All tests pass (100% success rate)
- [ ] Test coverage ≥ 95%
- [ ] ESLint passes with zero warnings
- [ ] TypeScript compiles without errors
- [ ] API integration tests pass with real endpoints
- [ ] MCP protocol compliance verified
- [ ] Performance benchmarks meet requirements
- [ ] Security scan passes (no vulnerabilities)

## Deliverables

### Required Artifacts:
1. **Source Code**: Two complete MCP servers with full test suites
2. **Test Reports**: Coverage reports and test execution results
3. **API Documentation**: Generated docs for all MCP tools
4. **Integration Guide**: Step-by-step setup and usage instructions
5. **Performance Metrics**: Benchmark results and optimization recommendations

### Success Criteria:
- Both servers start and respond within 2 seconds
- All MCP tools return valid responses within 5 seconds
- Error handling covers all edge cases with appropriate messages
- Code passes all quality gates without exceptions
- Documentation enables JetVision team to use tools independently
