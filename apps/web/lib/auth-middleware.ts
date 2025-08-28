import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Authentication Middleware for JetVision API Endpoints
 * Provides role-based access control and request validation
 */

export interface AuthUser {
    userId: string;
    emailAddress?: string;
    role?: string;
    permissions?: string[];
}

export interface AuthContext {
    user: AuthUser;
    isAdmin: boolean;
    isPremium: boolean;
    canAccess: (resource: string) => boolean;
}

/**
 * Authentication levels for different endpoints
 */
export enum AuthLevel {
    NONE = 'none',           // No authentication required
    OPTIONAL = 'optional',    // Authentication optional, enhances functionality
    BASIC = 'basic',         // Basic authentication required
    PREMIUM = 'premium',     // Premium subscription required
    ADMIN = 'admin'          // Admin privileges required
}

/**
 * Resource permissions for different API functionalities
 */
export const PERMISSIONS = {
    // Apollo.io permissions
    APOLLO_SEARCH_LEADS: 'apollo:search:leads',
    APOLLO_ENRICH_CONTACTS: 'apollo:enrich:contacts',
    APOLLO_MANAGE_CAMPAIGNS: 'apollo:campaigns:manage',
    APOLLO_VIEW_ANALYTICS: 'apollo:analytics:view',
    
    // Avainode permissions
    AVAINODE_SEARCH_AIRCRAFT: 'avainode:search:aircraft',
    AVAINODE_CREATE_BOOKINGS: 'avainode:bookings:create',
    AVAINODE_VIEW_PRICING: 'avainode:pricing:view',
    AVAINODE_MANAGE_FLEET: 'avainode:fleet:manage',
    
    // Admin permissions
    ADMIN_VIEW_LOGS: 'admin:logs:view',
    ADMIN_MANAGE_USERS: 'admin:users:manage',
    ADMIN_SYSTEM_CONFIG: 'admin:system:config'
} as const;

/**
 * Rate limiting configuration per authentication level
 */
export const RATE_LIMITS = {
    [AuthLevel.NONE]: { requests: 10, windowMs: 60000 },      // 10/min for unauthenticated
    [AuthLevel.OPTIONAL]: { requests: 30, windowMs: 60000 },   // 30/min for optional auth
    [AuthLevel.BASIC]: { requests: 100, windowMs: 60000 },     // 100/min for basic users
    [AuthLevel.PREMIUM]: { requests: 500, windowMs: 60000 },   // 500/min for premium users
    [AuthLevel.ADMIN]: { requests: 1000, windowMs: 60000 }     // 1000/min for admins
};

/**
 * Default user permissions based on subscription level
 */
function getDefaultPermissions(role?: string): string[] {
    const basePermissions = [
        PERMISSIONS.APOLLO_SEARCH_LEADS,
        PERMISSIONS.AVAINODE_SEARCH_AIRCRAFT,
        PERMISSIONS.AVAINODE_VIEW_PRICING
    ];

    if (role === 'premium') {
        return [
            ...basePermissions,
            PERMISSIONS.APOLLO_ENRICH_CONTACTS,
            PERMISSIONS.APOLLO_MANAGE_CAMPAIGNS,
            PERMISSIONS.APOLLO_VIEW_ANALYTICS,
            PERMISSIONS.AVAINODE_CREATE_BOOKINGS,
            PERMISSIONS.AVAINODE_MANAGE_FLEET
        ];
    }

    if (role === 'admin') {
        return Object.values(PERMISSIONS);
    }

    return basePermissions;
}

/**
 * Extract user role from Clerk metadata
 */
function extractUserRole(user: any): string {
    // Check public metadata first
    const publicRole = user.publicMetadata?.role || user.publicMetadata?.subscription;
    if (publicRole) return publicRole;

    // Check private metadata
    const privateRole = user.privateMetadata?.role || user.privateMetadata?.subscription;
    if (privateRole) return privateRole;

    // Check if user has premium indicators
    const isPremium = user.publicMetadata?.premium || 
                     user.privateMetadata?.premium ||
                     user.emailAddress?.includes('@jetvision.com');

    return isPremium ? 'premium' : 'basic';
}

/**
 * Create authentication context from Clerk session
 */
async function createAuthContext(session: any): Promise<AuthContext> {
    const user: AuthUser = {
        userId: session.userId,
        emailAddress: session.user?.emailAddresses?.[0]?.emailAddress,
        role: extractUserRole(session.user),
        permissions: getDefaultPermissions(extractUserRole(session.user))
    };

    const isAdmin = user.role === 'admin';
    const isPremium = user.role === 'premium' || isAdmin;

    return {
        user,
        isAdmin,
        isPremium,
        canAccess: (resource: string) => {
            return user.permissions?.includes(resource) || isAdmin;
        }
    };
}

/**
 * Main authentication middleware function
 */
export async function withAuth(
    authLevel: AuthLevel = AuthLevel.BASIC,
    requiredPermissions: string[] = []
) {
    return async function authMiddleware(
        request: NextRequest,
        handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
    ): Promise<NextResponse> {
        try {
            // Handle no authentication required
            if (authLevel === AuthLevel.NONE) {
                const guestContext: AuthContext = {
                    user: { userId: 'guest', permissions: [] },
                    isAdmin: false,
                    isPremium: false,
                    canAccess: () => false
                };
                return await handler(request, guestContext);
            }

            // Get authentication session
            const session = await auth();

            // Handle optional authentication
            if (authLevel === AuthLevel.OPTIONAL) {
                if (session?.userId) {
                    const authContext = await createAuthContext(session);
                    return await handler(request, authContext);
                } else {
                    const guestContext: AuthContext = {
                        user: { userId: 'guest', permissions: [] },
                        isAdmin: false,
                        isPremium: false,
                        canAccess: () => false
                    };
                    return await handler(request, guestContext);
                }
            }

            // Require authentication for all other levels
            if (!session?.userId) {
                return NextResponse.json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED',
                    authLevel: authLevel
                }, { status: 401 });
            }

            // Create authentication context
            const authContext = await createAuthContext(session);

            // Check admin requirement
            if (authLevel === AuthLevel.ADMIN && !authContext.isAdmin) {
                return NextResponse.json({
                    error: 'Administrator privileges required',
                    code: 'ADMIN_REQUIRED'
                }, { status: 403 });
            }

            // Check premium requirement
            if (authLevel === AuthLevel.PREMIUM && !authContext.isPremium) {
                return NextResponse.json({
                    error: 'Premium subscription required',
                    code: 'PREMIUM_REQUIRED',
                    upgradeUrl: '/upgrade'
                }, { status: 402 });
            }

            // Check specific permissions
            if (requiredPermissions.length > 0) {
                const hasAllPermissions = requiredPermissions.every(permission => 
                    authContext.canAccess(permission)
                );

                if (!hasAllPermissions) {
                    const missingPermissions = requiredPermissions.filter(permission => 
                        !authContext.canAccess(permission)
                    );

                    return NextResponse.json({
                        error: 'Insufficient permissions',
                        code: 'PERMISSION_DENIED',
                        missingPermissions,
                        userRole: authContext.user.role
                    }, { status: 403 });
                }
            }

            // Log successful authentication for analytics
            console.log('API request authenticated:', {
                userId: authContext.user.userId,
                role: authContext.user.role,
                endpoint: request.url,
                method: request.method,
                timestamp: new Date().toISOString()
            });

            return await handler(request, authContext);

        } catch (error) {
            console.error('Authentication middleware error:', error);
            
            return NextResponse.json({
                error: 'Authentication service unavailable',
                code: 'AUTH_SERVICE_ERROR',
                details: error instanceof Error ? error.message : 'Unknown error'
            }, { status: 503 });
        }
    };
}

/**
 * Rate limiting middleware (can be combined with auth)
 */
interface RateLimitState {
    requests: number[];
    lastReset: number;
}

const rateLimitStore = new Map<string, RateLimitState>();

export function withRateLimit(
    requests: number = 100,
    windowMs: number = 60000,
    keyGenerator?: (request: NextRequest, context?: AuthContext) => string
) {
    return async function rateLimitMiddleware(
        request: NextRequest,
        context: AuthContext,
        handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
    ): Promise<NextResponse> {
        try {
            // Generate rate limit key
            const key = keyGenerator ? 
                keyGenerator(request, context) : 
                context.user.userId || getClientIP(request) || 'anonymous';

            const now = Date.now();
            const windowStart = now - windowMs;

            // Get or create rate limit state
            let state = rateLimitStore.get(key) || {
                requests: [],
                lastReset: now
            };

            // Clean old requests outside the window
            state.requests = state.requests.filter(time => time > windowStart);

            // Check rate limit
            if (state.requests.length >= requests) {
                const resetTime = Math.ceil((state.requests[0] + windowMs - now) / 1000);
                
                return NextResponse.json({
                    error: 'Rate limit exceeded',
                    code: 'RATE_LIMIT_EXCEEDED',
                    limit: requests,
                    windowMs,
                    resetInSeconds: resetTime
                }, { 
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': requests.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': Math.ceil((now + resetTime * 1000) / 1000).toString(),
                        'Retry-After': resetTime.toString()
                    }
                });
            }

            // Record this request
            state.requests.push(now);
            rateLimitStore.set(key, state);

            // Add rate limit headers
            const response = await handler(request, context);
            response.headers.set('X-RateLimit-Limit', requests.toString());
            response.headers.set('X-RateLimit-Remaining', (requests - state.requests.length).toString());
            response.headers.set('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000).toString());

            return response;

        } catch (error) {
            console.error('Rate limiting middleware error:', error);
            // Continue without rate limiting on error
            return await handler(request, context);
        }
    };
}

/**
 * Utility function to get client IP
 */
function getClientIP(request: NextRequest): string | null {
    // Try various headers that might contain the real IP
    const headers = [
        'x-forwarded-for',
        'x-real-ip',
        'x-client-ip',
        'x-forwarded',
        'forwarded-for',
        'forwarded',
        'cf-connecting-ip', // Cloudflare
        'x-vercel-forwarded-for' // Vercel
    ];

    for (const header of headers) {
        const value = request.headers.get(header);
        if (value) {
            // x-forwarded-for can contain multiple IPs, use the first one
            return value.split(',')[0].trim();
        }
    }

    return null;
}

/**
 * Combine multiple middleware functions
 */
export function combineMiddleware(
    ...middlewares: Array<(request: NextRequest, context: AuthContext, handler: any) => Promise<NextResponse>>
) {
    return async function combinedMiddleware(
        request: NextRequest,
        context: AuthContext,
        finalHandler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
    ): Promise<NextResponse> {
        let currentHandler = finalHandler;

        // Apply middlewares in reverse order (last middleware first)
        for (let i = middlewares.length - 1; i >= 0; i--) {
            const middleware = middlewares[i];
            const nextHandler = currentHandler;
            currentHandler = (req: NextRequest, ctx: AuthContext) => 
                middleware(req, ctx, nextHandler);
        }

        return await currentHandler(request, context);
    };
}