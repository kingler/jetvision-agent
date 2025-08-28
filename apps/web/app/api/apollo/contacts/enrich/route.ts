import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { ApolloClient } from '../../../../../lib/apollo-client';

interface EnrichContactRequest {
    email: string;
    linkedinUrl?: string;
}

interface EnrichContactResponse {
    success: boolean;
    data?: any;
    error?: string;
    usage?: {
        credits_used: number;
        remaining_credits: number;
    };
}

/**
 * Apollo.io Contact Enrichment API Endpoint
 * POST /api/apollo/contacts/enrich
 */
export async function POST(request: NextRequest): Promise<NextResponse<EnrichContactResponse>> {
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
        const { email, linkedinUrl }: EnrichContactRequest = body;

        // Validate email is provided
        if (!email) {
            return NextResponse.json({
                success: false,
                error: 'Email address is required'
            }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid email format'
            }, { status: 400 });
        }

        // Validate LinkedIn URL format if provided
        if (linkedinUrl && !linkedinUrl.includes('linkedin.com')) {
            return NextResponse.json({
                success: false,
                error: 'Invalid LinkedIn URL format'
            }, { status: 400 });
        }

        // Initialize Apollo client
        const apolloClient = new ApolloClient();

        // Check API health before making request
        const healthStatus = await apolloClient.getHealthStatus();
        if (healthStatus.status !== 'ready') {
            return NextResponse.json({
                success: false,
                error: 'Apollo.io API is not configured properly. Please check API key.'
            }, { status: 503 });
        }

        try {
            // Perform contact enrichment
            const enrichedContact = await apolloClient.enrichContact({
                email,
                linkedinUrl
            });

            // Log enrichment for analytics (non-blocking)
            console.log(`Contact enrichment performed by user ${session.userId}:`, {
                email: email.replace(/(.{3}).*(@.*)/, '$1***$2'), // Mask email for privacy
                hasLinkedIn: !!linkedinUrl,
                verified: enrichedContact.verified,
                timestamp: new Date().toISOString()
            });

            return NextResponse.json({
                success: true,
                data: enrichedContact,
                usage: {
                    credits_used: 1,
                    remaining_credits: healthStatus.rateLimit - 1 // Approximate
                }
            }, { status: 200 });

        } catch (apolloError: any) {
            console.error('Apollo contact enrichment error:', apolloError);

            // Handle specific error cases
            if (apolloError.message?.includes('Contact not found')) {
                return NextResponse.json({
                    success: false,
                    error: 'Contact not found in Apollo.io database'
                }, { status: 404 });
            }

            if (apolloError.message?.includes('Rate limit exceeded')) {
                return NextResponse.json({
                    success: false,
                    error: 'Rate limit exceeded. Please wait before making more requests.'
                }, { status: 429 });
            }

            if (apolloError.message?.includes('API key') || apolloError.message?.includes('401')) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid Apollo.io API credentials'
                }, { status: 401 });
            }

            // Handle other Apollo API errors
            return NextResponse.json({
                success: false,
                error: `Apollo.io API error: ${apolloError.message || 'Unknown error occurred'}`
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Contact enrichment endpoint error:', error);
        
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
        endpoint: '/api/apollo/contacts/enrich',
        method: 'POST',
        description: 'Enrich contact information using Apollo.io Enrichment API',
        parameters: {
            email: 'string (required) - Email address to enrich',
            linkedinUrl: 'string (optional) - LinkedIn profile URL for additional matching'
        },
        authentication: 'Required - Clerk session',
        rateLimit: '60 requests per minute',
        response: {
            success: 'boolean',
            data: {
                email: 'string - Contact email',
                name: 'string - Full name',
                title: 'string - Job title',
                company: 'string - Company name',
                phone: 'string - Phone number',
                linkedIn: 'string - LinkedIn profile URL',
                twitter: 'string - Twitter profile URL',
                verified: 'boolean - Email verification status'
            },
            usage: {
                credits_used: 'number - Credits consumed',
                remaining_credits: 'number - Remaining credits'
            }
        },
        example: {
            email: 'john.doe@example.com',
            linkedinUrl: 'https://linkedin.com/in/johndoe'
        }
    });
}