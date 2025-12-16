-- IMPORTANT: Run this in your Supabase SQL Editor to enable real-time
-- Go to: Supabase Dashboard → SQL Editor → New Query

-- 1. Enable real-time for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 2. Enable real-time for room_participants table
ALTER PUBLICATION supabase_realtime ADD TABLE room_participants;

-- 3. Update Row Level Security to allow real-time subscriptions

-- Chat messages RLS
DROP POLICY IF EXISTS "Enable real-time for chat_messages" ON chat_messages;
CREATE POLICY "Enable real-time for chat_messages"
ON chat_messages FOR SELECT
TO authenticated, anon
USING (true);

-- Room participants RLS
DROP POLICY IF EXISTS "Enable real-time for room_participants" ON room_participants;
CREATE POLICY "Enable real-time for room_participants"
ON room_participants FOR SELECT
TO authenticated, anon
USING (true);

-- Verify real-time is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

