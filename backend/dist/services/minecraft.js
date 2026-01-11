"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaperVersions = exports.getMinecraftVersions = void 0;
const axios_1 = __importDefault(require("axios"));
// Cache for versions
let cachedVersions = null;
let cacheTime = 0;
const CACHE_DURATION = 3600000; // 1 hour
const getMinecraftVersions = async () => {
    // Return cached versions if still valid
    if (cachedVersions && Date.now() - cacheTime < CACHE_DURATION) {
        return cachedVersions;
    }
    try {
        const response = await axios_1.default.get('https://launchermeta.mojang.com/mc/game/version_manifest.json');
        // Filter for release versions only and get last 20
        const releaseVersions = response.data.versions
            .filter(v => v.type === 'release')
            .map(v => v.id)
            .slice(0, 20); // Get latest 20 versions
        cachedVersions = releaseVersions;
        cacheTime = Date.now();
        return releaseVersions;
    }
    catch (error) {
        console.error('Failed to fetch Minecraft versions:', error);
        // Fallback to hardcoded versions if API fails
        return [
            '1.21.4', '1.21.3', '1.21.1', '1.21',
            '1.20.6', '1.20.4', '1.20.2', '1.20.1',
            '1.19.4', '1.19.3', '1.19.2', '1.19.1',
            '1.18.2', '1.18.1', '1.17.1', '1.16.5',
            '1.15.2', '1.14.4', '1.13.2', '1.12.2'
        ];
    }
};
exports.getMinecraftVersions = getMinecraftVersions;
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
