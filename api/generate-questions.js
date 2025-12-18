const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rtxpelmkxxownbafiwmz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.OPEN_AI_KEY;

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!SUPABASE_SERVICE_KEY) {
            return res.status(500).json({ error: 'Supabase service key not configured' });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Check if we should generate new questions (only one per day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: existingQuestions, error: checkError } = await supabase
            .from('controversial_questions')
            .select('*')
            .gte('created_at', today.toISOString())
            .order('created_at', { ascending: false });

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        // If questions exist for today, return them
        if (existingQuestions && existingQuestions.length > 0) {
            return res.status(200).json({ 
                success: true, 
                questions: existingQuestions,
                message: 'Questions already generated for today'
            });
        }

        // Generate new controversial questions using OpenAI
        let questions = [];
        
        if (OPENAI_API_KEY) {
            try {
                const prompt = `Generate 5 controversial discussion questions that would spark debate. Focus on:
- Politics (both conservative and liberal perspectives)
- Religion and faith - INCLUDE SPECIFIC INTER-RELIGIOUS COMPARISONS like:
  * Islam vs Christianity (beliefs, practices, interpretations)
  * Christianity vs Judaism (theological differences, historical relations)
  * Different Christian denominations (Catholic vs Protestant, etc.)
  * Eastern vs Western religions (Buddhism, Hinduism vs Abrahamic faiths)
  * Religious fundamentalism vs modern interpretations
  * Religious influence on society and culture
- Social issues
- Economic policies
- Cultural topics
- Current events

Make them thought-provoking, balanced enough to allow multiple viewpoints, and designed to encourage respectful debate. Include at least 1-2 questions specifically comparing different religions or religious perspectives. Return ONLY a JSON array of question strings, no other text. Example format: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;

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
                                content: 'You are a helpful assistant that generates thought-provoking controversial questions for debate platforms. Return only valid JSON arrays.'
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.9,
                        max_tokens: 500
                    })
                });

                if (!openaiResponse.ok) {
                    throw new Error(`OpenAI API error: ${openaiResponse.status}`);
                }

                const openaiData = await openaiResponse.json();
                const content = openaiData.choices[0].message.content.trim();
                
                // Parse JSON from response (handle markdown code blocks if present)
                let parsedQuestions = [];
                try {
                    // Remove markdown code blocks if present
                    const jsonMatch = content.match(/\[.*\]/s);
                    if (jsonMatch) {
                        parsedQuestions = JSON.parse(jsonMatch[0]);
                    } else {
                        parsedQuestions = JSON.parse(content);
                    }
                } catch (parseError) {
                    // Fallback: try to extract questions from text
                    const lines = content.split('\n').filter(line => line.trim() && (line.includes('?') || line.match(/^\d+\./)));
                    parsedQuestions = lines.map(line => line.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '').trim()).filter(q => q);
                }

                if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
                    questions = parsedQuestions.slice(0, 5).map(q => ({
                        question: q,
                        category: categorizeQuestion(q)
                    }));
                }
            } catch (openaiError) {
                console.error('OpenAI error:', openaiError);
                // Fallback to default questions
                questions = getDefaultQuestions();
            }
        } else {
            // No OpenAI key, use default questions
            questions = getDefaultQuestions();
        }

        // Delete old questions (keep only last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        await supabase
            .from('controversial_questions')
            .delete()
            .lt('created_at', thirtyDaysAgo.toISOString());

        // Insert new questions
        if (questions.length > 0) {
            const { error: insertError } = await supabase
                .from('controversial_questions')
                .insert(questions);

            if (insertError) {
                throw insertError;
            }
        }

        // Fetch the inserted questions
        const { data: insertedQuestions, error: fetchError } = await supabase
            .from('controversial_questions')
            .select('*')
            .gte('created_at', today.toISOString())
            .order('created_at', { ascending: false });

        if (fetchError) {
            throw fetchError;
        }

        res.status(200).json({
            success: true,
            questions: insertedQuestions || questions,
            count: (insertedQuestions || questions).length
        });

    } catch (error) {
        console.error('Error generating questions:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to generate questions',
            details: error.toString()
        });
    }
};

function categorizeQuestion(question) {
    const lower = question.toLowerCase();
    // Check for religious comparisons and specific religions
    if (lower.includes('islam') || lower.includes('muslim') || lower.includes('quran') || lower.includes('muhammad')) {
        if (lower.includes('christian') || lower.includes('jesus') || lower.includes('bible')) {
            return 'religion'; // Inter-religious comparison
        }
        return 'religion';
    }
    if (lower.includes('christian') || lower.includes('jesus') || lower.includes('bible') || lower.includes('catholic') || lower.includes('protestant')) {
        if (lower.includes('judaism') || lower.includes('jewish') || lower.includes('islam') || lower.includes('muslim')) {
            return 'religion'; // Inter-religious comparison
        }
        return 'religion';
    }
    if (lower.includes('judaism') || lower.includes('jewish') || lower.includes('torah')) {
        return 'religion';
    }
    if (lower.includes('buddhism') || lower.includes('buddhist') || lower.includes('hinduism') || lower.includes('hindu')) {
        return 'religion';
    }
    if (lower.includes('religion') || lower.includes('god') || lower.includes('faith') || lower.includes('church') || lower.includes('worship') || lower.includes('prayer') || lower.includes('theology')) {
        return 'religion';
    }
    if (lower.includes('conservative') || lower.includes('republican') || lower.includes('right-wing')) {
        return 'conservative';
    }
    if (lower.includes('liberal') || lower.includes('democrat') || lower.includes('left-wing') || lower.includes('progressive')) {
        return 'liberal';
    }
    if (lower.includes('politic') || lower.includes('government') || lower.includes('election') || lower.includes('vote')) {
        return 'politics';
    }
    return 'general';
}

function getDefaultQuestions() {
    return [
        { question: "Should religious beliefs influence public policy decisions?", category: 'religion' },
        { question: "How do the core beliefs of Islam and Christianity differ, and which offers a better path to salvation?", category: 'religion' },
        { question: "Is universal healthcare a fundamental right or a government overreach?", category: 'politics' },
        { question: "Should social media platforms have the right to censor political content?", category: 'politics' },
        { question: "Do different interpretations of religious texts (like the Bible vs Quran) lead to fundamentally different moral frameworks?", category: 'religion' }
    ];
}

