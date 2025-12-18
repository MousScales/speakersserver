-- Insert demo donation data
-- First place: $100 total (multiple donations)
INSERT INTO donations (user_id, donor_name, amount, payment_intent_id, status, created_at) VALUES
-- First place user: $100 total (5 donations of $20 each)
(NULL, 'Alex Johnson', 2000, 'pi_demo_001', 'succeeded', NOW() - INTERVAL '2 days'),
(NULL, 'Alex Johnson', 2000, 'pi_demo_002', 'succeeded', NOW() - INTERVAL '1 day'),
(NULL, 'Alex Johnson', 2000, 'pi_demo_003', 'succeeded', NOW() - INTERVAL '12 hours'),
(NULL, 'Alex Johnson', 2000, 'pi_demo_004', 'succeeded', NOW() - INTERVAL '6 hours'),
(NULL, 'Alex Johnson', 2000, 'pi_demo_005', 'succeeded', NOW() - INTERVAL '1 hour'),

-- Second place: $48 total (2 donations of $24 each)
(NULL, 'Sarah Martinez', 2400, 'pi_demo_006', 'succeeded', NOW() - INTERVAL '3 days'),
(NULL, 'Sarah Martinez', 2400, 'pi_demo_007', 'succeeded', NOW() - INTERVAL '1 day'),

-- Third place: $45 total (multiple donations)
(NULL, 'Michael Chen', 1500, 'pi_demo_008', 'succeeded', NOW() - INTERVAL '4 days'),
(NULL, 'Michael Chen', 1500, 'pi_demo_009', 'succeeded', NOW() - INTERVAL '2 days'),
(NULL, 'Michael Chen', 1500, 'pi_demo_010', 'succeeded', NOW() - INTERVAL '1 day'),

-- Fourth place: $36 total
(NULL, 'Emily Rodriguez', 1800, 'pi_demo_011', 'succeeded', NOW() - INTERVAL '5 days'),
(NULL, 'Emily Rodriguez', 1800, 'pi_demo_012', 'succeeded', NOW() - INTERVAL '3 days'),

-- Fifth place: $30 total
(NULL, 'David Kim', 1500, 'pi_demo_013', 'succeeded', NOW() - INTERVAL '6 days'),
(NULL, 'David Kim', 1500, 'pi_demo_014', 'succeeded', NOW() - INTERVAL '4 days'),

-- Sixth place: $24 total
(NULL, 'Jessica Williams', 2400, 'pi_demo_015', 'succeeded', NOW() - INTERVAL '7 days'),

-- Seventh place: $20 total
(NULL, 'James Brown', 2000, 'pi_demo_016', 'succeeded', NOW() - INTERVAL '8 days'),

-- Eighth place: $18 total
(NULL, 'Amanda Taylor', 1800, 'pi_demo_017', 'succeeded', NOW() - INTERVAL '9 days'),

-- Ninth place: $15 total
(NULL, 'Ryan Anderson', 1500, 'pi_demo_018', 'succeeded', NOW() - INTERVAL '10 days'),

-- Tenth place: $12 total
(NULL, 'Olivia Davis', 1200, 'pi_demo_019', 'succeeded', NOW() - INTERVAL '11 days'),

-- Recent donations (various amounts under $24)
(NULL, 'Chris Wilson', 1000, 'pi_demo_020', 'succeeded', NOW() - INTERVAL '30 minutes'),
(NULL, 'Maya Patel', 2000, 'pi_demo_021', 'succeeded', NOW() - INTERVAL '1 hour'),
(NULL, 'Jordan Lee', 500, 'pi_demo_022', 'succeeded', NOW() - INTERVAL '2 hours'),
(NULL, 'Taylor Smith', 1500, 'pi_demo_023', 'succeeded', NOW() - INTERVAL '3 hours'),
(NULL, 'Morgan Jones', 800, 'pi_demo_024', 'succeeded', NOW() - INTERVAL '4 hours'),
(NULL, 'Casey White', 1200, 'pi_demo_025', 'succeeded', NOW() - INTERVAL '5 hours'),
(NULL, 'Riley Garcia', 1000, 'pi_demo_026', 'succeeded', NOW() - INTERVAL '6 hours'),
(NULL, 'Avery Miller', 2000, 'pi_demo_027', 'succeeded', NOW() - INTERVAL '7 hours'),
(NULL, 'Quinn Moore', 500, 'pi_demo_028', 'succeeded', NOW() - INTERVAL '8 hours'),
(NULL, 'Sage Thompson', 1500, 'pi_demo_029', 'succeeded', NOW() - INTERVAL '9 hours');

