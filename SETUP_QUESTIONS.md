# Controversial Questions Setup

This document explains how to set up the controversial questions system that replaces the news section.

## Database Setup

1. Run the SQL script to create the `controversial_questions` table:
   ```sql
   -- Run CONTROVERSIAL_QUESTIONS_SETUP.sql in Supabase SQL Editor
   ```

## API Setup

The system uses two serverless functions:

1. **`/api/generate-questions`** - Generates controversial questions using OpenAI
2. **`/api/cron-questions`** - Cron job endpoint that runs daily at 9am UTC

## Environment Variables

Make sure these are set in Vercel:

- `OPEN_AI_KEY` - Your OpenAI API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Your Supabase service role key
- `CRON_SECRET` - Secret for securing the cron endpoint

## Manual Trigger

To generate questions immediately (for testing or initial setup):

1. **Via Vercel Dashboard**: Go to your deployment → Functions → `/api/generate-questions` → Test
2. **Via API Call**: 
   ```bash
   curl -X POST https://your-domain.vercel.app/api/generate-questions
   ```

## How It Works

1. The cron job runs daily at 9am UTC
2. It calls `/api/generate-questions` which:
   - Checks if questions already exist for today
   - If not, uses OpenAI to generate 5 controversial questions
   - Questions focus on: politics, religion, conservative/liberal views, and other controversial topics
   - Stores them in the `controversial_questions` table
3. The frontend displays these questions in a slideshow at the top of the homepage
4. Questions cycle automatically every 5 seconds

## Categories

Questions are automatically categorized as:
- `politics` - Political topics
- `religion` - Religious topics
- `conservative` - Conservative viewpoints
- `liberal` - Liberal viewpoints
- `general` - Other controversial topics

