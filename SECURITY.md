# 🔒 Security Guidelines

## Environment Variables

This project uses environment variables to protect sensitive credentials.

### ⚠️ NEVER Commit These Files:
- ❌ `config.js` (contains your actual Supabase keys)
- ❌ `token-server.js` (contains your LiveKit secrets)
- ❌ `.env` or `.env.local` files
- ❌ Any file with actual API keys or secrets

### ✅ Safe to Commit:
- ✅ `config.example.js` (template without real keys)
- ✅ `token-server.example.js` (template without real keys)
- ✅ `env.example` (documentation only)
- ✅ `config.production.js` (fetches from serverless endpoint)
- ✅ `api/token.js` (uses environment variables)
- ✅ `api/config.js` (uses environment variables)

## How This Works

### Local Development
Your actual keys are in `config.js` and `token-server.js` (git-ignored).

### Production (Vercel)
All secrets are stored as Vercel Environment Variables and accessed via serverless functions.

## Setting Up Environment Variables

### For Vercel Deployment:

1. **Go to**: Your Vercel project → Settings → Environment Variables

2. **Add these variables**:

| Variable | Where to Get It | Safe for Frontend? |
|----------|----------------|-------------------|
| `SUPABASE_URL` | Supabase Dashboard → API → Project URL | ✅ Yes |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → API → anon/public | ✅ Yes (RLS protected) |
| `LIVEKIT_URL` | LiveKit Cloud → Project URL (wss://) | ✅ Yes |
| `LIVEKIT_API_KEY` | LiveKit Cloud → Settings → Keys | ❌ No (server-side only) |
| `LIVEKIT_API_SECRET` | LiveKit Cloud → Settings → Keys | ❌ No (server-side only) |

3. **Set for**: Production, Preview, and Development

### Why is Supabase Anon Key Safe?

The Supabase anon key is safe to expose because:
- ✅ It's designed for frontend use
- ✅ Row Level Security (RLS) protects your data
- ✅ Supabase enforces policies server-side
- ✅ It's limited to anon role permissions

**However, LiveKit secrets MUST stay server-side!**

## Architecture

```
Frontend (HTML/JS)
    ↓ (calls)
/api/config (serverless)
    ↓ (returns public config from env vars)
Frontend initializes Supabase
    
Frontend needs token
    ↓ (calls)
/api/token (serverless)
    ↓ (uses LIVEKIT_API_SECRET from env)
Returns signed token
```

## Security Checklist

- [x] API secrets in environment variables only
- [x] `.gitignore` protects local config files
- [x] Supabase RLS policies enabled
- [x] Token generation server-side only
- [x] CORS configured properly
- [x] No secrets in frontend code
- [x] No secrets in git history

## If You Accidentally Commit Secrets

1. **Rotate all keys immediately**:
   - Generate new Supabase anon key
   - Generate new LiveKit API credentials
   - Update environment variables

2. **Remove from git history**:
   ```bash
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch PATH/TO/FILE' \
   --prune-empty --tag-name-filter cat -- --all
   ```

3. **Force push** (⚠️ dangerous):
   ```bash
   git push origin --force --all
   ```

4. **Tell collaborators** to re-clone the repo

## Best Practices

✅ **DO:**
- Use environment variables for all secrets
- Keep `.gitignore` up to date
- Use RLS policies in Supabase
- Generate tokens server-side only
- Rotate keys periodically

❌ **DON'T:**
- Commit files with real API keys
- Share keys in chat or email
- Use production keys in development
- Disable security features to "make it work"

## Need Help?

- Supabase Security: https://supabase.com/docs/guides/auth/row-level-security
- Vercel Env Variables: https://vercel.com/docs/environment-variables
- LiveKit Security: https://docs.livekit.io/realtime/guides/access-tokens/

---

🔒 Security is not a feature, it's a requirement.

