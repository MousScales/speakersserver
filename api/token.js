// Vercel Serverless Function for LiveKit Token Generation
// Updated: Enhanced error logging for debugging

let AccessToken;
try {
    const sdk = await import('livekit-server-sdk');
    AccessToken = sdk.AccessToken;
    console.log('✅ LiveKit SDK loaded successfully');
} catch (error) {
    console.error('❌ Failed to load LiveKit SDK:', error);
}

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
        const { roomName, participantName, identity } = req.query;

        // Debug logging
        console.log('Token request received:', { roomName, participantName, identity });
        console.log('Environment check:', {
            hasApiKey: !!process.env.LIVEKIT_API_KEY,
            hasApiSecret: !!process.env.LIVEKIT_API_SECRET,
            apiKeyPrefix: process.env.LIVEKIT_API_KEY?.substring(0, 6) || 'MISSING',
        });

        if (!roomName || !participantName || !identity) {
            return res.status(400).json({ 
                error: 'Missing required parameters: roomName, participantName, identity' 
            });
        }

        const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
        const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

        if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
            console.error('Missing LiveKit credentials in environment variables');
            console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('LIVEKIT')));
            return res.status(500).json({ 
                error: 'Server configuration error: Missing LiveKit credentials',
                debug: {
                    hasApiKey: !!LIVEKIT_API_KEY,
                    hasApiSecret: !!LIVEKIT_API_SECRET
                }
            });
        }

        // Create access token
        const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: identity,
            name: participantName,
        });

        // Grant permissions
        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        const token = await at.toJwt();

        console.log(`✅ Generated token for ${participantName} in room ${roomName}`);
        
        return res.status(200).json({ token: token });

    } catch (error) {
        console.error('❌ Error generating token:', error);
        return res.status(500).json({ error: 'Failed to generate token' });
    }
}

