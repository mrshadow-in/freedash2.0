import axios from 'axios';
import { ENV } from '../config/env';
import { prisma } from '../prisma';

// Get Pterodactyl settings from database or fallback to env
async function getPteroConfig() {
    try {
        const settings = await prisma.settings.findFirst();
        const pterodactyl = (settings?.pterodactyl as any);
        if (pterodactyl?.apiUrl && pterodactyl?.apiKey) {
            return {
                url: pterodactyl.apiUrl,
                key: pterodactyl.apiKey,
                clientKey: pterodactyl.clientApiKey
            };
        }
    } catch (error) {
        console.error('Failed to fetch pterodactyl settings from DB');
    }

    // Fallback to env
    return {
        url: ENV.PTERODACTYL_URL,
        key: ENV.PTERODACTYL_API_KEY,
        clientKey: undefined // Env doesn't have client key usually? Or add it if needed.
    };
}

export const getPteroUrl = async () => {
    const config = await getPteroConfig();
    return config.url;
};

export const createPteroUser = async (email: string, username: string, password?: string) => {
    const config = await getPteroConfig();

    try {
        const response = await axios.post(
            `${config.url}/api/application/users`,
            {
                email,
                username,
                first_name: username,
                last_name: 'User',
                password: password || Math.random().toString(36).slice(-12) // Generate random password if not provided
            },
            {
                headers: {
                    Authorization: `Bearer ${config.key}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/vnd.pterodactyl.v1+json'
                }
            }
        );
        return (response.data as any).attributes;
    } catch (error: any) {
        if (error.response?.status === 422) {
            // User exists, fetch it and update password if provided
            const users = await axios.get(
                `${config.url}/api/application/users?filter[email]=${email}`,
                {
                    headers: {
                        Authorization: `Bearer ${config.key}`,
                        Accept: 'application/vnd.pterodactyl.v1+json'
                    }
                }
            );
            const existingUser = (users.data as any).data[0].attributes;

            // Update password for existing user if password is provided
            if (password && existingUser.id) {
                await updatePteroUserPassword(existingUser.id, password);
            }

            return existingUser;
        }
        throw error;
    }
};

// Reinstall server removed from here (duplicate)

// Update Pterodactyl user password
export const updatePteroUserPassword = async (userId: number, password: string) => {
    const config = await getPteroConfig();

    await axios.patch(
        `${config.url}/api/application/users/${userId}`,
        {
            password
        },
        {
            headers: {
                Authorization: `Bearer ${config.key}`,
                'Content-Type': 'application/json',
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
};

export const createPteroServer = async (
    name: string,
    userId: number,
    eggId: number,
    nestId: number,
    memory: number,
    disk: number,
    cpu: number,
    locationId: number = 1
) => {
    const config = await getPteroConfig();

    const response = await axios.post(
        `${config.url}/api/application/servers?include=allocations,node`,
        {
            name,
            user: userId,
            egg: eggId,
            docker_image: 'ghcr.io/pterodactyl/yolks:java_21',
            startup: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}',
            environment: {
                SERVER_JARFILE: 'server.jar',
                BUILD_NUMBER: 'latest',
                MINECRAFT_VERSION: 'latest',
                VANILLA_VERSION: 'latest',
                spigot_version: 'latest'
            },
            limits: {
                memory,
                swap: 0,
                disk,
                io: 500,
                cpu
            },
            feature_limits: {
                databases: 0,
                backups: 0,
                allocations: 1
            },
            allocation: {
                default: 1
            },
            deploy: {
                locations: [locationId],
                dedicated_ip: false,
                port_range: []
            }
        },
        {
            headers: {
                Authorization: `Bearer ${config.key}`,
                'Content-Type': 'application/json',
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
    // Return full response with relationships
    return response.data;
};

export const deletePteroServer = async (serverId: number) => {
    const config = await getPteroConfig();

    await axios.delete(
        `${config.url}/api/application/servers/${serverId}`,
        {
            headers: {
                Authorization: `Bearer ${config.key}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
};

export const suspendPteroServer = async (serverId: number) => {
    const config = await getPteroConfig();

    await axios.post(
        `${config.url}/api/application/servers/${serverId}/suspend`,
        {},
        {
            headers: {
                Authorization: `Bearer ${config.key}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
};

export const unsuspendPteroServer = async (serverId: number) => {
    const config = await getPteroConfig();

    await axios.post(
        `${config.url}/api/application/servers/${serverId}/unsuspend`,
        {},
        {
            headers: {
                Authorization: `Bearer ${config.key}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
};
export const getPteroServer = async (serverId: number) => {
    const config = await getPteroConfig();

    const response = await axios.get(
        `${config.url}/api/application/servers/${serverId}?include=allocations,node`,
        {
            headers: {
                Authorization: `Bearer ${config.key}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
    return (response.data as any).attributes;
};

export const updatePteroServerBuild = async (
    serverId: number,
    memory: number,
    disk: number,
    cpu: number,
    allocation: number
) => {
    const config = await getPteroConfig();

    const response = await axios.patch(
        `${config.url}/api/application/servers/${serverId}/build`,
        {
            allocation,
            memory,
            swap: 0,
            disk,
            io: 500,
            cpu,
            feature_limits: {
                databases: 0,
                backups: 0
            }
        },
        {
            headers: {
                Authorization: `Bearer ${config.key}`,
                'Content-Type': 'application/json',
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
    return (response.data as any).attributes;
};

export const powerPteroServer = async (identifier: string, signal: 'start' | 'stop' | 'restart' | 'kill') => {
    const config = await getPteroConfig();

    // Fallback to apiKey if clientKey is missing (some admins use same key for both if permitted, though rare)
    // Actually Client API requires Client Key.
    const token = config.clientKey || config.key;

    await axios.post(
        `${config.url}/api/client/servers/${identifier}/power`,
        { signal },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
};

// Console / WebSocket Details
export const getConsoleDetails = async (identifier: string) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;

    console.log(`[Console] Fetching WebSocket details for server: ${identifier}`);

    const response: any = await axios.get(
        `${config.url}/api/client/servers/${identifier}/websocket`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );

    const data = response.data.data;
    console.log(`[Console] Pterodactyl returned socket URL: ${data.socket}`);
    console.log(`[Console] Token length: ${data.token?.length || 0}`);

    return data;
};

// File Manager Functions
export const listFiles = async (identifier: string, directory: string = '') => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;

    const response: any = await axios.get(
        `${config.url}/api/client/servers/${identifier}/files/list?directory=${encodeURIComponent(directory)}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
    return response.data.data;
};

export const getFileContent = async (identifier: string, file: string) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;

    const response = await axios.get(
        `${config.url}/api/client/servers/${identifier}/files/contents?file=${encodeURIComponent(file)}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'text/plain'
            }
        }
    );
    return response.data;
};

export const writeFileContent = async (identifier: string, file: string, content: string) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;

    await axios.post(
        `${config.url}/api/client/servers/${identifier}/files/write?file=${encodeURIComponent(file)}`,
        content,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.pterodactyl.v1+json',
                'Content-Type': 'text/plain'
            }
        }
    );
};

export const renameFile = async (identifier: string, root: string, files: { from: string; to: string }[]) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;

    await axios.put(
        `${config.url}/api/client/servers/${identifier}/files/rename`,
        { root, files },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
};

export const deleteFile = async (identifier: string, root: string, files: string[]) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;

    await axios.post(
        `${config.url}/api/client/servers/${identifier}/files/delete`,
        { root: root || '/', files },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
};

export const createFolder = async (identifier: string, root: string, name: string) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;

    await axios.post(
        `${config.url}/api/client/servers/${identifier}/files/create-folder`,
        { root, name },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
};

export const getUploadUrl = async (identifier: string, directory: string = '/') => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;

    const response: any = await axios.get(
        `${config.url}/api/client/servers/${identifier}/files/upload?directory=${encodeURIComponent(directory)}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
    return response.data.attributes.url;
};

// Reinstall
export const reinstallServer = async (identifier: string) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;

    await axios.post(
        `${config.url}/api/client/servers/${identifier}/settings/reinstall`,
        {},
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
};

import redis from '../redis';

// ... (existing imports)

export const getPteroServerResources = async (identifier: string) => {
    const CACHE_KEY = `ptero:resources:${identifier}`;
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
        return JSON.parse(cached);
    }

    const config = await getPteroConfig();
    const token = config.clientKey || config.key;

    const response = await axios.get(
        `${config.url}/api/client/servers/${identifier}/resources`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );

    const data = (response.data as any).attributes;
    // Cache for 1 second (almost real-time)
    await redis.set(CACHE_KEY, JSON.stringify(data), 'EX', 1);

    return data;
};

// ==========================================
// Node Management (Wings)
// ==========================================

export const getPteroNodes = async () => {
    const config = await getPteroConfig();
    try {
        const response = await axios.get(`${config.url}/api/application/nodes?include=location`, {
            headers: {
                Authorization: `Bearer ${config.key}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        });
        return (response.data as any).data.map((item: any) => item.attributes);
    } catch (error) {
        console.error('Error fetching nodes:', error);
        throw error;
    }
};

export const getPteroLocations = async () => {
    const config = await getPteroConfig();
    try {
        const response = await axios.get(`${config.url}/api/application/locations`, {
            headers: {
                Authorization: `Bearer ${config.key}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        });
        return (response.data as any).data.map((item: any) => item.attributes);
    } catch (error) {
        console.error('Error fetching locations:', error);
        throw error;
    }
};

export const createPteroNode = async (data: any) => {
    const config = await getPteroConfig();
    try {
        const response = await axios.post(
            `${config.url}/api/application/nodes`,
            data,
            {
                headers: {
                    Authorization: `Bearer ${config.key}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/vnd.pterodactyl.v1+json'
                }
            }
        );
        return (response.data as any).attributes;
    } catch (error) {
        console.error('Error creating node:', error);
        throw error;
    }
};

export const getPteroNodeConfiguration = async (id: number) => {
    const config = await getPteroConfig();
    try {
        const response = await axios.get(`${config.url}/api/application/nodes/${id}/configuration`, {
            headers: {
                Authorization: `Bearer ${config.key}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        });
        return (response.data as any);
    } catch (error) {
        console.error('Error fetching node config:', error);
        throw error;
    }
};

export const pullPteroFile = async (pteroIdentifier: string, url: string, directory: string = '/') => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    try {
        // Send both 'root' and 'directory' to support different Pterodactyl versions/docs
        // Also ensure directory doesn't have double slashes but starts with / if needed, or maybe try without?
        // Pterodactyl usually expects sending 'root' or 'directory'. We'll send both.
        // Also strip trailing slash.
        const cleanDir = directory.endsWith('/') && directory.length > 1 ? directory.slice(0, -1) : directory;

        await axios.post(
            `${config.url}/api/client/servers/${pteroIdentifier}/files/pull`,
            {
                url,
                root: cleanDir,
                directory: cleanDir,
                use_header: false,
                foreground: true // Try force foreground to ensure it happens immediately? Optional.
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/vnd.pterodactyl.v1+json'
                }
            }
        );
        return true;
    } catch (error) {
        console.error('Error pulling file:', error);
        throw error;
    }
};

// Startup
export const getStartup = async (identifier: string) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;

    const response = await axios.get(
        `${config.url}/api/client/servers/${identifier}/startup`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
    return response.data;
};

export const updateStartupVariable = async (identifier: string, key: string, value: string) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;

    const response = await axios.put(
        `${config.url}/api/client/servers/${identifier}/startup/variable`,
        { key, value },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
    return response.data;
};

// Rename file
export const renamePteroFile = async (
    identifier: string,
    root: string,
    from: string,
    to: string
) => {
    const config = await getPteroConfig();

    await axios.put(
        `${config.url}/api/client/servers/${identifier}/files/rename`,
        {
            root,
            files: [{ from, to }]
        },
        {
            headers: {
                Authorization: `Bearer ${config.clientKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        }
    );
};

// Upload file (Binary/Multipart)
// Upload file (Binary/Multipart)
export const uploadFileToPtero = async (identifier: string, directory: string, filename: string, content: Buffer) => {
    // 1. Get Signed Upload URL
    const uploadUrl = await getUploadUrl(identifier, directory);

    // 2. Construct Multipart Body Manually (No 'form-data' dependency)
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    // Use generic binary stream content type
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
    const footer = `\r\n--${boundary}--`;

    const body = Buffer.concat([
        Buffer.from(header),
        content,
        Buffer.from(footer)
    ]);

    // 3. Upload to Node
    // Important: 'directory' is passed as a query param to the upload URL usually, or appended. 
    // The getUploadUrl returns a URL that usually creates file in root if not specified.
    // For Wings, we usually append `&directory=/plugins`.

    // Check if uploadUrl already has query params
    const separator = uploadUrl.includes('?') ? '&' : '?';
    const finalUrl = `${uploadUrl}${separator}directory=${encodeURIComponent(directory)}`;

    await axios.post(finalUrl, body, {
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
    } as any);
};

