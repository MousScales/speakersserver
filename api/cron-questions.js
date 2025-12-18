// Vercel Cron Job - Runs daily at 9am UTC to generate controversial questions
// This endpoint is called by Vercel's cron system

module.exports = async (req, res) => {
    // Verify this is called by Vercel Cron
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Call the generate-questions endpoint
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : process.env.SITE_URL || 'https://speakersserver.vercel.app';
        
        const response = await fetch(`${baseUrl}/api/generate-questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate questions');
        }

        res.status(200).json({
            success: true,
            message: 'Questions generated successfully',
            count: data.count || 0
        });
    } catch (error) {
        console.error('Cron job error:', error);
        res.status(500).json({
            error: error.message || 'Failed to run cron job'
        });
    }
};

