// Cron job to refresh news at 9am daily
// This endpoint is called by Vercel Cron

module.exports = async function handler(req, res) {
    // Verify this is called by Vercel Cron (optional security check)
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Call the news API endpoint
        // In Vercel, use the deployment URL or environment variable
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : (process.env.NEXT_PUBLIC_VERCEL_URL 
                ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
                : 'https://speakersserver.vercel.app');
        
        const response = await fetch(`${baseUrl}/api/news`, {
            method: 'GET',
            headers: {
                'x-api-key': process.env.CRON_SECRET || ''
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: 'Failed to fetch news', 
                details: data 
            });
        }

        return res.status(200).json({
            success: true,
            message: 'News refreshed successfully',
            count: data.count
        });

    } catch (error) {
        console.error('Cron news refresh error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
}

