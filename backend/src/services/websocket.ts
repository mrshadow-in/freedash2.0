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
    const wss = new WebSocketServer({ server, path: '/api/ws/console' });

    wss.on('connection', async (ws: ExtWebSocket, req) => {
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
            const decoded: any = jwt.verify(token, ENV.JWT_SECRET);
            ws.userId = decoded.userId;

            // Get Server
            const serverEntity = await prisma.server.findUnique({
                where: { id: serverId },
                include: { owner: true }
            });

            if (!serverEntity || serverEntity.ownerId !== decoded.userId) {
                // Allow admins? For now strict owner check
                const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
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
            const pteroDetails = await getConsoleDetails(serverEntity.pteroIdentifier);

            const pteroUrl = await getPteroUrl();
            // Connect to Pterodactyl Wings with lax SSL and Origin header
            const pteroWs = new WebSocket(pteroDetails.socket, {
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
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(data);
                }
            });

            // Proxy Messages: Client -> Ptero
            ws.on('message', (data) => {
                if (pteroWs.readyState === WebSocket.OPEN) {
                    pteroWs.send(data);
                }
            });

            // Cleanup
            const closeAll = () => {
                if (pteroWs.readyState === WebSocket.OPEN) pteroWs.close();
                if (ws.readyState === WebSocket.OPEN) ws.close();
            };

            ws.on('close', closeAll);
            pteroWs.on('close', closeAll);
            pteroWs.on('error', (err) => {
                console.error('[WS] Pterodactyl Error:', err.message);
                // Send distinct error to client
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ event: 'console output', args: [`\u001b[31m[System] Connection Error: ${err.message}\r\n`] }));
                    ws.close(1011, `Upstream: ${err.message}`);
                }
            });

        } catch (error: any) {
            console.error('[WS] Connection Error:', error.message);
            ws.close(1008, 'Authentication Failed');
        }
    });

    // Heartbeat
    const interval = setInterval(() => {
        wss.clients.forEach((ws: any) => {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => clearInterval(interval));

    console.log('[WebSocket] Initialized for Pterodactyl Proxy');
};
