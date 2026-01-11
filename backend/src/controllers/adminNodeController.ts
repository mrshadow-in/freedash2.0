import { Request, Response } from 'express';
import {
    getPteroNodes,
    createPteroNode,
    getPteroLocations,
    getPteroNodeConfiguration,
    getPteroUrl
} from '../services/pterodactyl';
import { z } from 'zod';

const createNodeSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    location_id: z.number(),
    fqdn: z.string().min(1),
    scheme: z.enum(['http', 'https']).default('https'),
    memory: z.number().min(1024),
    memory_overallocate: z.number().default(0),
    disk: z.number().min(1024),
    disk_overallocate: z.number().default(0),
    upload_size: z.number().default(100),
    daemon_sftp: z.number().default(2022),
    daemon_listen: z.number().default(8080)
});

export const getNodes = async (req: Request, res: Response) => {
    try {
        const nodes = await getPteroNodes();
        res.json(nodes);
    } catch (error) {
        console.error('Error fetching nodes:', error);
        res.status(500).json({ message: 'Failed to fetch nodes from Pterodactyl' });
    }
};

export const getLocations = async (req: Request, res: Response) => {
    try {
        const locations = await getPteroLocations();
        res.json(locations);
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({ message: 'Failed to fetch locations' });
    }
};

export const createNode = async (req: Request, res: Response) => {
    try {
        const data = createNodeSchema.parse(req.body);

        // Prepare payload for Pterodactyl
        // Pterodactyl expects specific fields.
        const nodeData = {
            name: data.name,
            description: data.description,
            location_id: data.location_id,
            public: 1, // Always public for now
            fqdn: data.fqdn,
            scheme: data.scheme,
            behind_proxy: 0,
            memory: data.memory,
            memory_overallocate: data.memory_overallocate,
            disk: data.disk,
            disk_overallocate: data.disk_overallocate,
            upload_size: data.upload_size,
            daemon_sftp: data.daemon_sftp,
            daemon_listen: data.daemon_listen
        };

        const newNode = await createPteroNode(nodeData);
        res.status(201).json(newNode);
    } catch (error) {
        console.error('Error creating node:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Invalid data', errors: error.issues });
        } else {
            res.status(500).json({ message: 'Failed to create node. Check Pterodactyl logs.' });
        }
    }
};

export const getNodeDeployment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const config = await getPteroNodeConfiguration(Number(id));

        // Pterodactyl return configuration JSON. We can construct the command here or send JSON.
        // Usually it returns 'token', 'uuid', etc.
        // We will send the whole config object.

        const panelUrl = await getPteroUrl();
        res.json({ ...config, panelUrl });
    } catch (error) {
        console.error('Error fetching node deployment:', error);
        res.status(500).json({ message: 'Failed to fetch deployment info' });
    }
};
