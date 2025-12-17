-- Insert 2 placeholder rooms for front-end UI design
-- Run this in Supabase SQL Editor

INSERT INTO rooms (title, description, category, active_participants, created_at, updated_at)
VALUES 
    (
        'Welcome to the Future of Discussion',
        'Join us for an engaging conversation about the latest trends in technology and innovation. Share your thoughts, ask questions, and connect with like-minded individuals.',
        'technology',
        5,
        NOW(),
        NOW()
    ),
    (
        'Exploring Creative Expression',
        'A space for artists, creators, and enthusiasts to discuss their latest projects, share inspiration, and collaborate on new ideas. All creative minds welcome!',
        'entertainment',
        3,
        NOW(),
        NOW()
    )
ON CONFLICT DO NOTHING;

-- Verify the rooms were created
SELECT id, title, category, active_participants, created_at 
FROM rooms 
ORDER BY created_at DESC 
LIMIT 2;

