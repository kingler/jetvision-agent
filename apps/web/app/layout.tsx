'use client'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { RootProvider, ReactQueryProvider } from '@repo/common/context'
import { AgentProvider } from '@repo/common/hooks'
import { TooltipProvider } from '@repo/ui'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#1a1a1a" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ClerkProvider>
          <RootProvider>
            <TooltipProvider>
              <ReactQueryProvider>
                <AgentProvider>
                  {children}
                </AgentProvider>
              </ReactQueryProvider>
            </TooltipProvider>
          </RootProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}