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
}

// IMPROVED PROMPT FOR CLEAR EXPLANATIONS & REAL TASKS
const LEARNING_PROMPT = `You are an expert educator. Create a comprehensive learning guide that helps students truly understand a topic.

TOPIC: "{topic}"

IMPORTANT REQUIREMENTS:
1. EXPLANATION MUST BE:
   - Clear and easy to understand
   - Break complex ideas into simple parts
   - Use everyday examples and analogies
   - Avoid jargon or explain it clearly
   - Include real-world applications

2. TASKS MUST BE:
   - Practical and actionable
   - Build from simple to complex
   - Focus on understanding, not memorization
   - Include real-world scenarios
   - Provide helpful hints that guide thinking

3. STRUCTURE:
   - Title
   - Clear Explanation (with examples)
   - 3 Practice Tasks (beginner → intermediate → advanced)
   - Helpful hints for each task

Respond in this EXACT JSON format:
{
  "title": "Clear Title",
  "explanation": "Detailed, understandable explanation with examples...",
  "tasks": [
    {
      "title": "Practical task title",
      "description": "Clear, actionable instructions",
      "difficulty": "beginner",
      "hint": "Helpful guidance, not just the answer"
    },
    {
      "title": "Practical task title", 
      "description": "Clear, actionable instructions",
      "difficulty": "intermediate",
      "hint": "Helpful guidance, not just the answer"
    },
    {
      "title": "Practical task title",
      "description": "Clear, actionable instructions", 
      "difficulty": "advanced",
      "hint": "Helpful guidance, not just the answer"
    }
  ]
}

Make learning engaging and effective!`;

// Generate quality learning content
async function generateLearningContent(topic) {
    try {
        console.log(`🎓 Generating learning guide for: ${topic}`);
        
        const prompt = LEARNING_PROMPT.replace('{topic}', topic);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Clean response
        let jsonText = text.trim();
        jsonText = jsonText.replace(/```json\s*|\s*```|```/g, '');
        
        const data = JSON.parse(jsonText);
        data.generated_at = new Date().toISOString();
        return data;
        
    } catch (error) {
        console.error('Generation error:', error);
        return getFallbackLearningGuide(topic);
    }
}

// Quality fallback content
function getFallbackLearningGuide(topic) {
    const commonTopics = {
        'python': {
            title: 'Python Programming Basics',
            explanation: `Python is a popular programming language known for its simplicity and readability. It's like giving clear instructions to a computer.

Key concepts:
1. **Variables**: Like labeled boxes that store information
   Example: age = 25 (a box labeled "age" contains 25)

2. **Functions**: Reusable sets of instructions
   Example: def greet(name): return f"Hello, {name}!"

3. **Loops**: Repeating actions
   Example: for i in range(3): print(i) # Prints 0, 1, 2

Real-world use: Web development, data analysis, automation, AI.`,
            tasks: [
                {
                    title: 'Create your first program',
                    description: 'Write a Python program that asks for your name and says "Hello, [Your Name]!"',
                    difficulty: 'beginner',
                    hint: 'Use input() to get name, then print() the greeting'
                },
                {
                    title: 'Calculate average',
                    description: 'Create a function that takes three test scores and returns the average score',
                    difficulty: 'intermediate',
                    hint: 'Average = sum of scores ÷ number of scores'
                },
                {
                    title: 'Build a simple calculator',
                    description: 'Make a calculator that can add, subtract, multiply, and divide based on user input',
                    difficulty: 'advanced',
                    hint: 'Use if/elif statements to choose operation based on user choice'
                }
            ]
        },
        'photosynthesis': {
            title: 'Photosynthesis: How Plants Make Food',
            explanation: `Photosynthesis is how plants use sunlight to make food (glucose) from carbon dioxide and water. Think of it as a plant's kitchen that runs on solar power!

Process in simple terms:
1. **Sunlight** hits leaves → captured by chlorophyll (green pigment)
2. **Water** from roots + **Carbon dioxide** from air → combined using sunlight energy
3. Produces: **Glucose** (plant food) + **Oxygen** (released into air)

Chemical equation: 
6CO₂ + 6H₂O + sunlight → C₆H₁₂O₆ + 6O₂

Real importance: Produces oxygen we breathe, forms base of food chain.`,
            tasks: [
                {
                    title: 'Identify photosynthesis components',
                    description: 'List all inputs (what goes in) and outputs (what comes out) of photosynthesis',
                    difficulty: 'beginner',
                    hint: 'Look at the chemical equation: 6CO₂ + 6H₂O + sunlight → C₆H₁₂O₆ + 6O₂'
                },
                {
                    title: 'Design an experiment',
                    description: 'Design a simple experiment to prove plants need sunlight for photosynthesis',
                    difficulty: 'intermediate',
                    hint: 'Think about covering part of a leaf and observing differences'
                },
                {
                    title: 'Calculate oxygen production',
                    description: 'If a tree consumes 264g of CO₂ in a day, how much oxygen does it produce? (Atomic weights: C=12, O=16)',
                    difficulty: 'advanced',
                    hint: 'Use the balanced equation: For every 6 molecules of CO₂ consumed, 6 molecules of O₂ are produced'
                }
            ]
        }
    };
    
    // Check if topic matches common ones
    const lowerTopic = topic.toLowerCase();
    for (const [key, content] of Object.entries(commonTopics)) {
        if (lowerTopic.includes(key)) {
            return content;
        }
    }
    
    // Generic fallback
    return {
        title: topic.charAt(0).toUpperCase() + topic.slice(1),
        explanation: `Let's understand "${topic}" clearly:

1. **Basic Concept**: Start with the fundamental idea
2. **Key Components**: Break it into main parts
3. **How It Works**: Step-by-step process
4. **Real Examples**: Everyday applications
5. **Why It Matters**: Practical importance

Take your time with each concept. Understanding beats memorization.`,
        tasks: [
            {
                title: 'Research and summarize',
                description: `Find 2-3 reliable sources about "${topic}" and write a one-paragraph summary in your own words`,
                difficulty: 'beginner',
                hint: 'Try educational websites, textbooks, or reputable online resources'
            },
            {
                title: 'Create a visual guide',
                description: 'Make a diagram or flowchart that explains the main concepts of this topic',
                difficulty: 'intermediate',
                hint: 'Focus on relationships between concepts, not just definitions'
            },
            {
                title: 'Apply to real situation',
                description: 'Find or create a real-world example where this knowledge would be useful',
                difficulty: 'advanced',
                hint: 'Think about practical problems this knowledge could solve'
            }
        ]
    };
}

// Rate limiting
const requests = [];
const MAX_REQUESTS = 60;
const WINDOW_MS = 60000;

function canMakeRequest() {
    const now = Date.now();
    
    // Remove old requests
    while (requests.length > 0 && requests[0] < now - WINDOW_MS) {
        requests.shift();
    }
    
    if (requests.length >= MAX_REQUESTS) {
        return false;
    }
    
    requests.push(now);
    return true;
}

// Main learning endpoint
app.get('/api/learn', async (req, res) => {
    try {
        const { topic } = req.query;
        
        if (!topic || topic.trim().length < 2) {
            return res.status(400).json({
                error: 'Please provide a valid topic to learn',
                example: '/api/learn?topic=python+functions'
            });
        }
        
        const cleanTopic = topic.trim();
        
        // Check rate limit
        if (!canMakeRequest()) {
            return res.status(429).json({
                error: 'Learning limit reached',
                message: 'Free tier allows 60 requests per minute. Please wait a moment.',
                limit: MAX_REQUESTS + ' requests/minute'
            });
        }
        
        // Check AI availability
        if (!model) {
            return res.status(503).json({
                error: 'Learning AI not ready',
                solution: 'Add GEMINI_API_KEY to .env file',
                get_key: 'https://makersuite.google.com/app/apikey'
            });
        }
        
        // Generate learning content
        const learningGuide = await generateLearningContent(cleanTopic);
        
        res.json({
            success: true,
            topic: cleanTopic,
            guide: learningGuide,
            tips: [
                'Read the explanation carefully',
                'Start with beginner task',
                'Use hints when stuck',
                'Practice regularly'
            ]
        });
        
    } catch (error) {
        console.error('Learning endpoint error:', error);
        
        res.status(500).json({
            error: 'Failed to create learning guide',
            fallback: getFallbackLearningGuide(req.query.topic || 'general topic'),
            message: 'Try again with a different topic'
        });
    }
});

// Simple health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        ai: model ? 'ready' : 'not configured',
        requests_this_minute: requests.length,
        limit: MAX_REQUESTS + ' per minute'
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Start server
app.listen(PORT, () => {
    console.log(`
    🎓 LEARNLAB - Clear Learning Platform
    =====================================
    📚 URL: http://localhost:${PORT}
    🤖 AI: ${model ? 'Ready for teaching' : 'Setup needed'}
    ⚡ Limit: ${MAX_REQUESTS} requests/minute
    
    ${!model ? `
    🔧 SETUP:
    1. Get free key: https://makersuite.google.com/app/apikey
    2. Add to .env: GEMINI_API_KEY=your_key
    3. Restart server
    ` : '✅ Ready! Try learning something new!'}
    
    💡 EXAMPLE TOPICS:
    • python functions
    • photosynthesis 
    • machine learning basics
    • how computers work
    • supply and demand
    `);
});

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n📚 Closing LearnLab...');
    console.log(`Total learning sessions: ${requests.length}`);
    process.exit(0);
});
