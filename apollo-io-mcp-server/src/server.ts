import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  Notification,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  LoggingMessageNotification,
  JSONRPCNotification,
  JSONRPCError,
  InitializeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { ApolloTools } from "./apollo-tools";

const SESSION_ID_HEADER_NAME = "mcp-session-id";
const JSON_RPC = "2.0";

export class MCPServer {
  server: Server;
  transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
  private apolloTools: ApolloTools;

  constructor(server: Server) {
    this.server = server;
    this.apolloTools = new ApolloTools();
    this.setupTools();
  }

  async handleGetRequest(req: Request, res: Response) {
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
    await this.server.close();
  }

  private setupTools() {
    // Define available Apollo.io tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        {
          name: "search-leads",
          description: "Search for prospects based on job title, industry, company size, and location",
          inputSchema: {
            type: "object",
            properties: {
              jobTitle: {
                type: "string",
                description: "Job title to search for (e.g., CEO, CFO, CTO)"
              },
              industry: {
                type: "string",
                description: "Industry sector (e.g., Aviation, Technology, Finance)"
              },
              companySize: {
                type: "string",
                description: "Company size range (e.g., 50-200, 200-500, 500+)"
              },
              location: {
                type: "string",
                description: "Geographic location (country, state, or city)"
              },
              limit: {
                type: "number",
                description: "Maximum number of results to return",
                default: 25
              }
            },
            required: []
          }
        },
        {
          name: "enrich-contact",
          description: "Enrich contact information with additional data from Apollo.io",
          inputSchema: {
            type: "object",
            properties: {
              email: {
                type: "string",
                description: "Email address of the contact to enrich"
              },
              linkedinUrl: {
                type: "string",
                description: "LinkedIn profile URL (optional)"
              }
            },
            required: ["email"]
          }
        },
        {
          name: "create-email-sequence",
          description: "Create an automated email sequence for lead nurturing",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name of the email sequence"
              },
              contacts: {
                type: "array",
                items: { type: "string" },
                description: "List of contact emails to add to the sequence"
              },
              templateIds: {
                type: "array",
                items: { type: "string" },
                description: "List of email template IDs to use in the sequence"
              },
              delayDays: {
                type: "array",
                items: { type: "number" },
                description: "Days to wait between each email"
              }
            },
            required: ["name", "contacts"]
          }
        },
        {
          name: "get-account-data",
          description: "Retrieve account-based marketing data for a company",
          inputSchema: {
            type: "object",
            properties: {
              domain: {
                type: "string",
                description: "Company domain (e.g., example.com)"
              },
              includeContacts: {
                type: "boolean",
                description: "Include contact information in the response",
                default: true
              }
            },
            required: ["domain"]
          }
        },
        {
          name: "track-engagement",
          description: "Track email and call engagement metrics for campaigns",
          inputSchema: {
            type: "object",
            properties: {
              sequenceId: {
                type: "string",
                description: "ID of the sequence to track"
              },
              startDate: {
                type: "string",
                description: "Start date for metrics (YYYY-MM-DD)"
              },
              endDate: {
                type: "string",
                description: "End date for metrics (YYYY-MM-DD)"
              }
            },
            required: ["sequenceId"]
          }
        },
        {
          name: "search-organizations",
          description: "Search for organizations/companies based on industry, size, location, and other criteria",
          inputSchema: {
            type: "object",
            properties: {
              industry: {
                type: "string",
                description: "Industry sector (e.g., Aviation, Technology, Finance)"
              },
              employeeCount: {
                type: "string",
                description: "Employee count range (e.g., 1-10, 11-50, 51-200, 201-500, 501+)"
              },
              revenue: {
                type: "string",
                description: "Annual revenue range (e.g., <$1M, $1M-$10M, $10M-$50M, $50M+)"
              },
              location: {
                type: "string",
                description: "Geographic location (country, state, or city)"
              },
              technologies: {
                type: "array",
                items: { type: "string" },
                description: "Technologies used by the organization"
              },
              limit: {
                type: "number",
                description: "Maximum number of results to return",
                default: 25
              }
            },
            required: []
          }
        },
        {
          name: "bulk-enrich-contacts",
          description: "Enrich multiple contacts (up to 10) with additional data from Apollo.io in a single request",
          inputSchema: {
            type: "object",
            properties: {
              contacts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    email: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    domain: { type: "string" },
                    linkedinUrl: { type: "string" }
                  }
                },
                description: "Array of contact objects to enrich (max 10)",
                maxItems: 10
              },
              revealPersonalEmails: {
                type: "boolean",
                description: "Include personal email addresses in results",
                default: false
              },
              revealPhoneNumbers: {
                type: "boolean",
                description: "Include phone numbers in results",
                default: false
              }
            },
            required: ["contacts"]
          }
        },
        {
          name: "bulk-enrich-organizations",
          description: "Enrich multiple organizations (up to 10) with additional data from Apollo.io in a single request",
          inputSchema: {
            type: "object",
            properties: {
              organizations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    domain: { type: "string" },
                    name: { type: "string" }
                  }
                },
                description: "Array of organization objects to enrich (max 10)",
                maxItems: 10
              }
            },
            required: ["organizations"]
          }
        },
        {
          name: "create-contact",
          description: "Create a new contact in Apollo.io CRM",
          inputSchema: {
            type: "object",
            properties: {
              firstName: {
                type: "string",
                description: "Contact's first name"
              },
              lastName: {
                type: "string",
                description: "Contact's last name"
              },
              email: {
                type: "string",
                description: "Contact's email address"
              },
              title: {
                type: "string",
                description: "Contact's job title"
              },
              company: {
                type: "string",
                description: "Contact's company name"
              },
              phone: {
                type: "string",
                description: "Contact's phone number"
              },
              linkedinUrl: {
                type: "string",
                description: "Contact's LinkedIn profile URL"
              },
              accountId: {
                type: "string",
                description: "Associated account ID in Apollo"
              }
            },
            required: ["firstName", "lastName", "email"]
          }
        },
        {
          name: "update-contact",
          description: "Update an existing contact in Apollo.io CRM",
          inputSchema: {
            type: "object",
            properties: {
              contactId: {
                type: "string",
                description: "Apollo contact ID to update"
              },
              firstName: {
                type: "string",
                description: "Updated first name"
              },
              lastName: {
                type: "string",
                description: "Updated last name"
              },
              email: {
                type: "string",
                description: "Updated email address"
              },
              title: {
                type: "string",
                description: "Updated job title"
              },
              company: {
                type: "string",
                description: "Updated company name"
              },
              phone: {
                type: "string",
                description: "Updated phone number"
              },
              linkedinUrl: {
                type: "string",
                description: "Updated LinkedIn profile URL"
              }
            },
            required: ["contactId"]
          }
        },
        {
          name: "search-contacts",
          description: "Search existing contacts in Apollo.io CRM with filters",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query (searches across names, emails, companies)"
              },
              accountId: {
                type: "string",
                description: "Filter by specific account ID"
              },
              jobTitle: {
                type: "string",
                description: "Filter by job title"
              },
              company: {
                type: "string",
                description: "Filter by company name"
              },
              lastContactedDays: {
                type: "number",
                description: "Filter by days since last contact"
              },
              limit: {
                type: "number",
                description: "Maximum number of results to return",
                default: 25
              }
            },
            required: []
          }
        },
        {
          name: "search-news",
          description: "Search for news articles related to companies or industries",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query for news articles"
              },
              organizationId: {
                type: "string",
                description: "Filter news by specific organization ID"
              },
              industry: {
                type: "string",
                description: "Filter news by industry"
              },
              startDate: {
                type: "string",
                description: "Start date for news search (YYYY-MM-DD)"
              },
              endDate: {
                type: "string",
                description: "End date for news search (YYYY-MM-DD)"
              },
              limit: {
                type: "number",
                description: "Maximum number of results to return",
                default: 25
              }
            },
            required: []
          }
        },
        {
          name: "search-job-postings",
          description: "Find job postings from organizations to identify expansion or hiring trends",
          inputSchema: {
            type: "object",
            properties: {
              organizationId: {
                type: "string",
                description: "Organization ID to search job postings for"
              },
              domain: {
                type: "string",
                description: "Company domain to search job postings for"
              },
              jobTitles: {
                type: "array",
                items: { type: "string" },
                description: "Filter by specific job titles"
              },
              departments: {
                type: "array",
                items: { type: "string" },
                description: "Filter by departments (e.g., Engineering, Sales, Marketing)"
              },
              limit: {
                type: "number",
                description: "Maximum number of results to return",
                default: 25
              }
            },
            required: []
          }
        },
        {
          name: "create-deal",
          description: "Create a new sales deal in Apollo.io",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Deal name/title"
              },
              value: {
                type: "number",
                description: "Deal value in USD"
              },
              stage: {
                type: "string",
                description: "Deal stage (e.g., Prospecting, Qualification, Proposal, Negotiation, Closed Won)"
              },
              contactId: {
                type: "string",
                description: "Primary contact ID for the deal"
              },
              accountId: {
                type: "string",
                description: "Account ID associated with the deal"
              },
              closeDate: {
                type: "string",
                description: "Expected close date (YYYY-MM-DD)"
              },
              probability: {
                type: "number",
                description: "Win probability percentage (0-100)"
              },
              description: {
                type: "string",
                description: "Deal description and notes"
              }
            },
            required: ["name", "value", "stage"]
          }
        },
        {
          name: "update-deal",
          description: "Update an existing sales deal in Apollo.io",
          inputSchema: {
            type: "object",
            properties: {
              dealId: {
                type: "string",
                description: "Deal ID to update"
              },
              name: {
                type: "string",
                description: "Updated deal name"
              },
              value: {
                type: "number",
                description: "Updated deal value"
              },
              stage: {
                type: "string",
                description: "Updated deal stage"
              },
              closeDate: {
                type: "string",
                description: "Updated close date (YYYY-MM-DD)"
              },
              probability: {
                type: "number",
                description: "Updated win probability (0-100)"
              },
              description: {
                type: "string",
                description: "Updated description"
              }
            },
            required: ["dealId"]
          }
        },
        {
          name: "search-deals",
          description: "Search and filter sales deals in Apollo.io",
          inputSchema: {
            type: "object",
            properties: {
              stage: {
                type: "string",
                description: "Filter by deal stage"
              },
              minValue: {
                type: "number",
                description: "Minimum deal value"
              },
              maxValue: {
                type: "number",
                description: "Maximum deal value"
              },
              accountId: {
                type: "string",
                description: "Filter by account ID"
              },
              contactId: {
                type: "string",
                description: "Filter by contact ID"
              },
              closeDateStart: {
                type: "string",
                description: "Start date for close date range (YYYY-MM-DD)"
              },
              closeDateEnd: {
                type: "string",
                description: "End date for close date range (YYYY-MM-DD)"
              },
              limit: {
                type: "number",
                description: "Maximum number of results to return",
                default: 25
              }
            },
            required: []
          }
        },
        {
          name: "create-task",
          description: "Create a task for follow-up activities in Apollo.io",
          inputSchema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Task title"
              },
              description: {
                type: "string",
                description: "Task description and notes"
              },
              dueDate: {
                type: "string",
                description: "Task due date (YYYY-MM-DD)"
              },
              priority: {
                type: "string",
                description: "Task priority (Low, Medium, High)",
                enum: ["Low", "Medium", "High"]
              },
              contactId: {
                type: "string",
                description: "Associated contact ID"
              },
              accountId: {
                type: "string",
                description: "Associated account ID"
              },
              dealId: {
                type: "string",
                description: "Associated deal ID"
              },
              type: {
                type: "string",
                description: "Task type (Call, Email, Meeting, Other)"
              }
            },
            required: ["title", "dueDate"]
          }
        },
        {
          name: "log-call",
          description: "Log a call activity with a contact in Apollo.io",
          inputSchema: {
            type: "object",
            properties: {
              contactId: {
                type: "string",
                description: "Contact ID for the call"
              },
              duration: {
                type: "number",
                description: "Call duration in minutes"
              },
              outcome: {
                type: "string",
                description: "Call outcome (Connected, Voicemail, No Answer, Busy, Wrong Number)"
              },
              notes: {
                type: "string",
                description: "Call notes and summary"
              },
              callDate: {
                type: "string",
                description: "Date and time of the call (ISO 8601 format)"
              },
              nextSteps: {
                type: "string",
                description: "Next steps after the call"
              }
            },
            required: ["contactId", "duration", "outcome"]
          }
        },
        {
          name: "get-api-usage",
          description: "Get current API usage statistics and credit consumption",
          inputSchema: {
            type: "object",
            properties: {
              startDate: {
                type: "string",
                description: "Start date for usage report (YYYY-MM-DD)"
              },
              endDate: {
                type: "string",
                description: "End date for usage report (YYYY-MM-DD)"
              },
              breakdown: {
                type: "boolean",
                description: "Include detailed breakdown by endpoint",
                default: false
              }
            },
            required: []
          }
        },
        {
          name: "search-sequences",
          description: "Search for existing email sequences",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query for sequence name"
              },
              status: {
                type: "string",
                enum: ["active", "paused", "completed", "draft"],
                description: "Filter by sequence status"
              },
              createdAfter: {
                type: "string",
                description: "Filter sequences created after date (YYYY-MM-DD)"
              },
              createdBefore: {
                type: "string",
                description: "Filter sequences created before date (YYYY-MM-DD)"
              },
              limit: {
                type: "number",
                description: "Maximum number of results to return",
                default: 25
              }
            },
            required: []
          }
        },
        {
          name: "search-tasks",
          description: "Search for tasks with filters",
          inputSchema: {
            type: "object",
            properties: {
              assignedTo: {
                type: "string",
                description: "User ID of task assignee"
              },
              status: {
                type: "string",
                enum: ["pending", "completed", "overdue", "cancelled"],
                description: "Task status filter"
              },
              dueDateStart: {
                type: "string",
                description: "Start date for due date range (YYYY-MM-DD)"
              },
              dueDateEnd: {
                type: "string",
                description: "End date for due date range (YYYY-MM-DD)"
              },
              contactId: {
                type: "string",
                description: "Filter by associated contact"
              },
              accountId: {
                type: "string",
                description: "Filter by associated account"
              },
              dealId: {
                type: "string",
                description: "Filter by associated deal"
              },
              priority: {
                type: "string",
                enum: ["Low", "Medium", "High"],
                description: "Task priority filter"
              },
              type: {
                type: "string",
                enum: ["Call", "Email", "Meeting", "Other"],
                description: "Task type filter"
              },
              limit: {
                type: "number",
                description: "Maximum number of results to return",
                default: 25
              }
            },
            required: []
          }
        },
        {
          name: "update-sequence",
          description: "Update an existing email sequence",
          inputSchema: {
            type: "object",
            properties: {
              sequenceId: {
                type: "string",
                description: "ID of the sequence to update"
              },
              name: {
                type: "string",
                description: "Updated sequence name"
              },
              status: {
                type: "string",
                enum: ["active", "paused", "completed"],
                description: "Updated sequence status"
              },
              templateIds: {
                type: "array",
                items: { type: "string" },
                description: "Updated list of email template IDs"
              },
              delayDays: {
                type: "array",
                items: { type: "number" },
                description: "Updated delays between emails"
              }
            },
            required: ["sequenceId"]
          }
        },
        {
          name: "get-sequence-stats",
          description: "Get detailed statistics for an email sequence",
          inputSchema: {
            type: "object",
            properties: {
              sequenceId: {
                type: "string",
                description: "ID of the sequence to get stats for"
              },
              startDate: {
                type: "string",
                description: "Start date for stats (YYYY-MM-DD)"
              },
              endDate: {
                type: "string",
                description: "End date for stats (YYYY-MM-DD)"
              }
            },
            required: ["sequenceId"]
          }
        },
        {
          name: "add-contacts-to-sequence",
          description: "Add contacts to an existing email sequence",
          inputSchema: {
            type: "object",
            properties: {
              sequenceId: {
                type: "string",
                description: "ID of the sequence"
              },
              contactIds: {
                type: "array",
                items: { type: "string" },
                description: "List of contact IDs to add"
              },
              emails: {
                type: "array",
                items: { type: "string" },
                description: "List of email addresses to add"
              }
            },
            required: ["sequenceId"]
          }
        },
        {
          name: "remove-contacts-from-sequence",
          description: "Remove contacts from an email sequence",
          inputSchema: {
            type: "object",
            properties: {
              sequenceId: {
                type: "string",
                description: "ID of the sequence"
              },
              contactIds: {
                type: "array",
                items: { type: "string" },
                description: "List of contact IDs to remove"
              }
            },
            required: ["sequenceId", "contactIds"]
          }
        },
        {
          name: "update-task",
          description: "Update an existing task",
          inputSchema: {
            type: "object",
            properties: {
              taskId: {
                type: "string",
                description: "ID of the task to update"
              },
              title: {
                type: "string",
                description: "Updated task title"
              },
              description: {
                type: "string",
                description: "Updated task description"
              },
              dueDate: {
                type: "string",
                description: "Updated due date (YYYY-MM-DD)"
              },
              priority: {
                type: "string",
                enum: ["Low", "Medium", "High"],
                description: "Updated priority"
              },
              status: {
                type: "string",
                enum: ["pending", "completed", "cancelled"],
                description: "Updated status"
              }
            },
            required: ["taskId"]
          }
        },
        {
          name: "complete-task",
          description: "Mark a task as completed",
          inputSchema: {
            type: "object",
            properties: {
              taskId: {
                type: "string",
                description: "ID of the task to complete"
              },
              completionNotes: {
                type: "string",
                description: "Notes about task completion"
              }
            },
            required: ["taskId"]
          }
        }
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        try {
          return await this.apolloTools.handleToolCall(request);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(errorMessage);
        }
      }
    );
  }

  private async streamMessages(transport: StreamableHTTPServerTransport) {
    try {
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
    const rpcNotification: JSONRPCNotification = {
      ...notification,
      jsonrpc: JSON_RPC,
    };
    await transport.send(rpcNotification);
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