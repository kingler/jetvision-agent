/**
 * User Sync API Route
 * Syncs Clerk user with Supabase database
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // Get the current user from Clerk
        const user = await currentUser();
        const { userId } = await auth();

        if (!user || !userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // TODO: Implement database user sync
        console.log('User sync requested:', {
            userId,
            email: user.emailAddresses?.[0]?.emailAddress,
        });

        return NextResponse.json({
            success: true,
            user: {
                id: userId,
                email: user.emailAddresses?.[0]?.emailAddress || '',
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                role: 'user',
            },
        });
    } catch (error) {
        console.error('User sync error:', error);
        return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // TODO: Implement database user lookup
        console.log('User lookup requested:', { userId });

        return NextResponse.json({
            success: true,
            user: {
                id: userId,
                email: '',
                name: '',
                role: 'user',
                preferences: {},
            },
        });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
    }
}
