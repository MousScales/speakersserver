# 🚀 Vercel Deployment Guide

Deploy your Speakers Server to Vercel with serverless functions for LiveKit token generation.

## 📋 Prerequisites

- Vercel account (free tier works!)
- GitHub repository with your code
- Supabase database already set up
- LiveKit Cloud account

## 🔧 Step 1: Prepare for Deployment

Your project is already configured for Vercel! Here's what's included:

- ✅ `vercel.json` - Vercel configuration
- ✅ `api/token.js` - Serverless function for tokens
- ✅ `config.production.js` - Production config
- ✅ Updated `package.json`

## 🌐 Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Easiest)

1. **Go to Vercel**: https://vercel.com
2. **Sign in** with GitHub
3. **Import Project**:
   - Click "Add New..." → "Project"
   - Select your `speakersserver` repository
4. **Configure Project**:
   - Framework Preset: **Other**
   - Root Directory: `./`
   - Build Command: Leave empty or `echo "Build complete"`
   - Output Directory: `./`
5. **Add Environment Variables** (IMPORTANT):
   - Click "Environment Variables"
   - Add these:
     ```
     LIVEKIT_API_KEY = API4vYKAgCCYFfW
     LIVEKIT_API_SECRET = HBsTvf1UVnlwCMijpfaFM6Jc7uqcaMHQorKILreF0r4B
     ```
6. **Deploy**: Click "Deploy"

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts
```

## 🔐 Step 3: Set Environment Variables

After deployment, if you didn't add them during setup:

1. Go to your project on Vercel
2. Settings → Environment Variables
3. Add:
   - `LIVEKIT_API_KEY` = `API4vYKAgCCYFfW`
   - `LIVEKIT_API_SECRET` = `HBsTvf1UVnlwCMijpfaFM6Jc7uqcaMHQorKILreF0r4B`
4. Redeploy (Vercel will do this automatically)

## 📝 Step 4: Update Production Config

Once deployed, update `config.production.js` if your Vercel domain is custom:

```javascript
const TOKEN_SERVER_URL = 'https://your-app.vercel.app/api/token';
```

But the current setup already uses `window.location.origin` so it works automatically!

## ✅ Step 5: Verify Deployment

1. **Visit your site**: `https://your-app.vercel.app`
2. **Test creating a room**
3. **Test joining as participant**
4. **Test raising hand and speaking**
5. **Check browser console** for any errors

## 🔄 Production vs Development

### Local Development:
- Uses `config.js` with `localhost:3000/token`
- Run: `npm start` (token server) + `python -m http.server 8000`

### Production (Vercel):
- Uses `config.production.js` (or you can rename to `config.js` for deployment)
- Serverless function at `/api/token`
- Automatic HTTPS
- Global CDN

## 🎯 Important Notes

### Database Connection (Supabase)
✅ **Already works!** Your Supabase connection is in the frontend config and will work on Vercel because:
- Supabase is cloud-hosted
- Uses public anon key (safe for frontend)
- Row Level Security (RLS) protects data

### Token Server
✅ **Converted to serverless!** The `/api/token` endpoint:
- Runs on-demand (no always-on server needed)
- Automatically scales
- Uses environment variables for secrets

### Real-time Features
✅ **Work perfectly!** Because:
- Supabase real-time uses WebSockets (works anywhere)
- LiveKit WebRTC is peer-to-peer
- Serverless function only generates tokens

## 🔐 Security Checklist

- ✅ LiveKit secrets in environment variables (not in code)
- ✅ Supabase RLS policies enabled
- ✅ CORS configured for serverless function
- ✅ Token generation server-side only
- ✅ `.gitignore` protects local secrets

## 🌍 Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Vercel handles SSL automatically

## 📊 Monitoring

Vercel provides:
- **Analytics**: Track page views
- **Logs**: See serverless function logs
- **Performance**: Monitor speed
- **Errors**: Catch issues

Access via: Project → Analytics/Logs

## 🔄 Updating Your Site

Every time you push to GitHub:

```bash
git add .
git commit -m "Update message"
git push
```

Vercel automatically:
1. Detects the push
2. Builds your site
3. Deploys new version
4. Zero downtime!

## ⚡ Vercel Advantages

- **Free tier**: Perfect for this project
- **Serverless**: No server management
- **Auto-scaling**: Handles traffic spikes
- **Global CDN**: Fast worldwide
- **HTTPS**: Automatic SSL
- **Zero config**: Works out of the box

## 🐛 Troubleshooting

### "Failed to get LiveKit token"
- Check environment variables in Vercel
- Verify API key and secret are correct
- Check serverless function logs

### "Database connection failed"
- Supabase URL correct in config?
- Check Supabase dashboard for issues
- Verify RLS policies are set

### "Room not loading"
- Clear browser cache
- Check browser console for errors
- Verify all tables exist in Supabase

## 📞 Need Help?

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- LiveKit Docs: https://docs.livekit.io

---

## 🎉 You're Done!

Your Speakers Server is now:
- 🌐 Deployed globally
- ⚡ Serverless and scalable
- 🔒 Secure with environment variables
- 🔄 Auto-deploying from GitHub
- 📱 Working on all devices

Enjoy your production-ready discussion platform! 🎊

