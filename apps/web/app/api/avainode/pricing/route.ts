import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { AvainodeClient } from '../../../../lib/avainode-client';

interface PricingRequest {
    aircraftId: string;
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    passengers: number;
    returnDate?: string;
    includeAllFees?: boolean;
}

interface PricingResponse {
    success: boolean;
    data?: any;
    error?: string;
    usage?: {
        credits_used: number;
        remaining_credits: number;
    };
}

/**
 * Avainode Pricing Calculation API Endpoint
 * POST /api/avainode/pricing
 */
export async function POST(request: NextRequest): Promise<NextResponse<PricingResponse>> {
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
            passengers,
            returnDate,
            includeAllFees = true
        }: PricingRequest = body;

        // Validate required fields
        const requiredFields = [
            'aircraftId', 'departureAirport', 'arrivalAirport', 
            'departureDate', 'passengers'
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

        // Validate return date if provided
        if (returnDate && !dateRegex.test(returnDate)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid return date format. Use YYYY-MM-DD'
            }, { status: 400 });
        }

        // Validate passengers
        if (passengers < 1 || passengers > 19) {
            return NextResponse.json({
                success: false,
                error: 'Passengers must be between 1 and 19'
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
            // Get pricing quote
            const pricing = await avainodeClient.getPricing({
                aircraftId: aircraftId.toUpperCase(),
                departureAirport: departureAirport.toUpperCase(),
                arrivalAirport: arrivalAirport.toUpperCase(),
                departureDate,
                passengers,
                returnDate,
                includeAllFees
            });

            // Calculate additional pricing insights
            const insights = generatePricingInsights(pricing, passengers, !!returnDate);

            // Generate cost breakdown summary
            const summary = generateCostSummary(pricing, includeAllFees);

            // Enhanced pricing response
            const enhancedPricing = {
                ...pricing,
                summary,
                insights,
                savings: returnDate ? {
                    roundTripDiscount: calculateRoundTripSavings(pricing),
                    alternativeRoutes: 'Contact us for potential routing optimizations'
                } : null,
                paymentSchedule: {
                    deposit: Math.round(pricing.total * 0.2),
                    depositPercentage: '20%',
                    balance: Math.round(pricing.total * 0.8),
                    balancePercentage: '80%',
                    depositDue: 'Upon booking confirmation',
                    balanceDue: '24 hours before departure'
                },
                terms: {
                    validUntil: pricing.validUntil,
                    currency: pricing.currency,
                    priceIncludes: includeAllFees ? 
                        ['Aircraft rental', 'Crew fees', 'Fuel surcharge', 'Landing fees', 'Handling fees', 'Catering', 'Taxes'] :
                        ['Aircraft rental only'],
                    additionalFees: !includeAllFees ? 
                        'Fuel, landing fees, catering, and other charges will be billed separately' : null
                }
            };

            // Log pricing request for analytics (non-blocking)
            console.log(`Pricing quote generated for user ${session.userId}:`, {
                aircraftId,
                route: `${departureAirport} → ${arrivalAirport}`,
                departureDate,
                passengers,
                isRoundTrip: !!returnDate,
                totalCost: pricing.total,
                includeAllFees,
                timestamp: new Date().toISOString()
            });

            return NextResponse.json({
                success: true,
                data: enhancedPricing,
                usage: {
                    credits_used: 1,
                    remaining_credits: healthStatus.rateLimit - 1
                }
            }, { status: 200 });

        } catch (avainodeError: any) {
            console.error('Avainode pricing error:', avainodeError);

            // Handle specific error cases
            if (avainodeError.message?.includes('Aircraft not found')) {
                return NextResponse.json({
                    success: false,
                    error: 'Aircraft not found. Please verify the aircraft ID.'
                }, { status: 404 });
            }

            if (avainodeError.message?.includes('Route not available')) {
                return NextResponse.json({
                    success: false,
                    error: 'Pricing not available for this route. Please contact support.'
                }, { status: 422 });
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
        console.error('Pricing endpoint error:', error);
        
        return NextResponse.json({
            success: false,
            error: `Internal server error: ${error.message || 'Unknown error'}`
        }, { status: 500 });
    }
}

/**
 * Generate pricing insights and recommendations
 */
function generatePricingInsights(pricing: any, passengers: number, isRoundTrip: boolean) {
    const insights = [];
    
    const costPerPassenger = Math.round(pricing.total / passengers);
    const costPerHour = Math.round(pricing.total / pricing.flightTime);

    insights.push({
        type: 'cost_breakdown',
        message: `$${costPerPassenger.toLocaleString()} per passenger for this ${isRoundTrip ? 'round-trip' : 'one-way'} flight`
    });

    insights.push({
        type: 'hourly_rate',
        message: `Effective rate: $${costPerHour.toLocaleString()} per flight hour`
    });

    // Round trip savings insight
    if (isRoundTrip) {
        const savings = calculateRoundTripSavings(pricing);
        insights.push({
            type: 'round_trip_savings',
            message: `Round-trip booking saves approximately $${savings.toLocaleString()} compared to two one-way flights`
        });
    }

    // Compare to commercial alternatives
    const commercialComparison = costPerPassenger / 2000; // Rough first-class commercial estimate
    if (commercialComparison < 5) {
        insights.push({
            type: 'value_comparison',
            message: 'Excellent value - comparable to premium commercial options with significant time savings'
        });
    } else if (commercialComparison > 15) {
        insights.push({
            type: 'luxury_positioning',
            message: 'Premium luxury experience with unmatched convenience and privacy'
        });
    }

    // Time savings insight
    insights.push({
        type: 'time_savings',
        message: 'Save 2-4 hours compared to commercial flights (no security lines, direct routing)'
    });

    return insights;
}

/**
 * Generate cost breakdown summary
 */
function generateCostSummary(pricing: any, includeAllFees: boolean) {
    const feeCategories: Array<{category: string, amount: any, percentage: string}> = [];
    let totalFees = 0;

    if (includeAllFees && pricing.fees) {
        Object.entries(pricing.fees).forEach(([category, amount]: [string, any]) => {
            if (amount && amount > 0) {
                feeCategories.push({
                    category: formatFeeCategory(category),
                    amount: amount,
                    percentage: ((amount / pricing.total) * 100).toFixed(1)
                });
                totalFees += amount;
            }
        });
    }

    return {
        baseCost: pricing.baseCost,
        baseCostPercentage: ((pricing.baseCost / pricing.total) * 100).toFixed(1),
        totalFees,
        totalFeesPercentage: ((totalFees / pricing.total) * 100).toFixed(1),
        feeBreakdown: feeCategories,
        grandTotal: pricing.total,
        costStructure: includeAllFees ? 'All-inclusive pricing' : 'Base aircraft cost only'
    };
}

/**
 * Format fee category names for display
 */
function formatFeeCategory(category: string): string {
    const categoryMap: { [key: string]: string } = {
        fuelSurcharge: 'Fuel Surcharge',
        landingFees: 'Landing Fees',
        handlingFees: 'Ground Handling',
        catering: 'Catering & Service',
        crewFees: 'Crew Expenses',
        taxes: 'Taxes & Regulatory Fees'
    };
    
    return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Calculate round trip savings
 */
function calculateRoundTripSavings(pricing: any): number {
    // Estimate savings from round-trip discount (typically 5-10%)
    const oneWayEquivalent = pricing.total / 1.9; // Reverse the 1.9 multiplier
    const twoOneWays = oneWayEquivalent * 2;
    return Math.round(twoOneWays - pricing.total);
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
        endpoint: '/api/avainode/pricing',
        method: 'POST',
        description: 'Calculate detailed pricing for private jet charters through Avainode',
        parameters: {
            aircraftId: 'string (required) - Aircraft identifier from search results',
            departureAirport: 'string (required) - ICAO or IATA airport code',
            arrivalAirport: 'string (required) - ICAO or IATA airport code',
            departureDate: 'string (required) - YYYY-MM-DD format',
            passengers: 'number (required) - Number of passengers (1-19)',
            returnDate: 'string (optional) - Return date for round-trip pricing',
            includeAllFees: 'boolean (optional) - Include all fees in quote (default: true)'
        },
        authentication: 'Required - Clerk session',
        rateLimit: '100 requests per minute',
        response: {
            success: 'boolean',
            data: {
                aircraftId: 'string - Aircraft identifier',
                route: 'string - Flight route',
                departureDate: 'string - Departure date',
                returnDate: 'string|null - Return date if round-trip',
                flightTime: 'number - Total flight hours',
                baseCost: 'number - Base aircraft rental cost',
                fees: 'object - Detailed fee breakdown',
                total: 'number - Total cost including all fees',
                currency: 'string - Currency code (USD)',
                validUntil: 'string - Quote expiration date',
                summary: 'object - Cost breakdown summary',
                insights: 'object[] - AI-generated pricing insights',
                paymentSchedule: 'object - Payment terms and schedule',
                terms: 'object - Quote terms and conditions'
            },
            usage: {
                credits_used: 'number - Credits consumed',
                remaining_credits: 'number - Remaining credits'
            }
        },
        example: {
            aircraftId: 'ACF123',
            departureAirport: 'KJFK',
            arrivalAirport: 'KLAX',
            departureDate: '2024-03-15',
            passengers: 6,
            returnDate: '2024-03-17',
            includeAllFees: true
        },
        pricing_components: {
            baseCost: 'Aircraft hourly rate × flight time',
            fuelSurcharge: '7.5% of base cost (market dependent)',
            landingFees: 'Airport-specific charges',
            handlingFees: 'Ground services and support',
            catering: '$150 per passenger (customizable)',
            crewFees: 'Crew expenses and overnight costs',
            taxes: '8% of subtotal (varies by jurisdiction)'
        },
        payment_terms: {
            deposit: '20% due upon booking confirmation',
            balance: '80% due 24 hours before departure',
            methods: 'Wire transfer, ACH, major credit cards',
            cancellation: 'Varies by operator and timing'
        },
        quote_validity: '5 days from generation (fuel prices subject to change)'
    });
}