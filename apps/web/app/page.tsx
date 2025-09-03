'use client'

import { RootLayout } from '@repo/common/components'
import { JetVisionChat } from '@repo/common/components/jetvision'

export default function HomePage() {
  return (
    <RootLayout>
      <div className="flex h-full w-full" data-testid="chat-container">
        <JetVisionChat 
          className="flex-1"
          sessionId={`home-${Date.now()}`}
        />
      </div>
    </RootLayout>
  )
}