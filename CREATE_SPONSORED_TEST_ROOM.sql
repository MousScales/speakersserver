-- Create a test sponsored room
-- This will show up in the sponsored section on the home page

-- Insert a test room with sponsorship
INSERT INTO rooms (
    id,
    title,
    description,
    category,
    active_participants,
    sponsor_until,
    created_at
) VALUES (
    gen_random_uuid(),
    'Test Sponsored Room - Check Out Our Features!',
    'This is a test room to demonstrate the sponsored section. Sponsored rooms appear at the top of the home page with special visibility.',
    'general',
    0,
    NOW() + INTERVAL '2 hours', -- Sponsored for 2 hours from now
    NOW()
)
ON CONFLICT DO NOTHING;

-- If you want to sponsor an existing room instead, uncomment and modify this:
-- UPDATE rooms 
-- SET sponsor_until = NOW() + INTERVAL '2 hours'
-- WHERE id = 'YOUR_ROOM_ID_HERE';

-- Create a corresponding sponsorship record (optional, for tracking)
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
    NULL, -- Anonymous sponsor for test
    2000, -- $20 in cents
    'test_payment_intent_' || gen_random_uuid()::text,
    'succeeded',
    r.sponsor_until,
    NOW()
FROM rooms r
WHERE r.title = 'Test Sponsored Room - Check Out Our Features!'
AND r.sponsor_until > NOW()
LIMIT 1
ON CONFLICT DO NOTHING;

-- Verify the sponsored room was created
SELECT 
    id,
    title,
    sponsor_until,
    CASE 
        WHEN sponsor_until > NOW() THEN 'ACTIVE SPONSORSHIP'
        ELSE 'NO ACTIVE SPONSORSHIP'
    END as sponsorship_status
FROM rooms
WHERE sponsor_until > NOW()
ORDER BY sponsor_until DESC;

