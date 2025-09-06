'use client';

import { RootLayout } from '@repo/common/components';
import { ChatInput } from '@repo/common/components';

export default function HomePage() {
    return (
        <RootLayout>
            <ChatInput showGreeting={true} showBottomBar={true} isFollowUp={false} />
        </RootLayout>
    );
}
