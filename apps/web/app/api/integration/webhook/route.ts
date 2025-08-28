import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationManager } from '../../../../lib/mcp/integration-manager';
import { DataSyncService } from '../../../../lib/mcp/data-sync';

// Global instances
let dataSyncService: DataSyncService | null = null;

function getDataSyncService(): DataSyncService {
  if (!dataSyncService) {
    const integrationManager = getIntegrationManager();
    dataSyncService = new DataSyncService(integrationManager);
  }
  return dataSyncService;
}

/**
 * Webhook endpoint for real-time integration events
 */

/**
 * Handle incoming webhook events from various systems
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const source = searchParams.get('source');
    const eventType = searchParams.get('type');
    
    if (!source) {
      return NextResponse.json({
        error: 'Missing source parameter'
      }, { status: 400 });
    }

    const body = await request.json();
    console.log(`Received webhook from ${source}:`, { eventType, body });

    const integrationManager = getIntegrationManager();
    const syncService = getDataSyncService();

    // Handle different webhook sources
    switch (source) {
      case 'apollo':
        await handleApolloWebhook(integrationManager, syncService, eventType, body);
        break;
      
      case 'avainode':
        await handleAvainodeWebhook(integrationManager, syncService, eventType, body);
        break;
      
      case 'n8n':
        await handleN8NWebhook(integrationManager, syncService, eventType, body);
        break;
      
      case 'lead':
        // Special case for lead processing webhook
        await handleLeadProcessingWebhook(integrationManager, body);
        break;
      
      default:
        return NextResponse.json({
          error: `Unknown webhook source: ${source}`
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({
      error: 'Failed to process webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Handle Apollo.io webhook events
 */
async function handleApolloWebhook(
  integrationManager: any,
  syncService: DataSyncService,
  eventType: string | null,
  data: any
) {
  const services = integrationManager.getServices();

  switch (eventType) {
    case 'lead_updated':
    case 'lead_created':
      // Process new or updated lead through the pipeline
      if (data.lead && data.lead.email) {
        try {
          // Auto-trigger lead-to-booking flow if flight requirements are provided
          if (data.flightRequirements) {
            await integrationManager.processLeadToBooking(data.lead, data.flightRequirements);
          }
        } catch (error) {
          console.error('Error processing lead from Apollo webhook:', error);
        }
      }
      
      // Sync webhook data
      await syncService.handleWebhookSync('apollo', data);
      break;

    case 'sequence_completed':
      // Handle email sequence completion
      console.log('Apollo sequence completed:', data);
      await syncService.handleWebhookSync('apollo', data);
      break;

    case 'contact_enriched':
      // Handle contact enrichment completion
      console.log('Apollo contact enriched:', data);
      await syncService.handleWebhookSync('apollo', data);
      break;

    default:
      console.log('Unhandled Apollo webhook event type:', eventType);
      await syncService.handleWebhookSync('apollo', data);
  }
}

/**
 * Handle Avainode webhook events
 */
async function handleAvainodeWebhook(
  integrationManager: any,
  syncService: DataSyncService,
  eventType: string | null,
  data: any
) {
  const services = integrationManager.getServices();

  switch (eventType) {
    case 'booking_confirmed':
      // Handle booking confirmation
      console.log('Avainode booking confirmed:', data);
      
      // Could trigger notification workflows here
      try {
        const n8nService = services.n8n;
        // Execute notification workflow if it exists
        // This would be a workflow that sends confirmation emails, updates CRM, etc.
      } catch (error) {
        console.error('Error triggering booking confirmation workflow:', error);
      }
      
      await syncService.handleWebhookSync('avainode', data);
      break;

    case 'booking_cancelled':
      // Handle booking cancellation
      console.log('Avainode booking cancelled:', data);
      await syncService.handleWebhookSync('avainode', data);
      break;

    case 'aircraft_availability_updated':
      // Handle aircraft availability changes
      console.log('Avainode aircraft availability updated:', data);
      await syncService.handleWebhookSync('avainode', data);
      break;

    case 'pricing_updated':
      // Handle pricing updates
      console.log('Avainode pricing updated:', data);
      await syncService.handleWebhookSync('avainode', data);
      break;

    default:
      console.log('Unhandled Avainode webhook event type:', eventType);
      await syncService.handleWebhookSync('avainode', data);
  }
}

/**
 * Handle N8N webhook events
 */
async function handleN8NWebhook(
  integrationManager: any,
  syncService: DataSyncService,
  eventType: string | null,
  data: any
) {
  const services = integrationManager.getServices();

  switch (eventType) {
    case 'workflow_completed':
      // Handle workflow completion
      console.log('N8N workflow completed:', data);
      
      // If this was a lead-to-booking workflow, update the flow status
      if (data.workflowName?.includes('Apollo Lead to Avainode Booking')) {
        // Could update database records, send notifications, etc.
      }
      
      await syncService.handleWebhookSync('n8n', data);
      break;

    case 'workflow_failed':
      // Handle workflow failure
      console.error('N8N workflow failed:', data);
      
      // Could trigger error handling workflows, notifications, etc.
      
      await syncService.handleWebhookSync('n8n', data);
      break;

    case 'execution_status':
      // Handle execution status updates
      console.log('N8N execution status update:', data);
      await syncService.handleWebhookSync('n8n', data);
      break;

    default:
      console.log('Unhandled N8N webhook event type:', eventType);
      await syncService.handleWebhookSync('n8n', data);
  }
}

/**
 * Handle lead processing webhook - special endpoint for direct lead processing
 */
async function handleLeadProcessingWebhook(integrationManager: any, data: any) {
  try {
    if (!data.leadData) {
      throw new Error('Missing leadData in webhook payload');
    }

    // Default flight requirements if not provided
    const defaultFlightRequirements = {
      departureAirport: 'KTEB', // Teterboro - common private jet airport
      arrivalAirport: 'KLAX',   // LAX - popular destination
      departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 days
      passengers: 6 // Common mid-size jet capacity
    };

    const flightRequirements = data.flightRequirements || defaultFlightRequirements;

    // Process the lead through the full pipeline
    const result = await integrationManager.processLeadToBooking(
      data.leadData,
      flightRequirements
    );

    console.log('Lead processing webhook result:', {
      success: result.success,
      leadId: result.data?.leadId,
      bookingStatus: result.data?.bookingStatus
    });

    return result;

  } catch (error) {
    console.error('Error in lead processing webhook:', error);
    throw error;
  }
}

/**
 * Test webhook endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const test = searchParams.get('test');
    
    if (test === 'apollo') {
      // Simulate Apollo webhook
      const mockLeadData = {
        lead: {
          name: 'John Doe',
          title: 'CEO',
          company: 'Test Company',
          email: 'john@testcompany.com',
          industry: 'Aviation',
          size: '100-500',
          location: 'New York'
        },
        flightRequirements: {
          departureAirport: 'KJFK',
          arrivalAirport: 'KLAX',
          departureDate: '2024-04-01',
          passengers: 8
        }
      };

      const integrationManager = getIntegrationManager();
      await handleApolloWebhook(integrationManager, getDataSyncService(), 'lead_created', mockLeadData);

      return NextResponse.json({
        success: true,
        message: 'Apollo webhook test completed',
        data: mockLeadData
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Webhook endpoint is active',
      supportedSources: ['apollo', 'avainode', 'n8n', 'lead'],
      testParameters: ['test=apollo'],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in webhook test:', error);
    return NextResponse.json({
      error: 'Webhook test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}