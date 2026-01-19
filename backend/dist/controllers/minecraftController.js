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
exports.getPaperVersions = exports.getMinecraftVersions = exports.changeServerVersion = exports.deletePlugin = exports.getInstalledPlugins = exports.installPlugin = exports.getPluginVersions = exports.searchPlugins = exports.updateServerProperties = exports.getServerProperties = void 0;
const pterodactyl_1 = require("../services/pterodactyl");
const prisma_1 = require("../prisma");
const axios_1 = __importDefault(require("axios"));
const settingsService_1 = require("../services/settingsService");
// Helper to parse properties file
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
        const { q, provider = 'modrinth', category = 'plugin', version } = req.query;
        const settings = await (0, settingsService_1.getSettingsOrCreate)();
        const keys = settings.plugins || {};
        if (provider === 'modrinth') {
            // Modrinth Search with Category Support
            const facetList = [];
            // Category filter
            if (category === 'plugin') {
                facetList.push(["project_type:plugin"]);
                facetList.push(["categories:bukkit", "categories:paper", "categories:spigot"]);
            }
            else if (category === 'mod') {
                facetList.push(["project_type:mod"]);
                facetList.push(["categories:fabric", "categories:forge", "categories:quilt"]);
            }
            else if (category === 'modpack') {
                facetList.push(["project_type:modpack"]);
            }
            // Version filter
            if (version && version !== 'latest') {
                facetList.push([`versions:${version}`]);
            }
            const facetsString = JSON.stringify(facetList);
            const response = await axios_1.default.get(`https://api.modrinth.com/v2/search`, {
                params: {
                    query: q || '', // Empty query returns all, sorted by relevance/downloads
                    limit: 20,
                    facets: facetsString,
                    index: 'downloads' // Sort by downloads (most popular first)
                }
            });
            const plugins = (response.data.hits || []).map((p) => ({
                id: p.project_id,
                slug: p.slug,
                name: p.title,
                description: p.description,
                downloads: p.downloads,
                follows: p.follows, // ⭐ Stars
                icon: p.icon_url,
                dateModified: p.date_modified, // 🕒 Last updated
                provider: 'modrinth',
                versions: p.versions,
                categories: p.categories,
                projectType: p.project_type // "plugin", "mod", "modpack"
            }));
            res.json(plugins);
        }
        else if (provider === 'hangar') {
            const response = await axios_1.default.get(`https://hangar.papermc.io/api/v1/projects?q=${q || ''}&limit=20&offset=0`);
            const plugins = (response.data.result || []).map((p) => ({
                id: p.namespace?.slug || p.name, // Use slug as ID for Hangar
                slug: p.namespace?.slug || p.name,
                name: p.name,
                description: p.description || 'No description available',
                downloads: p.stats?.downloads || 0,
                follows: p.stats?.stars || 0, // ⭐ Stars
                icon: p.avatarUrl || null,
                dateModified: p.lastUpdated || new Date().toISOString(),
                provider: 'hangar',
                versions: [], // Hangar structure is complex
                categories: p.category ? [p.category] : [],
                projectType: 'plugin' // Hangar is plugins only
            }));
            res.json(plugins);
        }
        else if (provider === 'polymart') {
            // Polymart Search
            const response = await axios_1.default.get(`https://api.polymart.org/v1/search?query=${q || ''}&limit=20&start=0`);
            const plugins = (response.data.response?.result || []).map((p) => ({
                id: p.id,
                slug: p.id.toString(),
                name: p.title,
                description: p.subtitle || 'No description available',
                downloads: p.downloads || 0,
                follows: p.stars || 0,
                icon: p.url_icon, // Polymart icon
                dateModified: p.updateDate || new Date().toISOString(),
                provider: 'polymart',
                versions: [],
                categories: [],
                projectType: 'plugin'
            }));
            res.json(plugins);
        }
        else if (provider === 'curseforge') {
            // CurseForge Search - STRICT Bukkit Plugins (Class ID 5)
            const apiKey = keys.curseforge_api_key;
            if (!apiKey) {
                console.log('[CurseForge] API key not configured');
                return res.json([]); // Return empty if no key
            }
            const response = await axios_1.default.get(`https://api.curseforge.com/v1/mods/search`, {
                headers: { 'x-api-key': apiKey },
                params: {
                    gameId: 432, // Minecraft
                    classId: 5, // Bukkit Plugins (CRITICAL: Excludes Mods/Modpacks)
                    searchFilter: q || '',
                    pageSize: 20,
                    sortOrder: 'desc'
                }
            });
            const plugins = (response.data.data || []).map((p) => ({
                id: p.id,
                slug: p.slug,
                name: p.name,
                description: p.summary || 'No description available',
                downloads: p.downloadCount || 0,
                follows: p.thumbsUpCount || 0,
                icon: p.logo?.thumbnailUrl || null,
                dateModified: p.dateModified || new Date().toISOString(),
                provider: 'curseforge',
                versions: [],
                categories: [],
                projectType: 'plugin'
            }));
            res.json(plugins);
        }
        else {
            // Spigot Search (Default)
            const response = await axios_1.default.get(`https://api.spiget.org/v2/search/resources/${q || 'plugin'}?size=20&sort=-downloads`);
            const plugins = response.data.map((p) => ({
                id: p.id,
                slug: p.id.toString(),
                name: p.name,
                description: p.tag || 'No description available',
                downloads: p.downloads || 0,
                follows: p.likes || 0,
                icon: p.icon?.url ? `https://www.spigotmc.org/${p.icon.url}` : null,
                dateModified: p.updateDate ? new Date(p.updateDate * 1000).toISOString() : new Date().toISOString(),
                provider: 'spigot',
                versions: p.testedVersions || [],
                categories: [],
                projectType: 'plugin'
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
const getPluginVersions = async (req, res) => {
    try {
        const { resourceId, provider = 'modrinth', version, loaders } = req.query;
        if (!resourceId)
            return res.status(400).json({ message: 'Missing resourceId' });
        if (provider === 'modrinth') {
            // Fetch versions from Modrinth with filtering
            const params = {};
            // Filter by loaders (bukkit, paper, spigot, fabric, forge, etc.)
            if (loaders) {
                params.loaders = loaders; // Already JSON string from frontend
            }
            // Filter by game version
            if (version && version !== 'latest') {
                params.game_versions = JSON.stringify([version]);
            }
            const response = await axios_1.default.get(`https://api.modrinth.com/v2/project/${resourceId}/version`, { params });
            const versions = response.data.map(v => ({
                id: v.id,
                name: v.name,
                versionNumber: v.version_number,
                gameVersions: v.game_versions,
                loaders: v.loaders,
                datePublished: v.date_published,
                downloads: v.downloads,
                file: v.files.find((f) => f.primary) || v.files[0]
            }));
            res.json(versions);
        }
        else if (provider === 'hangar') {
            // Hangar versions API
            const response = await axios_1.default.get(`https://hangar.papermc.io/api/v1/projects/${resourceId}/versions?limit=25&offset=0`);
            const allVersions = response.data.result || [];
            // Filter by MC version if provided
            const filteredVersions = version && version !== 'latest'
                ? allVersions.filter((v) => v.platformDependencies?.PAPER?.includes(version))
                : allVersions;
            const versions = filteredVersions.map((v) => ({
                id: v.name,
                name: v.name,
                versionNumber: v.name,
                gameVersions: v.platformDependencies?.PAPER || [],
                loaders: ['paper', 'spigot', 'bukkit'],
                datePublished: v.createdAt,
                downloads: v.stats?.downloads || 0,
                file: { url: v.downloads?.PAPER?.downloadUrl || '' }
            }));
            res.json(versions);
        }
        else if (provider === 'spigot') {
            // Spigot - Get resource versions
            const response = await axios_1.default.get(`https://api.spiget.org/v2/resources/${resourceId}/versions?size=25&sort=-releaseDate`);
            const allVersions = response.data;
            const versions = allVersions.map((v) => ({
                id: v.id,
                name: v.name,
                versionNumber: v.name,
                gameVersions: [], // Spigot doesn't provide MC versions per release
                loaders: ['bukkit', 'spigot', 'paper'],
                datePublished: new Date(v.releaseDate * 1000).toISOString(),
                downloads: 0,
                file: { url: `https://api.spiget.org/v2/resources/${resourceId}/versions/${v.id}/download` }
            }));
            res.json(versions);
        }
        else if (provider === 'polymart') {
            // Polymart - Get resource versions
            try {
                const response = await axios_1.default.post('https://api.polymart.org/v1/getResourceInfoSimple', {
                    resource_id: resourceId
                });
                const resourceInfo = response.data.response?.resource;
                if (resourceInfo && resourceInfo.updates) {
                    const versions = resourceInfo.updates.slice(0, 25).map((v) => ({
                        id: v.version_id || v.title,
                        name: v.title,
                        versionNumber: v.title,
                        gameVersions: [],
                        loaders: ['bukkit', 'spigot', 'paper'],
                        datePublished: new Date(v.date * 1000).toISOString(),
                        downloads: 0,
                        file: { url: '' }
                    }));
                    res.json(versions);
                }
                else {
                    res.json([]);
                }
            }
            catch (error) {
                res.json([]);
            }
        }
        else if (provider === 'curseforge') {
            // CurseForge - Get mod files
            const settings = await (0, settingsService_1.getSettingsOrCreate)();
            const keys = settings.plugins || {};
            const apiKey = keys.curseforge_api_key;
            if (!apiKey) {
                return res.json([]);
            }
            const response = await axios_1.default.get(`https://api.curseforge.com/v1/mods/${resourceId}/files`, {
                headers: { 'x-api-key': apiKey },
                params: { pageSize: 25 }
            });
            const allFiles = response.data.data || [];
            // Filter by MC version if provided
            const filteredFiles = version && version !== 'latest'
                ? allFiles.filter((f) => f.gameVersions?.includes(version))
                : allFiles;
            const versions = filteredFiles.map((v) => ({
                id: v.id,
                name: v.displayName,
                versionNumber: v.displayName,
                gameVersions: v.gameVersions || [],
                loaders: v.loaders || ['bukkit'],
                datePublished: v.fileDate,
                downloads: v.downloadCount || 0,
                file: { url: v.downloadUrl }
            }));
            res.json(versions);
        }
        else {
            // Placeholder for other providers
            res.json([]);
        }
    }
    catch (error) {
        console.error('Error fetching plugin versions:', error);
        res.json([]);
    }
};
exports.getPluginVersions = getPluginVersions;
const installPlugin = async (req, res) => {
    try {
        const { id } = req.params;
        const { resourceId, provider = 'modrinth', fileName, versionId } = req.body;
        const server = await prisma_1.prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!resourceId)
            return res.status(400).json({ message: 'Missing resourceId' });
        const settings = await (0, settingsService_1.getSettingsOrCreate)();
        const keys = settings.plugins || {};
        if (provider === 'modrinth') {
            let downloadUrl;
            if (versionId) {
                // Install specific version
                console.log(`[Plugin Install] Installing specific version: ${versionId}`);
                const versionRes = await axios_1.default.get(`https://api.modrinth.com/v2/version/${versionId}`);
                const versionData = versionRes.data;
                const file = versionData.files.find((f) => f.primary) || versionData.files[0];
                downloadUrl = file.url;
            }
            else {
                // Install latest version
                console.log(`[Plugin Install] Installing latest version of ${resourceId}`);
                const verRes = await axios_1.default.get(`https://api.modrinth.com/v2/project/${resourceId}/version`);
                const versions = verRes.data;
                if (!versions || versions.length === 0)
                    return res.status(404).json({ message: 'No versions found' });
                const latestVersion = versions[0];
                const file = latestVersion.files.find((f) => f.primary) || latestVersion.files[0];
                downloadUrl = file.url;
            }
            await (0, pterodactyl_1.pullPteroFile)(server.pteroIdentifier, downloadUrl, '/plugins');
        }
        else if (provider === 'hangar') {
            // Hangar Install
            const verRes = await axios_1.default.get(`https://hangar.papermc.io/api/v1/projects/${resourceId}/versions?limit=1&offset=0`);
            const versions = verRes.data.result || [];
            if (versions.length === 0)
                return res.status(404).json({ message: 'No versions found' });
            const latest = versions[0];
            // Hangar downloads are tricky, often need direct logic
            // Assuming platform 'PAPER' usually.
            const downloads = latest.downloads || {};
            const platform = Object.keys(downloads)[0]; // Pick first, e.g. PAPER
            if (!platform)
                return res.status(404).json({ message: 'No download platform found' });
            const downloadUrl = downloads[platform].downloadUrl;
            // Need full URL sometimes or it's relative? Hangar V1 usually gives full URL or we construct.
            // If relative: `https://hangar.papermc.io/api/v1/projects/${resourceId}/versions/${latest.name}/${platform}/download`
            // Let's rely on `downloadUrl` if absolute.
            await (0, pterodactyl_1.pullPteroFile)(server.pteroIdentifier, downloadUrl, '/plugins');
        }
        else if (provider === 'polymart') {
            // Polymart Install (Proxy? Or Direct?)
            // Addon uses getDownloadURL then pull.
            const response = await axios_1.default.post('https://api.polymart.org/v1/getDownloadURL', {
                resource_id: resourceId,
                version_id: 'latest',
                // service: 'pterodactyl-addon' // optional
            });
            const url = response.data.response?.url;
            if (!url)
                return res.status(404).json({ message: 'Could not get download URL from Polymart' });
            await (0, pterodactyl_1.pullPteroFile)(server.pteroIdentifier, url, '/plugins');
        }
        else if (provider === 'curseforge') {
            const apiKey = keys.curseforge_api_key;
            if (!apiKey)
                return res.status(400).json({ message: 'CurseForge API Key not configured in Admin' });
            const response = await axios_1.default.get(`https://api.curseforge.com/v1/mods/${resourceId}/files`, {
                headers: { 'x-api-key': apiKey },
                params: { pageSize: 1 }
            });
            const files = response.data.data || [];
            if (files.length === 0)
                return res.status(404).json({ message: 'No files found' });
            const file = files[0];
            const url = file.downloadUrl;
            if (!url)
                return res.status(404).json({ message: 'No download URL for this file' });
            await (0, pterodactyl_1.pullPteroFile)(server.pteroIdentifier, url, '/plugins');
        }
        else {
            // Spigot: Proxy Download (Backend -> Ptero)
            const downloadUrl = `https://api.spiget.org/v2/resources/${resourceId}/download`;
            // 1. Download to memory
            const dlResponse = await axios_1.default.get(downloadUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'FreeDash/2.0' }
            });
            // 2. Upload
            const finalName = fileName || `${resourceId}.jar`;
            await (0, pterodactyl_1.uploadFileToPtero)(server.pteroIdentifier, '/plugins', finalName, Buffer.from(dlResponse.data));
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
