-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    donor_name TEXT NOT NULL,
    amount INTEGER NOT NULL, -- Amount in cents
    payment_intent_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read donations (for leaderboard)
CREATE POLICY "Anyone can view donations" ON donations
    FOR SELECT
    USING (true);

-- Policy: Service role can insert donations (from serverless function)
CREATE POLICY "Service role can insert donations" ON donations
    FOR INSERT
    WITH CHECK (true);

-- Policy: Service role can update donations (for payment status updates)
CREATE POLICY "Service role can update donations" ON donations
    FOR UPDATE
    USING (true);

