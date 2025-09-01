import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const session = await auth();
    const clerkUserId = session?.userId;

    if (!clerkUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { feedback: feedbackText, rating, category } = await request.json();

        // TODO: Implement database feedback storage
        console.log('Feedback received:', { feedbackText, rating, category, clerkUserId });

        return NextResponse.json({ message: 'Feedback received' }, { status: 200 });
    } catch (error) {
        console.error('Feedback error:', error);
        return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }
}
