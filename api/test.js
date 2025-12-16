// Simple test endpoint to verify Vercel serverless functions are working

export default async function handler(req, res) {
    console.log('Test endpoint called');
    
    return res.status(200).json({ 
        status: 'OK',
        message: 'Vercel serverless function is working!',
        timestamp: new Date().toISOString(),
        env_vars_present: {
            LIVEKIT_API_KEY: !!process.env.LIVEKIT_API_KEY,
            LIVEKIT_API_SECRET: !!process.env.LIVEKIT_API_SECRET,
        }
    });
}

