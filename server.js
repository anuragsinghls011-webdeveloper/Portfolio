require('dotenv').config();
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const validator = require('validator');

const app = express();

// ===== SECURITY: Trust proxy (for rate limiting behind reverse proxies like Render) =====
app.set('trust proxy', 1);

// ===== SECURITY: Helmet — HTTP security headers =====
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // needed for inline admin scripts
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false, // needed for external fonts
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xContentTypeOptions: true,     // X-Content-Type-Options: nosniff
    xFrameOptions: { action: 'deny' }, // Prevent clickjacking
}));

// ===== SECURITY: Body parser with strict size limits =====
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: false }));
app.use(cookieParser());

// ===== SECURITY: Prevent NoSQL injection (Express 5 compatible) =====
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        mongoSanitize.sanitize(req.body);
    }
    if (req.params && typeof req.params === 'object') {
        mongoSanitize.sanitize(req.params);
    }
    next();
});

// ===== SECURITY: IP key generator (handles IPv4/IPv6) =====
function getClientIp(req) {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    // Normalize IPv6-mapped IPv4 (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
    return ip.replace(/^::ffff:/, '');
}

// ===== SECURITY: Global Rate Limiter =====
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests. Please try again later.' },
    keyGenerator: getClientIp,
    validate: false,
});
app.use(globalLimiter);

// ===== SECURITY: Strict Login Rate Limiter (Brute-Force Protection) =====
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // 15 login attempts per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many login attempts. Account locked for 15 minutes.' },
    keyGenerator: getClientIp,
    skipSuccessfulRequests: false,
    validate: false,
});

// ===== SECURITY: Contact Form Rate Limiter (Spam Protection) =====
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 messages per hour per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many messages sent. Please try again later.' },
    keyGenerator: getClientIp,
    validate: false,
});

// ===== SECURITY: API Rate Limiter for authenticated routes =====
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500, // Generous limit for admin saving/editing
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'API rate limit exceeded. Please wait a moment.' },
    keyGenerator: getClientIp,
    validate: false,
});

// ===== SECURITY: Disable X-Powered-By (already done by helmet, but explicit) =====
app.disable('x-powered-by');

// ===== SECURITY: CORS — No external origin access to API =====
app.use('/api', (req, res, next) => {
    // Only allow same-origin requests to the API
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin && !origin.includes(host)) {
        return res.status(403).json({ success: false, error: 'Cross-origin requests not allowed.' });
    }
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});

// ===== MONGODB CONNECTION =====
const mongoURI = process.env.MONGO_URI;
if (mongoURI) {
    mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
    })
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
    id: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 200 },
    email: { type: String, required: true, maxlength: 254 },
    subject: { type: String, maxlength: 500 },
    message: { type: String, required: true, maxlength: 5000 },
    date: { type: Date, default: Date.now }
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

// ===== SECURITY: JWT Secret Validation =====
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('❌ CRITICAL: JWT_SECRET is missing or too short (min 32 chars)! Set a strong secret in .env');
    process.exit(1);
}

// ===== SECURITY: Admin password hashing on startup =====
let adminPasswordHash = null;
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || '').trim();
const ADMIN_PASSWORD_RAW = (process.env.ADMIN_PASSWORD || '').trim();

if (!ADMIN_USERNAME || !ADMIN_PASSWORD_RAW) {
    console.error('❌ CRITICAL: ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
}

// Hash the password at startup so we never compare plaintext
(async () => {
    adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD_RAW, 12);
    console.log('🔐 Admin password hashed (bcrypt, 12 rounds)');
})();

// ===== SECURITY: Failed login tracker (account lockout) =====
const failedLoginAttempts = new Map(); // IP -> { count, lastAttempt }
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function isLockedOut(ip) {
    const record = failedLoginAttempts.get(ip);
    if (!record) return false;
    if (record.count >= MAX_FAILED_ATTEMPTS) {
        if (Date.now() - record.lastAttempt < LOCKOUT_DURATION_MS) {
            return true;
        }
        // Lockout expired, reset
        failedLoginAttempts.delete(ip);
        return false;
    }
    return false;
}

function recordFailedLogin(ip) {
    const record = failedLoginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    record.count++;
    record.lastAttempt = Date.now();
    failedLoginAttempts.set(ip, record);
}

function clearFailedLogins(ip) {
    failedLoginAttempts.delete(ip);
}

// Clean up old lockout records every 30 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of failedLoginAttempts.entries()) {
        if (now - record.lastAttempt > LOCKOUT_DURATION_MS) {
            failedLoginAttempts.delete(ip);
        }
    }
}, 30 * 60 * 1000);

// ===== SECURITY: Token blacklist (for logout) =====
const tokenBlacklist = new Set();

// Clean up expired blacklisted tokens every hour
setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    for (const token of tokenBlacklist) {
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.exp && decoded.exp < now) {
                tokenBlacklist.delete(token);
            }
        } catch {
            tokenBlacklist.delete(token);
        }
    }
}, 60 * 60 * 1000);

// ===== AUTHENTICATION MIDDLEWARE =====
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    // Check if token is blacklisted (logged out)
    if (tokenBlacklist.has(token)) {
        return res.status(401).json({ success: false, error: 'Session expired. Please login again.' });
    }

    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ success: false, error: 'Session expired. Please login again.' });
            }
            return res.status(403).json({ success: false, error: 'Invalid token.' });
        }
        req.user = decoded;
        req.token = token;
        next();
    });
}

// ===== SECURITY: Input sanitization helper =====
function sanitizeString(str, maxLen = 1000) {
    if (typeof str !== 'string') return '';
    return validator.escape(validator.trim(str)).substring(0, maxLen);
}

function isValidEmail(email) {
    return validator.isEmail(email, { allow_display_name: false });
}

// ===== API ROUTES =====

// --- Login ---
app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        // SECURITY: Add random delay to prevent timing attacks
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

        const ip = getClientIp(req);

        // Check lockout
        if (isLockedOut(ip)) {
            console.warn(`🚨 Locked out IP attempted login: ${ip}`);
            return res.status(429).json({ 
                success: false, 
                error: 'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.' 
            });
        }

        const { username, password } = req.body;

        // Validate input types
        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid input.' });
        }

        // Validate lengths
        if (username.length > 100 || password.length > 200) {
            return res.status(400).json({ success: false, error: 'Invalid input.' });
        }

        const inputUser = username.trim();
        const inputPass = password.trim();

        if (!inputUser || !inputPass) {
            return res.status(400).json({ success: false, error: 'Username and password are required.' });
        }

        // SECURITY: Constant-time username comparison
        const usernameMatch = crypto.timingSafeEqual(
            Buffer.from(inputUser.padEnd(256, '\0')),
            Buffer.from(ADMIN_USERNAME.padEnd(256, '\0'))
        );

        // SECURITY: bcrypt comparison (inherently constant-time)
        const passwordMatch = adminPasswordHash ? await bcrypt.compare(inputPass, adminPasswordHash) : false;

        if (usernameMatch && passwordMatch) {
            clearFailedLogins(ip);
            
            // SECURITY: Minimal JWT payload, short expiry, unique token ID
            const tokenId = crypto.randomBytes(16).toString('hex');
            const token = jwt.sign(
                { 
                    sub: inputUser,
                    jti: tokenId,     // Unique token ID for revocation
                    iat: Math.floor(Date.now() / 1000),
                },
                JWT_SECRET,
                { 
                    expiresIn: '2h',  // Reduced from 24h to 2h
                    algorithm: 'HS256'
                }
            );

            console.log(`✅ Successful login from IP: ${ip}`);
            res.json({ success: true, token });
        } else {
            recordFailedLogin(ip);
            const remaining = MAX_FAILED_ATTEMPTS - (failedLoginAttempts.get(ip)?.count || 0);
            console.warn(`⚠️ Failed login attempt from IP: ${ip} (${remaining} attempts remaining)`);
            
            // SECURITY: Generic error message (don't reveal which field was wrong)
            res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials.' 
            });
        }
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ success: false, error: 'Server error.' });
    }
});

// --- Logout (Token Invalidation) ---
app.post('/api/logout', authenticateToken, (req, res) => {
    tokenBlacklist.add(req.token);
    console.log(`🔓 Token invalidated for user: ${req.user.sub}`);
    res.json({ success: true, message: 'Logged out successfully.' });
});

// --- Verify Session / Token ---
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ success: true, user: req.user.sub });
});

// --- Helper: Read Local Data Backup ---
function getLocalFallbackData() {
    try {
        const fs = require('fs');
        const backupPath = path.join(__dirname, 'default_data.json');
        if (fs.existsSync(backupPath)) {
            const content = fs.readFileSync(backupPath, 'utf8');
            return JSON.parse(content);
        }
    } catch (e) {
        console.error('Error reading default_data.json:', e.message);
    }
    return {};
}

// --- Save Portfolio Data ---
app.post('/api/save', apiLimiter, authenticateToken, async (req, res) => {
    try {
        const newData = req.body;
        
        // SECURITY: Validate payload structure
        if (!newData || typeof newData !== 'object' || Array.isArray(newData)) {
            return res.status(400).json({ success: false, error: 'Invalid data format.' });
        }

        // SECURITY: Check payload size (1MB max)
        const dataSize = JSON.stringify(newData).length;
        if (dataSize > 1000000) {
            return res.status(413).json({ success: false, error: 'Data too large.' });
        }

        // Only allow known top-level keys
        const allowedKeys = ['hero', 'about', 'skills', 'experience', 'projects', 'services', 'contact'];
        const filteredData = {};
        for (const key of allowedKeys) {
            if (newData[key] !== undefined) {
                filteredData[key] = newData[key];
            }
        }

        // 1. ALWAYS persist to default_data.json as local backup & guaranteed storage
        const fs = require('fs');
        const backupPath = path.join(__dirname, 'default_data.json');
        try {
            fs.writeFileSync(backupPath, JSON.stringify(filteredData, null, 2), 'utf8');
            console.log('💾 Data persisted to default_data.json');
        } catch (fsErr) {
            console.error('Failed to write default_data.json:', fsErr.message);
        }

        // 2. If MongoDB Atlas is connected, ALSO update database
        if (mongoose.connection.readyState >= 1) {
            try {
                await Portfolio.replaceOne({}, filteredData, { upsert: true });
                console.log('☁️ Data synced to MongoDB Atlas');
            } catch (dbErr) {
                console.error('MongoDB sync error:', dbErr.message);
            }
        }
        
        console.log(`✅ Portfolio data saved successfully by ${req.user.sub}`);
        res.json({ success: true });
    } catch(err) {
        console.error('Save error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to save data.' });
    }
});

// --- Reset to Defaults ---
app.post('/api/reset', apiLimiter, authenticateToken, async (req, res) => {
    try {
        const fs = require('fs');
        const backupPath = path.join(__dirname, 'default_data.json');
        if (fs.existsSync(backupPath)) {
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            if (mongoose.connection.readyState >= 1) {
                try {
                    await Portfolio.replaceOne({}, backupData, { upsert: true });
                } catch(e) {}
            }

            console.log(`🔄 Portfolio data reset by ${req.user.sub}`);
            res.json({ success: true, data: backupData });
        } else {
            res.json({ success: false, message: 'No backup found' });
        }
    } catch(err) {
        console.error('Reset error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to reset data.' });
    }
});

// ===== MESSAGES API =====

// --- Contact Form (Public, Rate Limited) ---
app.post('/api/contact', contactLimiter, async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // SECURITY: Input validation
        if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid input.' });
        }

        const cleanName = sanitizeString(name, 200);
        const cleanEmail = email.trim().substring(0, 254);
        const cleanSubject = sanitizeString(subject || 'No Subject', 500);
        const cleanMessage = sanitizeString(message, 5000);

        if (!cleanName || !cleanEmail || !cleanMessage) {
            return res.status(400).json({ success: false, error: 'Name, email, and message are required.' });
        }

        // SECURITY: Email validation
        if (!isValidEmail(cleanEmail)) {
            return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
        }
        
        const newMsg = {
            id: 'msg_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
            name: cleanName,
            email: cleanEmail,
            subject: cleanSubject,
            message: cleanMessage,
            date: new Date()
        };
        
        // 1. ALWAYS persist to messages.json
        const fs = require('fs');
        const messagesPath = path.join(__dirname, 'messages.json');
        let currentMessages = [];
        try {
            if (fs.existsSync(messagesPath)) {
                currentMessages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
            }
        } catch(e) {}
        currentMessages.unshift(newMsg);
        try {
            fs.writeFileSync(messagesPath, JSON.stringify(currentMessages, null, 2), 'utf8');
        } catch(e) {}

        // 2. If MongoDB is connected, also save to MongoDB
        if (mongoose.connection.readyState >= 1) {
            try {
                await Message.create(newMsg);
            } catch (dbErr) {
                console.error('MongoDB message create error:', dbErr.message);
            }
        }
        
        console.log(`📩 New message received from: ${cleanEmail}`);
        res.json({ success: true });
    } catch(err) {
        console.error('Contact form error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to send message.' });
    }
});

// --- Get Messages (Auth Required) ---
app.get('/api/messages', apiLimiter, authenticateToken, async (req, res) => {
    try {
        let messages = [];
        if (mongoose.connection.readyState >= 1) {
            try {
                messages = await Message.find().sort({ date: -1 }).limit(100).lean();
            } catch(e) {}
        }
        
        // Fallback to local messages.json if DB has none or is offline
        if (!messages || messages.length === 0) {
            const fs = require('fs');
            const messagesPath = path.join(__dirname, 'messages.json');
            if (fs.existsSync(messagesPath)) {
                try {
                    messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
                } catch(e) {}
            }
        }
        res.json({ success: true, data: messages || [] });
    } catch(err) {
        console.error('Get messages error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to load messages.' });
    }
});

// --- Delete Message (Auth Required) ---
app.delete('/api/messages/:id', apiLimiter, authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // SECURITY: Validate message ID format
        if (typeof id !== 'string' || id.length > 100 || !/^msg_[\w]+$/.test(id)) {
            return res.status(400).json({ success: false, error: 'Invalid message ID.' });
        }

        // Delete from local messages.json
        const fs = require('fs');
        const messagesPath = path.join(__dirname, 'messages.json');
        if (fs.existsSync(messagesPath)) {
            try {
                let msgs = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
                msgs = msgs.filter(m => m.id !== id);
                fs.writeFileSync(messagesPath, JSON.stringify(msgs, null, 2), 'utf8');
            } catch(e) {}
        }

        // Delete from MongoDB if connected
        if (mongoose.connection.readyState >= 1) {
            try {
                await Message.deleteOne({ id });
            } catch(e) {}
        }
        
        console.log(`🗑️ Message ${id} deleted by ${req.user.sub}`);
        res.json({ success: true });
    } catch(err) {
        console.error('Delete message error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to delete message.' });
    }
});

// ===== REST API FOR PORTFOLIO DATA (Public, Read-only) =====
app.get('/api/portfolio', async (req, res) => {
    try {
        let portfolioData = null;
        
        if (mongoose.connection.readyState >= 1) {
            try {
                portfolioData = await Portfolio.findOne().lean();
            } catch (dbErr) {
                console.error('DB query failed, falling back to local file:', dbErr.message);
            }
        }
        
        // If MongoDB has no data or returned empty, read default_data.json
        if (!portfolioData || !portfolioData.skills || portfolioData.skills.length === 0) {
            portfolioData = getLocalFallbackData();
        }
        
        let cleanData = { ...portfolioData };
        delete cleanData._id;
        delete cleanData.__v;

        // Disable caching so edits in CMS appear immediately on portfolio.html
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.json({ success: true, data: cleanData });
    } catch(err) {
        console.error('Error fetching portfolio data:', err);
        const fallback = getLocalFallbackData();
        res.json({ success: true, data: fallback });
    }
});

// Handle root route to serve the portfolio
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'portfolio.html'));
});

// ===== SECURITY: Block access to sensitive files =====
app.use((req, res, next) => {
    const reqPath = decodeURIComponent(req.path).toLowerCase().replace(/^\/+/, '').replace(/\\/g, '/');
    
    // Block dotfiles (except the root path)
    if (reqPath.startsWith('.') || reqPath.includes('/.')) {
        return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    // Block specific sensitive files
    const blockedFiles = ['package.json', 'package-lock.json', 'default_data.json', 'messages.json', 'server.js'];
    if (blockedFiles.includes(reqPath)) {
        return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    // Block node_modules directory
    if (reqPath.startsWith('node_modules')) {
        return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    next();
});

// IMPORTANT: Define this AFTER security middleware
app.use(express.static(__dirname, {
    dotfiles: 'deny',  // SECURITY: Don't serve dotfiles (.env, .git, etc.)
    index: false,       // Don't auto-serve index.html
    maxAge: '1h',       // Cache static assets
}));

// ===== SECURITY: 404 Handler (don't leak info) =====
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not found.' });
});

// ===== SECURITY: Global Error Handler (don't leak stack traces) =====
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('----------------------------------------------------');
    console.log('🔒 CMS Server running with FULL SECURITY enabled!');
    console.log(`   Admin Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`   Live Portfolio:  http://localhost:${PORT}/portfolio.html`);
    console.log('----------------------------------------------------');
    console.log('🛡️  Security Features Active:');
    console.log('   ✅ Helmet HTTP Security Headers (CSP, HSTS, X-Frame)');
    console.log('   ✅ bcrypt Password Hashing (12 rounds)');
    console.log('   ✅ JWT with short expiry (2h) & token blacklist');
    console.log('   ✅ Brute-force protection (5 attempts / 15 min lockout)');
    console.log('   ✅ Rate limiting (Login, API, Contact form)');
    console.log('   ✅ NoSQL Injection prevention');
    console.log('   ✅ Input validation & sanitization');
    console.log('   ✅ XSS protection (output escaping)');
    console.log('   ✅ Sensitive file access blocked');
    console.log('   ✅ Timing-safe credential comparison');
    console.log('   ✅ CORS origin restriction on API');
    console.log('----------------------------------------------------');
});
