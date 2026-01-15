import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import {
    createPteroServer,
    deletePteroServer,
    getPteroServer,
    updatePteroServerBuild,
    powerPteroServer,
    getPteroServerResources,
    createPteroUser,
    getConsoleDetails,
    listFiles,
    getFileContent,
    writeFileContent,
    renameFile,
    deleteFile,
    createFolder,
    getUploadUrl,
    reinstallServer
} from '../services/pterodactyl';
import { z } from 'zod';
import { ENV } from '../config/env';

const createServerSchema = z.object({
    name: z.string().min(3).max(20),
    planId: z.string()
});

// Helper to ensure EULA exists
const ensureEula = async (pteroIdentifier: string) => {
    try {
        await writeFileContent(pteroIdentifier, 'eula.txt', 'eula=true');
        console.log(`[EULA] Ensured eula.txt for ${pteroIdentifier}`);
    } catch (error) {
        // Silently fail if server is installing or not ready, it's fine
        console.warn(`[EULA] Failed to ensure eula.txt for ${pteroIdentifier} (might be installing)`);
    }
};

export const getPlans = async (req: Request, res: Response) => {
    try {
        const plans = await prisma.plan.findMany();
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching plans' });
    }
};

export const createServer = async (req: AuthRequest, res: Response) => {
    try {
        const { name, planId } = createServerSchema.parse(req.body);
        const userId = req.user!.userId;

        await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            const plan = await tx.plan.findUnique({ where: { id: planId } });

            if (!user || !plan) throw new Error('User or Plan not found');

            // --- DISCORD ENFORCEMENT ---
            if (!user.discordId && user.role !== 'admin') {
                throw new Error('You must link your Discord account to create a server.');
            }

            if (user.coins < plan.priceCoins) {
                throw new Error('Insufficient coins');
            }

            // Deduct coins
            await tx.user.update({
                where: { id: userId },
                data: { coins: { decrement: plan.priceCoins } }
            });

            // Create Transaction Record
            await tx.transaction.create({
                data: {
                    userId: user.id,
                    type: 'debit',
                    amount: plan.priceCoins,
                    description: `Created server ${name}`,
                    balanceAfter: user.coins - plan.priceCoins,
                    metadata: { planId: plan.id }
                }
            });

            // Get pterodactyl settings
            const settings = await tx.settings.findFirst();
            const eggId = plan.pteroEggId || (settings?.pterodactyl as any)?.defaultEggId || 15;
            const nestId = plan.pteroNestId || (settings?.pterodactyl as any)?.defaultNestId || 1;
            const locationId = plan.pteroLocationId || (settings?.pterodactyl as any)?.defaultLocationId || 1;

            // Pterodactyl Call
            let pteroServer: any;
            try {
                // Ensure ptero user exists or get ID?
                // For simplicity, we assume createPteroUser handles duplicates or we just use email
                const pteroUser = await createPteroUser(user.email, user.username);
                pteroServer = await createPteroServer(
                    name,
                    pteroUser.id,
                    eggId,
                    nestId,
                    plan.ramMb,
                    plan.diskMb,
                    plan.cpuPercent, // Use explicit % from plan
                    locationId
                );
            } catch (err: any) {
                throw new Error(`Failed to create server on panel: ${err.message}`);
            }

            // Save Server to DB with IP address
            // Extract IP and port from allocations
            console.log('Ptero Allocations:', JSON.stringify(pteroServer.relationships?.allocations, null, 2));

            let allocations = pteroServer.relationships?.allocations?.data || [];

            // If no allocations in create response, try fetching server details immediately
            if (allocations.length === 0) {
                try {
                    console.log('Allocations missing in create response, fetching details...');
                    const fullServer = await getPteroServer(pteroServer.attributes.id);
                    allocations = fullServer.relationships?.allocations?.data || [];
                } catch (err) {
                    console.error('Failed to fetch fallback allocations:', err);
                }
            }

            const node = pteroServer.relationships?.node?.attributes;
            const primaryAllocation = allocations.find((a: any) => a.attributes.is_default) || allocations[0];

            let ipToUse = 'Pending';
            let portToUse = '';

            if (primaryAllocation) {
                ipToUse = primaryAllocation.attributes.ip;
                portToUse = primaryAllocation.attributes.port;

                if (ipToUse === '0.0.0.0' && node?.fqdn) {
                    ipToUse = node.fqdn;
                }
            }

            const serverIp = portToUse ? `${ipToUse}:${portToUse}` : 'Pending';

            // Extract server attributes from response
            const serverAttributes = pteroServer.attributes;

            const server = await tx.server.create({
                data: {
                    ownerId: user.id,
                    pteroServerId: serverAttributes.id,
                    pteroIdentifier: serverAttributes.identifier,
                    planId: plan.id,
                    name: name,
                    ramMb: plan.ramMb,
                    diskMb: plan.diskMb,
                    cpuCores: Math.ceil(plan.cpuPercent / 100),
                    serverIp,
                    status: 'installing'
                }
            });

            // Post-transaction notifications (fire and forget, outside tx block technically, but ok here)
            // Import dynamically or move out? Moving out is better but variables are here.

            // We can return data to be used outside
            return { server, user, plan, settings };
        }, {
            maxWait: 5000, // default: 2000
            timeout: 30000 // default: 5000
        }).then(async (result: any) => {

            // EULA will be created manually when user accepts it via popup

            // Send Discord webhook notification
            const { sendServerCreatedWebhook } = await import('../services/webhookService');
            sendServerCreatedWebhook({
                username: result.user.username,
                serverName: name,
                planName: result.plan.name,
                ramMb: result.plan.ramMb,
                diskMb: result.plan.diskMb,
                cpuCores: result.plan.cpuCores
            }).catch((err: any) => console.error('Webhook error:', err));

            // Send email notification
            // ... email logic ...

            // Send Real-time Notification
            const { sendUserNotification } = await import('../services/websocket');
            sendUserNotification(result.user.id, 'Server Created', `Your server "${name}" has been successfully created!`, 'success');

            res.status(201).json({ message: 'Server created', server: result.server });
        });

    } catch (error: any) {
        // Handle specific errors
        if (error.message === 'Insufficient coins') {
            return res.status(400).json({ message: 'Insufficient coins' });
        }
        res.status(400).json({ message: error.message || 'Error creating server' });
    }
};

export const getMyServers = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // --- PTERODACTYL SYNC LOGIC ---
        if (user.pteroUserId) {
            try {
                const { getPteroServersByUserId } = await import('../services/pterodactyl');
                const pteroServers = await getPteroServersByUserId(user.pteroUserId);

                for (const pServer of pteroServers) {
                    const existing = await prisma.server.findFirst({
                        where: { pteroServerId: pServer.id }
                    });

                    // Parse Specs
                    const ramMb = pServer.limits.memory === 0 ? 1024 : pServer.limits.memory; // 0 = unlimited, maybe default to 1GB to be safe for billing
                    const diskMb = pServer.limits.disk === 0 ? 5120 : pServer.limits.disk;
                    const cpuCores = pServer.limits.cpu === 0 ? 1 : Math.ceil(pServer.limits.cpu / 100);

                    if (existing) {
                        // Update specs if changed (Fixes the "976GB" issue if it was a sync error)
                        if (existing.ramMb !== ramMb || existing.diskMb !== diskMb || existing.status !== pServer.status) {
                            await prisma.server.update({
                                where: { id: existing.id },
                                data: {
                                    ramMb: ramMb,
                                    diskMb: diskMb,
                                    cpuCores: cpuCores,
                                    status: pServer.suspended ? 'suspended' : 'active', // simplified status
                                    name: pServer.name // Sync name too? Maybe optional
                                }
                            });
                        }
                    } else {
                        // Import New Server
                        console.log(`[Sync] Importing server ${pServer.name} (${pServer.id})`);

                        // Find a plan that fits or default
                        let plan = await prisma.plan.findFirst({
                            where: {
                                ramMb: { gte: ramMb },
                                diskMb: { gte: diskMb }
                            },
                            orderBy: { priceCoins: 'asc' }
                        });

                        if (!plan) {
                            // Fallback to any plan
                            plan = await prisma.plan.findFirst();
                        }

                        if (plan) {
                            // Extract IP
                            const allocations = pServer.relationships?.allocations?.data || [];
                            const defaultAlloc = allocations.find((a: any) => a.attributes.is_default) || allocations[0];
                            let serverIp = 'Pending';
                            if (defaultAlloc) {
                                serverIp = `${defaultAlloc.attributes.ip}:${defaultAlloc.attributes.port}`;
                            }

                            await prisma.server.create({
                                data: {
                                    ownerId: userId,
                                    pteroServerId: pServer.id,
                                    pteroIdentifier: pServer.identifier,
                                    planId: plan.id,
                                    name: pServer.name,
                                    ramMb,
                                    diskMb,
                                    cpuCores,
                                    serverIp,
                                    status: pServer.suspended ? 'suspended' : 'active'
                                }
                            });
                        }
                    }
                }

            } catch (err) {
                console.error('[Sync] Failed to sync with Pterodactyl:', err);
                // Continue to just return info from DB
            }
        }

        // --- END SYNC LOGIC ---

        const servers = await prisma.server.findMany({
            where: {
                ownerId: req.user!.userId,
                status: { not: 'deleted' }
            },
            include: { plan: true }
        });

        res.json(servers);
    } catch (error) {
        console.error('Get Servers Error:', error);
        res.status(500).json({ message: 'Error fetching servers' });
    }
};

export const deleteServer = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        console.log('🗑️ Delete request for server:', id, 'by user:', userId);

        let server;
        if (userRole === 'admin') {
            server = await prisma.server.findUnique({ where: { id } });
        } else {
            server = await prisma.server.findFirst({
                where: { id: id, ownerId: userId }
            });
        }

        if (!server) {
            return res.status(404).json({ message: 'Server not found or you do not own this server' });
        }

        // Delete from Pterodactyl
        if (server.pteroServerId) {
            try {
                await deletePteroServer(server.pteroServerId);
            } catch (err) {
                console.error('Failed to delete ptero server:', err);
            }
        }

        // Delete from database
        await prisma.server.delete({ where: { id } });

        // Send Webhook (Async)
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const { sendServerDeletedWebhook } = await import('../services/webhookService');
        sendServerDeletedWebhook({
            username: user?.username || 'Unknown',
            serverName: server.name,
            reason: userRole === 'admin' ? 'Admin Action' : 'User Action'
        }).catch(console.error);

        // Send Real-time Notification
        const { sendUserNotification } = await import('../services/websocket');
        sendUserNotification(userId, 'Server Deleted', `Your server "${server.name}" has been deleted.`, 'info');

        res.json({ message: 'Server deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting server' });
    }
};

export const getUpgradePricing = async (req: Request, res: Response) => {
    try {
        const settings = await prisma.settings.findFirst();
        res.json(settings?.upgradePricing || {
            ramPerGB: 100,
            diskPerGB: 50,
            cpuPerCore: 20
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pricing' });
    }
};

export const powerServer = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { signal } = req.body;

    try {
        const server = await prisma.server.findUnique({
            where: { id }
        });

        if (!server) return res.status(404).json({ message: 'Server not found' });
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!server.pteroIdentifier) return res.status(400).json({ message: 'Server not configured for Pterodactyl' });

        // EULA will be handled via manual acceptance popup in frontend

        await powerPteroServer(server.pteroIdentifier, signal);

        res.json({ message: `Signal ${signal} sent` });
    } catch (error: any) {
        const msg = error.response?.data?.errors?.[0]?.detail || error.message;
        res.status(500).json({ message: 'Power action failed', error: msg });
    }
};

export const getServer = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        let server = await prisma.server.findUnique({
            where: { id },
            include: { plan: true }
        });

        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Sync with Pterodactyl (Live Status Check)
        if (server.pteroServerId) {
            try {
                const pteroServer = await getPteroServer(server.pteroServerId);
                const pteroStatus = pteroServer.status || (pteroServer.suspended ? 'suspended' : 'active');

                // basic allocation check
                // basic allocation check
                const allocations = pteroServer.relationships?.allocations?.data || [];
                const node = pteroServer.relationships?.node?.attributes;
                const defaultAlloc = allocations.find((a: any) => a.attributes.is_default) || allocations[0];
                let serverIp = server.serverIp;

                if (defaultAlloc) {
                    let ipToUse = defaultAlloc.attributes.ip;
                    if (ipToUse === '0.0.0.0' && node?.fqdn) {
                        ipToUse = node.fqdn;
                    }
                    serverIp = `${ipToUse}:${defaultAlloc.attributes.port}`;
                }

                if (server.status !== pteroStatus || server.serverIp !== serverIp) {
                    server = await prisma.server.update({
                        where: { id: server.id },
                        data: {
                            status: pteroStatus,
                            serverIp: serverIp
                        },
                        include: { plan: true }
                    });
                }
            } catch (syncError) {
                console.error('Failed to sync with Pterodactyl:', syncError);
                // Ignore sync error and return cached server, but log it
            }
        }

        res.json(server);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch server' });
    }
};

export const upgradeServer = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { ramMb, diskMb, cpuCores } = req.body;
    const userId = req.user!.userId;

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            const server = await tx.server.findFirst({ where: { id: id, ownerId: userId } });
            if (!server) throw new Error('Server not found');

            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user) throw new Error('User not found');

            // Calculate Cost
            const settings = await tx.settings.findFirst();
            const pricing = (settings?.upgradePricing as any) || { ramPerGB: 100, diskPerGB: 50, cpuPerCore: 20 };

            let cost = 0;
            if (ramMb > server.ramMb) cost += ((ramMb - server.ramMb) / 1024) * pricing.ramPerGB;
            if (diskMb > server.diskMb) cost += ((diskMb - server.diskMb) / 1024) * pricing.diskPerGB;
            if (cpuCores > server.cpuCores) cost += (cpuCores - server.cpuCores) * pricing.cpuPerCore;

            cost = Math.ceil(cost);

            if (user.coins < cost) {
                throw new Error('Insufficient coins');
            }

            // Deduct
            await tx.user.update({
                where: { id: userId },
                data: { coins: { decrement: cost } }
            });

            await tx.transaction.create({
                data: {
                    userId: userId,
                    amount: -cost,
                    description: `Upgraded server ${server.name}`,
                    type: 'debit',
                    balanceAfter: user.coins - cost
                }
            });

            // Get current allocation from Pterodactyl
            const pteroServer = await getPteroServer(server.pteroServerId);
            const currentAllocationId = pteroServer.allocation;

            // Update Pterodactyl
            await updatePteroServerBuild(server.pteroServerId, ramMb, diskMb, cpuCores * 100, currentAllocationId);

            await tx.server.update({
                where: { id: server.id },
                data: {
                    ramMb,
                    diskMb,
                    cpuCores
                }
            });
            return server;
        });

        // Send Real-time Notification
        const { sendUserNotification } = await import('../services/websocket');
        // 'result' contains the server object returned from transaction
        sendUserNotification(userId, 'Server Upgraded', `Your server "${result.name}" has been upgraded (RAM: ${ramMb}MB, Disk: ${diskMb}MB).`, 'success');

        res.json({ message: 'Upgrade successful' });

    } catch (error: any) {
        if (error.message === 'Insufficient coins') return res.status(400).json({ message: error.message });
        res.status(500).json({ message: error.message || 'Upgrade failed' });
    }
};

export const getServerUsage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.userId;

        const server = await prisma.server.findFirst({
            where: { id: id, ownerId: userId }
        });

        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (!server.pteroIdentifier) {
            return res.status(400).json({ message: 'Server not configured for Pterodactyl' });
        }

        const stats = await getPteroServerResources(server.pteroIdentifier);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch server usage' });
    }
};

// Console
export const getConsoleCredentials = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const server = await prisma.server.findUnique({
            where: { id }
        });

        if (!server) return res.status(404).json({ message: 'Server not found' });

        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (!server.pteroServerId || !server.pteroIdentifier) {
            return res.status(400).json({ message: 'Server not configured for Pterodactyl' });
        }

        // Check if server is ready
        const pteroServer = await getPteroServer(server.pteroServerId);
        if (pteroServer.suspended || pteroServer.container?.installed !== 1) {
            return res.status(400).json({ message: 'Server is not ready' });
        }

        // Fetch WebSocket credentials from Pterodactyl
        // This returns the EXACT socket URL and token that the frontend needs
        const consoleDetails = await getConsoleDetails(server.pteroIdentifier);

        // Return Pterodactyl's socket URL and token directly
        // Frontend will connect directly to Pterodactyl Wings
        res.json({
            socket: consoleDetails.socket,
            token: consoleDetails.token
        });
    } catch (error: any) {
        console.error('Console credentials error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Failed to fetch console credentials', error: error.message });
    }
};

// Files
export const getServerFiles = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { directory } = req.query;

    try {
        const server = await prisma.server.findUnique({
            where: { id }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!server.pteroIdentifier) return res.status(400).json({ message: 'Server not configured for Pterodactyl' });

        const files = await listFiles(server.pteroIdentifier, directory as string);
        res.json(files);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch files' });
    }
};

export const getFile = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { file } = req.query;

    try {
        const server = await prisma.server.findUnique({
            where: { id }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!server.pteroIdentifier) return res.status(400).json({ message: 'Server not configured for Pterodactyl' });

        const content = await getFileContent(server.pteroIdentifier, file as string);
        res.send(content);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch file content' });
    }
};

export const writeFile = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { file, content } = req.body;

    try {
        const server = await prisma.server.findUnique({
            where: { id }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!server.pteroIdentifier) return res.status(400).json({ message: 'Server not configured for Pterodactyl' });

        await writeFileContent(server.pteroIdentifier, file, content);
        res.json({ message: 'File saved' });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to save file' });
    }
};

export const renameServerFile = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { root, files } = req.body;

    try {
        const server = await prisma.server.findUnique({
            where: { id }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!server.pteroIdentifier) return res.status(400).json({ message: 'Server not configured for Pterodactyl' });

        await renameFile(server.pteroIdentifier, root, files);
        res.json({ message: 'Renamed successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to rename' });
    }
};

export const deleteServerFile = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { root, files } = req.body;

    try {
        const server = await prisma.server.findUnique({
            where: { id }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!server.pteroIdentifier) return res.status(400).json({ message: 'Server not configured for Pterodactyl' });

        await deleteFile(server.pteroIdentifier, root, files);
        res.json({ message: 'Deleted successfully' });
    } catch (error: any) {
        console.error('Delete File Error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Failed to delete', error: error.response?.data || error.message });
    }
};

export const createServerFolder = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { root, name } = req.body;

    try {
        const server = await prisma.server.findUnique({
            where: { id }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!server.pteroIdentifier) return res.status(400).json({ message: 'Server not configured for Pterodactyl' });

        const folderRoot = root || '/';
        await createFolder(server.pteroIdentifier, folderRoot, name);
        res.json({ message: 'Folder created' });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to create folder' });
    }
};

export const getServerUploadUrl = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        const server = await prisma.server.findUnique({
            where: { id }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!server.pteroIdentifier) return res.status(400).json({ message: 'Server not configured for Pterodactyl' });

        const url = await getUploadUrl(server.pteroIdentifier);
        res.json({ url });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to get upload URL' });
    }
};

export const reinstallServerAction = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        const server = await prisma.server.findUnique({
            where: { id }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!server.pteroIdentifier) return res.status(400).json({ message: 'Server not configured for Pterodactyl' });

        await reinstallServer(server.pteroIdentifier);

        // Update DB status to installing
        await prisma.server.update({
            where: { id: server.id },
            data: { status: 'installing' }
        });

        res.json({ message: 'Server reinstalling' });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to reinstall server' });
    }
};

export const getServerResources = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const server = await prisma.server.findUnique({ where: { id } });

        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }

        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const resources: any = await getPteroServerResources(server.pteroIdentifier);
        res.json(resources);
    } catch (error: any) {
        console.error("Resources fetch error:", error);
        res.status(500).json({ message: 'Failed to fetch resources' });
    }
};

export const updateServer = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const server = await prisma.server.findUnique({ where: { id } });
        if (!server) return res.status(404).json({ message: 'Server not found' });

        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const updatedServer = await prisma.server.update({
            where: { id },
            data: {
                status: status
            }
        });

        res.json(updatedServer);
    } catch (error) {
        console.error('Update Server Error:', error);
        res.status(500).json({ message: 'Failed to update server' });
    }
};

// Accept EULA - Manual user action only
export const acceptEula = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        const server = await prisma.server.findFirst({
            where: { id: id, ownerId: req.user!.userId }
        });

        if (!server) return res.status(404).json({ message: 'Server not found' });
        if (!server.pteroIdentifier) return res.status(400).json({ message: 'Server not configured for Pterodactyl' });

        // Create EULA file
        await writeFileContent(server.pteroIdentifier, 'eula.txt', 'eula=true');
        console.log(`[EULA] User ${req.user!.userId} manually accepted EULA for server ${server.name} (${server.pteroIdentifier})`);

        res.json({ message: 'EULA accepted successfully' });
    } catch (error: any) {
        console.error('Accept EULA error:', error);
        res.status(500).json({
            message: 'Failed to accept EULA',
            error: error.message || 'Server might be installing or not ready yet'
        });
    }
};

