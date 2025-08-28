import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { ApolloClient } from '../../../../lib/apollo-client';

interface CreateCampaignRequest {
    name: string;
    contacts: string[];
    templateIds?: string[];
    delayDays?: number[];
}

interface CampaignResponse {
    success: boolean;
    data?: any;
    error?: string;
    usage?: {
        credits_used: number;
        remaining_credits: number;
    };
}

/**
 * Apollo.io Email Campaign Management API Endpoint
 * POST /api/apollo/campaigns - Create new email sequence/campaign
 * GET /api/apollo/campaigns - Get campaigns list (future implementation)
 */
export async function POST(request: NextRequest): Promise<NextResponse<CampaignResponse>> {
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
        const { name, contacts, templateIds, delayDays }: CreateCampaignRequest = body;

        // Validate required fields
        if (!name || !name.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Campaign name is required'
            }, { status: 400 });
        }

        if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'At least one contact is required'
            }, { status: 400 });
        }

        // Validate contacts array
        if (contacts.length > 100) {
            return NextResponse.json({
                success: false,
                error: 'Maximum 100 contacts per campaign'
            }, { status: 400 });
        }

        // Validate template IDs if provided
        if (templateIds && (!Array.isArray(templateIds) || templateIds.length > 10)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid templateIds format or too many templates (max 10)'
            }, { status: 400 });
        }

        // Validate delay days if provided
        if (delayDays && (!Array.isArray(delayDays) || delayDays.some(day => day < 1 || day > 30))) {
            return NextResponse.json({
                success: false,
                error: 'Invalid delayDays: must be array of numbers between 1-30'
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
            // Create email sequence
            const sequence = await apolloClient.createEmailSequence({
                name: name.trim(),
                contacts,
                templateIds,
                delayDays
            });

            // Log campaign creation for analytics (non-blocking)
            console.log(`Email campaign created by user ${session.userId}:`, {
                campaignName: name,
                contactsCount: contacts.length,
                templatesCount: templateIds?.length || 0,
                sequenceId: sequence.id,
                timestamp: new Date().toISOString()
            });

            return NextResponse.json({
                success: true,
                data: {
                    ...sequence,
                    message: 'Email campaign created successfully',
                    nextSteps: [
                        'Configure email templates if not already done',
                        'Review campaign settings',
                        'Activate the campaign when ready',
                        'Monitor performance using the tracking endpoint'
                    ]
                },
                usage: {
                    credits_used: Math.ceil(contacts.length / 10), // 1 credit per 10 contacts
                    remaining_credits: healthStatus.rateLimit - 1
                }
            }, { status: 201 });

        } catch (apolloError: any) {
            console.error('Apollo campaign creation error:', apolloError);

            // Handle specific error cases
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

            if (apolloError.message?.includes('template') || apolloError.message?.includes('Template')) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid template configuration. Please check template IDs.'
                }, { status: 400 });
            }

            // Handle other Apollo API errors
            return NextResponse.json({
                success: false,
                error: `Apollo.io API error: ${apolloError.message || 'Unknown error occurred'}`
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Campaign creation endpoint error:', error);
        
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
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

/**
 * GET endpoint for API documentation and future campaign listing
 */
export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get('id');

    if (campaignId) {
        // Future: Get specific campaign details
        return NextResponse.json({
            message: 'Campaign details endpoint not yet implemented',
            campaignId
        }, { status: 501 });
    }

    return NextResponse.json({
        endpoint: '/api/apollo/campaigns',
        methods: {
            POST: {
                description: 'Create new email sequence/campaign',
                parameters: {
                    name: 'string (required) - Campaign name',
                    contacts: 'string[] (required) - Array of contact IDs or emails (max 100)',
                    templateIds: 'string[] (optional) - Array of email template IDs (max 10)',
                    delayDays: 'number[] (optional) - Days between emails (1-30, default: [1,3,7])'
                },
                authentication: 'Required - Clerk session',
                rateLimit: '60 requests per minute',
                example: {
                    name: 'JetVision Q1 Outreach',
                    contacts: ['contact_123', 'contact_456'],
                    templateIds: ['template_abc', 'template_def'],
                    delayDays: [1, 3, 7, 14]
                }
            },
            GET: {
                description: 'List campaigns or get specific campaign details',
                parameters: {
                    id: 'string (optional) - Campaign ID for specific details'
                },
                status: 'Coming soon'
            }
        },
        response: {
            success: 'boolean',
            data: {
                id: 'string - Campaign/sequence ID',
                name: 'string - Campaign name',
                status: 'string - Campaign status',
                contactsCount: 'number - Number of contacts',
                templatesCount: 'number - Number of templates',
                createdAt: 'string - Creation timestamp',
                message: 'string - Success message',
                nextSteps: 'string[] - Recommended next actions'
            },
            usage: {
                credits_used: 'number - Credits consumed',
                remaining_credits: 'number - Remaining credits'
            }
        }
    });
}