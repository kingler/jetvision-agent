#!/bin/bash

# JetVision Agent - Deploy to Vercel
# This script helps you deploy the Next.js app to Vercel

set -e

echo "🚀 Deploying JetVision Agent to Vercel"
echo "======================================="
echo ""

# Navigate to the web app directory
cd /Volumes/SeagatePortableDrive/Projects/jetvision-agent/jetvision-agent/apps/web

# Check if user is logged in to Vercel
echo "📝 Checking Vercel login status..."
if ! vercel whoami &> /dev/null; then
    echo ""
    echo "❌ Not logged in to Vercel!"
    echo ""
    echo "Please run: vercel login"
    echo ""
    echo "Choose your preferred login method:"
    echo "  • Continue with GitHub (recommended)"
    echo "  • Continue with Email"
    echo ""
    exit 1
fi

echo "✅ Logged in to Vercel"
echo ""

# Create .vercel directory if it doesn't exist
mkdir -p .vercel

# Deploy to Vercel
echo "🚀 Starting Vercel deployment..."
echo "================================="
echo ""
echo "When prompted:"
echo "1. Set up and deploy: Yes"
echo "2. Which scope: Choose your account"
echo "3. Link to existing project? No (unless you have one)"
echo "4. Project name: jetvision-agent (or press Enter for default)"
echo "5. Directory: ./ (current directory)"
echo "6. Override settings? No"
echo ""

# Run Vercel deployment
vercel --yes \
  --env NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_bmV1dHJhbC1tdXNrb3gtMjQuY2xlcmsuYWNjb3VudHMuZGV2JA" \
  --env CLERK_SECRET_KEY="sk_test_s9GSF8dhPCq5Ps4rpZjdyyqhT5jaYs5IuMI5W8dlod" \
  --env NEXT_PUBLIC_N8N_WEBHOOK_URL="https://n8n.vividwalls.blog/webhook/jetvision-agent" \
  --env NEXT_PUBLIC_N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZWMyMDZhNS05ZGVjLTRlNTktOGMzZS00OTRkYWY2ZWRhZjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1OTk2OTQwfQ.CYm3Dvw5AHWou3-sBMXJvecye7jFWxo-0Z2axVCY-xs" \
  --env N8N_API_URL="https://n8n.vividwalls.blog/api/v1" \
  --env DATABASE_URL="postgresql://user:pass@localhost:5432/db" \
  --env NEXT_PUBLIC_POSTHOG_KEY="phc_test_key_dummy" \
  --env NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com" \
  --env NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in" \
  --env NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up" \
  --env NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/chat" \
  --env NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/chat"

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "📝 Next Steps:"
echo "=============="
echo ""
echo "1. Your app should be live at the URL shown above"
echo ""
echo "2. To deploy to production:"
echo "   vercel --prod"
echo ""
echo "3. To update environment variables:"
echo "   • Go to: https://vercel.com/dashboard"
echo "   • Select your project"
echo "   • Go to Settings > Environment Variables"
echo ""
echo "4. Important: Update DATABASE_URL with a real database"
echo "   Consider using:"
echo "   • Vercel Postgres"
echo "   • Supabase"
echo "   • Neon"
echo "   • PlanetScale"
echo ""
echo "5. Monitor your deployment:"
echo "   vercel logs"
echo ""