"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeDeployment = exports.createNode = exports.getLocations = exports.getNodes = void 0;
const pterodactyl_1 = require("../services/pterodactyl");
const zod_1 = require("zod");
const createNodeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    location_id: zod_1.z.number(),
    fqdn: zod_1.z.string().min(1),
    scheme: zod_1.z.enum(['http', 'https']).default('https'),
    memory: zod_1.z.number().min(1024),
    memory_overallocate: zod_1.z.number().default(0),
    disk: zod_1.z.number().min(1024),
    disk_overallocate: zod_1.z.number().default(0),
    upload_size: zod_1.z.number().default(100),
    daemon_sftp: zod_1.z.number().default(2022),
    daemon_listen: zod_1.z.number().default(8080)
});
const getNodes = async (req, res) => {
    try {
        const nodes = await (0, pterodactyl_1.getPteroNodes)();
        res.json(nodes);
    }
    catch (error) {
        console.error('Error fetching nodes:', error);
        res.status(500).json({ message: 'Failed to fetch nodes from Pterodactyl' });
    }
};
exports.getNodes = getNodes;
const getLocations = async (req, res) => {
    try {
        const locations = await (0, pterodactyl_1.getPteroLocations)();
        res.json(locations);
    }
    catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({ message: 'Failed to fetch locations' });
    }
};
exports.getLocations = getLocations;
const createNode = async (req, res) => {
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
        const newNode = await (0, pterodactyl_1.createPteroNode)(nodeData);
        res.status(201).json(newNode);
    }
    catch (error) {
        console.error('Error creating node:', error);
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ message: 'Invalid data', errors: error.issues });
        }
        else {
            res.status(500).json({ message: 'Failed to create node. Check Pterodactyl logs.' });
        }
    }
};
exports.createNode = createNode;
const getNodeDeployment = async (req, res) => {
    try {
        const { id } = req.params;
        const config = await (0, pterodactyl_1.getPteroNodeConfiguration)(Number(id));
        // Pterodactyl return configuration JSON. We can construct the command here or send JSON.
        // Usually it returns 'token', 'uuid', etc.
        // We will send the whole config object.
        const panelUrl = await (0, pterodactyl_1.getPteroUrl)();
        res.json({ ...config, panelUrl });
    }
    catch (error) {
        console.error('Error fetching node deployment:', error);
        res.status(500).json({ message: 'Failed to fetch deployment info' });
    }
};
exports.getNodeDeployment = getNodeDeployment;
