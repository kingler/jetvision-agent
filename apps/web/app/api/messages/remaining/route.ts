import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

// Force this route to be dynamic since it uses user authentication
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await currentUser();

        // For now, return mock data since we don't have a real credit system implemented
        // This can be replaced with actual database queries later
        const mockCreditInfo = {
            remaining: 100,
            limit: 100,
            resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
            isUnlimited: !user ? false : true, // Signed in users get unlimited for now
        };

        return NextResponse.json(mockCreditInfo);
    } catch (error) {
        console.error('Error fetching remaining credits:', error);
        return NextResponse.json({ error: 'Failed to fetch credit information' }, { status: 500 });
    }
}
