-- Add hand_raised_at timestamp column to room_participants table
-- Run this in Supabase SQL Editor

ALTER TABLE room_participants 
ADD COLUMN IF NOT EXISTS hand_raised_at TIMESTAMPTZ;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_room_participants_hand_raised_at 
ON room_participants(hand_raised_at) 
WHERE hand_raised = true;

