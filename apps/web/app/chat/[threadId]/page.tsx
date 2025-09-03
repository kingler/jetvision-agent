'use client'

import { RootLayout } from '@repo/common/components'
import { JetVisionChat } from '@repo/common/components/jetvision'

interface ChatPageProps {
  params: {
    threadId: string
  }
}

export default function ChatPage({ params }: ChatPageProps) {
  return (
    <RootLayout>
      <div className="flex h-full w-full" data-testid="chat-container">
        <JetVisionChat 
          className="flex-1"
          sessionId={`thread-${params.threadId}`}
        />
      </div>
    </RootLayout>
  )
}