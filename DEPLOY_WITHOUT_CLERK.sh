#!/bin/bash

# JetVision Agent - Deploy to Cloudflare without Clerk Auth
# This script disables Clerk authentication for deployment

set -e

echo "🚀 Deploying JetVision Agent to Cloudflare Pages (Without Clerk)"
echo "================================================================"
echo ""

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare!"
    echo "Please run: wrangler login"
    exit 1
fi

echo "✅ Logged in to Cloudflare"
echo ""

# Navigate to the web app directory
cd /Volumes/SeagatePortableDrive/Projects/jetvision-agent/jetvision-agent/apps/web

echo "🔧 Disabling Clerk Authentication..."
echo "====================================="

# Create a mock ClerkProvider that doesn't require auth
cat > app/clerk-mock.tsx << 'EOF'
'use client';

import React from 'react';

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  return null;
}

export function UserButton() {
  return <div>User</div>;
}

export function SignInButton({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  return { isSignedIn: true, userId: 'mock-user' };
}

export function useUser() {
  return { 
    user: { 
      id: 'mock-user',
      primaryEmailAddress: { emailAddress: 'user@example.com' },
      fullName: 'Mock User'
    }
  };
}

export function auth() {
  return { userId: 'mock-user' };
}

export function currentUser() {
  return Promise.resolve({
    id: 'mock-user',
    emailAddresses: [{ emailAddress: 'user@example.com' }],
    firstName: 'Mock',
    lastName: 'User'
  });
}
EOF

# Backup and modify layout.tsx to remove Clerk
cp app/layout.tsx app/layout.tsx.backup

# Create a modified layout without Clerk
cat > app/layout.tsx << 'EOF'
import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "JetVision Agent",
  description: "AI-powered aviation assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
EOF

# Create minimal environment file
cat > .env.production.local << 'EOF'
# Minimal environment for Cloudflare deployment
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@localhost:5432/db
EOF

echo "✅ Clerk authentication disabled"
echo ""

echo "🔨 Building application..."
echo "=========================="

export PATH="$HOME/.bun/bin:$PATH"

# Build with minimal configuration
SKIP_ENV_VALIDATION=1 bun run build || {
    echo "⚠️  Standard build failed. Trying static export..."
    
    # Modify next.config for static export
    cat > next.config.mjs << 'EOF'
const nextConfig = {
    output: 'export',
    images: {
        unoptimized: true,
    },
    transpilePackages: ['next-mdx-remote'],
    experimental: {
        externalDir: true,
    },
    webpack: (config, options) => {
        if (!options.isServer) {
            config.resolve.fallback = { fs: false, module: false, path: false };
        }
        config.experiments = {
            ...config.experiments,
            topLevelAwait: true,
            layers: true,
        };
        return config;
    },
};

export default nextConfig;
EOF
    
    # Build static export
    bun run build
}

echo ""
echo "📤 Deploying to Cloudflare Pages..."
echo "===================================="

# Deploy based on what was built
if [ -d "out" ]; then
    echo "Deploying static export..."
    wrangler pages deploy out --project-name=jetvision-agent --compatibility-date=2024-01-15
elif [ -d ".next" ]; then
    echo "Deploying Next.js build..."
    wrangler pages deploy .next --project-name=jetvision-agent --compatibility-date=2024-01-15
else
    echo "❌ No build output found!"
    exit 1
fi

# Restore original files
if [ -f "app/layout.tsx.backup" ]; then
    mv app/layout.tsx.backup app/layout.tsx
fi
rm -f app/clerk-mock.tsx
rm -f .env.production.local

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "📍 Your app is available at:"
echo "  https://jetvision-agent.pages.dev"
echo ""
echo "📝 Notes:"
echo "  - Authentication has been disabled for this deployment"
echo "  - The app will work without user accounts"
echo "  - To enable auth later, set up proper auth provider in Cloudflare"
echo ""
echo "🔧 To view logs:"
echo "  wrangler pages deployment tail --project-name=jetvision-agent"
echo ""