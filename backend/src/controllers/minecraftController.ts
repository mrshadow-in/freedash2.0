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
import { getSettingsOrCreate } from '../services/settingsService';

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
        const { q, provider = 'spigot', version } = req.query;
        if (!q) return res.json([]);

        const settings = await getSettingsOrCreate();
        const keys = (settings.plugins as any) || {};

        if (provider === 'modrinth') {
            // Modrinth Search - STRICT plugins only
            const facetList = [
                ["project_type:plugin"],
                ["categories:bukkit", "categories:spigot", "categories:paper"]
            ];

            if (version && version !== 'latest') {
                facetList.push([`versions:${version}`]);
            }

            const facetsString = JSON.stringify(facetList);
            const response = await axios.get(`https://api.modrinth.com/v2/search`, {
                params: {
                    query: q,
                    limit: 20,
                    facets: facetsString
                }
            });

            const plugins = ((response.data as any).hits || []).map((p: any) => ({
                id: p.project_id,
                name: p.title,
                tag: p.description,
                likes: p.follows,
                downloads: p.downloads,
                icon: p.icon_url,
                provider: 'modrinth',
                testedVersions: p.versions
            }));
            res.json(plugins);
        } else if (provider === 'hangar') {
            const response = await axios.get(`https://hangar.papermc.io/api/v1/projects?q=${q}&limit=20&offset=0`);
            const plugins = ((response.data as any).result || []).map((p: any) => ({
                id: p.namespace.slug, // Use slug as ID for Hangar
                name: p.name,
                tag: p.description,
                likes: p.stats.stars,
                downloads: p.stats.downloads,
                icon: p.avatarUrl,
                provider: 'hangar',
                testedVersions: [] // Hangar structure is complex
            }));
            res.json(plugins);

        } else if (provider === 'polymart') {
            // Polymart Search
            const response = await axios.get(`https://api.polymart.org/v1/search?query=${q}&limit=20&start=0`);
            const plugins = ((response.data as any).response?.result || []).map((p: any) => ({
                id: p.id,
                name: p.title,
                tag: p.subtitle,
                likes: p.stars,
                downloads: p.downloads,
                icon: p.url_icon, // Polymart icon
                provider: 'polymart',
                testedVersions: []
            }));
            res.json(plugins);

        } else if (provider === 'curseforge') {
            // CurseForge Search - STRICT Bukkit Plugins (Class ID 5)
            const apiKey = keys.curseforge_api_key;
            if (!apiKey) return res.json([]); // Return empty if no key

            const response = await axios.get(`https://api.curseforge.com/v1/mods/search`, {
                headers: { 'x-api-key': apiKey },
                params: {
                    gameId: 432, // Minecraft
                    classId: 5,  // Bukkit Plugins (CRITICAL: Excludes Mods/Modpacks)
                    searchFilter: q,
                    pageSize: 20,
                    sortOrder: 'desc'
                }
            });

            const plugins = ((response.data as any).data || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                tag: p.summary,
                likes: p.thumbsUpCount || 0,
                downloads: p.downloadCount,
                icon: p.logo?.thumbnailUrl,
                provider: 'curseforge',
                testedVersions: []
            }));
            res.json(plugins);

        } else {
            // Spigot Search (Default)
            const response = await axios.get(`https://api.spiget.org/v2/search/resources/${q}?size=20&sort=-likes`);
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
        const { resourceId, provider = 'spigot', fileName } = req.body;

        const server = await prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (!resourceId) return res.status(400).json({ message: 'Missing resourceId' });

        const settings = await getSettingsOrCreate();
        const keys = (settings.plugins as any) || {};

        if (provider === 'modrinth') {
            const verRes = await axios.get(`https://api.modrinth.com/v2/project/${resourceId}/version`);
            const versions = verRes.data as any[];
            if (!versions || versions.length === 0) return res.status(404).json({ message: 'No versions found' });
            const latestVersion = versions[0];
            const file = latestVersion.files.find((f: any) => f.primary) || latestVersion.files[0];
            await pullPteroFile(server.pteroIdentifier, file.url, '/plugins');

        } else if (provider === 'hangar') {
            // Hangar Install
            const verRes = await axios.get(`https://hangar.papermc.io/api/v1/projects/${resourceId}/versions?limit=1&offset=0`);
            const versions = (verRes.data as any).result || [];
            if (versions.length === 0) return res.status(404).json({ message: 'No versions found' });

            const latest = versions[0];
            // Hangar downloads are tricky, often need direct logic
            // Assuming platform 'PAPER' usually.
            const downloads = latest.downloads || {};
            const platform = Object.keys(downloads)[0]; // Pick first, e.g. PAPER
            if (!platform) return res.status(404).json({ message: 'No download platform found' });

            const downloadUrl = downloads[platform].downloadUrl;
            // Need full URL sometimes or it's relative? Hangar V1 usually gives full URL or we construct.
            // If relative: `https://hangar.papermc.io/api/v1/projects/${resourceId}/versions/${latest.name}/${platform}/download`
            // Let's rely on `downloadUrl` if absolute.
            await pullPteroFile(server.pteroIdentifier, downloadUrl, '/plugins');

        } else if (provider === 'polymart') {
            // Polymart Install (Proxy? Or Direct?)
            // Addon uses getDownloadURL then pull.
            const response = await axios.post('https://api.polymart.org/v1/getDownloadURL', {
                resource_id: resourceId,
                version_id: 'latest',
                // service: 'pterodactyl-addon' // optional
            });
            const url = (response.data as any).response?.url;
            if (!url) return res.status(404).json({ message: 'Could not get download URL from Polymart' });

            await pullPteroFile(server.pteroIdentifier, url, '/plugins');

        } else if (provider === 'curseforge') {
            const apiKey = keys.curseforge_api_key;
            if (!apiKey) return res.status(400).json({ message: 'CurseForge API Key not configured in Admin' });

            const response = await axios.get(`https://api.curseforge.com/v1/mods/${resourceId}/files`, {
                headers: { 'x-api-key': apiKey },
                params: { pageSize: 1 }
            });

            const files = (response.data as any).data || [];
            if (files.length === 0) return res.status(404).json({ message: 'No files found' });

            const file = files[0];
            const url = file.downloadUrl;
            if (!url) return res.status(404).json({ message: 'No download URL for this file' });

            await pullPteroFile(server.pteroIdentifier, url, '/plugins');

        } else {
            // Spigot: Proxy Download (Backend -> Ptero)
            const downloadUrl = `https://api.spiget.org/v2/resources/${resourceId}/download`;
            // 1. Download to memory
            const dlResponse = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'FreeDash/2.0' }
            });
            // 2. Upload
            const finalName = fileName || `${resourceId}.jar`;
            await uploadFileToPtero(server.pteroIdentifier, '/plugins', finalName, Buffer.from(dlResponse.data as ArrayBuffer));
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
