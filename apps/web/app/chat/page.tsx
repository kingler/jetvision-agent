'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatPage() {
  const router = useRouter()

  useEffect(() => {
    // Generate a new thread ID and redirect to it
    const newThreadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    router.push(`/chat/${newThreadId}`)
  }, [router])

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🛩️ Starting JetVision Chat...
        </h1>
        <p className="text-gray-600">
          Creating a new chat session for you
        </p>
      </div>
    </div>
  )
}