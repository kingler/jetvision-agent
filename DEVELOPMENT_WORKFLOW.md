# JetVision Agent - Development Workflow Guide

## 🚀 Quick Start - Updating Your Deployed App

When you make changes during development, use these commands to update the deployed version:

### 1️⃣ Standard Update (Most Common)
```bash
./UPDATE_DEPLOY.sh
```
- Rebuilds the application
- Deploys to Cloudflare Pages
- Automatic version tracking
- Takes ~2-3 minutes

### 2️⃣ Quick Deploy (For Minor Changes)
```bash
./QUICK_DEPLOY.sh
```
- Skips rebuild
- Deploys existing build
- Perfect for config/env changes
- Takes ~30 seconds

### 3️⃣ Force Rebuild
```bash
./UPDATE_DEPLOY.sh --force
```
- Forces complete rebuild
- Use when dependencies change
- Clears all caches

### 4️⃣ Update Everything (Including MCP Servers)
```bash
./UPDATE_DEPLOY.sh --mcp
```
- Updates main app
- Updates Apollo MCP server
- Updates Avainode MCP server
- Complete system update

## 📝 Development Scenarios

### Scenario 1: Frontend Changes (UI/Components)
```bash
# Make your changes in apps/web/src
# Then deploy:
./UPDATE_DEPLOY.sh
```

### Scenario 2: Environment Variable Changes
```bash
# Update .env.production.local
# Quick deploy without rebuild:
./QUICK_DEPLOY.sh
```

### Scenario 3: Package Updates
```bash
# After updating packages:
bun install
./UPDATE_DEPLOY.sh --force
```

### Scenario 4: MCP Server Updates
```bash
# After changing MCP server code:
./UPDATE_DEPLOY.sh --mcp
```

### Scenario 5: Quick Fix in Production
```bash
# Make the fix
# Deploy immediately:
./UPDATE_DEPLOY.sh --version hotfix-$(date +%Y%m%d)
```

## 🔄 Typical Development Flow

1. **Start Development**
   ```bash
   cd jetvision-agent/apps/web
   bun dev
   ```

2. **Make Changes**
   - Edit code
   - Test locally at http://localhost:3000

3. **Deploy Changes**
   ```bash
   # From project root:
   ./UPDATE_DEPLOY.sh
   ```

4. **Verify Deployment**
   ```bash
   # Check deployment status:
   wrangler pages deployment list --project-name=jetvision-agent
   
   # View logs:
   wrangler pages deployment tail
   ```

## 🏷️ Version Management

### Automatic Versioning
Every deployment gets an automatic timestamp version:
```
20250126-143025 (YYYYMMDD-HHMMSS)
```

### Custom Versions
Tag important deployments:
```bash
./UPDATE_DEPLOY.sh --version v1.2.0
./UPDATE_DEPLOY.sh --version feature-chat
./UPDATE_DEPLOY.sh --version hotfix-auth
```

### Check Current Version
```bash
cat .deployment-version
```

### View Deployment History
```bash
cat deployment.log
```

## ⚡ Speed Optimization Tips

### Fastest Updates (30 seconds)
Use when only changing:
- Static assets
- Environment variables
- Configuration files

```bash
./QUICK_DEPLOY.sh
```

### Normal Updates (2-3 minutes)
Use for:
- Component changes
- Logic updates
- Style changes

```bash
./UPDATE_DEPLOY.sh
```

### Full Rebuild (3-5 minutes)
Required for:
- Package changes
- Major refactoring
- Build issues

```bash
./UPDATE_DEPLOY.sh --force
```

## 🛠️ Troubleshooting

### Build Fails
```bash
# Clean and rebuild:
rm -rf out .next
./UPDATE_DEPLOY.sh --force
```

### Deployment Fails
```bash
# Check Cloudflare login:
wrangler whoami

# Re-login if needed:
wrangler login
```

### Changes Not Showing
```bash
# Clear Cloudflare cache:
wrangler pages deployment list --project-name=jetvision-agent
# Note the deployment ID, then check the Cloudflare dashboard
```

### Rollback to Previous Version
```bash
# List deployments:
wrangler pages deployment list --project-name=jetvision-agent

# Rollback:
wrangler pages rollback --project-name=jetvision-agent
```

## 📊 Monitoring Deployments

### Live Logs
```bash
wrangler pages deployment tail --project-name=jetvision-agent
```

### Deployment Status
```bash
wrangler pages deployment list --project-name=jetvision-agent
```

### Check Health
```bash
curl https://jetvision-agent.pages.dev
```

## 🔐 Environment Variables

### Update in Cloudflare Dashboard
1. Go to: https://dash.cloudflare.com
2. Navigate to: Pages > jetvision-agent > Settings > Environment variables
3. Add/Update variables
4. Trigger redeploy

### Update Locally for Next Deploy
1. Edit `.env.production.local`
2. Run: `./UPDATE_DEPLOY.sh`

## 🚦 Deployment Checklist

Before deploying:
- [ ] Test locally with `bun dev`
- [ ] Check TypeScript: `bun typecheck`
- [ ] Run linter: `bun lint`
- [ ] Commit changes (optional but recommended)
- [ ] Check `.env.production.local` is up to date

## 📈 Progressive Deployment Strategy

### Development → Staging → Production
```bash
# Dev deployment (frequent)
./UPDATE_DEPLOY.sh

# Staging (before major releases)
./UPDATE_DEPLOY.sh --version staging-$(date +%Y%m%d)

# Production (stable releases)
./UPDATE_DEPLOY.sh --version v1.0.0 --mcp
```

## 🎯 Best Practices

1. **Commit Before Deploy**
   - Helps track what's deployed
   - Easier rollback reference

2. **Use Version Tags**
   - Tag major features
   - Tag hotfixes
   - Tag releases

3. **Monitor After Deploy**
   - Check logs for errors
   - Test critical paths
   - Monitor performance

4. **Document Changes**
   - Update deployment.log
   - Note breaking changes
   - Document new features

## 💡 Pro Tips

1. **Parallel Development**
   ```bash
   # Keep local dev running while deploying:
   # Terminal 1:
   bun dev
   
   # Terminal 2:
   ./UPDATE_DEPLOY.sh
   ```

2. **Quick Iteration**
   ```bash
   # For rapid testing in production:
   ./QUICK_DEPLOY.sh  # Skip rebuild when possible
   ```

3. **Batch Updates**
   ```bash
   # Update everything at once:
   ./UPDATE_DEPLOY.sh --mcp --version weekly-update
   ```

## 📞 Need Help?

- **Deployment Issues**: Check `deployment.log`
- **Build Errors**: Run with `--force` flag
- **Cloudflare Issues**: Check dashboard at https://dash.cloudflare.com
- **MCP Server Issues**: Check individual server logs with `wrangler tail`

---

Remember: The deployed app at https://jetvision-agent.pages.dev updates within 30 seconds to 3 minutes depending on the deployment method chosen!