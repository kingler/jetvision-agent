# Cloudflare Pages CI/CD Setup Guide

This guide will help you set up automated deployments from GitHub to Cloudflare Pages for your JetVision Agent application.

## Prerequisites

1. **GitHub Repository**: Your code is already at `github.com/kingler/jetvision-agent`
2. **Cloudflare Account**: You have an account at designthru.ai
3. **Cloudflare API Token**: Needed for automated deployments

## Step 1: Get Your Cloudflare Credentials

### 1.1 Get Cloudflare Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain (designthru.ai)
3. On the right sidebar, find your **Account ID**
4. Copy this ID (it looks like: `485f44eabd68fe8c5301c12472a02612`)

### 1.2 Create Cloudflare API Token

1. Go to [My Profile > API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use **Custom token** template
4. Configure permissions:
   - **Account** → Cloudflare Pages:Edit
   - **Zone** → Zone:Read, Cache Purge:Purge
5. Zone Resources: Include → Specific zone → designthru.ai
6. Click **Continue to summary** → **Create Token**
7. **IMPORTANT**: Copy the token immediately (you won't see it again!)

### 1.3 Get Zone ID (for cache purging)

1. Go to your domain dashboard
2. Find **Zone ID** on the right sidebar
3. Copy this ID

## Step 2: Configure GitHub Secrets

Go to your repository settings: https://github.com/kingler/jetvision-agent/settings/secrets/actions

Add the following secrets:

| Secret Name | Description | Where to Find |
|------------|-------------|---------------|
| `CLOUDFLARE_API_TOKEN` | API token from Step 1.2 | Created in Step 1.2 |
| `CLOUDFLARE_ACCOUNT_ID` | Your account ID | From Step 1.1 |
| `CLOUDFLARE_ZONE_ID` | Zone ID for designthru.ai | From Step 1.3 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key | Clerk Dashboard |
| `SLACK_WEBHOOK_URL` | (Optional) For deployment notifications | Slack App Settings |

## Step 3: Configure GitHub Variables

Go to: https://github.com/kingler/jetvision-agent/settings/variables/actions

Add the following variables:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://jetvision.designthru.ai` | Your production URL |

## Step 4: Create Cloudflare Pages Project

### Option A: Via Dashboard

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/?to=/:account/pages)
2. Click **Create a project**
3. Select **Direct Upload** (we're using GitHub Actions)
4. Name it: `jetvision-agent`
5. Upload any placeholder file for now
6. Complete the setup

### Option B: Via CLI (First Deploy)

```bash
cd jetvision-agent/apps/web
npx wrangler pages project create jetvision-agent
```

## Step 5: Configure Environment Variables in Cloudflare

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/?to=/:account/pages)
2. Select `jetvision-agent` project
3. Go to **Settings** → **Environment variables**
4. Add production variables:

```
CLERK_SECRET_KEY=<your-clerk-secret>
DATABASE_URL=<your-database-url>
OPENAI_API_KEY=<your-openai-key>
# Add any other API keys your app needs
```

5. Click **Save**

## Step 6: Set Up Custom Domain (Optional)

1. In your Pages project settings
2. Go to **Custom domains**
3. Add domain: `jetvision.designthru.ai`
4. Follow DNS configuration instructions

## Step 7: Test the Deployment

### Manual Trigger

1. Go to Actions tab: https://github.com/kingler/jetvision-agent/actions
2. Select "Deploy to Cloudflare Pages"
3. Click "Run workflow"
4. Select branch and environment
5. Click "Run workflow"

### Automatic Deployment

Simply push to the main branch:

```bash
cd jetvision-agent
git add .
git commit -m "feat: configure automated Cloudflare deployment"
git push jetvision main
```

## Deployment URLs

- **Production**: https://jetvision-agent.pages.dev (or custom domain)
- **Preview**: https://preview-{pr-number}.jetvision-agent.pages.dev

## Monitoring Deployments

### GitHub Actions

- View deployments: https://github.com/kingler/jetvision-agent/actions
- Check deployment logs for any errors

### Cloudflare Dashboard

- View deployments: Cloudflare Pages → jetvision-agent → Deployments
- Check build logs and deployment history

## Troubleshooting

### Build Failures

1. Check GitHub Actions logs for specific errors
2. Common issues:
   - Missing environment variables
   - Build command failures
   - Dependency installation issues

### Deployment Not Updating

1. Check if cache needs purging
2. Verify GitHub Actions ran successfully
3. Check Cloudflare Pages deployment status

### Environment Variables Not Working

1. Ensure variables are set in both:
   - GitHub Secrets (for build time)
   - Cloudflare Pages (for runtime)
2. Restart deployment after adding variables

## Rollback Strategy

If a deployment causes issues:

1. **Via Cloudflare Dashboard**:
   - Go to Pages → jetvision-agent → Deployments
   - Find previous working deployment
   - Click "Rollback to this deployment"

2. **Via Git**:
   ```bash
   git revert HEAD
   git push jetvision main
   ```

## Security Best Practices

1. **Never commit secrets** to the repository
2. Use **GitHub Secrets** for sensitive data
3. Rotate API tokens regularly
4. Use separate tokens for production/staging
5. Enable 2FA on both GitHub and Cloudflare

## Next Steps

1. ✅ Set up monitoring and alerts
2. ✅ Configure staging environment
3. ✅ Set up branch protection rules
4. ✅ Enable Cloudflare Web Analytics
5. ✅ Configure custom error pages

## Support

- Cloudflare Pages Docs: https://developers.cloudflare.com/pages/
- GitHub Actions Docs: https://docs.github.com/en/actions
- Issues: https://github.com/kingler/jetvision-agent/issues