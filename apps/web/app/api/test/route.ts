import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    return NextResponse.json({
        message: 'Test API route is working!',
        timestamp: new Date().toISOString(),
        url: request.url,
    });
}

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => ({}));

    return NextResponse.json({
        message: 'Test POST API route is working!',
        timestamp: new Date().toISOString(),
        body,
        url: request.url,
    });
}
