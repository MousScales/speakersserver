// API route to fetch news from OpenAI and store in Supabase
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rtxpelmkxxownbafiwmz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service role key for admin access
const OPENAI_API_KEY = process.env.OPEN_AI_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY; // NewsAPI key for fetching real articles

module.exports = async function handler(req, res) {
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

        const today = new Date().toISOString().split('T')[0];
        
        // Use NewsAPI to get real news articles if API key is available
        let newsItems = [];
        
        if (NEWS_API_KEY) {
            // Fetch real news articles from NewsAPI
            const newsApiUrl = `https://newsapi.org/v2/everything?q=(politics OR protest OR controversy OR policy OR election OR immigration OR trade OR conflict OR scandal)&language=en&sortBy=publishedAt&pageSize=20&from=${today}&apiKey=${NEWS_API_KEY}`;
            
            const newsApiResponse = await fetch(newsApiUrl);
            
            if (newsApiResponse.ok) {
                const newsApiData = await newsApiResponse.json();
                
                if (newsApiData.articles && newsApiData.articles.length > 0) {
                    // Filter and format articles to focus on political/controversial topics
                    const filteredArticles = newsApiData.articles
                        .filter(article => {
                            const title = (article.title || '').toLowerCase();
                            const description = (article.description || '').toLowerCase();
                            const keywords = ['politics', 'policy', 'protest', 'election', 'immigration', 'trade', 'conflict', 'scandal', 'debate', 'controversy', 'government', 'law', 'rights', 'sanctions', 'diplomatic', 'tension'];
                            return keywords.some(keyword => title.includes(keyword) || description.includes(keyword));
                        })
                        .slice(0, 7); // Get top 7 most relevant
                    
                    newsItems = filteredArticles.map(article => ({
                        title: article.title || 'No title',
                        description: article.description || article.title || 'No description',
                        category: article.category || 'politics',
                        sourceUrl: article.url,
                        publishedAt: article.publishedAt
                    }));
                }
            }
        }
        
        // Fallback to OpenAI if NewsAPI fails or no key provided
        if (newsItems.length === 0 && OPENAI_API_KEY) {
            const prompt = `Generate a JSON array of 5-7 recent news events from around the world that happened today (${today}). 

CRITICAL: Focus EXCLUSIVELY on POLITICAL and CONTROVERSIAL topics that spark intense debate. These should be topics where people have strong opposing views. Prioritize:

- Political conflicts, policy debates, government decisions that divide public opinion
- Controversial social issues, protests, civil unrest, and demonstrations
- International tensions, diplomatic disputes, trade wars, sanctions
- Divisive policy changes, elections, political scandals, corruption
- Social justice movements, civil rights issues, cultural conflicts, identity politics
- Economic policies that divide opinion (taxes, regulations, welfare, austerity)
- Immigration debates, border policies, refugee crises
- Healthcare policy debates, education reform controversies
- Climate policy disputes, energy transition conflicts
- Free speech controversies, censorship debates, media bias disputes

AVOID: Sports, entertainment, technology product launches, non-controversial business news, feel-good stories, charity events, or neutral scientific discoveries.

Include events from smallest to biggest in terms of global impact. For each event, provide:
- title: A concise, engaging headline that highlights the controversial or political nature and why it's debated (max 80 characters)
- description: A brief description that emphasizes the controversy, opposing viewpoints, or why this sparks debate (max 150 characters)
- category: Must be "politics" or "world" (use "politics" for domestic political issues, "world" for international controversies)
- searchQuery: A search query (2-5 keywords) that can be used to find this news on Google News (e.g., "immigration policy debate protest 2024")

Return ONLY valid JSON array, no markdown, no code blocks, no explanations. Format:
[
  {
    "title": "Event title",
    "description": "Event description",
    "category": "category_name",
    "searchQuery": "search keywords for google news"
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

            if (openaiResponse.ok) {
                const openaiData = await openaiResponse.json();
                const content = openaiData.choices[0]?.message?.content;

                if (content) {
                    try {
                        const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                        const parsedItems = JSON.parse(cleanedContent);
                        
                        if (Array.isArray(parsedItems)) {
                            // For OpenAI-generated items, use Google News search as fallback
                            newsItems = parsedItems.map(item => ({
                                title: item.title,
                                description: item.description,
                                category: item.category || 'politics',
                                sourceUrl: `https://news.google.com/search?q=${encodeURIComponent(item.searchQuery || item.title)}&hl=en-US&gl=US&ceid=US:en`
                            }));
                        }
                    } catch (parseError) {
                        console.error('JSON parse error:', parseError);
                    }
                }
            }
        }

        if (newsItems.length === 0) {
            return res.status(500).json({ error: 'No news items could be fetched. Please check API keys.' });
        }

        // Delete old news items
        await supabase
            .from('news_items')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        // Insert new news items with real article URLs
        const { data: insertedNews, error: insertError } = await supabase
            .from('news_items')
            .insert(
                newsItems.map(item => ({
                    title: item.title,
                    description: item.description,
                    category: item.category || 'politics',
                    date: today,
                    source_url: item.sourceUrl
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

