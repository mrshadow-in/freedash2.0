import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { prisma } from '../prisma';
import { getConsoleDetails } from './pterodactyl';

interface JwtPayload {
    userId: string;
}

export const initWebSocketServer = (server: Server) => {
    const wss = new WebSocketServer({ server, path: '/api/ws/console' });

    wss.on('connection', async (ws, req) => {
        // Parse Query Params for Token and Server ID
        // URL: /api/ws/console?serverId=...&token=...
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        const serverId = url.searchParams.get('serverId');

        if (!token || !serverId) {
            ws.close(1008, 'Missing parameters'); // Policy Violation
            return;
        }

        // Authenticate User
        let userId: string;
        try {
            const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
            userId = decoded.userId;
        } catch (err) {
            ws.close(4001, 'Invalid Token');
            return;
        }

        // Verify Server Ownership
        const dbServer = await prisma.server.findFirst({
            where: { id: serverId, ownerId: userId }
        });

        if (!dbServer) {
            ws.close(4004, 'Server not found or unauthorized');
            return;
        }

        // Fetch Pterodactyl WebSocket Details
        let pteroSocketUrl: string;
        let pteroToken: string;
        try {
            const details = await getConsoleDetails(dbServer.pteroIdentifier);
            pteroSocketUrl = details.socket;
            pteroToken = details.token;
        } catch (err) {
            console.error('Failed to get Ptero WS details for proxy:', err);
            ws.close(1011, 'Failed to fetch upstream connection');
            return;
        }

        // Connect to Pterodactyl
        const pteroWs = new WebSocket(pteroSocketUrl, {
            origin: ENV.PTERODACTYL_URL // Set Origin to satisfy Pterodactyl
        });

        pteroWs.on('open', () => {
            // Setup piping

            // Forward messages from Client to Ptero
            ws.on('message', (data) => {
                // If this is the auth packet, we might want to replace the token?
                // Actually, the client uses the Ptero Token it got from getConsoleCredentials?
                // Wait, if we use Proxy, we ideally want to hide the Ptero Token or let the backend handle it.
                // CURRENTLY: Console.tsx sends "auth" with a token.
                // If Console.tsx gets the Ptero Token, it sends it.
                // WE SHOULD probably just let it strictly forward, OR we handle auth.

                // Better approach: Backend handles auth immediately upon connection.
                // We send the auth packet ourselves!

                // Check if message is auth? No, keep it simple.
                // Let's send the auth packet immediately from Backend to Ptero on open.
                // Then ignoring the auth packet from Client?

                // Parsing message to check for auth event
                try {
                    const str = data.toString();
                    const json = JSON.parse(str);
                    if (json.event === 'auth') {
                        // Client is sending auth. We can drop it, because WE will send auth.
                        return;
                    }
                } catch (e) { }

                if (pteroWs.readyState === WebSocket.OPEN) {
                    pteroWs.send(data);
                }
            });

            // Authenticate with Pterodactyl
            pteroWs.send(JSON.stringify({ event: 'auth', args: [pteroToken] }));
        });

        pteroWs.on('message', (data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        pteroWs.on('error', (err) => {
            console.error('Upstream (Ptero) WS Error:', err);
            ws.close(1011, 'Upstream Error');
        });

        pteroWs.on('close', (code, reason) => {
            console.log(`Upstream closed: ${code} ${reason}`);
            ws.close(code, reason);
        });

        ws.on('close', () => {
            if (pteroWs.readyState === WebSocket.OPEN) {
                pteroWs.close();
            }
        });

        ws.on('error', (err) => {
            console.error('Client WS Error:', err);
            pteroWs.close();
        });
    });
};
