// Vercel Serverless Function for Configuration
// Returns public configuration (safe to expose to frontend)

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Return public configuration from environment variables
        const config = {
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
            LIVEKIT_URL: process.env.LIVEKIT_URL
        };

        // Verify all required config is present
        if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !config.LIVEKIT_URL) {
            console.error('Missing required environment variables');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        return res.status(200).json(config);

    } catch (error) {
        console.error('❌ Error loading configuration:', error);
        return res.status(500).json({ error: 'Failed to load configuration' });
    }
}

