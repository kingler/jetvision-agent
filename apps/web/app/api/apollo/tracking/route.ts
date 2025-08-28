import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { ApolloClient } from '../../../../lib/apollo-client';

interface TrackingRequest {
    sequenceId: string;
    startDate?: string;
    endDate?: string;
}

interface TrackingResponse {
    success: boolean;
    data?: any;
    error?: string;
    usage?: {
        credits_used: number;
        remaining_credits: number;
    };
}

/**
 * Apollo.io Conversion Tracking API Endpoint
 * POST /api/apollo/tracking - Get engagement metrics for email sequences
 */
export async function POST(request: NextRequest): Promise<NextResponse<TrackingResponse>> {
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
        const { sequenceId, startDate, endDate }: TrackingRequest = body;

        // Validate required fields
        if (!sequenceId || !sequenceId.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Sequence ID is required'
            }, { status: 400 });
        }

        // Validate date formats if provided
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (startDate && !dateRegex.test(startDate)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid start date format. Use YYYY-MM-DD'
            }, { status: 400 });
        }

        if (endDate && !dateRegex.test(endDate)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid end date format. Use YYYY-MM-DD'
            }, { status: 400 });
        }

        // Validate date logic
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            return NextResponse.json({
                success: false,
                error: 'Start date cannot be after end date'
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
            // Track engagement metrics
            const metrics = await apolloClient.trackEngagement({
                sequenceId: sequenceId.trim(),
                startDate,
                endDate
            });

            // Calculate additional insights
            const insights = generateInsights(metrics);

            // Log tracking request for analytics (non-blocking)
            console.log(`Engagement tracking performed by user ${session.userId}:`, {
                sequenceId,
                period: metrics.period,
                emailsSent: metrics.emailsSent,
                replyRate: metrics.replyRate,
                timestamp: new Date().toISOString()
            });

            return NextResponse.json({
                success: true,
                data: {
                    ...metrics,
                    insights,
                    lastUpdated: new Date().toISOString()
                },
                usage: {
                    credits_used: 1,
                    remaining_credits: healthStatus.rateLimit - 1
                }
            }, { status: 200 });

        } catch (apolloError: any) {
            console.error('Apollo engagement tracking error:', apolloError);

            // Handle specific error cases
            if (apolloError.message?.includes('Sequence not found') || apolloError.message?.includes('404')) {
                return NextResponse.json({
                    success: false,
                    error: 'Sequence not found. Please check the sequence ID.'
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
        console.error('Tracking endpoint error:', error);
        
        return NextResponse.json({
            success: false,
            error: `Internal server error: ${error.message || 'Unknown error'}`
        }, { status: 500 });
    }
}

/**
 * Generate additional insights from engagement metrics
 */
function generateInsights(metrics: any) {
    const insights = [];
    
    // Open rate insights
    const openRateNum = parseFloat(metrics.openRate?.replace('%', '') || '0');
    if (openRateNum > 25) {
        insights.push({
            type: 'positive',
            category: 'open_rate',
            message: `Excellent open rate of ${metrics.openRate} - well above industry average of 20-25%`
        });
    } else if (openRateNum < 15) {
        insights.push({
            type: 'improvement',
            category: 'open_rate',
            message: `Open rate of ${metrics.openRate} is below average. Consider improving subject lines.`
        });
    }

    // Click rate insights
    const clickRateNum = parseFloat(metrics.clickRate?.replace('%', '') || '0');
    if (clickRateNum > 5) {
        insights.push({
            type: 'positive',
            category: 'click_rate',
            message: `Strong click rate of ${metrics.clickRate} indicates engaging content`
        });
    } else if (clickRateNum < 2) {
        insights.push({
            type: 'improvement',
            category: 'click_rate',
            message: `Click rate of ${metrics.clickRate} suggests content could be more engaging`
        });
    }

    // Reply rate insights
    const replyRateNum = parseFloat(metrics.replyRate?.replace('%', '') || '0');
    if (replyRateNum > 5) {
        insights.push({
            type: 'positive',
            category: 'reply_rate',
            message: `Outstanding reply rate of ${metrics.replyRate} - shows strong audience engagement`
        });
    } else if (replyRateNum < 2) {
        insights.push({
            type: 'improvement',
            category: 'reply_rate',
            message: `Reply rate of ${metrics.replyRate} could be improved with more personalized messaging`
        });
    }

    // Meeting conversion insights
    if (metrics.meetings > 0 && metrics.emailsSent > 0) {
        const meetingRate = ((metrics.meetings / metrics.emailsSent) * 100).toFixed(2);
        insights.push({
            type: 'positive',
            category: 'meetings',
            message: `${metrics.meetings} meetings booked from ${metrics.emailsSent} emails (${meetingRate}% conversion to meetings)`
        });
    }

    return insights;
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
        endpoint: '/api/apollo/tracking',
        method: 'POST',
        description: 'Track engagement metrics and conversions for Apollo.io email sequences',
        parameters: {
            sequenceId: 'string (required) - Email sequence/campaign ID to track',
            startDate: 'string (optional) - Start date for metrics (YYYY-MM-DD format)',
            endDate: 'string (optional) - End date for metrics (YYYY-MM-DD format)'
        },
        authentication: 'Required - Clerk session',
        rateLimit: '60 requests per minute',
        response: {
            success: 'boolean',
            data: {
                sequenceId: 'string - Sequence identifier',
                period: 'string - Time period covered',
                emailsSent: 'number - Total emails sent',
                opens: 'number - Email opens count',
                openRate: 'string - Open rate percentage',
                clicks: 'number - Link clicks count',
                clickRate: 'string - Click rate percentage',
                replies: 'number - Reply count',
                replyRate: 'string - Reply rate percentage',
                meetings: 'number - Meetings booked',
                insights: 'object[] - AI-generated insights and recommendations',
                lastUpdated: 'string - Data refresh timestamp'
            },
            usage: {
                credits_used: 'number - Credits consumed',
                remaining_credits: 'number - Remaining credits'
            }
        },
        example: {
            sequenceId: 'seq_1234567890',
            startDate: '2024-01-01',
            endDate: '2024-01-31'
        },
        insights: {
            types: ['positive', 'improvement', 'warning'],
            categories: ['open_rate', 'click_rate', 'reply_rate', 'meetings'],
            description: 'AI-generated insights help optimize campaign performance'
        }
    });
}