"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendUserNotification = exports.initWebSocketServer = void 0;
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const prisma_1 = require("../prisma");
const pterodactyl_1 = require("./pterodactyl");
const initWebSocketServer = (server) => {
    const wssConsole = new ws_1.WebSocketServer({ noServer: true });
    const wssNotifications = new ws_1.WebSocketServer({ noServer: true });
    // Store user notification sockets: userId -> Set<WebSocket>
    const userNotificationSockets = new Map();
    // --- CONSOLE HANDLING ---
    wssConsole.on('connection', async (ws, req) => {
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });
        try {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const token = url.searchParams.get('token');
            const serverId = url.searchParams.get('serverId');
            if (!token || !serverId) {
                console.log('[WS Console] Missing parameters - token:', !!token, 'serverId:', serverId);
                ws.close(1008, 'Missing parameters');
                return;
            }
            console.log('[WS Console] Attempting to verify JWT token...');
            const decoded = jsonwebtoken_1.default.verify(token, env_1.ENV.JWT_SECRET);
            const userId = decoded.userId || decoded.id; // Support both fields
            console.log('[WS Console] Token verified. userId:', userId);
            ws.userId = userId;
            console.log('[WS Console] Fetching server:', serverId);
            const serverEntity = await prisma_1.prisma.server.findUnique({
                where: { id: serverId },
                include: { owner: true }
            });
            if (!serverEntity) {
                console.log('[WS Console] Server not found:', serverId);
                ws.close(1008, 'Server not found');
                return;
            }
            console.log('[WS Console] Server found:', serverEntity.name, 'Owner:', serverEntity.ownerId);
            if (serverEntity.ownerId !== userId && (await prisma_1.prisma.user.findUnique({ where: { id: userId } }))?.role !== 'admin') {
                console.log('[WS Console] Unauthorized - User:', userId, 'is not owner of server');
                ws.close(1008, 'Unauthorized');
                return;
            }
            if (!serverEntity.pteroIdentifier) {
                ws.send(JSON.stringify({ event: 'error', args: ['Server has no Pterodactyl ID'] }));
                ws.close();
                return;
            }
            console.log(`[WS] Proxying console for server ${serverEntity.name}`);
            const pteroDetails = await (0, pterodactyl_1.getConsoleDetails)(serverEntity.pteroIdentifier);
            const pteroUrl = await (0, pterodactyl_1.getPteroUrl)();
            const pteroWs = new ws_1.WebSocket(pteroDetails.socket, { rejectUnauthorized: false, headers: { 'Origin': pteroUrl } });
            pteroWs.on('open', () => { pteroWs.send(JSON.stringify({ event: 'auth', args: [pteroDetails.token] })); });
            pteroWs.on('message', (data) => { if (ws.readyState === ws_1.WebSocket.OPEN)
                ws.send(data.toString()); });
            ws.on('message', (data) => { if (pteroWs.readyState === ws_1.WebSocket.OPEN)
                pteroWs.send(data.toString()); });
            const closeAll = () => {
                if (pteroWs.readyState === ws_1.WebSocket.OPEN)
                    pteroWs.close();
                if (ws.readyState === ws_1.WebSocket.OPEN)
                    ws.close();
            };
            ws.on('close', closeAll);
            pteroWs.on('close', closeAll);
            pteroWs.on('error', (err) => {
                if (ws.readyState === ws_1.WebSocket.OPEN)
                    ws.send(JSON.stringify({ event: 'console output', args: [`\u001b[31m[System] Error: ${err.message}\r\n`] }));
            });
        }
        catch (error) {
            console.error('[WS] Console Connection Error:', error.message);
            ws.close(1008, 'Auth Failed');
        }
    });
    // --- NOTIFICATION HANDLING ---
    wssNotifications.on('connection', async (ws, req) => {
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });
        try {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const token = url.searchParams.get('token');
            if (!token) {
                ws.close(1008, 'Missing token');
                return;
            }
            const decoded = jsonwebtoken_1.default.verify(token, env_1.ENV.JWT_SECRET);
            const userId = decoded.id; // JWT token uses 'id', not 'userId'
            ws.userId = userId;
            // Register Socket
            if (!userNotificationSockets.has(userId)) {
                userNotificationSockets.set(userId, new Set());
            }
            userNotificationSockets.get(userId).add(ws);
            console.log(`[WS] Notification subscribed: ${userId}`);
            ws.on('close', () => {
                if (userNotificationSockets.has(userId)) {
                    userNotificationSockets.get(userId).delete(ws);
                    if (userNotificationSockets.get(userId).size === 0) {
                        userNotificationSockets.delete(userId);
                    }
                }
            });
        }
        catch (error) {
            console.error('[WS] Notification Auth Error:', error.message);
            ws.close(1008, 'Auth Failed');
        }
    });
    // --- UPGRADE HANDLING ---
    server.on('upgrade', (request, socket, head) => {
        const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
        if (pathname === '/api/ws/console') {
            wssConsole.handleUpgrade(request, socket, head, (ws) => {
                wssConsole.emit('connection', ws, request);
            });
        }
        else if (pathname === '/api/ws/notifications') {
            wssNotifications.handleUpgrade(request, socket, head, (ws) => {
                wssNotifications.emit('connection', ws, request);
            });
        }
        else {
            socket.destroy();
        }
    });
    // Heartbeat
    const interval = setInterval(() => {
        [wssConsole, wssNotifications].forEach(wss => {
            wss.clients.forEach((ws) => {
                if (ws.isAlive === false)
                    return ws.terminate();
                ws.isAlive = false;
                ws.ping();
            });
        });
    }, 30000);
    // Export sender function closure
    global.sendUserNotification = async (userId, title, message, type = 'info') => {
        // 1. Create in DB
        try {
            await prisma_1.prisma.notification.create({
                data: { userId, title, message, type }
            });
        }
        catch (err) {
            console.error('[Notification] Failed to persist:', err);
        }
        // 2. Send via WS
        const sockets = userNotificationSockets.get(userId);
        if (sockets) {
            const payload = JSON.stringify({ type, title, message });
            sockets.forEach(ws => {
                if (ws.readyState === ws_1.WebSocket.OPEN)
                    ws.send(payload);
            });
        }
    };
    console.log('[WebSocket] Initialized (Console & Notifications)');
};
exports.initWebSocketServer = initWebSocketServer;
const sendUserNotification = async (userId, title, message, type = 'info') => {
    if (global.sendUserNotification) {
        await global.sendUserNotification(userId, title, message, type);
    }
};
exports.sendUserNotification = sendUserNotification;
