// API route to fetch news from OpenAI and store in Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rtxpelmkxxownbafiwmz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service role key for admin access
const OPENAI_API_KEY = process.env.OPEN_AI_KEY;

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check for API key in header (optional security)
    const authHeader = req.headers['x-api-key'];
    if (authHeader && authHeader !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    if (!SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'Supabase service key not configured' });
    }

    try {
        // Initialize Supabase with service role key
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Call OpenAI to get today's news
        const today = new Date().toISOString().split('T')[0];
        const prompt = `Generate a JSON array of 5-7 recent news events from around the world that happened today (${today}). Include events from smallest to biggest in terms of global impact. For each event, provide:
- title: A concise, engaging headline (max 80 characters)
- description: A brief description of the event (max 150 characters)
- category: One of: politics, technology, sports, entertainment, science, business, world

Return ONLY valid JSON array, no markdown, no code blocks, no explanations. Format:
[
  {
    "title": "Event title",
    "description": "Event description",
    "category": "category_name"
  }
]`;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a news aggregator. Return only valid JSON arrays, no markdown formatting.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!openaiResponse.ok) {
            const error = await openaiResponse.json();
            console.error('OpenAI API error:', error);
            return res.status(500).json({ error: 'Failed to fetch news from OpenAI', details: error });
        }

        const openaiData = await openaiResponse.json();
        const content = openaiData.choices[0]?.message?.content;

        if (!content) {
            return res.status(500).json({ error: 'No content from OpenAI' });
        }

        // Parse JSON from response (remove markdown code blocks if present)
        let newsItems;
        try {
            const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            newsItems = JSON.parse(cleanedContent);
        } catch (parseError) {
            console.error('JSON parse error:', parseError, 'Content:', content);
            return res.status(500).json({ error: 'Failed to parse news data', details: parseError.message });
        }

        if (!Array.isArray(newsItems)) {
            return res.status(500).json({ error: 'News data is not an array' });
        }

        // Delete old news items
        await supabase
            .from('news_items')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        // Insert new news items
        const { data: insertedNews, error: insertError } = await supabase
            .from('news_items')
            .insert(
                newsItems.map(item => ({
                    title: item.title,
                    description: item.description,
                    category: item.category || 'general',
                    date: today
                }))
            )
            .select();

        if (insertError) {
            console.error('Supabase insert error:', insertError);
            return res.status(500).json({ error: 'Failed to store news', details: insertError.message });
        }

        return res.status(200).json({
            success: true,
            count: insertedNews.length,
            news: insertedNews
        });

    } catch (error) {
        console.error('News fetch error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}

