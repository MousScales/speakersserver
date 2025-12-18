module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { amount, roomId, userId } = req.body;

        if (!amount || amount !== 2000) {
            return res.status(400).json({ error: 'Invalid amount. Sponsorship is $20.00 per hour' });
        }

        if (!roomId) {
            return res.status(400).json({ error: 'Room ID is required' });
        }

        const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET;
        
        if (!stripeSecretKey) {
            return res.status(500).json({ error: 'Stripe not configured' });
        }
        
        const stripe = require('stripe')(stripeSecretKey);

        // Create Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            metadata: {
                roomId: roomId,
                userId: userId || 'anonymous',
                type: 'sponsorship'
            },
        });

        // Save sponsorship to database (will be updated when payment succeeds via webhook)
        const { createClient } = require('@supabase/supabase-js');
        const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rtxpelmkxxownbafiwmz.supabase.co';
        const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
        
        if (SUPABASE_SERVICE_KEY) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            
            // Calculate sponsor_until (1 hour from now)
            const sponsorUntil = new Date();
            sponsorUntil.setHours(sponsorUntil.getHours() + 1);
            
            // Check if room already has an active sponsorship
            const { data: roomData } = await supabase
                .from('rooms')
                .select('sponsor_until')
                .eq('id', roomId)
                .single();
            
            let newSponsorUntil = sponsorUntil.toISOString();
            
            // If room already has active sponsorship, extend it by 1 hour
            if (roomData && roomData.sponsor_until) {
                const currentSponsorUntil = new Date(roomData.sponsor_until);
                const now = new Date();
                if (currentSponsorUntil > now) {
                    // Extend existing sponsorship
                    currentSponsorUntil.setHours(currentSponsorUntil.getHours() + 1);
                    newSponsorUntil = currentSponsorUntil.toISOString();
                }
            }
            
            // Save sponsorship record (pending status)
            await supabase
                .from('sponsorships')
                .insert({
                    room_id: roomId,
                    user_id: userId || null,
                    amount: amount,
                    payment_intent_id: paymentIntent.id,
                    status: 'pending',
                    sponsor_until: newSponsorUntil
                });
        }

        res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message || 'Failed to create payment intent' });
    }
};

