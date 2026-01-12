import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { prisma } from '../prisma';
import { getConsoleDetails, getPteroUrl } from './pterodactyl';

interface ExtWebSocket extends WebSocket {
    isAlive: boolean;
    userId?: string;
}

export const initWebSocketServer = (server: Server) => {
    const wssConsole = new WebSocketServer({ noServer: true });
    const wssNotifications = new WebSocketServer({ noServer: true });

    // Store user notification sockets: userId -> Set<WebSocket>
    const userNotificationSockets = new Map<string, Set<WebSocket>>();

    // --- CONSOLE HANDLING ---
    wssConsole.on('connection', async (ws: ExtWebSocket, req) => {
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        try {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const token = url.searchParams.get('token');
            const serverId = url.searchParams.get('serverId');

            if (!token || !serverId) { ws.close(1008, 'Missing parameters'); return; }

            const decoded: any = jwt.verify(token, ENV.JWT_SECRET);
            ws.userId = decoded.userId;

            const serverEntity = await prisma.server.findUnique({
                where: { id: serverId },
                include: { owner: true }
            });

            if (!serverEntity || (serverEntity.ownerId !== decoded.userId && (await prisma.user.findUnique({ where: { id: decoded.userId } }))?.role !== 'admin')) {
                ws.close(1008, 'Unauthorized');
                return;
            }

            if (!serverEntity.pteroIdentifier) {
                ws.send(JSON.stringify({ event: 'error', args: ['Server has no Pterodactyl ID'] }));
                ws.close();
                return;
            }

            console.log(`[WS] Proxying console for server ${serverEntity.name}`);
            const pteroDetails = await getConsoleDetails(serverEntity.pteroIdentifier);
            const pteroUrl = await getPteroUrl();
            const pteroWs = new WebSocket(pteroDetails.socket, { rejectUnauthorized: false, headers: { 'Origin': pteroUrl } });

            pteroWs.on('open', () => { pteroWs.send(JSON.stringify({ event: 'auth', args: [pteroDetails.token] })); });
            pteroWs.on('message', (data) => { if (ws.readyState === WebSocket.OPEN) ws.send(data.toString()); });
            ws.on('message', (data: any) => { if (pteroWs.readyState === WebSocket.OPEN) pteroWs.send(data.toString()); });

            const closeAll = () => {
                if (pteroWs.readyState === WebSocket.OPEN) pteroWs.close();
                if (ws.readyState === WebSocket.OPEN) ws.close();
            };
            ws.on('close', closeAll);
            pteroWs.on('close', closeAll);
            pteroWs.on('error', (err) => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ event: 'console output', args: [`\u001b[31m[System] Error: ${err.message}\r\n`] }));
            });

        } catch (error: any) {
            console.error('[WS] Console Connection Error:', error.message);
            ws.close(1008, 'Auth Failed');
        }
    });

    // --- NOTIFICATION HANDLING ---
    wssNotifications.on('connection', async (ws: ExtWebSocket, req) => {
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        try {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const token = url.searchParams.get('token');

            if (!token) { ws.close(1008, 'Missing token'); return; }

            const decoded: any = jwt.verify(token, ENV.JWT_SECRET);
            const userId = decoded.userId;
            ws.userId = userId;

            // Register Socket
            if (!userNotificationSockets.has(userId)) {
                userNotificationSockets.set(userId, new Set());
            }
            userNotificationSockets.get(userId)!.add(ws);

            console.log(`[WS] Notification subscribed: ${userId}`);

            ws.on('close', () => {
                if (userNotificationSockets.has(userId)) {
                    userNotificationSockets.get(userId)!.delete(ws);
                    if (userNotificationSockets.get(userId)!.size === 0) {
                        userNotificationSockets.delete(userId);
                    }
                }
            });

        } catch (error: any) {
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
        } else if (pathname === '/api/ws/notifications') {
            wssNotifications.handleUpgrade(request, socket, head, (ws) => {
                wssNotifications.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    });

    // Heartbeat
    const interval = setInterval(() => {
        [wssConsole, wssNotifications].forEach(wss => {
            wss.clients.forEach((ws: any) => {
                if (ws.isAlive === false) return ws.terminate();
                ws.isAlive = false;
                ws.ping();
            });
        });
    }, 30000);

    // Export sender function closure
    (global as any).sendUserNotification = async (userId: string, title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
        // 1. Create in DB
        try {
            await prisma.notification.create({
                data: { userId, title, message, type }
            });
        } catch (err) {
            console.error('[Notification] Failed to persist:', err);
        }

        // 2. Send via WS
        const sockets = userNotificationSockets.get(userId);
        if (sockets) {
            const payload = JSON.stringify({ type, title, message });
            sockets.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) ws.send(payload);
            });
        }
    };

    console.log('[WebSocket] Initialized (Console & Notifications)');
};

export const sendUserNotification = async (userId: string, title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if ((global as any).sendUserNotification) {
        await (global as any).sendUserNotification(userId, title, message, type);
    }
};
