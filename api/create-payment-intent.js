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
        const { amount, donorName, userId } = req.body;

        if (!amount || amount < 100) {
            return res.status(400).json({ error: 'Invalid amount. Minimum is $1.00' });
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
                donorName: donorName || 'Anonymous',
            },
        });

        // Save donation to database
        const { createClient } = require('@supabase/supabase-js');
        const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rtxpelmkxxownbafiwmz.supabase.co';
        const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
        
        if (SUPABASE_SERVICE_KEY) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            
            // Save donation to database
            await supabase
                .from('donations')
                .insert({
                    user_id: userId || null,
                    donor_name: donorName || 'Anonymous',
                    amount: amount,
                    payment_intent_id: paymentIntent.id,
                    status: 'pending'
                });
        }

        res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message || 'Failed to create payment intent' });
    }
};

