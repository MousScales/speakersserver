# Trigger News Fetch Now

## Step 1: Set Environment Variables in Vercel

Before the news API can work, you need to set these environment variables in Vercel:

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add these variables:

   - **`OPEN_AI_KEY`** (optional, used as fallback)
     - Value: Your OpenAI API key
     - Get it from: https://platform.openai.com/api-keys
   
   - **`NEWS_API_KEY`** (recommended, for real article URLs)
     - Value: Your NewsAPI key
     - Get it from: https://newsapi.org/register (free tier available)
     - This provides real news article URLs instead of Google News search links
   
   - **`SUPABASE_SERVICE_KEY`** (or `SUPABASE_SERVICE_ROLE_KEY`)
     - Value: Your Supabase service role key
     - Get it from: Supabase Dashboard → Settings → API → `service_role` key
     - ⚠️ **Keep this secret!** This key bypasses RLS policies
   
   - **`SUPABASE_URL`** (optional)
     - Value: `https://rtxpelmkxxownbafiwmz.supabase.co`
     - Or leave it to use the default
   
   - **`CRON_SECRET`** (optional but recommended)
     - Value: Any random string (e.g., `your-secret-key-123`)
     - Used to secure the cron endpoint

3. Select **Production**, **Preview**, and **Development** for all variables
4. Click **Save**
5. **Redeploy** your project (Vercel will prompt you, or go to Deployments → Redeploy)

## Step 2: Create the Database Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Run the contents of NEWS_ITEMS_SETUP.sql
```

Or run this directly:

```sql
CREATE TABLE IF NOT EXISTS news_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "News items are publicly readable" ON news_items
  FOR SELECT
  TO public
  USING (true);

CREATE INDEX IF NOT EXISTS idx_news_items_date ON news_items(date DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_category ON news_items(category);
```

## Step 3: Trigger News Fetch Now

After setting environment variables and redeploying, trigger the news fetch:

### Option A: Via Browser
Open this URL in your browser:
```
https://speakersserver.vercel.app/api/news
```

### Option B: Via Command Line (PowerShell)
```powershell
Invoke-WebRequest -Uri "https://speakersserver.vercel.app/api/news" -Method GET
```

### Option C: Via Command Line (curl - if you have it)
```bash
curl https://speakersserver.vercel.app/api/news
```

You should see a response like:
```json
{
  "success": true,
  "count": 5,
  "news": [...]
}
```

## Step 4: Verify News Appears

1. Go to your homepage: `https://speakersserver.vercel.app`
2. Check the news slideshow at the top
3. You should see 5-7 news items rotating

## Automatic Daily Refresh (Already Configured!)

The cron job is **already set up** in `vercel.json` to run daily at **9am UTC**:

```json
{
  "crons": [
    {
      "path": "/api/cron-news",
      "schedule": "0 9 * * *"
    }
  ]
}
```

This means:
- ✅ News will automatically refresh every day at 9am UTC
- ✅ No manual intervention needed
- ✅ You can verify it's working in Vercel Dashboard → Settings → Cron Jobs

## Troubleshooting

### "Supabase service key not configured"
- Make sure you added `SUPABASE_SERVICE_KEY` in Vercel environment variables
- Redeploy after adding variables

### "OpenAI API key not configured"
- Make sure you added `OPEN_AI_KEY` in Vercel environment variables
- Check that your OpenAI account has credits

### "Failed to fetch news from OpenAI"
- Check your OpenAI API key is valid
- Verify you have API credits
- Check Vercel function logs for detailed errors

### News not showing on homepage
- Check browser console for errors
- Verify the `news_items` table exists in Supabase
- Check that news was successfully inserted (run `SELECT * FROM news_items;` in Supabase)

### Cron not running
- Check Vercel Dashboard → Settings → Cron Jobs
- Verify the cron schedule is correct
- Check Vercel function logs for cron execution

