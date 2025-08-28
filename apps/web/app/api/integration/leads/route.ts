import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationManager } from '../../../../lib/mcp/integration-manager';

/**
 * API endpoint for lead management and Apollo.io integration
 */

/**
 * Search for leads using Apollo.io
 */
export async function GET(request: NextRequest) {
  try {
    const integrationManager = getIntegrationManager();
    const services = integrationManager.getServices();
    
    const { searchParams } = request.nextUrl;
    
    const searchCriteria = {
      jobTitle: searchParams.get('jobTitle') || undefined,
      industry: searchParams.get('industry') || undefined,
      companySize: searchParams.get('companySize') || undefined,
      location: searchParams.get('location') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    };

    // Remove undefined values
    Object.keys(searchCriteria).forEach(key => {
      if (searchCriteria[key as keyof typeof searchCriteria] === undefined) {
        delete searchCriteria[key as keyof typeof searchCriteria];
      }
    });

    const result = await services.apollo.searchLeads(searchCriteria);
    
    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      timestamp: result.timestamp.toISOString()
    }, {
      status: result.success ? 200 : 400
    });

  } catch (error) {
    console.error('Error searching leads:', error);
    return NextResponse.json({
      error: 'Failed to search leads',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Process lead through the lead-to-booking pipeline
 */
export async function POST(request: NextRequest) {
  try {
    const integrationManager = getIntegrationManager();
    
    const body = await request.json();
    
    if (!body.leadData || !body.flightRequirements) {
      return NextResponse.json({
        error: 'Missing required fields: leadData and flightRequirements'
      }, { status: 400 });
    }

    // Validate flight requirements
    const { departureAirport, arrivalAirport, departureDate, passengers } = body.flightRequirements;
    if (!departureAirport || !arrivalAirport || !departureDate || !passengers) {
      return NextResponse.json({
        error: 'Invalid flight requirements. Required: departureAirport, arrivalAirport, departureDate, passengers'
      }, { status: 400 });
    }

    const result = await integrationManager.processLeadToBooking(
      body.leadData,
      body.flightRequirements
    );
    
    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      timestamp: result.timestamp.toISOString()
    }, {
      status: result.success ? 200 : 400
    });

  } catch (error) {
    console.error('Error processing lead to booking:', error);
    return NextResponse.json({
      error: 'Failed to process lead to booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Batch process multiple leads
 */
export async function PUT(request: NextRequest) {
  try {
    const integrationManager = getIntegrationManager();
    
    const body = await request.json();
    
    if (!body.searchCriteria || !body.flightTemplate) {
      return NextResponse.json({
        error: 'Missing required fields: searchCriteria and flightTemplate'
      }, { status: 400 });
    }

    const result = await integrationManager.searchAndConvertLeads(
      body.searchCriteria,
      body.flightTemplate
    );
    
    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      timestamp: result.timestamp.toISOString()
    }, {
      status: result.success ? 200 : 400
    });

  } catch (error) {
    console.error('Error batch processing leads:', error);
    return NextResponse.json({
      error: 'Failed to batch process leads',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}