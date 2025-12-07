import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env';

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// In-memory storage for demo
const users: Map<string, any> = new Map();
const servers: any[] = [];

console.log('📦 Demo Backend Started - Using In-Memory Storage');

// Simple auth routes (no DB needed for demo)
app.post('/auth/register', (req, res) => {
    const { email, username, password } = req.body;

    console.log('📝 Register attempt:', { email, username });

    if (users.has(email)) {
        console.log('❌ User already exists');
        return res.status(400).json({ message: 'User already exists' });
    }

    const user = {
        id: Date.now(),
        email,
        username,
        password, // In demo, store plaintext (not secure, only for demo)
        coins: 100,
        role: 'user'
    };
    users.set(email, user);

    console.log('✅ User registered:', email);
    console.log('👥 Total users:', users.size);

    res.status(201).json({ message: 'User created successfully', userId: user.id });
});

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', { email });
    console.log('📋 Available users:', Array.from(users.keys()));

    const user = users.get(email);

    if (!user) {
        console.log('❌ User not found');
        return res.status(401).json({ message: 'Invalid credentials - user not found' });
    }

    // Simple password check for demo
    if (user.password !== password) {
        console.log('❌ Invalid password');
        return res.status(401).json({ message: 'Invalid credentials - wrong password' });
    }

    const accessToken = 'demo_token_' + user.id;
    const refreshToken = 'demo_refresh_' + user.id;

    console.log('✅ Login successful:', user.username);

    res.json({
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            coins: user.coins,
            role: user.role
        }
    });
});

app.get('/servers', (req, res) => {
    console.log('📋 Fetching servers');
    res.json(servers);
});

app.get('/', (req, res) => {
    res.json({
        status: 'running',
        mode: 'demo',
        users: users.size,
        message: 'Backend running in demo mode - data in memory only'
    });
});

// Start Server
app.listen(ENV.PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${ENV.PORT}`);
    console.log(`⚠️  DEMO MODE - Using in-memory storage`);
    console.log(`📝 Data will NOT persist after restart\n`);
});
