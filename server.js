require('dotenv').config();
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===== MONGODB CONNECTION =====
const mongoURI = process.env.MONGO_URI;
if (mongoURI) {
    mongoose.connect(mongoURI)
      .then(() => console.log('✅ Connected to MongoDB Atlas'))
      .catch(err => console.error('❌ MongoDB Connection Error:', err.message));
} else {
    console.error('❌ Error: MONGO_URI environment variable is missing.');
    console.error('👉 Please set MONGO_URI in your Render dashboard (Environment Variables).');
}

// ===== MONGOOSE MODELS =====
const portfolioSchema = new mongoose.Schema({
    hero: Object,
    about: Object,
    skills: Array,
    experience: Array,
    projects: Array,
    services: Array,
    contact: Object
}, { strict: false });
const Portfolio = mongoose.model('Portfolio', portfolioSchema);

const messageSchema = new mongoose.Schema({
    id: String,
    name: String,
    email: String,
    subject: String,
    message: String,
    date: Date
});
const Message = mongoose.model('Message', messageSchema);

// ===== SEED DATABASE =====
async function seedDatabase() {
    try {
        const count = await Portfolio.countDocuments();
        if (count === 0) {
            console.log('Seeding initial portfolio data...');
            const fs = require('fs');
            const backupPath = path.join(__dirname, 'default_data.json');
            if (fs.existsSync(backupPath)) {
                const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
                await Portfolio.create(backupData);
                console.log('✅ Database seeded with default_data.json');
            }
        }
        
        // Also import messages.json into DB if it exists and DB is empty
        const msgCount = await Message.countDocuments();
        if (msgCount === 0) {
            const fs = require('fs');
            const messagesPath = path.join(__dirname, 'messages.json');
            if (fs.existsSync(messagesPath)) {
                const messagesData = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
                if (messagesData.length > 0) {
                    await Message.insertMany(messagesData);
                    console.log('✅ Database seeded with previous messages.json');
                }
            }
        }
    } catch(e) {
        console.error('Error during seeding:', e.message);
    }
}
mongoose.connection.once('open', seedDatabase);

// ===== AUTHENTICATION =====
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ success: false, error: 'Unauthorized' });

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Forbidden' });
        req.user = user;
        next();
    });
}

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const expectedUser = (process.env.ADMIN_USERNAME || 'admin').trim();
    const expectedPass = (process.env.ADMIN_PASSWORD || 'password123').trim();
    if (username === expectedUser && password === expectedPass) {
        const token = jwt.sign({ username }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '24h' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

app.post('/api/save', authenticateToken, async (req, res) => {
    try {
        const newData = req.body;
        
        if (mongoose.connection.readyState === 1) {
            await Portfolio.replaceOne({}, newData, { upsert: true });
        }
        
        const fs = require('fs');
        const backupPath = path.join(__dirname, 'default_data.json');
        fs.writeFileSync(backupPath, JSON.stringify(newData, null, 4));

        res.json({ success: true });
    } catch(err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/reset', authenticateToken, async (req, res) => {
    try {
        const fs = require('fs');
        const backupPath = path.join(__dirname, 'default_data.json');
        if (fs.existsSync(backupPath)) {
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            if (mongoose.connection.readyState === 1) {
                await Portfolio.replaceOne({}, backupData, { upsert: true });
            }

            res.json({ success: true, data: backupData });
        } else {
            res.json({ success: false, message: 'No backup found' });
        }
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== MESSAGES API =====
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ success: false, error: 'Name, email, and message are required.' });
        }
        
        const newMsg = {
            id: 'msg_' + Date.now(),
            name,
            email,
            subject: subject || 'No Subject',
            message,
            date: new Date()
        };
        
        if (mongoose.connection.readyState === 1) {
            await Message.create(newMsg);
        }
        
        const fs = require('fs');
        const msgsPath = path.join(__dirname, 'messages.json');
        let localMsgs = [];
        if (fs.existsSync(msgsPath)) {
            localMsgs = JSON.parse(fs.readFileSync(msgsPath, 'utf8'));
        }
        localMsgs.push(newMsg);
        fs.writeFileSync(msgsPath, JSON.stringify(localMsgs, null, 4));
        
        res.json({ success: true });
    } catch(err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/messages', authenticateToken, async (req, res) => {
    try {
        let messages = [];
        if (mongoose.connection.readyState === 1) {
            messages = await Message.find().sort({ date: -1 });
        } else {
            const fs = require('fs');
            const msgsPath = path.join(__dirname, 'messages.json');
            if (fs.existsSync(msgsPath)) {
                messages = JSON.parse(fs.readFileSync(msgsPath, 'utf8'));
                messages.sort((a,b) => new Date(b.date) - new Date(a.date));
            }
        }
        res.json({ success: true, data: messages });
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/messages/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (mongoose.connection.readyState === 1) {
            await Message.deleteOne({ id });
        }
        
        const fs = require('fs');
        const msgsPath = path.join(__dirname, 'messages.json');
        if (fs.existsSync(msgsPath)) {
            let localMsgs = JSON.parse(fs.readFileSync(msgsPath, 'utf8'));
            localMsgs = localMsgs.filter(m => m.id !== id);
            fs.writeFileSync(msgsPath, JSON.stringify(localMsgs, null, 4));
        }
        
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== REST API FOR PORTFOLIO DATA =====
app.get('/api/portfolio', async (req, res) => {
    try {
        let portfolioData = null;
        
        if (mongoose.connection.readyState === 1) {
            try {
                portfolioData = await Portfolio.findOne();
            } catch (dbErr) {
                console.error('DB query failed, falling back:', dbErr.message);
            }
        }
        
        if (!portfolioData) {
            const fs = require('fs');
            const backupPath = path.join(__dirname, 'default_data.json');
            if (fs.existsSync(backupPath)) {
                portfolioData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            } else {
                portfolioData = {};
            }
        }
        
        let cleanData = portfolioData._doc ? { ...portfolioData._doc } : portfolioData;
        delete cleanData._id;
        delete cleanData.__v;

        res.json({ success: true, data: cleanData });
    } catch(err) {
        console.error('Error fetching portfolio data:', err);
        res.status(500).json({ success: false, error: 'Failed to load data' });
    }
});

// Handle root route to serve the portfolio
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'portfolio.html'));
});

// IMPORTANT: Define this AFTER /data.js so express intercepts the request!
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('----------------------------------------------------');
    console.log('CMS Server is running with MongoDB Integrations!');
    console.log('Admin Dashboard: http://localhost:' + PORT + '/admin.html');
    console.log('Live Portfolio:  http://localhost:' + PORT + '/portfolio.html');
    console.log('----------------------------------------------------');
});
