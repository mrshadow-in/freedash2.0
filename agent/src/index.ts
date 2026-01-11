import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import { dockerService } from './docker';

// Configuration
const CONFIG_PATH = process.env.CONFIG_PATH || './config.json';
let config = { port: 3005, token: '', panelUrl: '' };

if (fs.existsSync(CONFIG_PATH)) {
    try {
        config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
    } catch (e) {
        console.error('Failed to parse config.json');
    }
} else {
    // Allow env vars as fallback
    if (process.env.WINGS_TOKEN) config.token = process.env.WINGS_TOKEN;
    if (process.env.WINGS_PORT) config.port = parseInt(process.env.WINGS_PORT);
    console.warn('Config file not found. Starting with defaults/env vars.');
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(bodyParser.json());

// Auth Middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${config.token}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Routes
app.get('/', (req, res) => {
    res.json({ name: 'FreeDash Wings', version: '1.0.0', status: 'Online' });
});

app.post('/servers', authenticate, async (req, res) => {
    try {
        await dockerService.createServer(req.body);
        res.json({ success: true });
    } catch (e: any) {
        console.error('Create error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/servers/:uuid/power', authenticate, async (req, res) => {
    try {
        const { action } = req.body;
        await dockerService.power(req.params.uuid, action);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/servers/:uuid', authenticate, async (req, res) => {
    try {
        await dockerService.deleteServer(req.params.uuid);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

server.listen(config.port, () => {
    console.log(`[Wings] Listening on port ${config.port}`);
});

// WebSocket Handling
wss.on('connection', (ws, req) => {
    // Authenticate WS
    // Protocol: /console?token=XYZ&server=UUID
    // Note: In real setup, the token should be validated strictly.
    const url = new URL(req.url || '', `http://localhost:${config.port}`);
    const token = url.searchParams.get('token');
    const serverId = url.searchParams.get('server');

    if (token !== config.token) {
        ws.close(1008, 'Unauthorized');
        return;
    }

    if (!serverId) {
        ws.close(1003, 'Server ID required');
        return;
    }

    console.log(`[Wings] WS connection for server ${serverId}`);

    // Hand off to Docker service
    dockerService.attachConsole(serverId, ws);
});
