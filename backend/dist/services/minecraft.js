"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaperVersions = exports.getServerJarUrl = exports.getLatestMinecraftVersion = exports.getMinecraftVersions = void 0;
const axios_1 = __importDefault(require("axios"));
const PteroCache_1 = require("./PteroCache");
/**
 * Fetch Minecraft versions from Mojang API (cached 5 min)
 */
const getMinecraftVersions = async () => {
    return await PteroCache_1.PteroCache.getCached('minecraft:versions', 300, // 5min cache
    async () => {
        const response = await axios_1.default.get('https://launchermeta.mojang.com/mc/game/version_manifest.json', { timeout: 10000 });
        return response.data.versions;
    });
};
exports.getMinecraftVersions = getMinecraftVersions;
/**
 * Fetch latest Minecraft version (cached 5 min)
 */
const getLatestMinecraftVersion = async () => {
    return await PteroCache_1.PteroCache.getCached('minecraft:latest', 300, // 5min cache
    async () => {
        const response = await axios_1.default.get('https://launchermeta.mojang.com/mc/game/version_manifest.json', { timeout: 10000 });
        return response.data.latest.release;
    });
};
exports.getLatestMinecraftVersion = getLatestMinecraftVersion;
/**
 * Fetch server jar download URL for a version (cached 1 hour)
 */
const getServerJarUrl = async (version) => {
    return await PteroCache_1.PteroCache.getCached(`minecraft:jar:${version}`, 3600, // 1 hour cache (server jars don't change)
    async () => {
        try {
            // Get version manifest
            const response = await axios_1.default.get('https://launchermeta.mojang.com/mc/game/version_manifest.json', { timeout: 10000 });
            const versionData = response.data.versions.find(v => v.id === version);
            if (!versionData) {
                throw new Error(`Version ${version} not found`);
            }
            // Get version details
            const detailsResponse = await axios_1.default.get(versionData.url, { timeout: 10000 });
            const serverDownload = detailsResponse.data.downloads?.server;
            if (!serverDownload) {
                throw new Error(`Server jar not available for version ${version}`);
            }
            return {
                version,
                url: serverDownload.url,
                sha1: serverDownload.sha1
            };
        }
        catch (error) {
            console.error(`[Minecraft] Failed to fetch jar for ${version}:`, error.message);
            throw error;
        }
    });
};
exports.getServerJarUrl = getServerJarUrl;
const getPaperVersions = async (minecraftVersion) => {
    try {
        if (minecraftVersion) {
            // Get builds for specific version
            const response = await axios_1.default.get(`https://api.papermc.io/v2/projects/paper/versions/${minecraftVersion}`);
            return response.data.builds || [];
        }
        else {
            // Get all available Paper versions
            const response = await axios_1.default.get('https://api.papermc.io/v2/projects/paper');
            return response.data.versions || [];
        }
    }
    catch (error) {
        console.error('Failed to fetch Paper versions:', error);
        return [];
    }
};
exports.getPaperVersions = getPaperVersions;
