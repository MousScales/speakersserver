# News System Setup Guide

This guide explains how to set up the OpenAI-powered news system that refreshes daily at 9am.

## Prerequisites

1. **OpenAI API Key** - You need an OpenAI API key with access to GPT-4o-mini
2. **Supabase Service Role Key** - Required for the API to write news items to the database

## Setup Steps

### 1. Create the Database Table

Run the SQL script in your Supabase SQL Editor:

```sql
-- Run NEWS_ITEMS_SETUP.sql
```

This creates the `news_items` table with public read access and proper indexes.

### 2. Set Environment Variables in Vercel

Go to your Vercel project settings → Environment Variables and add:

- **`OPEN_AI_KEY`** - Your OpenAI API key (required)
- **`SUPABASE_SERVICE_KEY`** or **`SUPABASE_SERVICE_ROLE_KEY`** - Your Supabase service role key (required)
  - Find this in Supabase Dashboard → Settings → API → `service_role` key (keep this secret!)
- **`SUPABASE_URL`** - Your Supabase project URL (optional, defaults to hardcoded value)
- **`CRON_SECRET`** - A random secret string for securing cron endpoints (optional but recommended)

### 3. Deploy to Vercel

After setting environment variables, push to GitHub and Vercel will automatically deploy.

### 4. Test the News API

You can manually trigger the news fetch by calling:

```
GET https://your-domain.vercel.app/api/news
```

Or with authentication header:
```
GET https://your-domain.vercel.app/api/news
Headers: x-api-key: YOUR_CRON_SECRET
```

### 5. Verify Cron Job

The cron job is configured in `vercel.json` to run daily at 9am UTC:

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

You can check Vercel Dashboard → Settings → Cron Jobs to see the scheduled job.

## How It Works

1. **Daily Refresh (9am UTC)**: Vercel Cron calls `/api/cron-news`
2. **News Fetch**: The cron endpoint calls `/api/news` which:
   - Calls OpenAI GPT-4o-mini to generate 5-7 news events from smallest to biggest global impact
   - Parses the JSON response
   - Deletes old news items
   - Inserts new news items into Supabase
3. **Frontend Display**: The homepage fetches news from Supabase and displays them in a slideshow

## News Format

Each news item contains:
- `title`: Concise headline (max 80 characters)
- `description`: Brief description (max 150 characters)
- `category`: One of: politics, technology, sports, entertainment, science, business, world
- `date`: The date the news was generated

## Troubleshooting

### News not appearing
- Check Vercel function logs for errors
- Verify environment variables are set correctly
- Check Supabase table has data: `SELECT * FROM news_items ORDER BY created_at DESC;`

### Cron not running
- Verify `vercel.json` has the cron configuration
- Check Vercel Dashboard → Cron Jobs
- Ensure the cron endpoint is accessible

### OpenAI API errors
- Verify `OPEN_AI_KEY` is correct
- Check OpenAI account has credits
- Review API rate limits

