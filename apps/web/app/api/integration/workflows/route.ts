import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationManager } from '../../../../lib/mcp/integration-manager';

/**
 * API endpoint for N8N workflow management
 */

/**
 * List all workflows
 */
export async function GET(request: NextRequest) {
  try {
    const integrationManager = getIntegrationManager();
    const services = integrationManager.getServices();
    
    const result = await services.n8n.listWorkflows();
    
    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      timestamp: result.timestamp.toISOString()
    }, {
      status: result.success ? 200 : 500
    });

  } catch (error) {
    console.error('Error listing workflows:', error);
    return NextResponse.json({
      error: 'Failed to list workflows',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Create or execute workflow
 */
export async function POST(request: NextRequest) {
  try {
    const integrationManager = getIntegrationManager();
    const services = integrationManager.getServices();
    
    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      // Create new workflow
      const result = await services.n8n.createWorkflow(body.workflow);
      
      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: result.timestamp.toISOString()
      }, {
        status: result.success ? 200 : 400
      });

    } else if (action === 'execute') {
      // Execute existing workflow
      if (!body.workflowId) {
        return NextResponse.json({
          error: 'Missing workflowId for execution'
        }, { status: 400 });
      }

      const result = await services.n8n.executeWorkflow(body.workflowId, body.inputData);
      
      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: result.timestamp.toISOString()
      }, {
        status: result.success ? 200 : 400
      });

    } else if (action === 'create_lead_to_booking') {
      // Create the specialized Apollo to Avainode workflow
      const result = await services.n8n.createLeadToBookingWorkflow();
      
      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: result.timestamp.toISOString()
      }, {
        status: result.success ? 200 : 400
      });

    } else if (action === 'process_lead') {
      // Process lead through the pipeline
      if (!body.leadData) {
        return NextResponse.json({
          error: 'Missing leadData for processing'
        }, { status: 400 });
      }

      const result = await services.n8n.processLeadToBooking(body.leadData);
      
      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: result.timestamp.toISOString()
      }, {
        status: result.success ? 200 : 400
      });

    } else {
      return NextResponse.json({
        error: 'Invalid action. Supported actions: create, execute, create_lead_to_booking, process_lead'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing workflow request:', error);
    return NextResponse.json({
      error: 'Failed to process workflow request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Activate/deactivate workflow
 */
export async function PUT(request: NextRequest) {
  try {
    const integrationManager = getIntegrationManager();
    const services = integrationManager.getServices();
    
    const body = await request.json();
    const { workflowId, action } = body;

    if (!workflowId) {
      return NextResponse.json({
        error: 'Missing workflowId'
      }, { status: 400 });
    }

    let result;
    
    if (action === 'activate') {
      result = await services.n8n.activateWorkflow(workflowId);
    } else if (action === 'deactivate') {
      result = await services.n8n.deactivateWorkflow(workflowId);
    } else {
      return NextResponse.json({
        error: 'Invalid action. Supported actions: activate, deactivate'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      timestamp: result.timestamp.toISOString()
    }, {
      status: result.success ? 200 : 400
    });

  } catch (error) {
    console.error('Error managing workflow:', error);
    return NextResponse.json({
      error: 'Failed to manage workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}