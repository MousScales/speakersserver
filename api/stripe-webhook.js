const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rtxpelmkxxownbafiwmz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        
        if (SUPABASE_SERVICE_KEY) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            
            // Check if this is a sponsorship payment
            if (paymentIntent.metadata && paymentIntent.metadata.type === 'sponsorship') {
                // Update sponsorship status
                const { data: sponsorship } = await supabase
                    .from('sponsorships')
                    .select('room_id, sponsor_until')
                    .eq('payment_intent_id', paymentIntent.id)
                    .single();
                
                if (sponsorship) {
                    // Update sponsorship status
                    await supabase
                        .from('sponsorships')
                        .update({ status: 'succeeded' })
                        .eq('payment_intent_id', paymentIntent.id);
                    
                    // Update room's sponsor_until field
                    await supabase
                        .from('rooms')
                        .update({ sponsor_until: sponsorship.sponsor_until })
                        .eq('id', sponsorship.room_id);
                }
            } else {
                // Update donation status to succeeded
                await supabase
                    .from('donations')
                    .update({ status: 'succeeded' })
                    .eq('payment_intent_id', paymentIntent.id);
            }
        }
    } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        
        if (SUPABASE_SERVICE_KEY) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            
            // Check if this is a sponsorship payment
            if (paymentIntent.metadata && paymentIntent.metadata.type === 'sponsorship') {
                // Update sponsorship status to failed
                await supabase
                    .from('sponsorships')
                    .update({ status: 'failed' })
                    .eq('payment_intent_id', paymentIntent.id);
            } else {
                // Update donation status to failed
                await supabase
                    .from('donations')
                    .update({ status: 'failed' })
                    .eq('payment_intent_id', paymentIntent.id);
            }
        }
    }

    res.json({ received: true });
};

