-- Add image_url column to news_items table
ALTER TABLE news_items 
ADD COLUMN IF NOT EXISTS image_url TEXT;

