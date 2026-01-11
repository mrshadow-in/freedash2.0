"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaperVersions = exports.getMinecraftVersions = exports.changeServerVersion = exports.deletePlugin = exports.getInstalledPlugins = exports.installPlugin = exports.searchPlugins = exports.updateServerProperties = exports.getServerProperties = void 0;
const pterodactyl_1 = require("../services/pterodactyl");
const prisma_1 = require("../prisma");
const axios_1 = __importDefault(require("axios"));
// Helper to parse properties file
const CURSEFORGE_API_KEY = process.env.CURSEFORGE_API_KEY;
const parseProperties = (content) => {
    const lines = content.split('\n');
    const properties = {};
    lines.forEach(line => {
        if (line.trim().startsWith('#') || !line.includes('='))
            return;
        const [key, ...rest] = line.split('=');
        properties[key.trim()] = rest.join('=').trim();
    });
    return properties;
};
// Helper to serialize properties
const serializeProperties = (originalContent, updates) => {
    const lines = originalContent.split('\n');
    const newLines = [];
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
        }
        else {
            newLines.push(line);
        }
    });
    // Append new keys if any (though usually server.properties has fixed keys)
    updatedKeys.forEach(key => {
        newLines.push(`${key}=${updates[key]}`);
    });
    return newLines.join('\n');
};
const getServerProperties = async (req, res) => {
    try {
        const { id } = req.params;
        const server = await prisma_1.prisma.server.findUnique({ where: { id: (id) } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found or not initialized' });
        }
        // Verify ownership (prisma schema uses ownerId)
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        let content = '';
        try {
            content = await (0, pterodactyl_1.getFileContent)(server.pteroIdentifier, 'server.properties');
        }
        catch (err) {
            // If file doesn't exist, return empty properties
            console.log('server.properties not found, returning empty');
        }
        const properties = parseProperties(content);
        res.json(properties);
    }
    catch (error) {
        console.error('Error fetching properties:', error);
        res.status(500).json({ message: 'Failed to fetch server.properties' });
    }
};
exports.getServerProperties = getServerProperties;
const updateServerProperties = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const server = await prisma_1.prisma.server.findUnique({ where: { id: (id) } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        let content = '';
        try {
            content = await (0, pterodactyl_1.getFileContent)(server.pteroIdentifier, 'server.properties');
        }
        catch (err) {
            // File doesn't exist, create new
            console.log('server.properties not found, creating new');
        }
        const stringUpdates = {};
        Object.entries(updates).forEach(([k, v]) => {
            stringUpdates[k] = String(v);
        });
        const newContent = serializeProperties(content, stringUpdates);
        await (0, pterodactyl_1.writeFileContent)(server.pteroIdentifier, 'server.properties', newContent);
        res.json({ message: 'Properties updated successfully' });
    }
    catch (error) {
        console.error('Error updating properties:', error);
        res.status(500).json({ message: 'Failed to update server.properties' });
    }
};
exports.updateServerProperties = updateServerProperties;
const searchPlugins = async (req, res) => {
    try {
        const { q, provider = 'spigot', limit = '12', sort } = req.query;
        if (!q)
            return res.json([]);
        const size = parseInt(limit) || 12;
        if (provider === 'modrinth') {
            // Modrinth Search (Ported from Addon)
            // Filter for bukkit/spigot/paper categories
            const facets = encodeURIComponent('["categories:bukkit","categories:spigot","categories:paper"]');
            // Map Sort
            let mrSort = 'relevance';
            if (sort === 'Downloads')
                mrSort = 'downloads';
            if (sort === 'Updated')
                mrSort = 'updated';
            if (sort === 'Created')
                mrSort = 'newest';
            const response = await axios_1.default.get(`https://api.modrinth.com/v2/search?query=${q}&limit=${size}&index=${mrSort}&facets=[["categories:bukkit","categories:spigot","categories:paper"]]`);
            const plugins = (response.data.hits || []).map((p) => ({
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
        }
        else if (provider === 'curseforge') {
            // CurseForge Search
            if (!CURSEFORGE_API_KEY) {
                return res.json([]); // Or error
            }
            // gameId=432 (Minecraft), classId=5 (Bukkit Plugins)
            // Sort: 1=Name, 2=Downloads, 3=Popularity, 4=Updated, 6=TotalDownloads
            let cfSort = 2; // Downloads
            if (sort === 'Updated')
                cfSort = 4;
            if (sort === 'Created')
                cfSort = 4;
            if (sort === 'Name')
                cfSort = 1;
            const url = `https://api.curseforge.com/v1/mods/search?gameId=432&classId=5&searchFilter=${q}&sortField=${cfSort}&sortOrder=desc&pageSize=${size}`;
            const response = await axios_1.default.get(url, { headers: { 'x-api-key': CURSEFORGE_API_KEY } });
            const plugins = (response.data.data || []).map((p) => ({
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
        }
        else {
            // Spigot Search (Default)
            // Sort: -likes, -downloads, -updated, +name
            let spSort = '-likes';
            if (sort === 'Downloads')
                spSort = '-downloads';
            if (sort === 'Updated')
                spSort = '-updateDate';
            if (sort === 'Created')
                spSort = '-releaseDate';
            const response = await axios_1.default.get(`https://api.spiget.org/v2/search/resources/${q}?size=${size}&sort=${spSort}`);
            const plugins = response.data.map((p) => ({
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
    }
    catch (error) {
        console.error('Error searching plugins:', error);
        res.status(500).json({ message: 'Failed to search plugins' });
    }
};
exports.searchPlugins = searchPlugins;
const installPlugin = async (req, res) => {
    try {
        const { id } = req.params;
        const { resourceId, provider = 'spigot' } = req.body;
        const server = await prisma_1.prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!resourceId)
            return res.status(400).json({ message: 'Missing resourceId' });
        let downloadUrl = '';
        if (provider === 'modrinth') {
            // Modrinth: Fetch version to get download URL
            const verRes = await axios_1.default.get(`https://api.modrinth.com/v2/project/${resourceId}/version`);
            const versions = verRes.data;
            if (!versions || versions.length === 0) {
                return res.status(404).json({ message: 'No versions found for this plugin' });
            }
            const latestVersion = versions[0];
            const file = latestVersion.files.find((f) => f.primary) || latestVersion.files[0];
            await (0, pterodactyl_1.pullPteroFile)(server.pteroIdentifier, file.url, '/plugins');
        }
        else if (provider === 'curseforge') {
            // CurseForge: Fetch Files
            if (!CURSEFORGE_API_KEY)
                throw new Error('CurseForge API Key not configured');
            const filesRes = await axios_1.default.get(`https://api.curseforge.com/v1/mods/${resourceId}/files?pageSize=1`, {
                headers: { 'x-api-key': CURSEFORGE_API_KEY }
            });
            const files = filesRes.data.data;
            if (!files || files.length === 0)
                return res.status(404).json({ message: 'No files found' });
            const file = files[0];
            const downloadUrl = file.downloadUrl;
            await (0, pterodactyl_1.pullPteroFile)(server.pteroIdentifier, downloadUrl, '/plugins');
        }
        else {
            // Spigot: Proxy Download (Backend -> Ptero)
            const downloadUrl = `https://api.spiget.org/v2/resources/${resourceId}/download`;
            console.log(`[Plugin] Proxy downloading Spigot resource ${resourceId}...`);
            try {
                // 1. Download to memory
                const dlResponse = await axios_1.default.get(downloadUrl, {
                    responseType: 'arraybuffer',
                    headers: { 'User-Agent': 'FreeDash/2.0' }
                });
                if (!dlResponse.data)
                    throw new Error('Empty response from Spigot');
                // 2. Upload to Server
                const finalName = req.body.fileName || `${resourceId}.jar`;
                const buf = Buffer.from(dlResponse.data);
                console.log(`[Plugin] Uploading ${finalName} (${buf.length} bytes) to Pterodactyl...`);
                await (0, pterodactyl_1.uploadFileToPtero)(server.pteroIdentifier, '/plugins', finalName, buf);
                console.log(`[Plugin] Upload success.`);
            }
            catch (err) {
                console.error('[Plugin] Proxy Download/Upload Failed:', err.message);
                if (err.response) {
                    console.error('Upstream Response:', err.response.status, err.response.data instanceof Buffer ? err.response.data.toString('utf8').substring(0, 100) : err.response.data);
                }
                throw new Error('Failed to proxy download/upload plugin: ' + err.message);
            }
        }
        res.json({ message: `Plugin installation started from ${provider}` });
    }
    catch (error) {
        console.error('Error installing plugin:', error);
        res.status(500).json({ message: 'Failed to install plugin' });
    }
};
exports.installPlugin = installPlugin;
// Get list of installed plugins
const getInstalledPlugins = async (req, res) => {
    try {
        const { id } = req.params;
        const server = await prisma_1.prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        // List files in /plugins directory
        const files = await (0, pterodactyl_1.listFiles)(server.pteroIdentifier, '/plugins');
        // Filter for .jar files only
        const plugins = files
            .filter((file) => file.attributes.name.endsWith('.jar'))
            .map((file) => ({
            name: file.attributes.name,
            size: file.attributes.size,
            modified: file.attributes.modified_at
        }));
        res.json(plugins);
    }
    catch (error) {
        console.error('Error fetching installed plugins:', error);
        // Return empty array if directory doesn't exist
        res.json([]);
    }
};
exports.getInstalledPlugins = getInstalledPlugins;
// Delete a plugin
const deletePlugin = async (req, res) => {
    try {
        const { id, filename } = req.params;
        const server = await prisma_1.prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        // Delete the plugin file
        await (0, pterodactyl_1.deleteFile)(server.pteroIdentifier, '/plugins', [filename]);
        res.json({ message: 'Plugin deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting plugin:', error);
        res.status(500).json({ message: 'Failed to delete plugin' });
    }
};
exports.deletePlugin = deletePlugin;
// Change server version
const changeServerVersion = async (req, res) => {
    try {
        const { id } = req.params;
        const { version } = req.body;
        if (!version) {
            return res.status(400).json({ message: 'Version is required' });
        }
        if (!version) {
            return res.status(400).json({ message: 'Version is required' });
        }
        const server = await prisma_1.prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        // 1. Update MINECRAFT_VERSION variable
        await (0, pterodactyl_1.updateStartupVariable)(server.pteroIdentifier, 'MINECRAFT_VERSION', version);
        // 2. Trigger Server Reinstall
        // This will stop the server and run the egg's install script which downloads the version
        await (0, pterodactyl_1.reinstallServer)(server.pteroIdentifier);
        res.json({
            message: `Server version set to ${version}. Reinstall started automatically to apply changes.`,
            version
        });
    }
    catch (error) {
        console.error('Error changing server version:', error);
        res.status(500).json({ message: 'Failed to change version' });
    }
};
exports.changeServerVersion = changeServerVersion;
// Get Minecraft versions from Mojang API
const getMinecraftVersions = async (req, res) => {
    try {
        const { getMinecraftVersions: fetchVersions } = await Promise.resolve().then(() => __importStar(require('../services/minecraft')));
        const versions = await fetchVersions();
        res.json(versions);
    }
    catch (error) {
        console.error('Error fetching Minecraft versions:', error);
        res.status(500).json({ message: 'Failed to fetch versions' });
    }
};
exports.getMinecraftVersions = getMinecraftVersions;
// Get Paper versions
const getPaperVersions = async (req, res) => {
    try {
        const { getPaperVersions: fetchPaperVersions } = await Promise.resolve().then(() => __importStar(require('../services/minecraft')));
        const versions = await fetchPaperVersions();
        res.json(versions);
    }
    catch (error) {
        console.error('Error fetching Paper versions:', error);
        res.status(500).json({ message: 'Failed to fetch Paper versions' });
    }
};
exports.getPaperVersions = getPaperVersions;
