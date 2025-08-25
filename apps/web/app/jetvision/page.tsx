'use client';
import { JetVisionChat } from '@repo/common/components/jetvision';
import { useAuth } from '@clerk/nextjs';

export default function JetVisionPage() {
    const { userId } = useAuth();
    
    // Generate a session ID for this chat session
    const sessionId = typeof window !== 'undefined' 
        ? window.sessionStorage.getItem('jetvision-session-id') || generateSessionId()
        : generateSessionId();

    // Store session ID
    if (typeof window !== 'undefined' && !window.sessionStorage.getItem('jetvision-session-id')) {
        window.sessionStorage.setItem('jetvision-session-id', sessionId);
    }

    function generateSessionId() {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    return (
        <div className="h-screen w-full overflow-hidden">
            <JetVisionChat 
                userId={userId || undefined}
                sessionId={sessionId}
                className="h-full"
            />
        </div>
    );
}