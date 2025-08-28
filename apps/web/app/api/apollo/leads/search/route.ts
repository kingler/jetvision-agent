import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { ApolloClient } from '../../../../../lib/apollo-client';

interface SearchLeadsRequest {
    jobTitle?: string;
    industry?: string;
    companySize?: string;
    location?: string;
    limit?: number;
}

interface SearchLeadsResponse {
    success: boolean;
    data?: any[];
    error?: string;
    usage?: {
        credits_used: number;
        remaining_credits: number;
    };
}

/**
 * Apollo.io Lead Search API Endpoint
 * POST /api/apollo/leads/search
 */
export async function POST(request: NextRequest): Promise<NextResponse<SearchLeadsResponse>> {
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
        const { jobTitle, industry, companySize, location, limit = 25 }: SearchLeadsRequest = body;

        // Validate that at least one search criterion is provided
        if (!jobTitle && !industry && !companySize && !location) {
            return NextResponse.json({
                success: false,
                error: 'At least one search criterion must be provided (jobTitle, industry, companySize, or location)'
            }, { status: 400 });
        }

        // Validate limit parameter
        if (limit && (limit < 1 || limit > 100)) {
            return NextResponse.json({
                success: false,
                error: 'Limit must be between 1 and 100'
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
            // Perform the lead search
            const leads = await apolloClient.searchLeads({
                jobTitle,
                industry,
                companySize,
                location,
                limit
            });

            // Log search for analytics (non-blocking)
            console.log(`Lead search performed by user ${session.userId}:`, {
                criteria: { jobTitle, industry, companySize, location },
                resultsCount: leads.length,
                timestamp: new Date().toISOString()
            });

            return NextResponse.json({
                success: true,
                data: leads,
                usage: {
                    credits_used: 1,
                    remaining_credits: healthStatus.rateLimit - 1 // Approximate
                }
            }, { status: 200 });

        } catch (apolloError: any) {
            console.error('Apollo API error:', apolloError);

            // Handle rate limiting specifically
            if (apolloError.message?.includes('Rate limit exceeded')) {
                return NextResponse.json({
                    success: false,
                    error: 'Rate limit exceeded. Please wait before making more requests.'
                }, { status: 429 });
            }

            // Handle API key issues
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
        console.error('Lead search endpoint error:', error);
        
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
 * GET endpoint for API documentation/health check
 */
export async function GET(request: NextRequest) {
    return NextResponse.json({
        endpoint: '/api/apollo/leads/search',
        method: 'POST',
        description: 'Search for leads using Apollo.io People Search API',
        parameters: {
            jobTitle: 'string (optional) - Job title to search for',
            industry: 'string (optional) - Industry to filter by',
            companySize: 'string (optional) - Company size range',
            location: 'string (optional) - Location to search in',
            limit: 'number (optional) - Maximum results to return (1-100, default: 25)'
        },
        authentication: 'Required - Clerk session',
        rateLimit: '60 requests per minute',
        example: {
            jobTitle: 'CEO',
            industry: 'Technology',
            companySize: '50-200',
            location: 'San Francisco',
            limit: 10
        }
    });
}