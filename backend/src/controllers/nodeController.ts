import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { sshService } from '../services/sshService';
import { z } from 'zod';

const createNodeSchema = z.object({
    name: z.string().min(1),
    ipAddress: z.string().min(1), // IP address or hostname
    sshPort: z.number().default(22),
    sshUser: z.string().default('root'),
    sshKeyPath: z.string().optional(),
    sshPassword: z.string().optional(),
    osType: z.string().default('ubuntu'),
    maxRam: z.number().min(512), // MB
    maxCpu: z.number().min(1),
    maxDisk: z.number().min(1024), // MB
});

const updateNodeSchema = createNodeSchema.partial();

/**
 * List all nodes (Admin only)
 */
export const listNodes = async (req: AuthRequest, res: Response) => {
    try {
        const nodes = await prisma.node.findMany({
            include: {
                _count: {
                    select: { servers: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Sanitize sensitive data
        const sanitizedNodes = nodes.map((node: any) => ({
            ...node,
            sshPassword: undefined, // Never expose password
            sshKeyPath: node.sshKeyPath ? '[configured]' : null
        }));

        res.json(sanitizedNodes);
    } catch (error: any) {
        console.error('List nodes error:', error);
        res.status(500).json({ message: 'Failed to list nodes' });
    }
};

/**
 * Get single node (Admin only)
 */
export const getNode = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const node = await prisma.node.findUnique({
            where: { id },
            include: {
                servers: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        ramMb: true,
                        diskMb: true,
                        cpuCores: true
                    }
                },
                _count: {
                    select: { servers: true }
                }
            }
        });

        if (!node) {
            return res.status(404).json({ message: 'Node not found' });
        }

        res.json({
            ...node,
            sshPassword: undefined,
            sshKeyPath: node.sshKeyPath ? '[configured]' : null
        });
    } catch (error: any) {
        console.error('Get node error:', error);
        res.status(500).json({ message: 'Failed to get node' });
    }
};

/**
 * Create new node (Admin only)
 */
export const createNode = async (req: AuthRequest, res: Response) => {
    try {
        const data = createNodeSchema.parse(req.body);

        // Validate that at least one auth method is provided
        if (!data.sshKeyPath && !data.sshPassword) {
            return res.status(400).json({
                message: 'Either SSH key path or password is required'
            });
        }

        const node = await prisma.node.create({
            data: {
                name: data.name,
                ipAddress: data.ipAddress,
                sshPort: data.sshPort,
                sshUser: data.sshUser,
                sshKeyPath: data.sshKeyPath,
                sshPassword: data.sshPassword, // TODO: Encrypt this
                osType: data.osType,
                maxRam: data.maxRam,
                maxCpu: data.maxCpu,
                maxDisk: data.maxDisk,
                status: 'offline'
            }
        });

        res.status(201).json({
            ...node,
            sshPassword: undefined,
            sshKeyPath: node.sshKeyPath ? '[configured]' : null
        });
    } catch (error: any) {
        console.error('Create node error:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json({ message: 'Invalid data', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to create node' });
    }
};

/**
 * Update node (Admin only)
 */
export const updateNode = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data = updateNodeSchema.parse(req.body);

        const existingNode = await prisma.node.findUnique({ where: { id } });
        if (!existingNode) {
            return res.status(404).json({ message: 'Node not found' });
        }

        // Close existing SSH connection if settings changed
        if (data.ipAddress || data.sshPort || data.sshUser || data.sshKeyPath || data.sshPassword) {
            sshService.closeConnection(id);
        }

        const node = await prisma.node.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });

        res.json({
            ...node,
            sshPassword: undefined,
            sshKeyPath: node.sshKeyPath ? '[configured]' : null
        });
    } catch (error: any) {
        console.error('Update node error:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json({ message: 'Invalid data', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to update node' });
    }
};

/**
 * Delete node (Admin only)
 */
export const deleteNode = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Check if node has servers
        const serverCount = await prisma.server.count({
            where: { nodeId: id }
        });

        if (serverCount > 0) {
            return res.status(400).json({
                message: `Cannot delete node with ${serverCount} active server(s). Migrate or delete servers first.`
            });
        }

        // Close SSH connection
        sshService.closeConnection(id);

        await prisma.node.delete({ where: { id } });

        res.json({ message: 'Node deleted' });
    } catch (error: any) {
        console.error('Delete node error:', error);
        res.status(500).json({ message: 'Failed to delete node' });
    }
};

/**
 * Test SSH connection to a node (Admin only)
 */
export const testNodeConnection = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const node = await prisma.node.findUnique({ where: { id } });
        if (!node) {
            return res.status(404).json({ message: 'Node not found' });
        }

        const result = await sshService.testConnection({
            host: node.ipAddress,
            port: node.sshPort,
            username: node.sshUser,
            privateKeyPath: node.sshKeyPath || undefined,
            password: node.sshPassword || undefined
        });

        if (result.success) {
            // Update node status to online
            await prisma.node.update({
                where: { id },
                data: {
                    status: 'online',
                    lastPing: new Date()
                }
            });
        }

        res.json(result);
    } catch (error: any) {
        console.error('Test connection error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Connection test failed'
        });
    }
};

/**
 * Get node resource usage (Admin only)
 */
export const getNodeStats = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const node = await prisma.node.findUnique({ where: { id } });
        if (!node) {
            return res.status(404).json({ message: 'Node not found' });
        }

        // Execute stats command on node
        const result = await sshService.exec(id, `
            echo "{\\"hostname\\": \\"$(hostname)\\", \\"uptime\\": \\"$(uptime -p)\\", \\"load\\": \\"$(cat /proc/loadavg | cut -d' ' -f1-3)\\", \\"memTotal\\": $(free -m | awk '/Mem:/ {print $2}'), \\"memUsed\\": $(free -m | awk '/Mem:/ {print $3}'), \\"diskTotal\\": $(df -BM / | awk 'NR==2 {print $2}' | tr -d 'M'), \\"diskUsed\\": $(df -BM / | awk 'NR==2 {print $3}' | tr -d 'M')}"
        `);

        if (result.code !== 0) {
            throw new Error(result.stderr || 'Failed to get stats');
        }

        const stats = JSON.parse(result.stdout.trim());

        // Update node status
        await prisma.node.update({
            where: { id },
            data: {
                status: 'online',
                lastPing: new Date()
            }
        });

        res.json(stats);
    } catch (error: any) {
        console.error('Get node stats error:', error);

        // Mark node as offline
        await prisma.node.update({
            where: { id: req.params.id },
            data: { status: 'offline' }
        }).catch(() => { });

        res.status(500).json({
            message: error.message || 'Failed to get node stats'
        });
    }
};

/**
 * Get node allocations (Admin only)
 */
export const getNodeAllocations = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const allocations = await prisma.allocation.findMany({
            where: { nodeId: id },
            orderBy: { port: 'asc' }
        });
        res.json(allocations);
    } catch (error: any) {
        console.error('Get allocations error:', error);
        res.status(500).json({ message: 'Failed to get allocations' });
    }
};

/**
 * Create node allocations (Admin only)
 */
export const createNodeAllocations = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { ip, alias, ports } = req.body; // ports is array of strings "25565", "8000-8010"

        if (!ip || !Array.isArray(ports)) {
            return res.status(400).json({ message: 'IP and ports array required' });
        }

        const allocationsToCreate: any[] = [];

        for (const portEntry of ports) {
            if (typeof portEntry === 'string' && portEntry.includes('-')) {
                // Range
                const [start, end] = portEntry.split('-').map(Number);
                if (!isNaN(start) && !isNaN(end) && start <= end) {
                    for (let p = start; p <= end; p++) {
                        allocationsToCreate.push({
                            nodeId: id,
                            ip,
                            port: p,
                            alias: alias || null,
                            assigned: false
                        });
                    }
                }
            } else {
                // Single
                const port = Number(portEntry);
                if (!isNaN(port)) {
                    allocationsToCreate.push({
                        nodeId: id,
                        ip,
                        port,
                        alias: alias || null,
                        assigned: false
                    });
                }
            }
        }

        // Use createMany (skips duplicates if supported by DB config, but plain createMany might fail on conflict)
        // Prisma createMany skipDuplicates is supported in Postgres
        await prisma.allocation.createMany({
            data: allocationsToCreate,
            skipDuplicates: true
        });

        const newAllocations = await prisma.allocation.findMany({
            where: { nodeId: id },
            orderBy: { createdAt: 'desc' },
            take: allocationsToCreate.length
        });

        res.status(201).json(newAllocations);
    } catch (error: any) {
        console.error('Create allocations error:', error);
        res.status(500).json({ message: 'Failed to create allocations' });
    }
};

/**
 * Delete node allocation (Admin only)
 */
export const deleteNodeAllocation = async (req: AuthRequest, res: Response) => {
    try {
        const { id, allocationId } = req.params;

        const allocation = await prisma.allocation.findUnique({
            where: { id: allocationId }
        });

        if (!allocation || allocation.nodeId !== id) {
            return res.status(404).json({ message: 'Allocation not found' });
        }

        if (allocation.assigned) {
            return res.status(400).json({ message: 'Cannot delete assigned allocation' });
        }

        res.json({ message: 'Allocation deleted' });
    } catch (error: any) {
        console.error('Delete allocation error:', error);
        res.status(500).json({ message: 'Failed to delete allocation' });
    }
};

/**
 * Get deployment SSH key (Admin only)
 */
export const getDeploymentKey = async (req: AuthRequest, res: Response) => {
    try {
        const key = await sshService.getSystemPublicKey();
        res.json({ key });
    } catch (error: any) {
        console.error('Get deployment key error:', error);
        res.status(500).json({ message: 'Failed to get deployment key' });
    }
};
