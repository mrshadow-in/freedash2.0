import axios from 'axios';
import { ENV } from '../config/env';
import Settings from '../models/Settings';

// Get Pterodactyl settings from database or fallback to env
async function getPteroConfig() {
    try {
        const settings = await Settings.findOne();
        if (settings?.pterodactyl?.apiUrl && settings?.pterodactyl?.apiKey) {
            return {
                url: settings.pterodactyl.apiUrl,
                key: settings.pterodactyl.apiKey,
                clientKey: settings.pterodactyl.clientApiKey
            };
        }
    } catch (error) {
        console.error('Failed to fetch pterodactyl settings from DB');
    }

    // Fallback to env
    return {
        url: ENV.PTERODACTYL_URL,
        key: ENV.PTERODACTYL_API_KEY
    };
}

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
        `${config.url}/api/application/servers?include=allocations`,
        {
            name,
            user: userId,
            egg: eggId,
            docker_image: 'ghcr.io/pterodactyl/yolks:java_17',
            startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
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
        `${config.url}/api/application/servers/${serverId}`,
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

export const getPteroServerResources = async (identifier: string) => {
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
    return (response.data as any).attributes;
};
