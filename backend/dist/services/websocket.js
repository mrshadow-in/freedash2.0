"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocketServer = void 0;
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const prisma_1 = require("../prisma");
const pterodactyl_1 = require("./pterodactyl");
const initWebSocketServer = (server) => {
    const wss = new ws_1.WebSocketServer({ server, path: '/api/ws/console' });
    wss.on('connection', async (ws, req) => {
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });
        try {
            // Parse URL params
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const token = url.searchParams.get('token');
            const serverId = url.searchParams.get('serverId');
            if (!token || !serverId) {
                ws.close(1008, 'Missing parameters');
                return;
            }
            // Verify User Token
            const decoded = jsonwebtoken_1.default.verify(token, env_1.ENV.JWT_SECRET);
            ws.userId = decoded.userId;
            // Get Server
            const serverEntity = await prisma_1.prisma.server.findUnique({
                where: { id: serverId },
                include: { owner: true }
            });
            if (!serverEntity || serverEntity.ownerId !== decoded.userId) {
                // Allow admins? For now strict owner check
                const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.userId } });
                if (user?.role !== 'admin' && serverEntity?.ownerId !== decoded.userId) {
                    ws.close(1008, 'Unauthorized');
                    return;
                }
            }
            if (!serverEntity?.pteroIdentifier) {
                ws.send(JSON.stringify({ event: 'error', args: ['Server has no Pterodactyl ID'] }));
                ws.close();
                return;
            }
            console.log(`[WS] Proxying console for server ${serverEntity.name} (${serverEntity.pteroIdentifier})`);
            // Get Pterodactyl WebSocket Details
            const pteroDetails = await (0, pterodactyl_1.getConsoleDetails)(serverEntity.pteroIdentifier);
            const pteroUrl = await (0, pterodactyl_1.getPteroUrl)();
            // Connect to Pterodactyl Wings with lax SSL and Origin header
            const pteroWs = new ws_1.WebSocket(pteroDetails.socket, {
                rejectUnauthorized: false,
                headers: {
                    'Origin': pteroUrl
                }
            });
            // Handle Ptero Open -> Auth
            pteroWs.on('open', () => {
                pteroWs.send(JSON.stringify({
                    event: 'auth',
                    args: [pteroDetails.token]
                }));
            });
            // Proxy Messages: Ptero -> Client
            pteroWs.on('message', (data) => {
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    // Force CRLF for xterm.js compatibility and toString for Blob fix
                    ws.send(data.toString().replace(/\n/g, '\r\n'));
                }
            });
            // Proxy Messages: Client -> Ptero
            ws.on('message', (data) => {
                if (pteroWs.readyState === ws_1.WebSocket.OPEN) {
                    // Pterodactyl expects strings for commands
                    pteroWs.send(data.toString());
                }
            });
            // Cleanup
            const closeAll = () => {
                if (pteroWs.readyState === ws_1.WebSocket.OPEN)
                    pteroWs.close();
                if (ws.readyState === ws_1.WebSocket.OPEN)
                    ws.close();
            };
            ws.on('close', closeAll);
            pteroWs.on('close', closeAll);
            pteroWs.on('error', (err) => {
                console.error('[WS] Pterodactyl Error:', err.message);
                // Send distinct error to client
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    ws.send(JSON.stringify({ event: 'console output', args: [`\u001b[31m[System] Connection Error: ${err.message}\r\n`] }));
                    ws.close(1011, `Upstream: ${err.message}`);
                }
            });
        }
        catch (error) {
            console.error('[WS] Connection Error:', error.message);
            ws.close(1008, 'Authentication Failed');
        }
    });
    // Heartbeat
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false)
                return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);
    wss.on('close', () => clearInterval(interval));
    console.log('[WebSocket] Initialized for Pterodactyl Proxy');
};
exports.initWebSocketServer = initWebSocketServer;
