import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getDrizzleClient } from '@/lib/database/client';
import { feedback, users } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
    const session = await auth();
    const clerkUserId = session?.userId;

    if (!clerkUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = getDrizzleClient();
        
        // Get the user from database
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.clerkId, clerkUserId))
            .limit(1);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { feedback: feedbackText, rating, category } = await request.json();

        // Create feedback
        await db.insert(feedback).values({
            userId: user.id,
            feedback: feedbackText,
            rating,
            category,
            metadata: {
                timestamp: new Date().toISOString(),
                userAgent: request.headers.get('user-agent'),
            },
        });

        return NextResponse.json({ message: 'Feedback received' }, { status: 200 });
    } catch (error) {
        console.error('Feedback error:', error);
        return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }
}
