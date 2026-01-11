import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';
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
            const locationId = (settings?.pterodactyl as any)?.defaultLocationId || 1;

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
                    plan.cpuCores * 100, // Ptero uses % (100 = 1 core)
                    locationId
                );
            } catch (err: any) {
                throw new Error(`Failed to create server on panel: ${err.message}`);
            }

            // Save Server to DB with IP address
            // Extract IP and port from allocations
            const allocations = pteroServer.relationships?.allocations?.data || [];
            const primaryAllocation = allocations.find((a: any) => a.attributes.is_default) || allocations[0];
            const serverIp = primaryAllocation
                ? `${primaryAllocation.attributes.ip}:${primaryAllocation.attributes.port}`
                : 'Pending';

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
                    cpuCores: plan.cpuCores,
                    serverIp,
                    status: 'installing'
                }
            });

            // Post-transaction notifications (fire and forget, outside tx block technically, but ok here)
            // Import dynamically or move out? Moving out is better but variables are here.

            // We can return data to be used outside
            return { server, user, plan, settings };
        }).then(async (result: any) => {
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
        const servers = await prisma.server.findMany({
            where: {
                ownerId: req.user!.userId,
                status: { not: 'deleted' }
            },
            include: { plan: true }
        });

        // Sync Installing Status
        const updatedServers = await Promise.all(servers.map(async (server: any) => {
            if (server.status === 'installing') {
                try {
                    const pteroData = await getPteroServer(server.pteroServerId);
                    // Pterodactyl status: null (active), installing, install_failed, suspended, restoring_backup
                    if (pteroData.status === null) {
                        const updated = await prisma.server.update({
                            where: { id: server.id },
                            data: { status: 'active' },
                            include: { plan: true }
                        });
                        return updated;
                    } else if (pteroData.status === 'suspended') {
                        const updated = await prisma.server.update({
                            where: { id: server.id },
                            data: { status: 'suspended' },
                            include: { plan: true }
                        });
                        return updated;
                    }
                } catch (err) {
                    console.error(`Failed to sync status for server ${server.id}`, err);
                }
            }
            return server;
        }));

        res.json(updatedServers);
    } catch (error) {
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
        const server = await prisma.server.findFirst({
            where: { id: id, ownerId: req.user!.userId }
        });

        if (!server) return res.status(404).json({ message: 'Server not found' });

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
        let server = await prisma.server.findFirst({
            where: { id: id, ownerId: req.user!.userId },
            include: { plan: true }
        });

        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        // Sync with Pterodactyl (Live Status Check)
        try {
            const pteroServer = await getPteroServer(server.pteroServerId);
            const pteroStatus = pteroServer.status || (pteroServer.suspended ? 'suspended' : 'running');

            // basic allocation check
            const allocations = pteroServer.relationships?.allocations?.data || [];
            const defaultAlloc = allocations.find((a: any) => a.attributes.is_default) || allocations[0];
            let serverIp = server.serverIp;
            if (defaultAlloc) {
                serverIp = `${defaultAlloc.attributes.ip}:${defaultAlloc.attributes.port}`;
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
        await prisma.$transaction(async (tx: any) => {
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
        });

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
        const server = await prisma.server.findFirst({
            where: { id: id, ownerId: req.user!.userId }
        });

        if (!server) return res.status(404).json({ message: 'Server not found' });

        const data = await getConsoleDetails(server.pteroIdentifier);
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch console credentials' });
    }
};

// Files
export const getServerFiles = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { directory } = req.query;

    try {
        const server = await prisma.server.findFirst({
            where: { id: id, ownerId: req.user!.userId }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });

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
        const server = await prisma.server.findFirst({
            where: { id: id, ownerId: req.user!.userId }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });

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
        const server = await prisma.server.findFirst({
            where: { id: id, ownerId: req.user!.userId }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });

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
        const server = await prisma.server.findFirst({
            where: { id: id, ownerId: req.user!.userId }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });

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
        const server = await prisma.server.findFirst({
            where: { id: id, ownerId: req.user!.userId }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });

        await deleteFile(server.pteroIdentifier, root, files);
        res.json({ message: 'Deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to delete' });
    }
};

export const createServerFolder = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { root, name } = req.body;

    try {
        const server = await prisma.server.findFirst({
            where: { id: id, ownerId: req.user!.userId }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });

        await createFolder(server.pteroIdentifier, root, name);
        res.json({ message: 'Folder created' });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to create folder' });
    }
};

export const getServerUploadUrl = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        const server = await prisma.server.findFirst({
            where: { id: id, ownerId: req.user!.userId }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });

        const url = await getUploadUrl(server.pteroIdentifier);
        res.json({ url });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to get upload URL' });
    }
};

export const reinstallServerAction = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        const server = await prisma.server.findFirst({
            where: { id: id, ownerId: req.user!.userId }
        });
        if (!server) return res.status(404).json({ message: 'Server not found' });

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
