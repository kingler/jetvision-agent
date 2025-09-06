import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

interface ApolloHealthResponse {
    healthy: boolean;
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    service: 'apollo';
    latency?: number;
    error?: string;
    metadata?: {
        api_endpoint: string;
        api_key_configured: boolean;
        rate_limit_remaining?: string | null;
        last_successful_request?: string;
        connectivity: 'available' | 'limited' | 'unavailable';
    };
}

export async function GET(request: Request) {
    const startTime = Date.now();

    try {
        // Check if Apollo API key is configured
        const apolloApiKey = process.env.APOLLO_API_KEY;

        if (!apolloApiKey) {
            const response: ApolloHealthResponse = {
                healthy: false,
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                service: 'apollo',
                error: 'Apollo API key not configured',
                metadata: {
                    api_endpoint: 'https://api.apollo.io/v1',
                    api_key_configured: false,
                    connectivity: 'unavailable',
                },
            };

            return NextResponse.json(response, { status: 503 });
        }

        // Test Apollo API connectivity with a lightweight endpoint
        try {
            const apiResponse = await fetch('https://api.apollo.io/v1/auth/health', {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'X-Api-Key': apolloApiKey,
                    'User-Agent': 'JetVision-Agent/1.0',
                },
                signal: AbortSignal.timeout(8000), // 8 second timeout
            });

            const latency = Date.now() - startTime;
            const rateLimitRemaining = apiResponse.headers.get('x-rate-limit-remaining');

            if (apiResponse.ok) {
                const response: ApolloHealthResponse = {
                    healthy: true,
                    status: latency > 3000 ? 'degraded' : 'healthy',
                    timestamp: new Date().toISOString(),
                    service: 'apollo',
                    latency,
                    metadata: {
                        api_endpoint: 'https://api.apollo.io/v1',
                        api_key_configured: true,
                        rate_limit_remaining: rateLimitRemaining,
                        last_successful_request: new Date().toISOString(),
                        connectivity: latency > 3000 ? 'limited' : 'available',
                    },
                };

                return NextResponse.json(response, { status: 200 });
            } else {
                // API responded but with an error
                const errorText = await apiResponse.text().catch(() => 'Unknown error');

                const response: ApolloHealthResponse = {
                    healthy: false,
                    status:
                        apiResponse.status === 401 || apiResponse.status === 403
                            ? 'degraded'
                            : 'unhealthy',
                    timestamp: new Date().toISOString(),
                    service: 'apollo',
                    latency,
                    error: `Apollo API error: ${apiResponse.status} - ${errorText}`,
                    metadata: {
                        api_endpoint: 'https://api.apollo.io/v1',
                        api_key_configured: true,
                        rate_limit_remaining: rateLimitRemaining,
                        connectivity: apiResponse.status === 429 ? 'limited' : 'unavailable',
                    },
                };

                const httpStatus =
                    apiResponse.status === 401 || apiResponse.status === 403 ? 200 : 503;
                return NextResponse.json(response, { status: httpStatus });
            }
        } catch (fetchError) {
            const latency = Date.now() - startTime;

            Sentry.captureException(fetchError, {
                tags: {
                    service: 'apollo',
                    health_check: true,
                },
                extra: { latency },
            });

            const response: ApolloHealthResponse = {
                healthy: false,
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                service: 'apollo',
                latency,
                error:
                    fetchError instanceof Error
                        ? fetchError.message
                        : 'Network connectivity failed',
                metadata: {
                    api_endpoint: 'https://api.apollo.io/v1',
                    api_key_configured: true,
                    connectivity: 'unavailable',
                },
            };

            return NextResponse.json(response, { status: 503 });
        }
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                endpoint: 'apollo_health',
                service: 'apollo',
            },
        });

        const response: ApolloHealthResponse = {
            healthy: false,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            service: 'apollo',
            error: error instanceof Error ? error.message : 'Apollo health check failed',
            metadata: {
                api_endpoint: 'https://api.apollo.io/v1',
                api_key_configured: !!process.env.APOLLO_API_KEY,
                connectivity: 'unavailable',
            },
        };

        return NextResponse.json(response, { status: 503 });
    }
}

export async function POST(request: Request) {
    // API key validation endpoint
    try {
        const { apiKey } = await request.json();

        if (!apiKey) {
            return NextResponse.json(
                {
                    valid: false,
                    error: 'API key is required',
                },
                { status: 400 }
            );
        }

        // Test the provided API key
        const response = await fetch('https://api.apollo.io/v1/auth/health', {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'X-Api-Key': apiKey,
                'User-Agent': 'JetVision-Agent/1.0',
            },
            signal: AbortSignal.timeout(5000),
        });

        const result = {
            valid: response.ok,
            status: response.status,
            message: response.ok ? 'API key is valid' : 'API key validation failed',
        };

        return NextResponse.json(result, { status: response.ok ? 200 : 400 });
    } catch (error) {
        return NextResponse.json(
            {
                valid: false,
                error: 'API key validation failed',
            },
            { status: 500 }
        );
    }
}
