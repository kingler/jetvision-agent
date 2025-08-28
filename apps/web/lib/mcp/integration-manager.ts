import { MCPClient } from './client';
import { ApolloService } from './services/apollo-service';
import { AvainodeService } from './services/avainode-service';
import { N8NService } from './services/n8n-service';
import {
  MCPServerConfig,
  ConnectionStatus,
  ServiceResponse,
  LeadToBookingFlow,
  ApolloLead,
  Aircraft
} from './types';

/**
 * Integration Manager - Central coordinator for all MCP services
 */
export class IntegrationManager {
  private mcpClient: MCPClient;
  private apolloService: ApolloService;
  private avainodeService: AvainodeService;
  private n8nService: N8NService;
  private isInitialized = false;
  private eventCallbacks: Map<string, Function[]> = new Map();

  constructor(serverConfigs?: MCPServerConfig[]) {
    // Default server configurations
    const defaultConfigs: MCPServerConfig[] = [
      {
        name: 'apollo-io',
        url: process.env.APOLLO_MCP_SERVER_URL || 'http://localhost:8123/mcp',
        port: 8123,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      {
        name: 'avainode',
        url: process.env.AVAINODE_MCP_SERVER_URL || 'http://localhost:8124/mcp',
        port: 8124,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      {
        name: 'n8n',
        url: process.env.N8N_MCP_SERVER_URL || 'http://localhost:8125/mcp',
        port: 8125,
        timeout: 60000, // N8N workflows may take longer
        retryAttempts: 3,
        retryDelay: 2000
      }
    ];

    this.mcpClient = new MCPClient(serverConfigs || defaultConfigs);
    this.apolloService = new ApolloService(this.mcpClient);
    this.avainodeService = new AvainodeService(this.mcpClient);
    this.n8nService = new N8NService(this.mcpClient);

    // Set up event forwarding
    this.setupEventForwarding();
  }

  /**
   * Initialize all MCP connections
   */
  async initialize(): Promise<ServiceResponse<{connectedServers: string[]}>> {
    try {
      const results = await Promise.allSettled([
        this.mcpClient.connect('apollo-io'),
        this.mcpClient.connect('avainode'),
        this.mcpClient.connect('n8n')
      ]);

      const connectedServers: string[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        const serverNames = ['apollo-io', 'avainode', 'n8n'];
        const serverName = serverNames[index];

        if (result.status === 'fulfilled' && result.value.success) {
          connectedServers.push(serverName);
        } else {
          const reason = result.status === 'rejected' ? result.reason : result.value.error?.message;
          errors.push(`${serverName}: ${reason}`);
          console.error(`Failed to connect to ${serverName}:`, reason);
        }
      });

      this.isInitialized = connectedServers.length > 0;

      if (this.isInitialized) {
        // Initialize the Apollo to Avainode workflow if N8N is connected
        if (connectedServers.includes('n8n')) {
          await this.setupIntegrationWorkflows();
        }

        this.emit('initialized', { connectedServers, errors });
      }

      return {
        success: this.isInitialized,
        data: { connectedServers },
        error: errors.length > 0 ? {
          code: 'PARTIAL_INITIALIZATION',
          message: `Some servers failed to connect: ${errors.join(', ')}`,
          details: errors
        } : undefined,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INITIALIZATION_FAILED',
          message: 'Failed to initialize integration manager',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get overall system status
   */
  async getSystemStatus(): Promise<ServiceResponse<{
    isInitialized: boolean;
    connections: ConnectionStatus[];
    totalTools: number;
    activeFlows: number;
  }>> {
    try {
      const connections = await this.mcpClient.getConnectionStatus();
      const allTools = this.mcpClient.getAllTools();
      const totalTools = Object.values(allTools).reduce((total, tools) => total + tools.length, 0);

      return {
        success: true,
        data: {
          isInitialized: this.isInitialized,
          connections,
          totalTools,
          activeFlows: 0 // Would track active integration flows in production
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: 'Failed to get system status',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Execute lead-to-booking integration flow
   */
  async processLeadToBooking(
    leadData: ApolloLead,
    flightRequirements: {
      departureAirport: string;
      arrivalAirport: string;
      departureDate: string;
      passengers: number;
    }
  ): Promise<ServiceResponse<LeadToBookingFlow>> {
    try {
      if (!this.isInitialized) {
        throw new Error('Integration manager not initialized');
      }

      const flow: LeadToBookingFlow = {
        leadId: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        apolloData: leadData,
        flightRequirements,
        bookingStatus: 'pending'
      };

      this.emit('flow_started', { flow });

      // Step 1: Enrich the lead data
      const enrichResult = await this.apolloService.enrichContact({
        email: leadData.email,
        linkedinUrl: leadData.linkedIn
      });

      if (enrichResult.success && enrichResult.data) {
        flow.apolloData = { ...flow.apolloData, ...enrichResult.data };
      }

      // Step 2: Search for available aircraft
      const searchResult = await this.avainodeService.searchAircraft(flightRequirements);

      if (!searchResult.success || !searchResult.data?.length) {
        flow.bookingStatus = 'no_aircraft_available';
        this.emit('flow_error', { flow, error: 'No aircraft available' });
        
        return {
          success: false,
          error: {
            code: 'NO_AIRCRAFT_AVAILABLE',
            message: 'No aircraft found for the requested criteria',
            details: searchResult.error
          },
          timestamp: new Date()
        };
      }

      flow.avainodeResults = searchResult.data;

      // Step 3: Create charter request for the best option
      const bestAircraft = this.selectBestAircraft(searchResult.data, flightRequirements.passengers);
      
      const charterResult = await this.avainodeService.createCharterRequest({
        aircraftId: bestAircraft.id,
        departureAirport: flightRequirements.departureAirport,
        arrivalAirport: flightRequirements.arrivalAirport,
        departureDate: flightRequirements.departureDate,
        departureTime: '10:00', // Default time
        passengers: flightRequirements.passengers,
        contactName: flow.apolloData.name,
        contactEmail: flow.apolloData.email,
        contactPhone: flow.apolloData.phone || 'Not provided'
      });

      if (charterResult.success) {
        flow.bookingStatus = 'charter_requested';
        this.emit('charter_created', { flow, requestId: charterResult.data?.requestId });
      }

      // Step 4: Execute N8N workflow if available
      if (this.isInitialized) {
        try {
          const workflowResult = await this.n8nService.processLeadToBooking({
            ...flow.apolloData,
            flightRequirements,
            charterRequestId: charterResult.data?.requestId
          });

          if (workflowResult.success && workflowResult.data) {
            flow.workflowExecutionId = workflowResult.data.workflowExecutionId;
          }
        } catch (error) {
          console.warn('N8N workflow execution failed:', error);
          // Don't fail the entire flow if N8N fails
        }
      }

      this.emit('flow_completed', { flow });

      return {
        success: true,
        data: flow,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LEAD_TO_BOOKING_FAILED',
          message: 'Failed to process lead-to-booking flow',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Search leads and convert to booking opportunities
   */
  async searchAndConvertLeads(
    searchCriteria: {
      jobTitle?: string;
      industry?: string;
      companySize?: string;
      location?: string;
      limit?: number;
    },
    flightTemplate: {
      departureAirport: string;
      arrivalAirport: string;
      departureDate: string;
      passengers: number;
    }
  ): Promise<ServiceResponse<LeadToBookingFlow[]>> {
    try {
      if (!this.isInitialized) {
        throw new Error('Integration manager not initialized');
      }

      // Search for leads
      const leadsResult = await this.apolloService.searchLeads(searchCriteria);
      
      if (!leadsResult.success || !leadsResult.data?.length) {
        return {
          success: false,
          error: {
            code: 'NO_LEADS_FOUND',
            message: 'No leads found matching criteria',
            details: leadsResult.error
          },
          timestamp: new Date()
        };
      }

      // Process each lead through the booking flow
      const flows: LeadToBookingFlow[] = [];
      const batchSize = 5; // Process in small batches to avoid overwhelming services

      for (let i = 0; i < leadsResult.data.length; i += batchSize) {
        const batch = leadsResult.data.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(lead => this.processLeadToBooking(lead, flightTemplate))
        );

        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value.success && result.value.data) {
            flows.push(result.value.data);
          }
        });

        // Small delay between batches
        if (i + batchSize < leadsResult.data.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        success: true,
        data: flows,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BATCH_PROCESSING_FAILED',
          message: 'Failed to process leads in batch',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get service instances for direct access
   */
  getServices() {
    return {
      apollo: this.apolloService,
      avainode: this.avainodeService,
      n8n: this.n8nService
    };
  }

  /**
   * Clean up all connections
   */
  async cleanup(): Promise<void> {
    try {
      await this.mcpClient.cleanup();
      this.isInitialized = false;
      this.eventCallbacks.clear();
      this.emit('cleanup', {});
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Event system
   */
  on(event: string, callback: Function): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    callbacks.push(callback);
    this.eventCallbacks.set(event, callbacks);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
      this.eventCallbacks.set(event, callbacks);
    }
  }

  // Private methods
  private setupEventForwarding(): void {
    this.mcpClient.on('connection', (data) => this.emit('connection', data));
    this.mcpClient.on('error', (data) => this.emit('error', data));
    this.mcpClient.on('tool_execution', (data) => this.emit('tool_execution', data));
  }

  private emit(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event callback for ${event}:`, error);
      }
    });
  }

  private async setupIntegrationWorkflows(): Promise<void> {
    try {
      // Create the lead-to-booking workflow if it doesn't exist
      await this.n8nService.createLeadToBookingWorkflow();
    } catch (error) {
      console.warn('Failed to setup integration workflows:', error);
    }
  }

  private selectBestAircraft(aircraft: Aircraft[], passengers: number): Aircraft {
    // Simple selection logic - would be more sophisticated in production
    const suitable = aircraft.filter(a => a.maxPassengers >= passengers);
    
    if (suitable.length === 0) {
      return aircraft[0]; // Fallback to first option
    }

    // Sort by hourly rate (ascending) and select the most cost-effective
    suitable.sort((a, b) => a.hourlyRate - b.hourlyRate);
    return suitable[0];
  }
}

// Singleton instance for global use
let integrationManager: IntegrationManager | null = null;

export function getIntegrationManager(): IntegrationManager {
  if (!integrationManager) {
    integrationManager = new IntegrationManager();
  }
  return integrationManager;
}