# Vercel Deployment Guide - African Warriors

This guide walks you through deploying the African Warriors game to Vercel.

## Prerequisites

1. **GitHub Repository**: Your code should be pushed to GitHub
2. **Vercel Account**: Sign up at https://vercel.com
3. **Supabase Project**: Active project at https://supabase.com

## Deployment Steps

### 1. Connect to Vercel

1. Go to https://vercel.com and log in
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the Vite framework

### 2. Configure Build Settings

Vercel should auto-detect these settings from `vercel.json`, but verify:

- **Framework Preset**: Vite
- **Build Command**: `pnpm install && pnpm run build`
- **Output Directory**: `dist/public`
- **Install Command**: `pnpm install`

### 3. Set Environment Variables

In Vercel Dashboard > Project Settings > Environment Variables, add:

#### Required Variables

| Variable | Value | Where to Find |
|----------|-------|---------------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase Dashboard > Settings > API > Project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase Dashboard > Settings > API > anon/public key |
| `VITE_APP_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |

**Important**: Set these for **Production**, **Preview**, and **Development** environments.

#### Optional Variables (Analytics)

Only add if you're using analytics:

| Variable | Value |
|----------|-------|
| `VITE_ANALYTICS_ENDPOINT` | Your analytics endpoint |
| `VITE_ANALYTICS_WEBSITE_ID` | Your analytics website ID |

### 4. Deploy

1. Click "Deploy"
2. Wait for build to complete (usually 1-2 minutes)
3. Vercel will provide your deployment URL

### 5. Update Supabase Edge Function Secrets

After deployment, update your Supabase Edge Functions with the production URL:

```bash
# Set the APP_URL secret for your Edge Functions
npx --yes supabase@latest secrets set APP_URL=https://your-actual-app.vercel.app
```

This is critical for the multiplayer matchmaking system to work correctly.

### 6. Test Your Deployment

Visit your Vercel URL and test:

1. **Home Page**: Should load correctly
2. **Single Player**: Start a quick battle
3. **Online Multiplayer**:
   - Create a game
   - Open incognito window
   - Join with game code
   - Complete a battle

## Architecture Notes

### What Runs Where

- **Frontend (Vercel)**:
  - Static React app built with Vite
  - Client-side routing with Wouter
  - All game UI and logic

- **Backend (Supabase)**:
  - Database (PostgreSQL)
  - Realtime subscriptions
  - Edge Functions (matchmaking, game management)
  - Authentication (if added later)

- **Not Deployed**:
  - Express server (in `server/` folder) - not used on Vercel
  - Local development files - excluded by `.vercelignore`

### SPA Routing

The `vercel.json` configuration ensures all routes serve `index.html`, enabling client-side routing:

- `/` - Home page
- `/online` - Online multiplayer lobby
- `/join/:code` - Join game with code

### Asset Caching

Assets in `/assets/` are cached for 1 year (immutable) for optimal performance.

## Troubleshooting

### Build Fails

**Issue**: Build fails with "pnpm: command not found"
**Fix**: Vercel should auto-detect pnpm from `packageManager` field in package.json. If not, try:
- Clear Vercel build cache
- Re-deploy

**Issue**: Large bundle warning
**Fix**: This is expected (654KB). The game includes:
- 16 character images
- All Radix UI components
- Tailwind CSS
- Game logic

### Environment Variables Not Working

**Issue**: Blank page or Supabase errors
**Fix**:
1. Verify all three required env vars are set in Vercel
2. Check they're set for all environments (Production/Preview/Development)
3. Redeploy after setting env vars

### Multiplayer Not Working

**Issue**: Can't create or join games
**Fix**:
1. Verify Supabase URL and anon key are correct
2. Check Supabase Edge Functions are deployed: `npx --yes supabase@latest functions list`
3. Verify APP_URL secret is set in Supabase: `npx --yes supabase@latest secrets list`
4. Check Supabase logs for errors

### Routes Return 404

**Issue**: Direct navigation to `/online` returns 404
**Fix**:
- Verify `vercel.json` has the rewrite rule for `/(.*)`
- Redeploy

## Production Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] APP_URL secret set in Supabase Edge Functions
- [ ] Test single-player mode
- [ ] Test online multiplayer (create + join)
- [ ] Test on mobile devices
- [ ] Verify all 16 characters display correctly
- [ ] Test all game actions (Attack, Block, Counter, Heal)
- [ ] Verify shop system works
- [ ] Test round progression (best of 5)
- [ ] Check browser console for errors

## Monitoring

### Vercel Analytics

Enable in Vercel Dashboard > Analytics to track:
- Page views
- Load times
- User locations
- Performance metrics

### Supabase Logs

Monitor in Supabase Dashboard > Logs:
- Database queries
- Edge Function invocations
- Realtime connections
- Errors

## Updates and Redeployment

Vercel automatically redeploys when you push to your main branch:

1. Make changes locally
2. Commit and push to GitHub
3. Vercel detects changes and rebuilds
4. New version deployed automatically

For manual redeploy:
- Go to Vercel Dashboard > Deployments
- Click "Redeploy" on any deployment

## Cost Estimates

- **Vercel**: Free tier supports up to 100GB bandwidth/month
- **Supabase**: Free tier supports up to 500MB database, 2GB bandwidth
- Both free tiers should be sufficient for moderate traffic

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Vite Docs**: https://vite.dev
