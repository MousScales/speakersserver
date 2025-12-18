-- Create controversial_questions table (replaces news_items)
CREATE TABLE IF NOT EXISTS controversial_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    category TEXT, -- politics, religion, conservative, liberal, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_controversial_questions_created_at ON controversial_questions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE controversial_questions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read questions
CREATE POLICY "Anyone can view questions" ON controversial_questions
    FOR SELECT
    USING (true);

-- Policy: Service role can insert/update questions
CREATE POLICY "Service role can manage questions" ON controversial_questions
    FOR ALL
    USING (true)
    WITH CHECK (true);

