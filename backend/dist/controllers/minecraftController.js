"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeServerVersion = exports.deletePlugin = exports.getInstalledPlugins = exports.installPlugin = exports.searchPlugins = exports.updateServerProperties = exports.getServerProperties = void 0;
const pterodactyl_1 = require("../services/pterodactyl");
const prisma_1 = require("../prisma");
const axios_1 = __importDefault(require("axios"));
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
        const { q } = req.query;
        if (!q)
            return res.json([]);
        const response = await axios_1.default.get(`https://api.spiget.org/v2/search/resources/${q}?size=20&sort=-likes`);
        const plugins = response.data.map((p) => ({
            id: p.id,
            name: p.name,
            tag: p.tag,
            likes: p.likes,
            downloads: p.downloads,
            icon: p.icon?.url ? `https://www.spigotmc.org/${p.icon.url}` : null,
            testedVersions: p.testedVersions
        }));
        res.json(plugins);
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
        const { downloadUrl, fileName } = req.body;
        const server = await prisma_1.prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const resourceId = req.body.resourceId;
        if (!resourceId)
            return res.status(400).json({ message: 'Missing resourceId' });
        const realDownloadUrl = `https://api.spiget.org/v2/resources/${resourceId}/download`;
        await (0, pterodactyl_1.pullPteroFile)(server.pteroIdentifier, realDownloadUrl, '/plugins');
        res.json({ message: 'Plugin installation started' });
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
// Change server version (Paper only)
const changeServerVersion = async (req, res) => {
    try {
        const { id } = req.params;
        const { version } = req.body;
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
        // Update MINECRAFT_VERSION variable via startup API
        await (0, pterodactyl_1.updateStartupVariable)(server.pteroIdentifier, 'MINECRAFT_VERSION', version);
        res.json({ message: `Server version changed to ${version}. Restart server to apply.`, version });
    }
    catch (error) {
        console.error('Error changing server version:', error);
        res.status(500).json({ message: 'Failed to change server version' });
    }
};
exports.changeServerVersion = changeServerVersion;
