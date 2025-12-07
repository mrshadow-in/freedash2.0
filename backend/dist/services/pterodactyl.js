"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPteroServerResources = exports.powerPteroServer = exports.updatePteroServerBuild = exports.getPteroServer = exports.unsuspendPteroServer = exports.suspendPteroServer = exports.deletePteroServer = exports.createPteroServer = exports.updatePteroUserPassword = exports.createPteroUser = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const Settings_1 = __importDefault(require("../models/Settings"));
// Get Pterodactyl settings from database or fallback to env
async function getPteroConfig() {
    try {
        const settings = await Settings_1.default.findOne();
        if (settings?.pterodactyl?.apiUrl && settings?.pterodactyl?.apiKey) {
            return {
                url: settings.pterodactyl.apiUrl,
                key: settings.pterodactyl.apiKey,
                clientKey: settings.pterodactyl.clientApiKey
            };
        }
    }
    catch (error) {
        console.error('Failed to fetch pterodactyl settings from DB');
    }
    // Fallback to env
    return {
        url: env_1.ENV.PTERODACTYL_URL,
        key: env_1.ENV.PTERODACTYL_API_KEY
    };
}
const createPteroUser = async (email, username, password) => {
    const config = await getPteroConfig();
    try {
        const response = await axios_1.default.post(`${config.url}/api/application/users`, {
            email,
            username,
            first_name: username,
            last_name: 'User',
            password: password || Math.random().toString(36).slice(-12) // Generate random password if not provided
        }, {
            headers: {
                Authorization: `Bearer ${config.key}`,
                'Content-Type': 'application/json',
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        });
        return response.data.attributes;
    }
    catch (error) {
        if (error.response?.status === 422) {
            // User exists, fetch it and update password if provided
            const users = await axios_1.default.get(`${config.url}/api/application/users?filter[email]=${email}`, {
                headers: {
                    Authorization: `Bearer ${config.key}`,
                    Accept: 'application/vnd.pterodactyl.v1+json'
                }
            });
            const existingUser = users.data.data[0].attributes;
            // Update password for existing user if password is provided
            if (password && existingUser.id) {
                await (0, exports.updatePteroUserPassword)(existingUser.id, password);
            }
            return existingUser;
        }
        throw error;
    }
};
exports.createPteroUser = createPteroUser;
// Update Pterodactyl user password
const updatePteroUserPassword = async (userId, password) => {
    const config = await getPteroConfig();
    await axios_1.default.patch(`${config.url}/api/application/users/${userId}`, {
        password
    }, {
        headers: {
            Authorization: `Bearer ${config.key}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
};
exports.updatePteroUserPassword = updatePteroUserPassword;
const createPteroServer = async (name, userId, eggId, nestId, memory, disk, cpu, locationId = 1) => {
    const config = await getPteroConfig();
    const response = await axios_1.default.post(`${config.url}/api/application/servers?include=allocations`, {
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
    }, {
        headers: {
            Authorization: `Bearer ${config.key}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
    // Return full response with relationships
    return response.data;
};
exports.createPteroServer = createPteroServer;
const deletePteroServer = async (serverId) => {
    const config = await getPteroConfig();
    await axios_1.default.delete(`${config.url}/api/application/servers/${serverId}`, {
        headers: {
            Authorization: `Bearer ${config.key}`,
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
};
exports.deletePteroServer = deletePteroServer;
const suspendPteroServer = async (serverId) => {
    const config = await getPteroConfig();
    await axios_1.default.post(`${config.url}/api/application/servers/${serverId}/suspend`, {}, {
        headers: {
            Authorization: `Bearer ${config.key}`,
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
};
exports.suspendPteroServer = suspendPteroServer;
const unsuspendPteroServer = async (serverId) => {
    const config = await getPteroConfig();
    await axios_1.default.post(`${config.url}/api/application/servers/${serverId}/unsuspend`, {}, {
        headers: {
            Authorization: `Bearer ${config.key}`,
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
};
exports.unsuspendPteroServer = unsuspendPteroServer;
const getPteroServer = async (serverId) => {
    const config = await getPteroConfig();
    const response = await axios_1.default.get(`${config.url}/api/application/servers/${serverId}`, {
        headers: {
            Authorization: `Bearer ${config.key}`,
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
    return response.data.attributes;
};
exports.getPteroServer = getPteroServer;
const updatePteroServerBuild = async (serverId, memory, disk, cpu, allocation) => {
    const config = await getPteroConfig();
    const response = await axios_1.default.patch(`${config.url}/api/application/servers/${serverId}/build`, {
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
    }, {
        headers: {
            Authorization: `Bearer ${config.key}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
    return response.data.attributes;
};
exports.updatePteroServerBuild = updatePteroServerBuild;
const powerPteroServer = async (identifier, signal) => {
    const config = await getPteroConfig();
    // Fallback to apiKey if clientKey is missing (some admins use same key for both if permitted, though rare)
    // Actually Client API requires Client Key.
    const token = config.clientKey || config.key;
    await axios_1.default.post(`${config.url}/api/client/servers/${identifier}/power`, { signal }, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
};
exports.powerPteroServer = powerPteroServer;
const getPteroServerResources = async (identifier) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    const response = await axios_1.default.get(`${config.url}/api/client/servers/${identifier}/resources`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
    return response.data.attributes;
};
exports.getPteroServerResources = getPteroServerResources;
