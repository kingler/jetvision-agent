'use client';

import { RootLayout, Thread, ChatInput } from '@repo/common/components';

interface ChatPageProps {
    params: {
        threadId: string;
    };
}

export default function ChatPage({ params }: ChatPageProps) {
    return (
        <RootLayout>
            <div className="flex h-full w-full flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-4xl">
                        <Thread />
                    </div>
                </div>
                <ChatInput showGreeting={false} showBottomBar={false} isFollowUp={true} />
            </div>
        </RootLayout>
    );
}
