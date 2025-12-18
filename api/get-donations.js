const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rtxpelmkxxownbafiwmz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!SUPABASE_SERVICE_KEY) {
            return res.status(500).json({ error: 'Supabase not configured' });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Get all succeeded donations (exclude Anonymous for leaderboard)
        const { data: allDonations, error: topError } = await supabase
            .from('donations')
            .select('donor_name, amount')
            .eq('status', 'succeeded')
            .neq('donor_name', 'Anonymous');

        if (topError) {
            // If table doesn't exist, return empty arrays
            if (topError.code === 'PGRST116' || topError.message.includes('relation') || topError.message.includes('does not exist')) {
                return res.status(200).json({
                    leaderboard: [],
                    recent: []
                });
            }
            throw topError;
        }

        // Group by donor_name and sum amounts for leaderboard
        const leaderboardMap = new Map();
        (allDonations || []).forEach(donation => {
            // Only include if not "Anonymous" - logged in users only
            if (donation.donor_name && donation.donor_name !== 'Anonymous') {
                const current = leaderboardMap.get(donation.donor_name) || 0;
                leaderboardMap.set(donation.donor_name, current + donation.amount);
            }
        });

        const leaderboard = Array.from(leaderboardMap.entries())
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 3);

        // Get recent donations (only succeeded, exclude Anonymous)
        const { data: recentDonations, error: recentError } = await supabase
            .from('donations')
            .select('donor_name, amount, created_at')
            .eq('status', 'succeeded')
            .neq('donor_name', 'Anonymous')
            .order('created_at', { ascending: false })
            .limit(5);

        if (recentError) throw recentError;

        // Format recent donations with relative time
        const formattedRecent = (recentDonations || []).map(donation => ({
            name: donation.donor_name,
            amount: donation.amount,
            time: formatRelativeTime(new Date(donation.created_at))
        }));

        res.status(200).json({
            leaderboard: leaderboard,
            recent: formattedRecent
        });
    } catch (error) {
        console.error('Error fetching donations:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch donations' });
    }
};

function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

