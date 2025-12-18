-- Add sponsor_until column to rooms table if it doesn't exist
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS sponsor_until TIMESTAMPTZ;

-- Create sponsorships table to track sponsorship payments
CREATE TABLE IF NOT EXISTS sponsorships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL, -- Amount in cents
    payment_intent_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed
    sponsor_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sponsorships_room_id ON sponsorships(room_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON sponsorships(status);
CREATE INDEX IF NOT EXISTS idx_rooms_sponsor_until ON rooms(sponsor_until) WHERE sponsor_until IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE sponsorships ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read sponsorships
CREATE POLICY "Anyone can read sponsorships" ON sponsorships
    FOR SELECT
    USING (true);

-- Policy: Only authenticated users can insert their own sponsorships
CREATE POLICY "Users can insert their own sponsorships" ON sponsorships
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Service role can update sponsorships (for webhook)
CREATE POLICY "Service role can update sponsorships" ON sponsorships
    FOR ALL
    USING (true)
    WITH CHECK (true);

