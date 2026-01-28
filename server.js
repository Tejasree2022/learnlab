require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'learnlab',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

// Initialize database
async function initializeDatabase() {
    try {
        // Create tables if they don't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS topics (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                slug VARCHAR(200) UNIQUE NOT NULL,
                stream VARCHAR(50),
                category VARCHAR(100),
                explanation TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
                title VARCHAR(200) NOT NULL,
                description TEXT NOT NULL,
                difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
                hint TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Insert sample data if empty
        const topicsCount = await pool.query('SELECT COUNT(*) FROM topics');
        if (parseInt(topicsCount.rows[0].count) === 0) {
            await insertSampleData();
        }
        
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
    }
}

// Insert sample topics and tasks
async function insertSampleData() {
    const sampleTopics = [
        {
            title: "Python Functions",
            slug: "python-functions",
            stream: "cse",
            category: "programming",
            explanation: "Functions in Python are reusable blocks of code that perform specific tasks. They help organize code, avoid repetition, and make programs easier to understand. You define a function using 'def' keyword followed by function name and parentheses. Inside the parentheses, you can include parameters (inputs). The function body is indented and can return a value using 'return' statement.",
            tasks: [
                {
                    title: "Define a simple function",
                    description: "Create a function called 'greet' that takes a name as parameter and prints 'Hello, [name]!'",
                    difficulty: "beginner",
                    hint: "Use def greet(name): and print statement inside"
                },
                {
                    title: "Function with return value",
                    description: "Write a function 'square' that takes a number and returns its square",
                    difficulty: "beginner",
                    hint: "return num * num"
                },
                {
                    title: "Multiple parameters",
                    description: "Create a function 'calculate_area' that takes length and width, returns area of rectangle",
                    difficulty: "intermediate",
                    hint: "Area = length × width"
                }
            ]
        },
        {
            title: "Ohm's Law",
            slug: "ohms-law",
            stream: "ece",
            category: "electronics",
            explanation: "Ohm's Law states that the current through a conductor between two points is directly proportional to the voltage across the two points. The formula is V = I × R, where V is voltage in volts, I is current in amperes, and R is resistance in ohms. This fundamental law helps calculate voltage, current, or resistance when the other two values are known. It applies to many electrical circuits and is essential for circuit analysis.",
            tasks: [
                {
                    title: "Calculate voltage",
                    description: "If current is 2A and resistance is 3Ω, find voltage using Ohm's Law",
                    difficulty: "beginner",
                    hint: "V = I × R"
                },
                {
                    title: "Find resistance",
                    description: "A circuit has 12V voltage and 0.5A current. What is the resistance?",
                    difficulty: "beginner",
                    hint: "R = V ÷ I"
                },
                {
                    title: "Real circuit problem",
                    description: "A light bulb has resistance of 240Ω. If it's connected to 120V supply, what current flows through it?",
                    difficulty: "intermediate",
                    hint: "First find I, then check if it's reasonable"
                }
            ]
        },
        {
            title: "Photosynthesis",
            slug: "photosynthesis",
            stream: "science",
            category: "biology",
            explanation: "Photosynthesis is the process by which plants, algae, and some bacteria convert light energy into chemical energy in the form of glucose (sugar). The basic equation is: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂. This means carbon dioxide and water, using sunlight, produce glucose and oxygen. The process occurs in chloroplasts, which contain chlorophyll - the green pigment that captures light. Photosynthesis is crucial for life on Earth as it produces oxygen and forms the base of the food chain.",
            tasks: [
                {
                    title: "Identify inputs and outputs",
                    description: "What are the inputs (reactants) and outputs (products) of photosynthesis?",
                    difficulty: "beginner",
                    hint: "Look at the equation"
                },
                {
                    title: "Role of chlorophyll",
                    description: "Explain why leaves are green and what happens to chlorophyll in autumn",
                    difficulty: "intermediate",
                    hint: "Chlorophyll absorbs certain colors of light"
                },
                {
                    title: "Real-world application",
                    description: "How does understanding photosynthesis help in agriculture?",
                    difficulty: "advanced",
                    hint: "Think about plant growth factors"
                }
            ]
        }
    ];

    for (const topic of sampleTopics) {
        // Insert topic
        const topicResult = await pool.query(
            'INSERT INTO topics (title, slug, stream, category, explanation) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [topic.title, topic.slug, topic.stream, topic.category, topic.explanation]
        );
        
        const topicId = topicResult.rows[0].id;
        
        // Insert tasks for this topic
        for (const task of topic.tasks) {
            await pool.query(
                'INSERT INTO tasks (topic_id, title, description, difficulty, hint) VALUES ($1, $2, $3, $4, $5)',
                [topicId, task.title, task.description, task.difficulty, task.hint]
            );
        }
    }
    
    console.log('📝 Sample data inserted');
}

// API endpoint: Search topics
app.get('/api/topic', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        // Search for topic (simple search by title or slug)
        const topicResult = await pool.query(
            `SELECT * FROM topics 
             WHERE title ILIKE $1 OR slug ILIKE $2 
             LIMIT 1`,
            [`%${q}%`, `%${q}%`]
        );
        
        if (topicResult.rows.length === 0) {
            // Return a simple generated response if topic not found
            return res.json({
                title: q.charAt(0).toUpperCase() + q.slice(1),
                explanation: `I'll help you learn about "${q}". This topic covers important concepts that are useful to understand. Start by researching basic definitions and gradually move to advanced applications.`,
                tasks: [
                    {
                        title: "Research basic definition",
                        description: `Find 3 different definitions of "${q}" from reliable sources`,
                        difficulty: "beginner",
                        hint: "Check textbooks or educational websites"
                    },
                    {
                        title: "Find real-world examples",
                        description: `List 5 practical applications or examples of "${q}"`,
                        difficulty: "intermediate",
                        hint: "Look for case studies or news articles"
                    },
                    {
                        title: "Teach someone",
                        description: `Explain "${q}" to a friend as if they're hearing about it for the first time`,
                        difficulty: "advanced",
                        hint: "Use simple analogies and avoid jargon"
                    }
                ],
                related_topics: ["Basic concepts", "Practical applications", "Advanced theories"]
            });
        }
        
        const topic = topicResult.rows[0];
        
        // Get tasks for this topic
        const tasksResult = await pool.query(
            'SELECT title, description, difficulty, hint FROM tasks WHERE topic_id = $1',
            [topic.id]
        );
        
        res.json({
            title: topic.title,
            explanation: topic.explanation,
            tasks: tasksResult.rows,
            stream: topic.stream,
            category: topic.category,
            related_topics: ["Related concept 1", "Related concept 2", "Related concept 3"]
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint: Add new topic (for admin)
app.post('/api/topic', async (req, res) => {
    try {
        const { title, explanation, tasks, stream, category } = req.body;
        
        if (!title || !explanation) {
            return res.status(400).json({ error: 'Title and explanation are required' });
        }
        
        // Create slug from title
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        // Insert topic
        const topicResult = await pool.query(
            'INSERT INTO topics (title, slug, explanation, stream, category) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [title, slug, explanation, stream, category]
        );
        
        const topicId = topicResult.rows[0].id;
        
        // Insert tasks if provided
        if (tasks && Array.isArray(tasks)) {
            for (const task of tasks) {
                await pool.query(
                    'INSERT INTO tasks (topic_id, title, description, difficulty, hint) VALUES ($1, $2, $3, $4, $5)',
                    [topicId, task.title, task.description, task.difficulty, task.hint]
                );
            }
        }
        
        res.json({ 
            success: true, 
            message: 'Topic added successfully', 
            topicId 
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 API endpoint: http://localhost:${PORT}/api/topic?q=your-topic`);
    
    // Initialize database
    await initializeDatabase();
});

// Serve frontend
app.use(express.static('.'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
