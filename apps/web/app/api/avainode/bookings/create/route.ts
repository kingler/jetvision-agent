import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { AvainodeClient } from '../../../../../lib/avainode-client';

interface CreateBookingRequest {
    aircraftId: string;
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    departureTime: string;
    passengers: number;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    specialRequests?: string;
    returnDate?: string;
    returnTime?: string;
}

interface BookingResponse {
    success: boolean;
    data?: any;
    error?: string;
    usage?: {
        credits_used: number;
        remaining_credits: number;
    };
}

/**
 * Avainode Charter Booking API Endpoint
 * POST /api/avainode/bookings/create
 */
export async function POST(request: NextRequest): Promise<NextResponse<BookingResponse>> {
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
            aircraftId,
            departureAirport,
            arrivalAirport,
            departureDate,
            departureTime,
            passengers,
            contactName,
            contactEmail,
            contactPhone,
            specialRequests,
            returnDate,
            returnTime
        }: CreateBookingRequest = body;

        // Validate required fields
        const requiredFields = [
            'aircraftId', 'departureAirport', 'arrivalAirport', 
            'departureDate', 'departureTime', 'passengers',
            'contactName', 'contactEmail', 'contactPhone'
        ];

        for (const field of requiredFields) {
            if (!body[field] || (typeof body[field] === 'string' && !body[field].trim())) {
                return NextResponse.json({
                    success: false,
                    error: `${field} is required`
                }, { status: 400 });
            }
        }

        // Validate aircraft ID format
        if (!aircraftId.match(/^[A-Z0-9]{3,10}$/i)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid aircraft ID format'
            }, { status: 400 });
        }

        // Validate airport codes
        const airportCodeRegex = /^[A-Z]{3,4}$/;
        if (!airportCodeRegex.test(departureAirport.toUpperCase())) {
            return NextResponse.json({
                success: false,
                error: 'Invalid departure airport code format'
            }, { status: 400 });
        }

        if (!airportCodeRegex.test(arrivalAirport.toUpperCase())) {
            return NextResponse.json({
                success: false,
                error: 'Invalid arrival airport code format'
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

        // Validate time format
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(departureTime)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid departure time format. Use HH:MM (24-hour format)'
            }, { status: 400 });
        }

        // Validate return date and time if provided
        if (returnDate && !dateRegex.test(returnDate)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid return date format. Use YYYY-MM-DD'
            }, { status: 400 });
        }

        if (returnTime && !timeRegex.test(returnTime)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid return time format. Use HH:MM (24-hour format)'
            }, { status: 400 });
        }

        // Validate passengers
        if (passengers < 1 || passengers > 19) {
            return NextResponse.json({
                success: false,
                error: 'Passengers must be between 1 and 19'
            }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactEmail)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid email format'
            }, { status: 400 });
        }

        // Validate phone format (basic international format check)
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(contactPhone.replace(/[\s\-\(\)]/g, ''))) {
            return NextResponse.json({
                success: false,
                error: 'Invalid phone number format'
            }, { status: 400 });
        }

        // Validate date logic
        const depDate = new Date(`${departureDate}T${departureTime}`);
        const now = new Date();
        
        if (depDate < now) {
            return NextResponse.json({
                success: false,
                error: 'Departure date/time cannot be in the past'
            }, { status: 400 });
        }

        // Validate return date logic if provided
        if (returnDate && returnTime) {
            const retDate = new Date(`${returnDate}T${returnTime}`);
            if (retDate <= depDate) {
                return NextResponse.json({
                    success: false,
                    error: 'Return date/time must be after departure'
                }, { status: 400 });
            }
        }

        // Validate special requests length
        if (specialRequests && specialRequests.length > 500) {
            return NextResponse.json({
                success: false,
                error: 'Special requests cannot exceed 500 characters'
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

        try {
            // Create charter request
            const charterRequest = await avainodeClient.createCharterRequest({
                aircraftId: aircraftId.toUpperCase(),
                departureAirport: departureAirport.toUpperCase(),
                arrivalAirport: arrivalAirport.toUpperCase(),
                departureDate,
                departureTime,
                passengers,
                contactName: contactName.trim(),
                contactEmail: contactEmail.trim().toLowerCase(),
                contactPhone: contactPhone.trim(),
                specialRequests: specialRequests?.trim(),
                returnDate,
                returnTime
            });

            // Generate booking confirmation details
            const bookingDetails = {
                ...charterRequest,
                estimatedResponse: '2-4 hours',
                nextSteps: [
                    'Operator will review your request within 2-4 hours',
                    'You will receive a detailed quote via email',
                    'Upon acceptance, a deposit invoice will be sent',
                    '20% deposit required to secure the booking',
                    'Final balance due 24 hours before departure'
                ],
                importantNotes: [
                    'All times are in local time zones',
                    'Fuel prices subject to change until booking confirmation',
                    'Weather conditions may affect scheduling',
                    'Cancellation policy applies as per operator terms'
                ],
                supportContact: {
                    email: 'support@jetvision.com',
                    phone: '+1-800-JET-VISION',
                    hours: '24/7 for urgent matters'
                }
            };

            // Log booking creation for analytics (non-blocking)
            console.log(`Charter booking created by user ${session.userId}:`, {
                requestId: charterRequest.requestId,
                route: `${departureAirport} → ${arrivalAirport}`,
                aircraftId,
                departureDateTime: `${departureDate} ${departureTime}`,
                passengers,
                isRoundTrip: !!returnDate,
                timestamp: new Date().toISOString()
            });

            return NextResponse.json({
                success: true,
                data: bookingDetails,
                usage: {
                    credits_used: 2, // Booking requests cost more credits
                    remaining_credits: healthStatus.rateLimit - 2
                }
            }, { status: 201 });

        } catch (avainodeError: any) {
            console.error('Avainode booking creation error:', avainodeError);

            // Handle specific error cases
            if (avainodeError.message?.includes('Aircraft not available')) {
                return NextResponse.json({
                    success: false,
                    error: 'Selected aircraft is not available for the requested dates. Please search for alternatives.'
                }, { status: 409 });
            }

            if (avainodeError.message?.includes('Invalid aircraft')) {
                return NextResponse.json({
                    success: false,
                    error: 'Aircraft ID not found. Please verify the aircraft selection.'
                }, { status: 404 });
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

            // Handle validation errors from Avainode
            if (avainodeError.message?.includes('validation') || avainodeError.message?.includes('invalid')) {
                return NextResponse.json({
                    success: false,
                    error: `Request validation failed: ${avainodeError.message}`
                }, { status: 400 });
            }

            // Handle other Avainode API errors
            return NextResponse.json({
                success: false,
                error: `Avainode API error: ${avainodeError.message || 'Unknown error occurred'}`
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Booking creation endpoint error:', error);
        
        return NextResponse.json({
            success: false,
            error: `Internal server error: ${error.message || 'Unknown error'}`
        }, { status: 500 });
    }
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
        endpoint: '/api/avainode/bookings/create',
        method: 'POST',
        description: 'Create a charter request booking through Avainode',
        parameters: {
            aircraftId: 'string (required) - Aircraft identifier from search results',
            departureAirport: 'string (required) - ICAO or IATA airport code',
            arrivalAirport: 'string (required) - ICAO or IATA airport code',
            departureDate: 'string (required) - YYYY-MM-DD format',
            departureTime: 'string (required) - HH:MM format (24-hour)',
            passengers: 'number (required) - Number of passengers (1-19)',
            contactName: 'string (required) - Primary contact name',
            contactEmail: 'string (required) - Contact email address',
            contactPhone: 'string (required) - Contact phone number',
            specialRequests: 'string (optional) - Additional requirements (max 500 chars)',
            returnDate: 'string (optional) - Return date for round trip',
            returnTime: 'string (optional) - Return time for round trip'
        },
        validation: {
            aircraftId: 'Alphanumeric, 3-10 characters',
            airportCodes: 'ICAO (4 letters) or IATA (3 letters)',
            dates: 'YYYY-MM-DD format, must be future dates',
            times: 'HH:MM format, 24-hour time',
            passengers: 'Integer between 1 and 19',
            email: 'Valid email format',
            phone: 'International phone number format',
            specialRequests: 'Maximum 500 characters'
        },
        authentication: 'Required - Clerk session',
        rateLimit: '100 requests per minute',
        response: {
            success: 'boolean',
            data: {
                requestId: 'string - Booking request identifier',
                aircraftId: 'string - Aircraft identifier',
                route: 'string - Flight route',
                departureDate: 'string - Departure date',
                departureTime: 'string - Departure time',
                passengers: 'number - Passenger count',
                contactName: 'string - Contact name',
                contactEmail: 'string - Contact email',
                status: 'string - Request status',
                estimatedResponse: 'string - Expected response time',
                nextSteps: 'string[] - Process workflow',
                importantNotes: 'string[] - Important information',
                supportContact: 'object - Support details'
            },
            usage: {
                credits_used: 'number - Credits consumed (2 for bookings)',
                remaining_credits: 'number - Remaining credits'
            }
        },
        example: {
            aircraftId: 'ACF123',
            departureAirport: 'KJFK',
            arrivalAirport: 'KLAX',
            departureDate: '2024-03-15',
            departureTime: '10:00',
            passengers: 6,
            contactName: 'John Doe',
            contactEmail: 'john.doe@example.com',
            contactPhone: '+1-555-123-4567',
            specialRequests: 'Vegetarian catering requested',
            returnDate: '2024-03-17',
            returnTime: '16:00'
        },
        workflow: {
            step1: 'Submit charter request',
            step2: 'Operator reviews (2-4 hours)',
            step3: 'Receive detailed quote',
            step4: 'Accept quote and pay deposit (20%)',
            step5: 'Receive confirmation and flight details',
            step6: 'Pay balance 24 hours before departure',
            step7: 'Enjoy your flight!'
        }
    });
}