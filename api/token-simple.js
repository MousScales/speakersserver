// Simplified token endpoint for debugging

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('Step 1: Handler started');
        
        // Check env vars
        const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
        const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
        
        console.log('Step 2: Env vars checked', {
            hasKey: !!LIVEKIT_API_KEY,
            hasSecret: !!LIVEKIT_API_SECRET
        });

        if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
            return res.status(500).json({ 
                error: 'Missing credentials',
                hasKey: !!LIVEKIT_API_KEY,
                hasSecret: !!LIVEKIT_API_SECRET
            });
        }

        console.log('Step 3: About to import SDK');
        
        // Try to import SDK
        const { AccessToken } = await import('livekit-server-sdk');
        
        console.log('Step 4: SDK imported successfully');

        const { roomName, participantName, identity } = req.query;

        if (!roomName || !participantName || !identity) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        console.log('Step 5: Creating token');

        // Create token
        const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: identity,
            name: participantName,
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        console.log('Step 6: Converting to JWT');

        const token = await at.toJwt();

        console.log('Step 7: Success!');

        return res.status(200).json({ token: token });

    } catch (error) {
        console.error('ERROR at some step:', error);
        return res.status(500).json({ 
            error: error.message,
            stack: error.stack,
            name: error.name
        });
    }
}

