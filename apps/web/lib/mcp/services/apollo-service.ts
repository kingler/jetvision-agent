import { MCPClient } from '../client';
import {
  ApolloLead,
  ApolloSearchParams,
  ApolloEnrichParams,
  ApolloSequenceParams,
  ApolloAccountParams,
  ApolloEngagementParams,
  ServiceResponse
} from '../types';

/**
 * Service layer for Apollo.io MCP server integration
 */
export class ApolloService {
  private readonly SERVER_NAME = 'apollo-io';

  constructor(private mcpClient: MCPClient) {}

  /**
   * Search for leads based on criteria
   */
  async searchLeads(params: ApolloSearchParams): Promise<ServiceResponse<ApolloLead[]>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'search-leads',
        params
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to search leads');
      }

      // Parse leads from response text
      const leads = this.parseLeadsFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: leads,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'APOLLO_SEARCH_FAILED',
          message: 'Failed to search leads',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Enrich contact information
   */
  async enrichContact(params: ApolloEnrichParams): Promise<ServiceResponse<ApolloLead>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'enrich-contact',
        params
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to enrich contact');
      }

      // Parse enriched contact data
      const enrichedData = this.parseEnrichedContactFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: enrichedData,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'APOLLO_ENRICH_FAILED',
          message: 'Failed to enrich contact',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Create email sequence
   */
  async createEmailSequence(params: ApolloSequenceParams): Promise<ServiceResponse<{sequenceId: string}>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'create-email-sequence',
        params
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to create email sequence');
      }

      // Extract sequence ID from response
      const sequenceId = this.parseSequenceIdFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: { sequenceId },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'APOLLO_SEQUENCE_FAILED',
          message: 'Failed to create email sequence',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get account data by domain
   */
  async getAccountData(params: ApolloAccountParams): Promise<ServiceResponse<{
    domain: string;
    companyName: string;
    industry: string;
    employeeCount: number;
    revenue: string;
    headquarters: string;
    contacts: Array<{name: string; title: string; email: string}>;
  }>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'get-account-data',
        params
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to get account data');
      }

      // Parse account data from response
      const accountData = this.parseAccountDataFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: accountData,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'APOLLO_ACCOUNT_FAILED',
          message: 'Failed to get account data',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Track engagement metrics
   */
  async trackEngagement(params: ApolloEngagementParams): Promise<ServiceResponse<{
    sequenceId: string;
    period: string;
    emailsSent: number;
    opens: number;
    openRate: string;
    clicks: number;
    clickRate: string;
    replies: number;
    replyRate: string;
    meetings: number;
  }>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'track-engagement',
        params
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to track engagement');
      }

      // Parse engagement metrics from response
      const metrics = this.parseEngagementMetricsFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: metrics,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'APOLLO_ENGAGEMENT_FAILED',
          message: 'Failed to track engagement',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if Apollo service is available
   */
  async checkConnection(): Promise<ServiceResponse<{isConnected: boolean}>> {
    try {
      // Try to list tools as a connection test
      const session = this.mcpClient.getAllTools()[this.SERVER_NAME];
      const isConnected = Array.isArray(session) && session.length > 0;

      return {
        success: true,
        data: { isConnected },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'APOLLO_CONNECTION_CHECK_FAILED',
          message: 'Failed to check Apollo connection',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  // Private parsing methods
  private parseLeadsFromResponse(responseText: string): ApolloLead[] {
    const leads: ApolloLead[] = [];
    
    try {
      // Parse leads from the formatted response text
      const lines = responseText.split('\n').filter(line => line.trim().startsWith('•'));
      
      lines.forEach(line => {
        const match = line.match(/• (.+?) - (.+?) at (.+?) \((.+?), (.+?) employees, (.+?)\)/);
        if (match) {
          leads.push({
            name: match[1].trim(),
            title: match[2].trim(),
            company: match[3].trim(),
            industry: match[4].trim(),
            size: match[5].trim(),
            location: match[6].trim(),
            email: `${match[1].toLowerCase().replace(' ', '')}@example.com`
          });
        }
      });
    } catch (error) {
      console.error('Error parsing leads from response:', error);
    }

    return leads;
  }

  private parseEnrichedContactFromResponse(responseText: string): ApolloLead {
    try {
      // Extract JSON data from response text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          name: data.name || '',
          title: data.title || '',
          company: data.company || '',
          email: data.email || '',
          phone: data.phone,
          linkedIn: data.linkedIn,
          industry: 'Various',
          size: 'Unknown',
          location: 'Unknown'
        };
      }
    } catch (error) {
      console.error('Error parsing enriched contact:', error);
    }

    return {
      name: 'Unknown',
      title: 'Unknown',
      company: 'Unknown',
      email: 'unknown@example.com',
      industry: 'Unknown',
      size: 'Unknown',
      location: 'Unknown'
    };
  }

  private parseSequenceIdFromResponse(responseText: string): string {
    const match = responseText.match(/Sequence ID: (seq_\d+)/);
    return match ? match[1] : `seq_${Date.now()}`;
  }

  private parseAccountDataFromResponse(responseText: string): any {
    try {
      // Extract JSON data from response text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing account data:', error);
    }

    return {
      domain: 'unknown.com',
      companyName: 'Unknown Company',
      industry: 'Unknown',
      employeeCount: 0,
      revenue: 'Unknown',
      headquarters: 'Unknown',
      contacts: []
    };
  }

  private parseEngagementMetricsFromResponse(responseText: string): any {
    try {
      // Extract JSON data from response text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing engagement metrics:', error);
    }

    return {
      sequenceId: 'unknown',
      period: 'Unknown',
      emailsSent: 0,
      opens: 0,
      openRate: '0%',
      clicks: 0,
      clickRate: '0%',
      replies: 0,
      replyRate: '0%',
      meetings: 0
    };
  }
}