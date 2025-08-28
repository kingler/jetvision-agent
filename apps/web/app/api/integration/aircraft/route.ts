import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationManager } from '../../../../lib/mcp/integration-manager';

/**
 * API endpoint for aircraft search and Avainode integration
 */

/**
 * Search for available aircraft using Avainode
 */
export async function GET(request: NextRequest) {
  try {
    const integrationManager = getIntegrationManager();
    const services = integrationManager.getServices();
    
    const { searchParams } = request.nextUrl;
    
    // Validate required parameters
    const departureAirport = searchParams.get('departureAirport');
    const arrivalAirport = searchParams.get('arrivalAirport');
    const departureDate = searchParams.get('departureDate');
    const passengers = searchParams.get('passengers');

    if (!departureAirport || !arrivalAirport || !departureDate || !passengers) {
      return NextResponse.json({
        error: 'Missing required parameters: departureAirport, arrivalAirport, departureDate, passengers'
      }, { status: 400 });
    }

    const searchCriteria = {
      departureAirport,
      arrivalAirport,
      departureDate,
      passengers: parseInt(passengers),
      aircraftCategory: searchParams.get('aircraftCategory') || undefined,
      maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined
    };

    const result = await services.avainode.searchAircraft(searchCriteria);
    
    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      timestamp: result.timestamp.toISOString()
    }, {
      status: result.success ? 200 : 400
    });

  } catch (error) {
    console.error('Error searching aircraft:', error);
    return NextResponse.json({
      error: 'Failed to search aircraft',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Create charter request
 */
export async function POST(request: NextRequest) {
  try {
    const integrationManager = getIntegrationManager();
    const services = integrationManager.getServices();
    
    const body = await request.json();
    
    // Validate required parameters
    const requiredFields = [
      'aircraftId', 'departureAirport', 'arrivalAirport', 'departureDate',
      'departureTime', 'passengers', 'contactName', 'contactEmail', 'contactPhone'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          error: `Missing required field: ${field}`
        }, { status: 400 });
      }
    }

    const result = await services.avainode.createCharterRequest(body);
    
    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      timestamp: result.timestamp.toISOString()
    }, {
      status: result.success ? 200 : 400
    });

  } catch (error) {
    console.error('Error creating charter request:', error);
    return NextResponse.json({
      error: 'Failed to create charter request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}