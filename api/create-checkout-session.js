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
        const { amount } = req.body;

        if (!amount || amount < 100) {
            return res.status(400).json({ error: 'Invalid amount. Minimum is $1.00' });
        }

        const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET;
        
        if (!stripeSecretKey) {
            return res.status(500).json({ error: 'Stripe not configured' });
        }
        
        const stripe = require('stripe')(stripeSecretKey);

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Donation to Speakers Server',
                            description: 'Thank you for supporting Speakers Server!',
                        },
                        unit_amount: amount, // Amount in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin || process.env.SITE_URL || 'https://speakersserver.vercel.app'}/?donation=success`,
            cancel_url: `${req.headers.origin || process.env.SITE_URL || 'https://speakersserver.vercel.app'}/?donation=cancelled`,
        });

        res.status(200).json({ url: session.url });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message || 'Failed to create checkout session' });
    }
};

