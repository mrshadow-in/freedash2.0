import { Request, Response } from 'express';
import {
    getFileContent,
    writeFileContent,
    pullPteroFile
} from '../services/pterodactyl';
import { prisma } from '../prisma';
import axios from 'axios';
import { AuthRequest } from '../middleware/auth';

// Helper to parse properties file
const parseProperties = (content: string) => {
    const lines = content.split('\n');
    const properties: Record<string, string> = {};
    lines.forEach(line => {
        if (line.trim().startsWith('#') || !line.includes('=')) return;
        const [key, ...rest] = line.split('=');
        properties[key.trim()] = rest.join('=').trim();
    });
    return properties;
};

// Helper to serialize properties
const serializeProperties = (originalContent: string, updates: Record<string, string>) => {
    const lines = originalContent.split('\n');
    const newLines: string[] = [];
    const updatedKeys = new Set(Object.keys(updates));

    // Update existing lines
    lines.forEach(line => {
        if (line.trim().startsWith('#') || !line.includes('=')) {
            newLines.push(line);
            return;
        }
        const [key] = line.split('=');
        const trimKey = key.trim();
        if (updates[trimKey] !== undefined) {
            newLines.push(`${trimKey}=${updates[trimKey]}`);
            updatedKeys.delete(trimKey);
        } else {
            newLines.push(line);
        }
    });

    // Append new keys if any (though usually server.properties has fixed keys)
    updatedKeys.forEach(key => {
        newLines.push(`${key}=${updates[key]}`);
    });

    return newLines.join('\n');
};

export const getServerProperties = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const server = await prisma.server.findUnique({ where: { id: (id) } }); // ID is string uuid? NO.
        // Wait, Server ID in API is usually UUID (from database). Pterodactyl requires Ptero Identifier.
        // Let's check Schema. Server.id is String (UUID).
        // Server has pteroIdentifier (string) and pteroServerId (int).

        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found or not initialized' });
        }

        // Verify ownership
        if (server.userId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const content = await getFileContent(server.pteroIdentifier, 'server.properties');
        const properties = parseProperties(content);
        res.json(properties);
    } catch (error) {
        console.error('Error fetching properties:', error);
        res.status(500).json({ message: 'Failed to fetch server.properties' });
    }
};

export const updateServerProperties = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body; // Record<string, string | boolean | number>

        const server = await prisma.server.findUnique({ where: { id: (id) } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }

        if (server.userId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const content = await getFileContent(server.pteroIdentifier, 'server.properties');

        // Convert all values to string
        const stringUpdates: Record<string, string> = {};
        Object.entries(updates).forEach(([k, v]) => {
            stringUpdates[k] = String(v);
        });

        const newContent = serializeProperties(content, stringUpdates);
        await writeFileContent(server.pteroIdentifier, 'server.properties', newContent);

        res.json({ message: 'Properties updated successfully' });
    } catch (error) {
        console.error('Error updating properties:', error);
        res.status(500).json({ message: 'Failed to update server.properties' });
    }
};

export const searchPlugins = async (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        // Use Spiget API
        const response = await axios.get(`https://api.spiget.org/v2/search/resources/${q}?size=20&sort=-likes`);
        const plugins = response.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            tag: p.tag,
            likes: p.likes,
            downloads: p.downloads,
            icon: p.icon?.url ? `https://www.spigotmc.org/${p.icon.url}` : null,
            testedVersions: p.testedVersions
        }));
        res.json(plugins);
    } catch (error) {
        console.error('Error searching plugins:', error);
        res.status(500).json({ message: 'Failed to search plugins' });
    }
};

export const installPlugin = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { downloadUrl, fileName } = req.body;

        const server = await prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.userId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Typically Spiget download URL is complicated. 
        // Ideally we use: https://api.spiget.org/v2/resources/[ID]/download
        // But the frontend should pass the Resource ID and we construct the URL?
        // Or frontend passes URL.
        // Let's accept Resource ID.

        const resourceId = req.body.resourceId;
        if (!resourceId) return res.status(400).json({ message: 'Missing resourceId' });

        // Construct download URL
        const realDownloadUrl = `https://api.spiget.org/v2/resources/${resourceId}/download`;

        // Pterodactyl Pull
        await pullPteroFile(server.pteroIdentifier, realDownloadUrl, '/plugins');

        res.json({ message: 'Plugin installation started' });
    } catch (error) {
        console.error('Error installing plugin:', error);
        res.status(500).json({ message: 'Failed to install plugin' });
    }
};
