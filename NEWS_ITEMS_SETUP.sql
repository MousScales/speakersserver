-- Create news_items table for storing daily news
CREATE TABLE IF NOT EXISTS news_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read news items (public read access)
CREATE POLICY "News items are publicly readable" ON news_items
  FOR SELECT
  TO public
  USING (true);

-- Policy: Only service role can insert/update/delete (handled by service key)
-- No policy needed as service role bypasses RLS

-- Create index for date lookups
CREATE INDEX IF NOT EXISTS idx_news_items_date ON news_items(date DESC);

-- Create index for category
CREATE INDEX IF NOT EXISTS idx_news_items_category ON news_items(category);

