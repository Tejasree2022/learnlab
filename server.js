require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Initialize Google Gemini
let genAI;
let model;

if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log('✅ Google Gemini AI initialized');
} else {
    console.log('⚠️  Gemini API key not found');
}

// AI Prompt Template
const PROMPT_TEMPLATE = `You are an expert educator creating learning materials.

TOPIC: "{topic}"

Create a comprehensive learning guide with:
1. A CLEAR TITLE in Title Case
2. A DETAILED EXPLANATION that breaks down the concept simply
3. 4 PRACTICE TASKS with different difficulty levels (beginner, intermediate, advanced)
4. Identify the EDUCATIONAL STREAM (cse, ece, science, math, commerce, arts, or general)
5. Suggest a CATEGORY
6. List 3 RELATED TOPICS

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
    "title": "Proper Title Case",
    "explanation": "Detailed explanation here...",
    "tasks": [
        {
            "title": "Task title 1",
            "description": "Clear instructions here",
            "difficulty": "beginner",
            "hint": "Helpful hint if needed"
        },
        {
            "title": "Task title 2",
            "description": "Clear instructions here",
            "difficulty": "intermediate",
            "hint": "Helpful hint if needed"
        },
        {
            "title": "Task title 3", 
            "description": "Clear instructions here",
            "difficulty": "advanced",
            "hint": "Helpful hint if needed"
        },
        {
            "title": "Task title 4",
            "description": "Clear instructions here",
            "difficulty": "intermediate",
            "hint": "Helpful hint if needed"
        }
    ],
    "stream": "stream_name",
    "category": "category_name",
    "related_topics": ["Topic 1", "Topic 2", "Topic 3"]
}

Make tasks practical, engaging, and focused on understanding.`;

// Generate topic using Google Gemini AI
async function generateTopicWithAI(topic) {
    try {
        console.log(`🤖 Gemini generating: ${topic}`);
        
        const prompt = PROMPT_TEMPLATE.replace('{topic}', topic);
        
        // Call Gemini API
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Clean the response (remove markdown code blocks if present)
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```/, '');
        }
        
        // Parse JSON
        const data = JSON.parse(jsonText);
        
        // Add metadata
        data.source = "gemini_ai";
        data.generated_at = new Date().toISOString();
        data.ai_model = "gemini-pro";
        
        return data;
        
    } catch (error) {
        console.error('Gemini AI Error:', error);
        
        // Fallback response if AI fails
        return getFallbackResponse(topic);
    }
}

// Fallback response
function getFallbackResponse(topic) {
    return {
        title: topic.charAt(0).toUpperCase() + topic.slice(1),
        explanation: `Let's explore "${topic}" together. This topic covers important concepts that are valuable to understand.\n\nStart with these steps:\n1. Research basic definitions from reliable sources\n2. Identify key principles and components\n3. Find real-world applications\n4. Practice with examples\n5. Teach someone else to reinforce learning`,
        tasks: [
            {
                title: "Research and define",
                description: `Find 3 different definitions of "${topic}" from textbooks, websites, or videos`,
                difficulty: "beginner",
                hint: "Wikipedia, Khan Academy, and educational YouTube channels are good starting points"
            },
            {
                title: "Identify key concepts",
                description: `List the 5 most important concepts or formulas related to "${topic}"`,
                difficulty: "intermediate",
                hint: "Look for foundational principles that everything else builds upon"
            },
            {
                title: "Real-world application",
                description: `Find 2-3 practical examples of how "${topic}" is used in industry or daily life`,
                difficulty: "intermediate",
                hint: "Search for case studies or news articles about applications"
            },
            {
                title: "Create learning resource",
                description: `Make a one-page cheat sheet explaining "${topic}" to a complete beginner`,
                difficulty: "advanced",
                hint: "Use simple language, diagrams, and avoid jargon"
            }
        ],
        stream: "general",
        category: "concept",
        related_topics: ["Fundamentals", "Advanced Concepts", "Practical Applications"],
        source: "fallback",
        note: "AI service temporarily unavailable - using fallback content"
    };
}

// Rate limiting (Gemini free tier: 60 requests per minute)
const requestHistory = [];
const RATE_LIMIT = 60; // requests per minute
const TIME_WINDOW = 60 * 1000; // 1 minute in milliseconds

function checkRateLimit() {
    const now = Date.now();
    // Remove old requests
    while (requestHistory.length > 0 && requestHistory[0] < now - TIME_WINDOW) {
        requestHistory.shift();
    }
    
    // Check if limit exceeded
    if (requestHistory.length >= RATE_LIMIT) {
        const oldest = requestHistory[0];
        const waitTime = Math.ceil((oldest + TIME_WINDOW - now) / 1000);
        throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds. Free tier: 60 requests/minute.`);
    }
    
    // Add current request
    requestHistory.push(now);
    return true;
}

// Main API endpoint
app.get('/api/topic', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim() === '') {
            return res.status(400).json({ 
                error: 'Please provide a topic to learn. Example: /api/topic?q=python+functions',
                example_topics: [
                    "machine learning basics",
                    "quantum physics introduction", 
                    "how to invest in stocks",
                    "French revolution causes",
                    "Python data structures"
                ]
            });
        }
        
        const topic = q.trim();
        
        // Check rate limit
        try {
            checkRateLimit();
        } catch (rateError) {
            return res.status(429).json({
                error: rateError.message,
                limit: "60 requests per minute",
                upgrade: "For higher limits, upgrade at https://makersuite.google.com"
            });
        }
        
        // Generate with Gemini AI
        if (!model) {
            return res.status(503).json({ 
                error: 'AI service not configured',
                setup_guide: 'Add your Gemini API key to .env file: GEMINI_API_KEY=your_key_here',
                get_key: 'Get free API key: https://makersuite.google.com/app/apikey',
                fallback: 'Using fallback content instead'
            });
        }
        
        console.log(`🔍 Processing: "${topic}"`);
        const aiResponse = await generateTopicWithAI(topic);
        
        // Add rate limit info
        aiResponse.rate_limit = {
            remaining: RATE_LIMIT - requestHistory.length,
            reset_in: "1 minute",
            note: "Google Gemini Free Tier: 60 requests per minute"
        };
        
        res.json(aiResponse);
        
    } catch (error) {
        console.error('API Error:', error);
        
        // Provide helpful error messages
        if (error.message.includes('API key not valid')) {
            return res.status(401).json({
                error: 'Invalid Gemini API Key',
                solution: '1. Get key from https://makersuite.google.com/app/apikey\n2. Add to .env: GEMINI_API_KEY=your_key_here\n3. Restart server'
            });
        }
        
        if (error.message.includes('quota')) {
            return res.status(429).json({
                error: 'API quota exceeded',
                solution: 'Free tier: 60 requests per minute. Wait a minute or upgrade your plan.'
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to generate learning materials',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
            fallback: getFallbackResponse(req.query.q || 'general topic')
        });
    }
});

// API information endpoint
app.get('/api/info', (req, res) => {
    res.json({
        service: "LearnLab AI",
        version: "2.0.0",
        ai_provider: "Google Gemini",
        ai_model: "gemini-pro",
        features: [
            "AI-generated explanations",
            "Practice tasks with hints",
            "Multiple difficulty levels",
            "Related topic suggestions",
            "Rate limited: 60 req/min (free tier)"
        ],
        usage: {
            endpoint: "GET /api/topic?q=your+topic",
            example: "http://localhost:3000/api/topic?q=machine+learning",
            rate_limit: "60 requests per minute"
        },
        setup_guide: "Add GEMINI_API_KEY to .env file",
        get_key: "https://makersuite.google.com/app/apikey"
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        ai_configured: !!model,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        rate_limit: {
            current: requestHistory.length,
            limit: RATE_LIMIT,
            remaining: RATE_LIMIT - requestHistory.length
        }
    });
});

// Frontend
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        available: [
            'GET /',
            'GET /api/topic?q=your+topic',
            'GET /api/health',
            'GET /api/info'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
    🚀 LearnLab with Google Gemini AI
    ============================================
    📍 Local:       http://localhost:${PORT}
    🤖 AI:          ${model ? 'READY' : 'NOT CONFIGURED'}
    🔑 API Key:     ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ Missing'}
    📊 Rate Limit:  60 requests/minute (free tier)
    ============================================
    
    ${!model ? `
    🔧 SETUP REQUIRED:
    1. Your API Key: ${process.env.GEMINI_API_KEY || 'Not found in .env'}
    2. Add to .env: GEMINI_API_KEY=AIzaSyClk17kaxNmSI0mnPHBNEfGRpqM8B0_AR4
    3. Restart server: npm start
    ` : '✅ Ready to learn! Try searching any topic.'}
    
    💡 EXAMPLE SEARCHES:
    • machine learning basics
    • how photosynthesis works
    • Python functions tutorial  
    • supply and demand economics
    • French revolution summary
    • quantum physics introduction
    • how to invest in stocks
    • cooking pasta properly
    
    📈 API STATUS: ${requestHistory.length}/60 requests this minute
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down LearnLab AI...');
    console.log(`📊 Total requests this session: ${requestHistory.length}`);
    console.log('👋 Server stopped');
    process.exit(0);
});
