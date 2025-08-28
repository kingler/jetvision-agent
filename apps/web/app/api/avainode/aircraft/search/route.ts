import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { AvainodeClient } from '../../../../../lib/avainode-client';

interface AircraftSearchRequest {
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    passengers: number;
    aircraftCategory?: string;
    maxPrice?: number;
    returnDate?: string;
}

interface AircraftSearchResponse {
    success: boolean;
    data?: any[];
    error?: string;
    usage?: {
        credits_used: number;
        remaining_credits: number;
    };
    metadata?: {
        search_criteria: any;
        results_count: number;
        search_time: string;
    };
}

/**
 * Avainode Aircraft Search API Endpoint
 * POST /api/avainode/aircraft/search
 */
export async function POST(request: NextRequest): Promise<NextResponse<AircraftSearchResponse>> {
    try {
        // Authenticate the request
        const session = await auth();
        if (!session?.userId) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            }, { status: 401 });
        }

        // Parse and validate request body
        const body = await request.json().catch(() => ({}));
        const { 
            departureAirport, 
            arrivalAirport, 
            departureDate, 
            passengers, 
            aircraftCategory, 
            maxPrice,
            returnDate 
        }: AircraftSearchRequest = body;

        // Validate required fields
        if (!departureAirport || !departureAirport.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Departure airport is required'
            }, { status: 400 });
        }

        if (!arrivalAirport || !arrivalAirport.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Arrival airport is required'
            }, { status: 400 });
        }

        if (!departureDate || !departureDate.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Departure date is required'
            }, { status: 400 });
        }

        if (!passengers || passengers < 1 || passengers > 19) {
            return NextResponse.json({
                success: false,
                error: 'Passengers must be between 1 and 19'
            }, { status: 400 });
        }

        // Validate airport code formats
        const airportCodeRegex = /^[A-Z]{3,4}$/;
        if (!airportCodeRegex.test(departureAirport.toUpperCase())) {
            return NextResponse.json({
                success: false,
                error: 'Invalid departure airport code format. Use ICAO (4 letters) or IATA (3 letters) codes.'
            }, { status: 400 });
        }

        if (!airportCodeRegex.test(arrivalAirport.toUpperCase())) {
            return NextResponse.json({
                success: false,
                error: 'Invalid arrival airport code format. Use ICAO (4 letters) or IATA (3 letters) codes.'
            }, { status: 400 });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(departureDate)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid departure date format. Use YYYY-MM-DD'
            }, { status: 400 });
        }

        // Validate return date if provided
        if (returnDate && !dateRegex.test(returnDate)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid return date format. Use YYYY-MM-DD'
            }, { status: 400 });
        }

        // Validate date logic
        const depDate = new Date(departureDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (depDate < today) {
            return NextResponse.json({
                success: false,
                error: 'Departure date cannot be in the past'
            }, { status: 400 });
        }

        if (returnDate && new Date(returnDate) <= depDate) {
            return NextResponse.json({
                success: false,
                error: 'Return date must be after departure date'
            }, { status: 400 });
        }

        // Validate max price if provided
        if (maxPrice && (maxPrice < 1000 || maxPrice > 100000)) {
            return NextResponse.json({
                success: false,
                error: 'Max price must be between $1,000 and $100,000 per hour'
            }, { status: 400 });
        }

        // Validate aircraft category if provided
        const validCategories = ['Light Jet', 'Midsize Jet', 'Super Midsize Jet', 'Heavy Jet', 'Ultra Long Range'];
        if (aircraftCategory && !validCategories.includes(aircraftCategory)) {
            return NextResponse.json({
                success: false,
                error: `Invalid aircraft category. Must be one of: ${validCategories.join(', ')}`
            }, { status: 400 });
        }

        // Initialize Avainode client
        const avainodeClient = new AvainodeClient();

        // Check API health before making request
        const healthStatus = await avainodeClient.getHealthStatus();
        if (healthStatus.status !== 'ready') {
            return NextResponse.json({
                success: false,
                error: 'Avainode API is not configured properly. Please check API key.'
            }, { status: 503 });
        }

        const searchStartTime = new Date().toISOString();

        try {
            // Perform aircraft search
            const aircraft = await avainodeClient.searchAircraft({
                departureAirport: departureAirport.toUpperCase(),
                arrivalAirport: arrivalAirport.toUpperCase(),
                departureDate,
                passengers,
                aircraftCategory,
                maxPrice,
                returnDate
            });

            // Enhance results with additional metadata
            const enhancedResults = aircraft.map(ac => ({
                ...ac,
                route: `${departureAirport.toUpperCase()} → ${arrivalAirport.toUpperCase()}`,
                isRoundTrip: !!returnDate,
                estimatedFlightTime: calculateFlightTime(departureAirport, arrivalAirport),
                priceEstimate: {
                    oneWay: ac.hourlyRate * calculateFlightTime(departureAirport, arrivalAirport),
                    roundTrip: returnDate ? ac.hourlyRate * calculateFlightTime(departureAirport, arrivalAirport) * 1.9 : null
                },
                passengerCapacityMatch: ac.maxPassengers >= passengers ? 'exact' : 'insufficient'
            }));

            // Sort by relevance (passenger capacity match, then price)
            const sortedResults = enhancedResults.sort((a, b) => {
                if (a.passengerCapacityMatch !== b.passengerCapacityMatch) {
                    return a.passengerCapacityMatch === 'exact' ? -1 : 1;
                }
                return a.hourlyRate - b.hourlyRate;
            });

            // Log search for analytics (non-blocking)
            console.log(`Aircraft search performed by user ${session.userId}:`, {
                route: `${departureAirport} → ${arrivalAirport}`,
                departureDate,
                passengers,
                category: aircraftCategory,
                resultsCount: sortedResults.length,
                isRoundTrip: !!returnDate,
                timestamp: searchStartTime
            });

            return NextResponse.json({
                success: true,
                data: sortedResults,
                usage: {
                    credits_used: 1,
                    remaining_credits: healthStatus.rateLimit - 1
                },
                metadata: {
                    search_criteria: {
                        departureAirport: departureAirport.toUpperCase(),
                        arrivalAirport: arrivalAirport.toUpperCase(),
                        departureDate,
                        returnDate,
                        passengers,
                        aircraftCategory,
                        maxPrice
                    },
                    results_count: sortedResults.length,
                    search_time: searchStartTime,
                    recommendations: generateRecommendations(sortedResults, passengers)
                }
            }, { status: 200 });

        } catch (avainodeError: any) {
            console.error('Avainode aircraft search error:', avainodeError);

            // Handle specific error cases
            if (avainodeError.message?.includes('Invalid airport code')) {
                return NextResponse.json({
                    success: false,
                    error: 'One or more airport codes are not recognized. Please verify airport codes.'
                }, { status: 400 });
            }

            if (avainodeError.message?.includes('Rate limit exceeded')) {
                return NextResponse.json({
                    success: false,
                    error: 'Rate limit exceeded. Please wait before making more requests.'
                }, { status: 429 });
            }

            if (avainodeError.message?.includes('API key') || avainodeError.message?.includes('401')) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid Avainode API credentials'
                }, { status: 401 });
            }

            // Handle other Avainode API errors
            return NextResponse.json({
                success: false,
                error: `Avainode API error: ${avainodeError.message || 'Unknown error occurred'}`
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Aircraft search endpoint error:', error);
        
        return NextResponse.json({
            success: false,
            error: `Internal server error: ${error.message || 'Unknown error'}`
        }, { status: 500 });
    }
}

/**
 * Calculate estimated flight time between airports
 */
function calculateFlightTime(departure: string, arrival: string): number {
    // Mock flight time calculation - in production would use great circle distance
    const routes: { [key: string]: number } = {
        "KJFK-KLAX": 5.5, "KLAX-KJFK": 5.0,
        "KTEB-KLAS": 5.0, "KLAS-KTEB": 4.5,
        "KJFK-EGLL": 7.5, "EGLL-KJFK": 8.0,
        "KJFK-LFPG": 7.0, "LFPG-KJFK": 8.0,
        "KLAX-EGLL": 11.0, "EGLL-KLAX": 10.5,
        "KORD-KLAX": 4.0, "KLAX-KORD": 3.5,
        "KBOS-KMIA": 3.0, "KMIA-KBOS": 2.5
    };
    
    const routeKey = `${departure.toUpperCase()}-${arrival.toUpperCase()}`;
    return routes[routeKey] || 3.5; // Default estimate
}

/**
 * Generate recommendations based on search results
 */
function generateRecommendations(aircraft: any[], passengers: number) {
    const recommendations = [];
    
    if (aircraft.length === 0) {
        recommendations.push({
            type: 'no_results',
            message: 'No aircraft found matching your criteria. Try adjusting your search parameters.'
        });
        return recommendations;
    }

    // Best value recommendation
    const bestValue = aircraft.reduce((prev, current) => 
        (prev.hourlyRate < current.hourlyRate) ? prev : current
    );
    recommendations.push({
        type: 'best_value',
        aircraftId: bestValue.id,
        message: `${bestValue.model} offers the best hourly rate at $${bestValue.hourlyRate.toLocaleString()}`
    });

    // Capacity recommendations
    const oversizedAircraft = aircraft.filter(ac => ac.maxPassengers > passengers + 4);
    if (oversizedAircraft.length > 0 && aircraft.length > oversizedAircraft.length) {
        recommendations.push({
            type: 'right_sizing',
            message: `Consider smaller aircraft to optimize costs. You have ${passengers} passengers.`
        });
    }

    // Category recommendations
    const categories = Array.from(new Set(aircraft.map(ac => ac.category)));
    if (categories.length > 1) {
        recommendations.push({
            type: 'category_options',
            message: `${categories.length} aircraft categories available: ${categories.join(', ')}`
        });
    }

    return recommendations;
}

/**
 * Handle preflight CORS requests
 */
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

/**
 * GET endpoint for API documentation
 */
export async function GET(request: NextRequest) {
    return NextResponse.json({
        endpoint: '/api/avainode/aircraft/search',
        method: 'POST',
        description: 'Search for available private jets using Avainode marketplace',
        parameters: {
            departureAirport: 'string (required) - ICAO or IATA airport code',
            arrivalAirport: 'string (required) - ICAO or IATA airport code',
            departureDate: 'string (required) - Departure date in YYYY-MM-DD format',
            passengers: 'number (required) - Number of passengers (1-19)',
            aircraftCategory: 'string (optional) - Aircraft category filter',
            maxPrice: 'number (optional) - Maximum hourly rate in USD',
            returnDate: 'string (optional) - Return date for round trip'
        },
        validation: {
            airportCodes: 'ICAO (4 letters) or IATA (3 letters) format',
            dates: 'YYYY-MM-DD format, departure must be future date',
            passengers: 'Between 1 and 19',
            maxPrice: 'Between $1,000 and $100,000 per hour',
            aircraftCategories: ['Light Jet', 'Midsize Jet', 'Super Midsize Jet', 'Heavy Jet', 'Ultra Long Range']
        },
        authentication: 'Required - Clerk session',
        rateLimit: '100 requests per minute',
        response: {
            success: 'boolean',
            data: 'Aircraft[] - Array of available aircraft',
            metadata: {
                search_criteria: 'object - Search parameters used',
                results_count: 'number - Number of results',
                search_time: 'string - Search timestamp',
                recommendations: 'object[] - AI-generated recommendations'
            },
            usage: {
                credits_used: 'number - Credits consumed',
                remaining_credits: 'number - Remaining credits'
            }
        },
        example: {
            departureAirport: 'KJFK',
            arrivalAirport: 'KLAX',
            departureDate: '2024-03-15',
            passengers: 6,
            aircraftCategory: 'Heavy Jet',
            maxPrice: 10000
        }
    });
}