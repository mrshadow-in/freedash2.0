import { Request, Response } from 'express';
import {
    getFileContent,
    writeFileContent,
    pullPteroFile,
    listFiles,
    deleteFile,
    updateStartupVariable,
    renamePteroFile,
    reinstallServer,
    uploadFileToPtero
} from '../services/pterodactyl';
import { prisma } from '../prisma';
import axios from 'axios';
import { AuthRequest } from '../middleware/auth';

// Helper to parse properties file
const CURSEFORGE_API_KEY = process.env.CURSEFORGE_API_KEY;

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
        const server = await prisma.server.findUnique({ where: { id: (id) } });

        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found or not initialized' });
        }

        // Verify ownership (prisma schema uses ownerId)
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        let content = '';
        try {
            content = await getFileContent(server.pteroIdentifier, 'server.properties') as string;
        } catch (err) {
            // If file doesn't exist, return empty properties
            console.log('server.properties not found, returning empty');
        }
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
        const updates = req.body;

        const server = await prisma.server.findUnique({ where: { id: (id) } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }

        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        let content = '';
        try {
            content = await getFileContent(server.pteroIdentifier, 'server.properties') as string;
        } catch (err) {
            // File doesn't exist, create new
            console.log('server.properties not found, creating new');
        }

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
        const { q, provider = 'spigot', limit = '12', sort } = req.query;
        if (!q) return res.json([]);

        const size = parseInt(limit as string) || 12;

        if (provider === 'modrinth') {
            // Modrinth Search (Ported from Addon)
            // Filter for bukkit/spigot/paper categories
            const facets = encodeURIComponent('["categories:bukkit","categories:spigot","categories:paper"]');

            // Map Sort
            let mrSort = 'relevance';
            if (sort === 'Downloads') mrSort = 'downloads';
            if (sort === 'Updated') mrSort = 'updated';
            if (sort === 'Created') mrSort = 'newest';

            const response = await axios.get(`https://api.modrinth.com/v2/search?query=${q}&limit=${size}&index=${mrSort}&facets=[["categories:bukkit","categories:spigot","categories:paper"]]`);

            const plugins = ((response.data as any).hits || []).map((p: any) => ({
                id: p.project_id,
                name: p.title,
                tag: p.description,
                likes: p.follows,
                downloads: p.downloads,
                icon: p.icon_url,
                provider: 'modrinth', // Tag provider
                testedVersions: p.versions // rough approximation
            }));
            res.json(plugins);
        } else if (provider === 'curseforge') {
            // CurseForge Search
            if (!CURSEFORGE_API_KEY) {
                return res.json([]); // Or error
            }
            // gameId=432 (Minecraft), classId=5 (Bukkit Plugins)
            // Sort: 1=Name, 2=Downloads, 3=Popularity, 4=Updated, 6=TotalDownloads
            let cfSort = 2; // Downloads
            if (sort === 'Updated') cfSort = 4;
            if (sort === 'Created') cfSort = 4;
            if (sort === 'Name') cfSort = 1;

            const url = `https://api.curseforge.com/v1/mods/search?gameId=432&classId=5&searchFilter=${q}&sortField=${cfSort}&sortOrder=desc&pageSize=${size}`;
            const response = await axios.get(url, { headers: { 'x-api-key': CURSEFORGE_API_KEY } });

            const plugins = ((response.data as any).data || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                tag: p.summary,
                likes: p.downloadCount, // Approximate likes with downloads
                downloads: p.downloadCount,
                icon: p.logo?.url,
                provider: 'curseforge',
                testedVersions: [] // CF versions strictly tied to files
            }));
            res.json(plugins);
        } else {
            // Spigot Search (Default)
            // Sort: -likes, -downloads, -updated, +name
            let spSort = '-likes';
            if (sort === 'Downloads') spSort = '-downloads';
            if (sort === 'Updated') spSort = '-updateDate';
            if (sort === 'Created') spSort = '-releaseDate';

            const response = await axios.get(`https://api.spiget.org/v2/search/resources/${q}?size=${size}&sort=${spSort}`);
            const plugins = (response.data as any).map((p: any) => ({
                id: p.id,
                name: p.name,
                tag: p.tag,
                likes: p.likes,
                downloads: p.downloads,
                icon: p.icon?.url ? `https://www.spigotmc.org/${p.icon.url}` : null,
                provider: 'spigot',
                testedVersions: p.testedVersions
            }));
            res.json(plugins);
        }
    } catch (error) {
        console.error('Error searching plugins:', error);
        res.status(500).json({ message: 'Failed to search plugins' });
    }
};

export const installPlugin = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { resourceId, provider = 'spigot' } = req.body;

        const server = await prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (!resourceId) return res.status(400).json({ message: 'Missing resourceId' });

        let downloadUrl = '';

        if (provider === 'modrinth') {
            // Modrinth: Fetch version to get download URL
            const verRes = await axios.get(`https://api.modrinth.com/v2/project/${resourceId}/version`);
            const versions = verRes.data as any[];
            if (!versions || versions.length === 0) {
                return res.status(404).json({ message: 'No versions found for this plugin' });
            }
            const latestVersion = versions[0];
            const file = latestVersion.files.find((f: any) => f.primary) || latestVersion.files[0];

            await pullPteroFile(server.pteroIdentifier, file.url, '/plugins');

        } else if (provider === 'curseforge') {
            // CurseForge: Fetch Files
            if (!CURSEFORGE_API_KEY) throw new Error('CurseForge API Key not configured');

            const filesRes = await axios.get(`https://api.curseforge.com/v1/mods/${resourceId}/files?pageSize=1`, {
                headers: { 'x-api-key': CURSEFORGE_API_KEY }
            });
            const files = (filesRes.data as any).data;
            if (!files || files.length === 0) return res.status(404).json({ message: 'No files found' });

            const file = files[0];
            const downloadUrl = file.downloadUrl;

            await pullPteroFile(server.pteroIdentifier, downloadUrl, '/plugins');

        } else {
            // Spigot: Proxy Download (Backend -> Ptero)
            const downloadUrl = `https://api.spiget.org/v2/resources/${resourceId}/download`;
            console.log(`[Plugin] Proxy downloading Spigot resource ${resourceId}...`);

            try {
                // 1. Download to memory
                const dlResponse = await axios.get(downloadUrl, {
                    responseType: 'arraybuffer',
                    headers: { 'User-Agent': 'FreeDash/2.0' }
                });

                if (!dlResponse.data) throw new Error('Empty response from Spigot');

                // 2. Upload to Server
                const finalName = req.body.fileName || `${resourceId}.jar`;
                const buf = Buffer.from(dlResponse.data as ArrayBuffer);
                console.log(`[Plugin] Uploading ${finalName} (${buf.length} bytes) to Pterodactyl...`);

                await uploadFileToPtero(server.pteroIdentifier, '/plugins', finalName, buf);
                console.log(`[Plugin] Upload success.`);
            } catch (err: any) {
                console.error('[Plugin] Proxy Download/Upload Failed:', err.message);
                if (err.response) {
                    console.error('Upstream Response:', err.response.status, err.response.data instanceof Buffer ? (err.response.data as Buffer).toString('utf8').substring(0, 100) : err.response.data);
                }
                throw new Error('Failed to proxy download/upload plugin: ' + err.message);
            }
        }

        res.json({ message: `Plugin installation started from ${provider}` });
    } catch (error) {
        console.error('Error installing plugin:', error);
        res.status(500).json({ message: 'Failed to install plugin' });
    }
};

// Get list of installed plugins
export const getInstalledPlugins = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const server = await prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // List files in /plugins directory
        const files = await listFiles(server.pteroIdentifier, '/plugins');

        // Filter for .jar files only
        const plugins = files
            .filter((file: any) => file.attributes.name.endsWith('.jar'))
            .map((file: any) => ({
                name: file.attributes.name,
                size: file.attributes.size,
                modified: file.attributes.modified_at
            }));

        res.json(plugins);
    } catch (error: any) {
        console.error('Error fetching installed plugins:', error);
        // Return empty array if directory doesn't exist
        res.json([]);
    }
};

// Delete a plugin
export const deletePlugin = async (req: AuthRequest, res: Response) => {
    try {
        const { id, filename } = req.params;

        const server = await prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Delete the plugin file
        await deleteFile(server.pteroIdentifier, '/plugins', [filename]);

        res.json({ message: 'Plugin deleted successfully' });
    } catch (error) {
        console.error('Error deleting plugin:', error);
        res.status(500).json({ message: 'Failed to delete plugin' });
    }
};

// Change server version
export const changeServerVersion = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { version } = req.body;

        if (!version) {
            return res.status(400).json({ message: 'Version is required' });
        }

        if (!version) {
            return res.status(400).json({ message: 'Version is required' });
        }

        const server = await prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // 1. Update MINECRAFT_VERSION variable
        await updateStartupVariable(server.pteroIdentifier, 'MINECRAFT_VERSION', version);

        // 2. Trigger Server Reinstall
        // This will stop the server and run the egg's install script which downloads the version
        await reinstallServer(server.pteroIdentifier);

        res.json({
            message: `Server version set to ${version}. Reinstall started automatically to apply changes.`,
            version
        });
    } catch (error) {
        console.error('Error changing server version:', error);
        res.status(500).json({ message: 'Failed to change version' });
    }
};

// Get Minecraft versions from Mojang API
export const getMinecraftVersions = async (req: AuthRequest, res: Response) => {
    try {
        const { getMinecraftVersions: fetchVersions } = await import('../services/minecraft');
        const versions = await fetchVersions();
        res.json(versions);
    } catch (error) {
        console.error('Error fetching Minecraft versions:', error);
        res.status(500).json({ message: 'Failed to fetch versions' });
    }
};

// Get Paper versions
export const getPaperVersions = async (req: AuthRequest, res: Response) => {
    try {
        const { getPaperVersions: fetchPaperVersions } = await import('../services/minecraft');
        const versions = await fetchPaperVersions();
        res.json(versions);
    } catch (error) {
        console.error('Error fetching Paper versions:', error);
        res.status(500).json({ message: 'Failed to fetch Paper versions' });
    }
};
