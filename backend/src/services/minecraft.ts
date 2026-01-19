import axios from 'axios';
import { PteroCache } from './PteroCache';

interface MinecraftVersion {
    id: string;
    type: string;
    url: string;
    releaseTime: string;
}

interface VersionManifest {
    latest: {
        release: string;
        snapshot: string;
    };
    versions: MinecraftVersion[];
}

interface ServerJarInfo {
    version: string;
    url: string;
    sha1?: string;
}

/**
 * Fetch Minecraft versions from Mojang API (cached 5 min)
 */
export const getMinecraftVersions = async (): Promise<MinecraftVersion[]> => {
    return await PteroCache.getCached(
        'minecraft:versions',
        300, // 5min cache
        async () => {
            const response = await axios.get<VersionManifest>(
                'https://launchermeta.mojang.com/mc/game/version_manifest.json',
                { timeout: 10000 }
            );
            return response.data.versions;
        }
    );
};

/**
 * Fetch latest Minecraft version (cached 5 min)
 */
export const getLatestMinecraftVersion = async (): Promise<string> => {
    return await PteroCache.getCached(
        'minecraft:latest',
        300, // 5min cache
        async () => {
            const response = await axios.get<VersionManifest>(
                'https://launchermeta.mojang.com/mc/game/version_manifest.json',
                { timeout: 10000 }
            );
            return response.data.latest.release;
        }
    );
};

/**
 * Fetch server jar download URL for a version (cached 1 hour)
 */
export const getServerJarUrl = async (version: string): Promise<ServerJarInfo> => {
    return await PteroCache.getCached(
        `minecraft:jar:${version}`,
        3600, // 1 hour cache (server jars don't change)
        async () => {
            try {
                // Get version manifest
                const response = await axios.get<VersionManifest>(
                    'https://launchermeta.mojang.com/mc/game/version_manifest.json',
                    { timeout: 10000 }
                );
                const versionData = response.data.versions.find(v => v.id === version);

                if (!versionData) {
                    throw new Error(`Version ${version} not found`);
                }

                // Get version details
                const detailsResponse = await axios.get(
                    versionData.url,
                    { timeout: 10000 }
                );

                const serverDownload = (detailsResponse.data as any).downloads?.server;
                if (!serverDownload) {
                    throw new Error(`Server jar not available for version ${version}`);
                }

                return {
                    version,
                    url: serverDownload.url,
                    sha1: serverDownload.sha1
                };
            } catch (error: any) {
                console.error(`[Minecraft] Failed to fetch jar for ${version}:`, error.message);
                throw error;
            }
        }
    );
};

export const getPaperVersions = async (minecraftVersion?: string): Promise<string[]> => {
    try {
        if (minecraftVersion) {
            // Get builds for specific version
            const response = await axios.get(
                `https://api.papermc.io/v2/projects/paper/versions/${minecraftVersion}`
            );
            return (response.data as any).builds || [];
        } else {
            // Get all available Paper versions
            const response = await axios.get(
                'https://api.papermc.io/v2/projects/paper'
            );
            return (response.data as any).versions || [];
        }
    } catch (error) {
        console.error('Failed to fetch Paper versions:', error);
        return [];
    }
};
