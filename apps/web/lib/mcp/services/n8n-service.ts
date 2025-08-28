import { MCPClient } from '../client';
import {
  N8NWorkflow,
  N8NExecution,
  N8NCredential,
  ServiceResponse,
  LeadToBookingFlow
} from '../types';

/**
 * Service layer for N8N MCP server integration
 */
export class N8NService {
  private readonly SERVER_NAME = 'n8n';

  constructor(private mcpClient: MCPClient) {}

  /**
   * List all workflows
   */
  async listWorkflows(): Promise<ServiceResponse<N8NWorkflow[]>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'workflow-list',
        {}
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to list workflows');
      }

      // Parse workflows from response
      const workflows = this.parseWorkflowsFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: workflows,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'N8N_LIST_WORKFLOWS_FAILED',
          message: 'Failed to list workflows',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get workflow details by ID
   */
  async getWorkflow(workflowId: string): Promise<ServiceResponse<N8NWorkflow>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'workflow-get',
        { workflowId }
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to get workflow');
      }

      // Parse workflow from response
      const workflow = this.parseWorkflowFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: workflow,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'N8N_GET_WORKFLOW_FAILED',
          message: 'Failed to get workflow',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Create new workflow
   */
  async createWorkflow(workflow: Partial<N8NWorkflow>): Promise<ServiceResponse<{workflowId: string}>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'workflow-create',
        {
          name: workflow.name,
          nodes: workflow.nodes || [],
          connections: workflow.connections || {}
        }
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to create workflow');
      }

      // Extract workflow ID from response
      const workflowId = this.parseWorkflowIdFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: { workflowId },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'N8N_CREATE_WORKFLOW_FAILED',
          message: 'Failed to create workflow',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflowId: string, inputData?: any): Promise<ServiceResponse<N8NExecution>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'execution-execute',
        { workflowId, inputData }
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to execute workflow');
      }

      // Parse execution from response
      const execution = this.parseExecutionFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: execution,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'N8N_EXECUTE_WORKFLOW_FAILED',
          message: 'Failed to execute workflow',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get execution status
   */
  async getExecution(executionId: string): Promise<ServiceResponse<N8NExecution>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'execution-get',
        { executionId }
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to get execution');
      }

      // Parse execution from response
      const execution = this.parseExecutionFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: execution,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'N8N_GET_EXECUTION_FAILED',
          message: 'Failed to get execution',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * List executions
   */
  async listExecutions(workflowId?: string): Promise<ServiceResponse<N8NExecution[]>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'execution-list',
        { workflowId }
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to list executions');
      }

      // Parse executions from response
      const executions = this.parseExecutionsFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: executions,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'N8N_LIST_EXECUTIONS_FAILED',
          message: 'Failed to list executions',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Activate workflow
   */
  async activateWorkflow(workflowId: string): Promise<ServiceResponse<{activated: boolean}>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'workflow-activate',
        { workflowId }
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to activate workflow');
      }

      const activated = result.data.content[0].text.includes('activated');

      return {
        success: true,
        data: { activated },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'N8N_ACTIVATE_WORKFLOW_FAILED',
          message: 'Failed to activate workflow',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Deactivate workflow
   */
  async deactivateWorkflow(workflowId: string): Promise<ServiceResponse<{deactivated: boolean}>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'workflow-deactivate',
        { workflowId }
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to deactivate workflow');
      }

      const deactivated = result.data.content[0].text.includes('deactivated');

      return {
        success: true,
        data: { deactivated },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'N8N_DEACTIVATE_WORKFLOW_FAILED',
          message: 'Failed to deactivate workflow',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Create Apollo to Avainode integration workflow
   */
  async createLeadToBookingWorkflow(): Promise<ServiceResponse<{workflowId: string}>> {
    const workflowDefinition: Partial<N8NWorkflow> = {
      name: 'Apollo Lead to Avainode Booking Pipeline',
      nodes: [
        {
          id: 'webhook-trigger',
          name: 'Lead Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [0, 0],
          parameters: {
            httpMethod: 'POST',
            path: 'apollo-lead-webhook',
            responseMode: 'onReceived'
          }
        },
        {
          id: 'enrich-contact',
          name: 'Enrich Apollo Contact',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 1,
          position: [200, 0],
          parameters: {
            url: '={{$env.APOLLO_MCP_SERVER_URL}}/enrich-contact',
            method: 'POST',
            jsonParameters: true,
            options: {}
          }
        },
        {
          id: 'search-aircraft',
          name: 'Search Available Aircraft',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 1,
          position: [400, 0],
          parameters: {
            url: '={{$env.AVAINODE_MCP_SERVER_URL}}/search-aircraft',
            method: 'POST',
            jsonParameters: true,
            options: {}
          }
        },
        {
          id: 'create-charter-request',
          name: 'Create Charter Request',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 1,
          position: [600, 0],
          parameters: {
            url: '={{$env.AVAINODE_MCP_SERVER_URL}}/create-charter-request',
            method: 'POST',
            jsonParameters: true,
            options: {}
          }
        },
        {
          id: 'notify-sales-team',
          name: 'Notify Sales Team',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 1,
          position: [800, 0],
          parameters: {
            fromEmail: 'noreply@jetvision.com',
            toEmail: 'sales@jetvision.com',
            subject: 'New Charter Request Created',
            emailType: 'html'
          }
        }
      ],
      connections: {
        'Lead Webhook': {
          main: [
            [{ node: 'Enrich Apollo Contact', type: 'main', index: 0 }]
          ]
        },
        'Enrich Apollo Contact': {
          main: [
            [{ node: 'Search Available Aircraft', type: 'main', index: 0 }]
          ]
        },
        'Search Available Aircraft': {
          main: [
            [{ node: 'Create Charter Request', type: 'main', index: 0 }]
          ]
        },
        'Create Charter Request': {
          main: [
            [{ node: 'Notify Sales Team', type: 'main', index: 0 }]
          ]
        }
      }
    };

    return await this.createWorkflow(workflowDefinition);
  }

  /**
   * Process lead through the Apollo to Avainode pipeline
   */
  async processLeadToBooking(leadData: any): Promise<ServiceResponse<LeadToBookingFlow>> {
    try {
      // Get the lead-to-booking workflow
      const workflows = await this.listWorkflows();
      if (!workflows.success) {
        throw new Error('Failed to get workflows');
      }

      const pipelineWorkflow = workflows.data?.find(w => 
        w.name.includes('Apollo Lead to Avainode Booking')
      );

      if (!pipelineWorkflow) {
        // Create the workflow if it doesn't exist
        const createResult = await this.createLeadToBookingWorkflow();
        if (!createResult.success) {
          throw new Error('Failed to create lead-to-booking workflow');
        }
      }

      // Execute the workflow with lead data
      const execution = await this.executeWorkflow(pipelineWorkflow!.id, leadData);
      
      if (!execution.success) {
        throw new Error('Failed to execute lead-to-booking workflow');
      }

      const flow: LeadToBookingFlow = {
        leadId: leadData.leadId || `lead_${Date.now()}`,
        apolloData: leadData,
        workflowExecutionId: execution.data?.id,
        bookingStatus: 'pending'
      };

      return {
        success: true,
        data: flow,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'N8N_PROCESS_LEAD_FAILED',
          message: 'Failed to process lead through pipeline',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if N8N service is available
   */
  async checkConnection(): Promise<ServiceResponse<{isConnected: boolean}>> {
    try {
      // Try to list workflows as a connection test
      const result = await this.listWorkflows();
      return {
        success: true,
        data: { isConnected: result.success },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'N8N_CONNECTION_CHECK_FAILED',
          message: 'Failed to check N8N connection',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  // Private parsing methods
  private parseWorkflowsFromResponse(responseText: string): N8NWorkflow[] {
    const workflows: N8NWorkflow[] = [];
    
    try {
      // Try to parse JSON response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            workflows.push({
              id: item.id || `wf_${Date.now()}`,
              name: item.name || 'Unnamed Workflow',
              active: item.active || false,
              nodes: item.nodes || [],
              connections: item.connections || {}
            });
          });
        }
      }
    } catch (error) {
      console.error('Error parsing workflows from response:', error);
    }

    return workflows;
  }

  private parseWorkflowFromResponse(responseText: string): N8NWorkflow {
    try {
      // Try to parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          id: data.id || `wf_${Date.now()}`,
          name: data.name || 'Unnamed Workflow',
          active: data.active || false,
          nodes: data.nodes || [],
          connections: data.connections || {}
        };
      }
    } catch (error) {
      console.error('Error parsing workflow from response:', error);
    }

    return {
      id: `wf_${Date.now()}`,
      name: 'Unknown Workflow',
      active: false,
      nodes: [],
      connections: {}
    };
  }

  private parseWorkflowIdFromResponse(responseText: string): string {
    const match = responseText.match(/workflow ID: ([a-zA-Z0-9_-]+)|ID: ([a-zA-Z0-9_-]+)/i);
    return match ? (match[1] || match[2]) : `wf_${Date.now()}`;
  }

  private parseExecutionFromResponse(responseText: string): N8NExecution {
    try {
      // Try to parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          id: data.id || `exec_${Date.now()}`,
          workflowId: data.workflowId || '',
          mode: data.mode || 'manual',
          startedAt: data.startedAt || new Date().toISOString(),
          stoppedAt: data.stoppedAt,
          status: data.status || 'running',
          data: data.data
        };
      }
    } catch (error) {
      console.error('Error parsing execution from response:', error);
    }

    return {
      id: `exec_${Date.now()}`,
      workflowId: '',
      mode: 'manual',
      startedAt: new Date().toISOString(),
      status: 'running'
    };
  }

  private parseExecutionsFromResponse(responseText: string): N8NExecution[] {
    const executions: N8NExecution[] = [];
    
    try {
      // Try to parse JSON response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            executions.push({
              id: item.id || `exec_${Date.now()}`,
              workflowId: item.workflowId || '',
              mode: item.mode || 'manual',
              startedAt: item.startedAt || new Date().toISOString(),
              stoppedAt: item.stoppedAt,
              status: item.status || 'running',
              data: item.data
            });
          });
        }
      }
    } catch (error) {
      console.error('Error parsing executions from response:', error);
    }

    return executions;
  }
}