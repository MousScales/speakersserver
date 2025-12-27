-- Insert 20 demo rooms across all categories with some sponsored
-- Run this in Supabase SQL Editor to populate your site with test data

-- Insert rooms with various categories, participant counts, and some sponsorships
INSERT INTO rooms (title, description, category, active_participants, sponsor_until, created_at, updated_at)
VALUES 
    -- Sponsored rooms (5 rooms)
    (
        'Is Universal Basic Income the Future?',
        'A deep dive into UBI proposals, economic impacts, and whether it could solve modern inequality. Join the debate!',
        'debate',
        12,
        NOW() + INTERVAL '3 hours', -- Sponsored for 3 hours
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '2 hours'
    ),
    (
        'Hot Take: Social Media is Destroying Society',
        'Unpopular opinion time! Let''s discuss whether platforms like TikTok and Instagram are doing more harm than good.',
        'hot-takes',
        8,
        NOW() + INTERVAL '2 hours', -- Sponsored for 2 hours
        NOW() - INTERVAL '1 hour',
        NOW() - INTERVAL '1 hour'
    ),
    (
        'Chill Vibes: Late Night Philosophy',
        'Relaxed discussion about life, the universe, and everything. No pressure, just good conversation.',
        'chilling',
        5,
        NOW() + INTERVAL '4 hours', -- Sponsored for 4 hours
        NOW() - INTERVAL '30 minutes',
        NOW() - INTERVAL '30 minutes'
    ),
    (
        'The Climate Change Debate: Real or Exaggerated?',
        'Honest conversation about climate science, policy, and what we should actually be doing about it.',
        'debate',
        15,
        NOW() + INTERVAL '1 hour', -- Sponsored for 1 hour
        NOW() - INTERVAL '3 hours',
        NOW() - INTERVAL '3 hours'
    ),
    (
        'Hot Take: Remote Work is Overrated',
        'Controversial opinion: going back to the office might actually be better for productivity and culture.',
        'hot-takes',
        6,
        NOW() + INTERVAL '5 hours', -- Sponsored for 5 hours
        NOW() - INTERVAL '15 minutes',
        NOW() - INTERVAL '15 minutes'
    ),
    
    -- Debate category rooms (5 rooms)
    (
        'Should College Be Free?',
        'Exploring the pros and cons of free higher education. What would it mean for students, taxpayers, and society?',
        'debate',
        9,
        NULL,
        NOW() - INTERVAL '4 hours',
        NOW() - INTERVAL '4 hours'
    ),
    (
        'AI Regulation: Too Much or Too Little?',
        'As AI advances rapidly, should governments step in with regulations or let innovation run free?',
        'debate',
        11,
        NULL,
        NOW() - INTERVAL '5 hours',
        NOW() - INTERVAL '5 hours'
    ),
    (
        'The Housing Crisis: What''s the Real Solution?',
        'Discussing affordable housing, zoning laws, and whether the market can solve this crisis on its own.',
        'debate',
        7,
        NULL,
        NOW() - INTERVAL '6 hours',
        NOW() - INTERVAL '6 hours'
    ),
    (
        'Cancel Culture: Accountability or Censorship?',
        'Where do we draw the line between holding people accountable and suppressing free speech?',
        'debate',
        4,
        NULL,
        NOW() - INTERVAL '7 hours',
        NOW() - INTERVAL '7 hours'
    ),
    (
        'Healthcare: Public vs Private Systems',
        'Comparing healthcare models around the world. Which system works best for patients and society?',
        'debate',
        13,
        NULL,
        NOW() - INTERVAL '8 hours',
        NOW() - INTERVAL '8 hours'
    ),
    
    -- Hot Takes category rooms (5 rooms)
    (
        'Hot Take: Cryptocurrency is a Scam',
        'Unpopular opinion: most crypto projects are just elaborate Ponzi schemes. Change my mind!',
        'hot-takes',
        3,
        NULL,
        NOW() - INTERVAL '1 hour',
        NOW() - INTERVAL '1 hour'
    ),
    (
        'Hot Take: Modern Dating Apps Are Terrible',
        'Swiping culture has ruined genuine connections. Let''s talk about what''s wrong with dating in 2024.',
        'hot-takes',
        10,
        NULL,
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '2 hours'
    ),
    (
        'Hot Take: Productivity Culture is Toxic',
        'The obsession with being productive 24/7 is making us miserable. Time to slow down and enjoy life.',
        'hot-takes',
        5,
        NULL,
        NOW() - INTERVAL '3 hours',
        NOW() - INTERVAL '3 hours'
    ),
    (
        'Hot Take: Streaming Killed Music Quality',
        'Spotify and Apple Music prioritize convenience over sound quality. Real music lovers know the difference.',
        'hot-takes',
        2,
        NULL,
        NOW() - INTERVAL '4 hours',
        NOW() - INTERVAL '4 hours'
    ),
    (
        'Hot Take: Influencers Are Overrated',
        'Social media influencers have too much power and not enough accountability. Time for a reality check.',
        'hot-takes',
        8,
        NULL,
        NOW() - INTERVAL '5 hours',
        NOW() - INTERVAL '5 hours'
    ),
    
    -- Chilling category rooms (3 rooms)
    (
        'Chill Zone: Weekend Vibes',
        'Just hanging out and talking about whatever comes to mind. No agenda, just good vibes.',
        'chilling',
        4,
        NULL,
        NOW() - INTERVAL '45 minutes',
        NOW() - INTERVAL '45 minutes'
    ),
    (
        'Chill: Coffee Talk',
        'Morning coffee and casual conversation. What''s on your mind today?',
        'chilling',
        6,
        NULL,
        NOW() - INTERVAL '1 hour',
        NOW() - INTERVAL '1 hour'
    ),
    (
        'Chill: Late Night Thoughts',
        'Those random thoughts that hit you at 2 AM. Let''s explore them together in a relaxed space.',
        'chilling',
        3,
        NULL,
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '2 hours'
    ),
    
    -- General category rooms (2 rooms)
    (
        'General Discussion: What''s Happening?',
        'Open forum for discussing current events, news, and whatever topics are on your mind.',
        'general',
        5,
        NULL,
        NOW() - INTERVAL '20 minutes',
        NOW() - INTERVAL '20 minutes'
    ),
    (
        'Random Thoughts and Ideas',
        'A space for sharing random thoughts, ideas, and conversations that don''t fit anywhere else.',
        'general',
        1,
        NULL,
        NOW() - INTERVAL '10 minutes',
        NOW() - INTERVAL '10 minutes'
    )
ON CONFLICT DO NOTHING;

-- Create sponsorship records for the sponsored rooms
INSERT INTO sponsorships (
    room_id,
    user_id,
    amount,
    payment_intent_id,
    status,
    sponsor_until,
    created_at
)
SELECT 
    r.id,
    NULL, -- Anonymous sponsors for demo
    2000, -- $20 per hour in cents
    'demo_sponsor_' || gen_random_uuid()::text,
    'succeeded',
    r.sponsor_until,
    r.created_at
FROM rooms r
WHERE r.sponsor_until > NOW()
AND r.sponsor_until IS NOT NULL
ON CONFLICT DO NOTHING;

-- Verify the rooms were created
SELECT 
    id,
    title,
    category,
    active_participants,
    CASE 
        WHEN sponsor_until > NOW() THEN 'SPONSORED'
        ELSE 'NOT SPONSORED'
    END as sponsorship_status,
    sponsor_until,
    created_at
FROM rooms
ORDER BY 
    CASE WHEN sponsor_until > NOW() THEN 0 ELSE 1 END, -- Sponsored first
    active_participants DESC, -- Then by participant count
    created_at DESC
LIMIT 25;


