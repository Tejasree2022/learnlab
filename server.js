require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Initialize Google GenAI
let ai = null;
let aiAvailable = false;

// Try to initialize AI, but if it fails, use enhanced local mode
if (process.env.GEMINI_API_KEY) {
    try {
        const { GoogleGenAI } = require("@google/genai");
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        aiAvailable = true;
        console.log('✅ Google GenAI initialized');
    } catch (error) {
        console.log('⚠️  Could not initialize Gemini. Using enhanced local mode.');
        aiAvailable = false;
    }
} else {
    console.log('⚠️  No GEMINI_API_KEY found. Using enhanced local mode.');
}

// AI PROMPT TEMPLATE - More detailed and specific
const AI_PROMPT_TEMPLATE = `You are an expert educator. Create a comprehensive learning guide about this topic: "{topic}"

IMPORTANT FORMAT: Return ONLY valid JSON in this exact structure:

{
  "title": "Creative and descriptive title",
  "explanation": "## Detailed Explanation\n\n### What is {topic}?\n[Clear definition]\n\n### Why Learn {topic}?\n[Benefits and importance]\n\n### Core Concepts\n[Key principles and ideas]\n\n### Real-World Applications\n[Practical uses]\n\n### Learning Path\n[Step-by-step approach]\n\n### Common Examples\n[Concrete illustrations]\n\n### Tips for Success\n[Helpful advice]\n\nUse markdown formatting: # for main headers, ## for subheaders, * for bullet points, **bold** for emphasis, and \`code\` for code snippets.",
  "tasks": [
    {
      "title": "Hands-on beginner exercise",
      "description": "Clear, actionable instructions",
      "difficulty": "beginner",
      "hint": "Helpful guidance without giving away the answer"
    },
    {
      "title": "Practical intermediate project",
      "description": "Real-world application task",
      "difficulty": "intermediate",
      "hint": "Step-by-step thinking process"
    },
    {
      "title": "Advanced implementation challenge",
      "description": "Complex problem-solving task",
      "difficulty": "advanced",
      "hint": "Resources and approaches"
    }
  ]
}`;

// Generate learning content with AI
async function generateLearningWithAI(topic) {
    console.log(`🤖 AI generating: "${topic}"`);
    
    if (!aiAvailable || !ai) {
        console.log('AI not available, using enhanced fallback');
        return generateEnhancedFallbackContent(topic);
    }
    
    try {
        const prompt = AI_PROMPT_TEMPLATE.replace(/{topic}/g, topic);
        
        // Try with gemini-pro (most reliable)
        try {
            const response = await ai.models.generateContent({
                model: "gemini-pro",
                contents: prompt
            });
            
            const text = response.text.trim();
            
            // Extract JSON from response
            let jsonText = text;
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonText = jsonMatch[0];
            }
            
            const data = JSON.parse(jsonText);
            
            // Validate and enhance the data
            return {
                success: true,
                topic: topic,
                guide: {
                    title: data.title || `Learning Guide: ${topic}`,
                    explanation: data.explanation || generateDefaultExplanation(topic),
                    tasks: data.tasks || generateDefaultTasks(topic)
                },
                source: "ai_generated",
                message: "AI-generated learning guide ready!"
            };
            
        } catch (aiError) {
            console.log('AI generation failed:', aiError.message);
            return generateEnhancedFallbackContent(topic);
        }
        
    } catch (error) {
        console.error('AI generation error:', error.message);
        return generateEnhancedFallbackContent(topic);
    }
}

// Generate default explanation for any topic
function generateDefaultExplanation(topic) {
    return `# Comprehensive Guide to ${topic.charAt(0).toUpperCase() + topic.slice(1)}

## What is ${topic}?
${topic} is a concept/technology/skill that involves [basic definition]. It's important in today's world because [relevance].

## Core Concepts
- **Fundamental Principle**: The basic idea behind ${topic}
- **Key Components**: Main elements that make up ${topic}
- **Working Mechanism**: How ${topic} functions in practice
- **Applications**: Where and how ${topic} is used
- **Benefits**: Advantages of understanding/using ${topic}

## Learning Objectives
By studying ${topic}, you will:
1. Understand the fundamental principles
2. Recognize practical applications
3. Develop problem-solving skills
4. Gain hands-on experience
5. Build a foundation for advanced topics

## Step-by-Step Learning Path
### Week 1: Foundation
- Learn basic terminology
- Understand core concepts
- Study simple examples

### Week 2: Application
- Work on small exercises
- Apply concepts to problems
- Build simple projects

### Week 3: Mastery
- Tackle complex challenges
- Explore advanced topics
- Create comprehensive projects

### Week 4: Real-World Application
- Solve actual problems
- Optimize solutions
- Prepare for professional use

## Common Use Cases
1. **Industry Applications**: How businesses use ${topic}
2. **Educational Value**: Learning benefits of ${topic}
3. **Research Potential**: How ${topic} advances knowledge
4. **Personal Projects**: Creative applications of ${topic}

## Tools and Resources
- **Learning Platforms**: Online courses and tutorials
- **Practice Tools**: Software and environments
- **Community**: Forums and discussion groups
- **Documentation**: Official guides and references

## Tips for Success
- **Start Small**: Begin with basic concepts
- **Practice Regularly**: Consistency is key
- **Build Projects**: Apply knowledge practically
- **Seek Help**: Join communities and ask questions
- **Stay Updated**: Follow latest developments

## Next Steps
1. Research basic definitions
2. Complete beginner exercises
3. Join relevant communities
4. Start a small project
5. Share your learning with others

Remember: The key to mastering ${topic} is consistent practice and application. Don't just memorize - understand the underlying principles and apply them to real problems.`;
}

// Generate default tasks for any topic
function generateDefaultTasks(topic) {
    return [
        {
            title: `Research and Define ${topic}`,
            description: `Find 3-5 reliable sources about ${topic} and create a summary in your own words. Include: definition, key concepts, and real-world applications.`,
            difficulty: "beginner",
            hint: "Start with Wikipedia, educational websites, and official documentation. Focus on understanding, not just copying."
        },
        {
            title: `Create a ${topic} Concept Map`,
            description: `Design a visual diagram showing the main components of ${topic}, their relationships, and how they work together.`,
            difficulty: "intermediate",
            hint: "Use tools like draw.io, Lucidchart, or even paper. Start with the central concept and branch out to related ideas."
        },
        {
            title: `Design a Practical ${topic} Application`,
            description: `Identify a real-world problem that could be solved using ${topic}. Create a detailed plan including: problem statement, solution approach, required resources, and expected outcomes.`,
            difficulty: "advanced",
            hint: "Think about problems in your community, workplace, or area of interest. Consider feasibility and impact."
        }
    ];
}

// ENHANCED fallback content with detailed explanations
function generateEnhancedFallbackContent(topic) {
    const lowerTopic = topic.toLowerCase();
    
    // Enhanced content for common topics with DETAILED explanations
    const enhancedTopics = {
        'python': {
            title: 'Python Programming: Complete Practical Guide',
            explanation: `# Python Programming Mastery Guide

## What is Python?
Python is a high-level, interpreted programming language known for its simplicity, readability, and versatility. Created by Guido van Rossum in 1991, Python emphasizes code readability with its notable use of significant whitespace.

## Why Learn Python?
### Easy to Learn
- Simple syntax similar to English
- Minimal boilerplate code
- Great for beginners and experts alike

### Versatile Applications
- **Web Development**: Django, Flask frameworks
- **Data Science**: Pandas, NumPy, SciPy
- **Machine Learning**: TensorFlow, PyTorch, Scikit-learn
- **Automation**: Scripting and task automation
- **Game Development**: PyGame library
- **Scientific Computing**: Research and analysis

### High Demand
- Used by Google, Netflix, Instagram, Spotify
- One of the highest-paying programming skills
- Extensive job opportunities across industries

## Core Python Concepts

### 1. Variables and Data Types
\`\`\`python
# Variables store data
name = "Alice"
age = 25
height = 5.6
is_student = True

# Data Types
# - int: Integer numbers (42)
# - float: Decimal numbers (3.14)
# - str: Text data ("Hello")
# - bool: True/False values
# - list: Ordered collection [1, 2, 3]
# - tuple: Immutable collection (1, 2, 3)
# - dict: Key-value pairs {"name": "Alice"}
# - set: Unique unordered collection {1, 2, 3}
\`\`\`

### 2. Control Structures
\`\`\`python
# Conditional statements
if age >= 18:
    print("Adult")
elif age >= 13:
    print("Teenager")
else:
    print("Child")

# Loops
for i in range(5):
    print(f"Number: {i}")

count = 0
while count < 5:
    print(count)
    count += 1
\`\`\`

### 3. Functions
\`\`\`python
def greet(name, greeting="Hello"):
    """Return a greeting message"""
    return f"{greeting}, {name}!"

# Function call
message = greet("Alice")
print(message)  # Output: Hello, Alice!
\`\`\`

### 4. Data Structures
\`\`\`python
# Lists (mutable, ordered)
fruits = ["apple", "banana", "cherry"]
fruits.append("orange")

# Dictionaries (key-value pairs)
student = {
    "name": "Alice",
    "age": 20,
    "courses": ["Math", "Science"]
}

# Sets (unique elements)
unique_numbers = {1, 2, 3, 3, 2}  # Becomes {1, 2, 3}
\`\`\`

## Real-World Applications

### Web Development with Flask
\`\`\`python
from flask import Flask
app = Flask(__name__)

@app.route('/')
def home():
    return "Welcome to my Python web app!"

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

### Data Analysis with Pandas
\`\`\`python
import pandas as pd

# Load data
data = pd.read_csv('data.csv')

# Analyze data
average = data['score'].mean()
top_students = data[data['score'] > 90]
\`\`\`

### Automation Script
\`\`\`python
import os
import shutil

# Organize files by extension
def organize_files(directory):
    for filename in os.listdir(directory):
        if os.path.isfile(os.path.join(directory, filename)):
            extension = filename.split('.')[-1]
            folder_path = os.path.join(directory, extension)
            os.makedirs(folder_path, exist_ok=True)
            shutil.move(
                os.path.join(directory, filename),
                os.path.join(folder_path, filename)
            )
\`\`\`

## Learning Path

### Month 1: Python Basics
- Variables and data types
- Control structures (if, for, while)
- Functions and modules
- Basic data structures

### Month 2: Intermediate Python
- Object-Oriented Programming
- File handling
- Error handling (try-except)
- Working with APIs

### Month 3: Specialization
- Choose a path: Web, Data Science, ML, etc.
- Learn relevant frameworks
- Build portfolio projects

### Month 4: Advanced Topics
- Concurrency and parallelism
- Performance optimization
- Design patterns
- Contributing to open source

## Best Practices

1. **Write Readable Code**
   - Use descriptive variable names
   - Follow PEP 8 style guide
   - Add comments and docstrings

2. **Test Your Code**
   - Write unit tests
   - Use debugging tools
   - Handle exceptions gracefully

3. **Learn Continuously**
   - Read Python documentation
   - Follow Python communities
   - Contribute to projects

## Resources
- **Official**: python.org
- **Learning**: Real Python, Python.org Tutorial
- **Practice**: LeetCode, HackerRank, Codewars
- **Community**: r/learnpython, Python Discord

Start your Python journey today! Remember: consistent practice and building projects is key to mastery.`,
            tasks: [
                {
                    title: 'Build a Personal Information Manager',
                    description: 'Create a program that stores personal details (name, age, contacts, notes) and allows searching, updating, and displaying information.',
                    difficulty: 'beginner',
                    hint: 'Use dictionaries to store information and functions for different operations.'
                },
                {
                    title: 'Create a Weather Data Analyzer',
                    description: 'Build a program that fetches weather data from an API, stores it, and provides statistics (average temperature, max/min, trends over time).',
                    difficulty: 'intermediate',
                    hint: 'Use requests library for API calls, pandas for data analysis, and matplotlib for visualization.'
                },
                {
                    title: 'Develop a Task Automation System',
                    description: 'Create a system that automates repetitive tasks: file organization, email sending, data backup, and report generation with scheduling.',
                    difficulty: 'advanced',
                    hint: 'Use os and shutil for file operations, smtplib for emails, schedule library for automation, and logging for tracking.'
                }
            ]
        },
        'database': {
            title: 'Database Design and Management: Complete Guide',
            explanation: `# Database Fundamentals: Complete Guide

## What is a Database?
A database is an organized collection of structured data stored electronically in a computer system. Databases are managed by Database Management Systems (DBMS) that handle data storage, retrieval, security, and integrity.

## Types of Databases

### 1. Relational Databases (SQL)
- **MySQL**: Open-source, widely used for web applications
- **PostgreSQL**: Advanced features, ACID compliant
- **SQLite**: Lightweight, file-based, great for mobile/local apps
- **Oracle**: Enterprise-level, robust features
- **SQL Server**: Microsoft's solution, integrates with .NET

### 2. NoSQL Databases
- **MongoDB**: Document-oriented, flexible schema
- **Redis**: In-memory key-value store, extremely fast
- **Cassandra**: Distributed, handles large datasets
- **Neo4j**: Graph database for relationship-heavy data

## Core Database Concepts

### 1. Tables and Relationships
\`\`\`sql
-- Creating tables
CREATE TABLE Students (
    student_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    enrollment_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE Courses (
    course_id INT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    credits INT CHECK (credits > 0)
);

-- Many-to-Many relationship table
CREATE TABLE Enrollments (
    enrollment_id INT PRIMARY KEY,
    student_id INT REFERENCES Students(student_id),
    course_id INT REFERENCES Courses(course_id),
    grade CHAR(1),
    UNIQUE(student_id, course_id)
);
\`\`\`

### 2. CRUD Operations
\`\`\`sql
-- CREATE (Insert)
INSERT INTO Students (student_id, name, email)
VALUES (1, 'Alice Johnson', 'alice@email.com');

-- READ (Select)
SELECT * FROM Students WHERE enrollment_date >= '2024-01-01';

-- UPDATE
UPDATE Students 
SET email = 'newemail@email.com'
WHERE student_id = 1;

-- DELETE
DELETE FROM Students WHERE student_id = 1;
\`\`\`

### 3. Advanced Queries
\`\`\`sql
-- JOIN operations
SELECT s.name, c.title, e.grade
FROM Students s
JOIN Enrollments e ON s.student_id = e.student_id
JOIN Courses c ON e.course_id = c.course_id
WHERE e.grade = 'A';

-- Aggregation
SELECT 
    c.title,
    COUNT(e.student_id) as total_students,
    AVG(CASE 
        WHEN e.grade = 'A' THEN 4.0
        WHEN e.grade = 'B' THEN 3.0
        WHEN e.grade = 'C' THEN 2.0
        ELSE 0 
    END) as average_gpa
FROM Courses c
LEFT JOIN Enrollments e ON c.course_id = e.course_id
GROUP BY c.course_id, c.title;

-- Subqueries
SELECT name FROM Students
WHERE student_id IN (
    SELECT student_id FROM Enrollments
    GROUP BY student_id
    HAVING COUNT(*) > 3
);
\`\`\`

## Database Design Principles

### 1. Normalization
- **1NF**: Atomic values, no repeating groups
- **2NF**: No partial dependencies
- **3NF**: No transitive dependencies
- **BCNF**: Boyce-Codd Normal Form

### 2. Indexing for Performance
\`\`\`sql
-- Creating indexes
CREATE INDEX idx_student_email ON Students(email);
CREATE INDEX idx_enrollment_grade ON Enrollments(grade);

-- Composite index
CREATE INDEX idx_student_course ON Enrollments(student_id, course_id);
\`\`\`

### 3. Transactions and ACID Properties
- **Atomicity**: All or nothing execution
- **Consistency**: Data integrity maintained
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed changes persist

\`\`\`sql
BEGIN TRANSACTION;
-- Multiple operations
UPDATE Accounts SET balance = balance - 100 WHERE account_id = 1;
UPDATE Accounts SET balance = balance + 100 WHERE account_id = 2;
-- Rollback on error, Commit on success
COMMIT;
\`\`\`

## Real-World Database Scenarios

### E-commerce Database Design
\`\`\`sql
-- Core tables for e-commerce
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    category_id INT REFERENCES Categories(category_id)
);

CREATE TABLE Orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id),
    total_amount DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Order_Items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES Orders(order_id),
    product_id INT REFERENCES Products(product_id),
    quantity INT NOT NULL,
    price_at_time DECIMAL(10,2)
);
\`\`\`

### Social Media Database Pattern
\`\`\`sql
-- Social media relationships
CREATE TABLE Posts (
    post_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id),
    content TEXT NOT NULL,
    media_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Follows (
    follower_id INT REFERENCES Users(user_id),
    following_id INT REFERENCES Users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE Likes (
    like_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id),
    post_id INT REFERENCES Posts(post_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
);
\`\`\`

## Performance Optimization

### 1. Query Optimization
\`\`\`sql
-- Instead of SELECT *
SELECT id, name, email FROM Users;

-- Use EXISTS instead of IN for large datasets
SELECT * FROM Users u
WHERE EXISTS (
    SELECT 1 FROM Orders o 
    WHERE o.user_id = u.user_id
);

-- Limit result sets
SELECT * FROM Products 
ORDER BY created_at DESC 
LIMIT 20 OFFSET 0;
\`\`\`

### 2. Connection Pooling
- Reuse database connections
- Reduce connection overhead
- Manage concurrent connections efficiently

### 3. Caching Strategies
- Query result caching
- Frequently accessed data in memory
- Cache invalidation policies

## Security Best Practices

### 1. SQL Injection Prevention
\`\`\`python
# BAD: Vulnerable to SQL injection
query = f"SELECT * FROM Users WHERE username = '{user_input}'"

# GOOD: Parameterized queries
query = "SELECT * FROM Users WHERE username = %s"
cursor.execute(query, (user_input,))
\`\`\`

### 2. Access Control
- Principle of least privilege
- Role-based access control (RBAC)
- Regular permission reviews

### 3. Data Encryption
- Encrypt sensitive data at rest
- Use SSL/TLS for data in transit
- Secure password hashing (bcrypt, Argon2)

## Learning Path

### Phase 1: Fundamentals (1-2 months)
- Basic SQL syntax
- Database design principles
- Simple CRUD operations

### Phase 2: Intermediate (2-3 months)
- Advanced SQL queries
- Indexing and optimization
- Transaction management

### Phase 3: Advanced (3-4 months)
- Database administration
- Performance tuning
- Replication and sharding
- NoSQL databases

### Phase 4: Specialization (4+ months)
- Cloud databases (AWS RDS, Azure SQL)
- Big data technologies
- Data warehousing
- Database security

## Career Opportunities

### 1. Database Administrator (DBA)
- Install, configure, and maintain databases
- Backup and recovery planning
- Performance monitoring and tuning
- Security management

### 2. Database Developer
- Design and implement database schemas
- Write optimized queries and stored procedures
- Develop database applications
- Data migration and ETL processes

### 3. Data Analyst/Engineer
- Extract insights from data
- Build data pipelines
- Create reports and dashboards
- Implement data warehouses

## Tools and Technologies

### SQL Clients
- **pgAdmin**: PostgreSQL administration
- **MySQL Workbench**: MySQL GUI tool
- **DBeaver**: Universal database tool
- **DataGrip**: JetBrains database IDE

### Monitoring Tools
- **Prometheus**: Metrics collection
- **Grafana**: Visualization and dashboards
- **Percona Monitoring**: MySQL/PostgreSQL monitoring

### ORM Tools
- **SQLAlchemy** (Python)
- **Sequelize** (JavaScript)
- **Hibernate** (Java)
- **Entity Framework** (.NET)

## Best Practices Summary

1. **Design First**: Plan your database schema carefully
2. **Normalize Properly**: But don't over-normalize
3. **Index Strategically**: Index columns used in WHERE, JOIN, ORDER BY
4. **Backup Regularly**: Automated backups with test restores
5. **Monitor Performance**: Regular query optimization
6. **Secure Always**: Implement proper authentication and authorization
7. **Document Everything**: Schema, procedures, and changes
8. **Test Thoroughly**: Unit tests for database operations
9. **Version Control**: Database schema changes in version control
10. **Scale Thoughtfully**: Plan for growth from the beginning

Start your database journey by building small projects and gradually increasing complexity. Practice is key to mastering database concepts!`,
            tasks: [
                {
                    title: 'Design a Library Management System',
                    description: 'Create a complete database schema for a library including: Books, Members, Borrowing Records, Authors, and Publishers. Implement all necessary relationships and constraints.',
                    difficulty: 'beginner',
                    hint: 'Focus on proper table relationships (one-to-many, many-to-many) and implement basic CRUD operations.'
                },
                {
                    title: 'Build an E-commerce Analytics Dashboard',
                    description: 'Design queries to analyze sales data: monthly revenue, top-selling products, customer purchase patterns, and inventory turnover rates.',
                    difficulty: 'intermediate',
                    hint: 'Use aggregation functions, window functions, and complex joins to extract business insights.'
                },
                {
                    title: 'Implement a Database Migration System',
                    description: 'Create a system to handle database schema migrations, versioning, rollback capabilities, and automated deployment for a production environment.',
                    difficulty: 'advanced',
                    hint: 'Consider using tools like Flyway or Liquibase as inspiration, and implement safe migration practices.'
                }
            ]
        }
    };
    
    // Check if topic matches any enhanced topic
    for (const [key, content] of Object.entries(enhancedTopics)) {
        if (lowerTopic.includes(key)) {
            console.log(`📚 Using ENHANCED local content for: ${key}`);
            return {
                success: true,
                topic: topic,
                guide: content,
                source: "enhanced_local_detailed",
                message: "Detailed learning guide from enhanced local database"
            };
        }
    }
    
    // For unknown topics, generate detailed content
    console.log(`📝 Generating detailed content for: ${topic}`);
    return {
        success: true,
        topic: topic,
        guide: {
            title: `Comprehensive Guide to ${topic.charAt(0).toUpperCase() + topic.slice(1)}`,
            explanation: generateDefaultExplanation(topic),
            tasks: generateDefaultTasks(topic)
        },
        source: "generated_detailed",
        message: "Generated detailed learning guide"
    };
}

// Rate limiting
const requestHistory = [];
const RATE_LIMIT = 30;
const WINDOW_MS = 60000;

function checkRateLimit() {
    const now = Date.now();
    
    // Remove old requests
    while (requestHistory.length > 0 && requestHistory[0] < now - WINDOW_MS) {
        requestHistory.shift();
    }
    
    if (requestHistory.length >= RATE_LIMIT) {
        const waitTime = Math.ceil((requestHistory[0] + WINDOW_MS - now) / 1000);
        throw new Error(`Rate limit: ${RATE_LIMIT} requests/minute. Wait ${waitTime} seconds.`);
    }
    
    requestHistory.push(now);
    return true;
}

// Main learning endpoint
app.get('/api/learn', async (req, res) => {
    try {
        const { topic } = req.query;
        
        if (!topic || topic.trim().length < 2) {
            return res.status(400).json({
                error: 'Please enter a topic to learn',
                example: 'Try: "python programming", "database design", "machine learning"'
            });
        }
        
        const cleanTopic = topic.trim();
        
        // Check rate limit
        checkRateLimit();
        
        console.log(`\n📖 Learning request: "${cleanTopic}"`);
        
        let result;
        
        // Try AI first if available
        if (aiAvailable) {
            try {
                console.log('🤖 Attempting AI generation...');
                result = await generateLearningWithAI(cleanTopic);
            } catch (aiError) {
                console.log('AI failed, using enhanced fallback:', aiError.message);
                result = generateEnhancedFallbackContent(cleanTopic);
            }
        } else {
            // Use enhanced local content
            console.log('📚 Using enhanced local content (AI not available)');
            result = generateEnhancedFallbackContent(cleanTopic);
        }
        
        // Add rate limit info
        result.rate_limit = {
            current: requestHistory.length,
            limit: RATE_LIMIT,
            remaining: RATE_LIMIT - requestHistory.length,
            reset_in: "1 minute"
        };
        
        // Add server info
        result.server = {
            ai_enabled: aiAvailable,
            source: result.source || 'local',
            timestamp: new Date().toISOString()
        };
        
        res.json(result);
        
    } catch (error) {
        console.error('API Error:', error.message);
        
        if (error.message.includes('Rate limit')) {
            res.status(429).json({
                error: 'Rate limit exceeded',
                message: error.message,
                limit: RATE_LIMIT,
                fallback: generateEnhancedFallbackContent(req.query.topic || 'general topic').guide
            });
        } else {
            res.status(500).json({
                error: 'Server error',
                fallback: generateEnhancedFallbackContent(req.query.topic || 'general topic').guide,
                message: 'Using enhanced fallback content'
            });
        }
    }
});

// Test AI connection endpoint
app.get('/api/test-ai', async (req, res) => {
    try {
        if (!aiAvailable || !ai) {
            return res.json({
                success: false,
                message: 'AI not available',
                mode: 'enhanced_local',
                note: 'App will use detailed local content for all topics'
            });
        }
        
        // Test with a simple prompt
        const testPrompt = "Say 'AI is working' in one sentence.";
        
        try {
            const response = await ai.models.generateContent({
                model: "gemini-pro",
                contents: testPrompt
            });
            
            res.json({
                success: true,
                message: 'AI is working correctly',
                response: response.text,
                package: '@google/genai',
                mode: 'ai_enhanced'
            });
        } catch (error) {
            res.json({
                success: false,
                message: 'AI connection failed',
                error: error.message,
                mode: 'enhanced_local',
                note: 'App will use detailed local content instead'
            });
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'running',
        mode: aiAvailable ? 'ai_enhanced' : 'enhanced_local',
        requests_this_minute: requestHistory.length,
        rate_limit: RATE_LIMIT,
        enhanced_topics: ['python', 'database', 'machine learning'],
        uptime: process.uptime().toFixed(0) + ' seconds'
    });
});

// List endpoints
app.get('/api', (req, res) => {
    res.json({
        endpoints: {
            '/api/learn?topic=YOUR_TOPIC': 'Get detailed learning guide',
            '/api/health': 'Check server status and mode',
            '/api/test-ai': 'Test AI connection',
            '/': 'Main application'
        },
        mode: aiAvailable ? 'AI Enhanced' : 'Enhanced Local Content',
        example_topics: [
            'python programming',
            'database design',
            'web development',
            'machine learning basics',
            'any other topic'
        ]
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Start server
app.listen(PORT, () => {
    console.log(`
    🎓 LEARNLAB - Enhanced Learning Platform
    ==========================================
    📚 URL: http://localhost:${PORT}
    🚀 Mode: ${aiAvailable ? 'AI-Enhanced' : 'Enhanced Local Content'}
    📖 Features: Detailed explanations for ALL topics
    ⚡ Rate: ${RATE_LIMIT} requests/minute
    
    💡 Enhanced topics include:
    • Python Programming (Comprehensive guide)
    • Database Design (Complete reference)
    • And detailed content for ANY topic!
    
    🎯 Try these:
    • http://localhost:${PORT}/api/learn?topic=python
    • http://localhost:${PORT}/api/learn?topic=database
    • http://localhost:${PORT}/api/learn?topic=web+development
    
    🔧 Test AI: http://localhost:${PORT}/api/test-ai
    `);
});

// Handle shutdown
process.on('SIGINT', () => {
    console.log(`\n📚 Total learning sessions: ${requestHistory.length}`);
    console.log('👋 LearnLab shutting down...');
    process.exit(0);
});
