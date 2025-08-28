/**
 * User Sync API Route
 * Syncs Clerk user with Supabase database
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { syncUserFromClerk } from '@/lib/database/service';

export async function POST(request: NextRequest) {
  try {
    // Get the current user from Clerk
    const user = await currentUser();
    const { userId } = await auth();

    if (!user || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Sync user to database
    const dbUser = await syncUserFromClerk({
      id: userId,
      emailAddresses: user.emailAddresses,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim(),
        role: dbUser.role,
      },
    });
  } catch (error) {
    console.error('User sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const { UserRepository } = await import('@/lib/database/service');
    const dbUser = await UserRepository.getByClerkId(userId);

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim(),
        role: dbUser.role,
        preferences: dbUser.preferences,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}