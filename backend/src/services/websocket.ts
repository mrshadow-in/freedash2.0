import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { prisma } from '../prisma';
import { containerService } from './containerService';

interface JwtPayload {
    userId?: string;
    id?: string;
}

/**
 * WebSocket Server for Console streaming
 * This replaces the Pterodactyl proxy with direct Docker log streaming
 */
export const initWebSocketServer = (server: Server) => {
    const wss = new WebSocketServer({ server, path: '/api/ws/console' });

    console.log('✅ WebSocket Server initialized at /api/ws/console');

    wss.on('error', (error) => {
        console.error('❌ WebSocket Server Error:', error);
    });

    wss.on('connection', async (ws, req) => {
        console.log('🔌 New WebSocket connection attempt');

        try {
            // Parse Query Params
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const token = url.searchParams.get('token');
            const serverId = url.searchParams.get('serverId');

            if (!token || !serverId) {
                console.error('❌ Missing parameters');
                ws.close(1008, 'Missing parameters');
                return;
            }

            // Authenticate User
            let userId: string;
            try {
                const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
                userId = decoded.userId || decoded.id || '';
                if (!userId) throw new Error('No user ID in token');
            } catch (err) {
                console.error('❌ Invalid token');
                ws.close(4001, 'Invalid Token');
                return;
            }

            console.log('✅ User authenticated:', userId);

            // Verify Server Ownership and get node info
            const dbServer = await prisma.server.findFirst({
                where: { id: serverId, ownerId: userId },
                include: { node: true }
            });

            if (!dbServer) {
                console.error('❌ Server not found');
                ws.close(4004, 'Server not found');
                return;
            }

            if (!dbServer.nodeId || !dbServer.containerId) {
                console.error('❌ Server not configured for self-hosted mode');
                ws.close(4004, 'Server not on managed node');
                return;
            }

            console.log('✅ Server found:', dbServer.name, 'Container:', dbServer.containerId);

            // Send auth success event
            ws.send(JSON.stringify({ event: 'auth success' }));

            // Start streaming Docker logs
            let logStream: { close: () => void } | null = null;

            try {
                logStream = await containerService.streamContainerLogs(
                    dbServer.nodeId,
                    dbServer.containerId,
                    (data) => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                event: 'console output',
                                args: [data]
                            }));
                        }
                    }
                );

                console.log('✅ Log streaming started');
            } catch (err: any) {
                console.error('❌ Failed to start log stream:', err.message);
                ws.send(JSON.stringify({
                    event: 'console output',
                    args: [`[FreeDash] Failed to connect to container: ${err.message}\n`]
                }));
            }

            // Get initial container stats
            try {
                const stats = await containerService.getContainerStats(
                    dbServer.nodeId,
                    dbServer.containerId
                );
                ws.send(JSON.stringify({ event: 'stats', args: [JSON.stringify(stats)] }));
            } catch (err) {
                // Stats not critical, ignore error
            }

            // Handle incoming messages (commands)
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());

                    if (message.event === 'send command' && message.args?.[0]) {
                        const command = message.args[0];
                        console.log(`[Console] Command: ${command}`);

                        await containerService.sendCommand(
                            dbServer.nodeId!,
                            dbServer.containerId!,
                            command
                        );
                    }
                } catch (err) {
                    console.error('Failed to process message:', err);
                }
            });

            // Handle disconnect
            ws.on('close', () => {
                console.log('🔌 WebSocket closed');
                if (logStream) {
                    logStream.close();
                }
            });

            ws.on('error', (err) => {
                console.error('❌ WebSocket error:', err);
                if (logStream) {
                    logStream.close();
                }
            });

        } catch (error: any) {
            console.error('❌ Unexpected error:', error);
            ws.close(1011, 'Internal server error');
        }
    });
};
