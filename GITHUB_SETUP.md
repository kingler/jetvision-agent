# GitHub Repository Setup & CI/CD Instructions

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository named `jetvision-agent`
3. Set it as private or public based on your preference
4. DO NOT initialize with README, .gitignore, or license (we already have these)

## Step 2: Add Remote and Push

After creating the repository, run these commands in your terminal:

```bash
cd /Volumes/SeagatePortableDrive/Projects/jetvision-agent

# Add your GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/jetvision-agent.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Set Up GitHub Secrets for CI/CD

Go to your repository Settings > Secrets and variables > Actions, and add these secrets:

### Required Secrets:
- `VERCEL_TOKEN`: Your Vercel deployment token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID
- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

### Environment Variables (optional, can use defaults from vercel.json):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Step 4: Connect Vercel to GitHub

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Select the `jetvision-agent` repository
5. Configure project:
   - Framework Preset: Next.js
   - Root Directory: `jetvision-agent/apps/web`
   - Build Command: `cd ../.. && bun install && cd apps/web && bun run build`
   - Output Directory: `.next`
   - Install Command: `cd ../.. && bun install`

## Step 5: Enable GitHub Actions

The repository includes GitHub Actions workflows in `.github/workflows/`:
- `deploy.yml`: Deploys to Cloudflare Pages on push to main
- `test-automation.yml`: Runs tests on pull requests

These will automatically run once the repository is pushed to GitHub.

## Step 6: Trigger Deployment

After setup, any push to the `main` branch will automatically:
1. Run tests via GitHub Actions
2. Deploy to Vercel (if connected)
3. Deploy MCP servers to Cloudflare Workers

You can also manually trigger deployments:
```bash
# Manual deployment to Vercel
vercel --prod

# Manual deployment to Cloudflare
bun run deploy:production
```

## Current Deployment Status

### Already Deployed:
✅ **Avinode MCP Server**: https://avainode-mcp.designthru.ai
- Mock data system active
- 7 MCP tools available
- Ready for integration

### Ready to Deploy:
- **JetVision Agent Web App**: Awaiting Vercel connection
- **Apollo MCP Server**: Ready for Cloudflare deployment
- **N8N MCP Server**: Ready for deployment

## Vercel Deployment Configuration

The project is configured with:
- Next.js 14+ with App Router
- Bun package manager
- TypeScript
- Tailwind CSS
- Clerk Authentication
- Supabase Database
- N8N Integration

All environment variables are already configured in `vercel.json`.

## Troubleshooting

If deployment fails:

1. **Check build logs**: Vercel dashboard > Project > Functions > Logs
2. **Verify environment variables**: All required vars are set in Vercel
3. **Test locally**: `cd jetvision-agent && bun install && bun dev`
4. **Check GitHub Actions**: Repository > Actions tab for workflow runs

## Support

For issues:
- Vercel: https://vercel.com/docs
- Cloudflare: https://developers.cloudflare.com/workers/
- GitHub Actions: https://docs.github.com/actions