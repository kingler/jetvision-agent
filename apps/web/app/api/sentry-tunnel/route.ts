import { NextRequest, NextResponse } from 'next/server';

// Sentry tunnel to avoid ad blockers and CORS issues in production
// This proxies Sentry requests through our domain
export async function POST(request: NextRequest) {
  try {
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    
    if (!sentryDsn) {
      return NextResponse.json({ error: 'Sentry DSN not configured' }, { status: 500 });
    }

    // Extract Sentry project ID from DSN
    const dsnMatch = sentryDsn.match(/https:\/\/([^@]+)@([^\/]+)\/(.+)/);
    if (!dsnMatch) {
      return NextResponse.json({ error: 'Invalid Sentry DSN format' }, { status: 500 });
    }

    const [, key, host, projectId] = dsnMatch;
    const sentryUrl = `https://${host}/api/${projectId}/envelope/`;

    // Forward the request to Sentry
    const body = await request.text();
    const sentryResponse = await fetch(sentryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${key}, sentry_client=jetvision-agent/1.0`,
      },
      body,
    });

    return new NextResponse(sentryResponse.body, {
      status: sentryResponse.status,
      statusText: sentryResponse.statusText,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Sentry tunnel error:', error);
    return NextResponse.json({ error: 'Tunnel failed' }, { status: 500 });
  }
}

// Also handle GET for basic connectivity checks
export async function GET() {
  return NextResponse.json({ 
    status: 'Sentry tunnel is operational',
    timestamp: new Date().toISOString() 
  });
}