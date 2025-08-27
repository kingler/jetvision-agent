// Static version of the thread page with generateStaticParams
'use client';
import { TableOfMessages, Thread } from '@repo/common/components';
import { useChatStore } from '@repo/common/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStickToBottom } from 'use-stick-to-bottom';

// Generate static params for known thread IDs
// For Cloudflare Pages, we'll use a limited set or skip this
export async function generateStaticParams() {
    // Return empty array to allow fallback to client-side routing
    return [];
}

const ChatSessionPage = ({ params }: { params: { threadId: string } }) => {
    const router = useRouter();
    const isGenerating = useChatStore(state => state.isGenerating);
    const [shouldScroll, setShouldScroll] = useState(isGenerating);
    const { scrollRef, contentRef } = useStickToBottom({
        stiffness: 1,
        damping: 0,
    });
    const switchThread = useChatStore(state => state.switchThread);
    const getThread = useChatStore(state => state.getThread);

    useEffect(() => {
        if (isGenerating) {
            setShouldScroll(true);
        } else {
            const timer = setTimeout(() => {
                setShouldScroll(false);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isGenerating]);

    useEffect(() => {
        const { threadId } = params;
        if (!threadId) {
            return;
        }
        
        // Handle client-side thread loading
        if (typeof window !== 'undefined') {
            getThread(threadId).then(thread => {
                if (thread?.id) {
                    switchThread(thread.id);
                } else {
                    router.push('/chat');
                }
            });
        }
    }, [params, getThread, switchThread, router]);

    return (
        <div
            className="no-scrollbar flex w-full flex-1 flex-col items-center overflow-y-auto px-8"
            ref={shouldScroll ? scrollRef : undefined}
        >
            <div className="mx-auto w-full max-w-3xl px-4 pb-[200px] pt-2" ref={contentRef}>
                <Thread />
                <TableOfMessages />
            </div>
        </div>
    );
};

export default ChatSessionPage;