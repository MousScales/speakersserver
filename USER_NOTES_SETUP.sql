-- Create user_notes table for storing notes and folders (Google Drive-like structure)
CREATE TABLE IF NOT EXISTS user_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('folder', 'note')),
  content TEXT DEFAULT '',
  parent_id UUID REFERENCES user_notes(id) ON DELETE CASCADE,
  category TEXT, -- Optional: can link to room category for quick access
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Note: Unique constraint removed to allow flexibility with null parent_id
  -- Application logic should prevent duplicate names in same folder
);

-- Enable Row Level Security
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notes
CREATE POLICY "Users can view own notes" ON user_notes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own notes
CREATE POLICY "Users can insert own notes" ON user_notes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own notes
CREATE POLICY "Users can update own notes" ON user_notes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own notes
CREATE POLICY "Users can delete own notes" ON user_notes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_notes_user_parent ON user_notes(user_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_user_category ON user_notes(user_id, category) WHERE category IS NOT NULL;
