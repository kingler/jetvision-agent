import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
    // '/chat(.*)',  // Temporarily disabled for testing
    '/api(.*)',
]);

const isPublicApiRoute = createRouteMatcher([
    '/api/n8n-webhook',
    '/api/test', // For testing
    '/api/messages/remaining', // Credit info endpoint
]);

export default clerkMiddleware(async (auth, req) => {
    // Skip authentication for public API routes
    if (isPublicApiRoute(req)) {
        return NextResponse.next();
    }

    // Protect other routes
    if (isProtectedRoute(req)) {
        await auth.protect();
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg)).*)',
        '/(api|trpc)(.*)',
    ],
};