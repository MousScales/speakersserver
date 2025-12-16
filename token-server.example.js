// LiveKit Token Server
// Run this with: node token-server.js

const express = require('express');
const cors = require('cors');
const { AccessToken } = require('livekit-server-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const LIVEKIT_API_KEY = 'YOUR_LIVEKIT_API_KEY';
const LIVEKIT_API_SECRET = 'YOUR_LIVEKIT_API_SECRET';

// Token generation endpoint
app.get('/token', async (req, res) => {
    try {
        const { roomName, participantName, identity } = req.query;

        if (!roomName || !participantName || !identity) {
            return res.status(400).json({ 
                error: 'Missing required parameters: roomName, participantName, identity' 
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
        console.log(`Token: ${token.substring(0, 20)}...`);
        
        res.json({ token: token });

    } catch (error) {
        console.error('❌ Error generating token:', error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'LiveKit Token Server' });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 LiveKit Token Server running on http://localhost:${PORT}`);
    console.log(`📡 Ready to generate tokens for LiveKit`);
});

