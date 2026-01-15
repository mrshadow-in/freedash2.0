"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileToPtero = exports.renamePteroFile = exports.updateStartupVariable = exports.getStartup = exports.pullPteroFile = exports.getPteroNodeConfiguration = exports.createPteroNode = exports.getPteroLocations = exports.getPteroNodes = exports.getPteroServerResources = exports.reinstallServer = exports.getUploadUrl = exports.createFolder = exports.deleteFile = exports.renameFile = exports.writeFileContent = exports.getFileContent = exports.listFiles = exports.getConsoleDetails = exports.powerPteroServer = exports.updatePteroServerBuild = exports.getPteroServersByUserId = exports.getPteroServer = exports.unsuspendPteroServer = exports.suspendPteroServer = exports.deletePteroServer = exports.createPteroServer = exports.updatePteroUserPassword = exports.createPteroUser = exports.getPteroUrl = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const prisma_1 = require("../prisma");
// Get Pterodactyl settings from database or fallback to env
async function getPteroConfig() {
    try {
        const settings = await prisma_1.prisma.settings.findFirst();
        const pterodactyl = settings?.pterodactyl;
        if (pterodactyl?.apiUrl && pterodactyl?.apiKey) {
            return {
                url: pterodactyl.apiUrl,
                key: pterodactyl.apiKey,
                clientKey: pterodactyl.clientApiKey
            };
        }
    }
    catch (error) {
        console.error('Failed to fetch pterodactyl settings from DB');
    }
    // Fallback to env
    return {
        url: env_1.ENV.PTERODACTYL_URL,
        key: env_1.ENV.PTERODACTYL_API_KEY,
        clientKey: undefined // Env doesn't have client key usually? Or add it if needed.
    };
}
const getPteroUrl = async () => {
    const config = await getPteroConfig();
    return config.url;
};
exports.getPteroUrl = getPteroUrl;
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
// Reinstall server removed from here (duplicate)
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
    const response = await axios_1.default.post(`${config.url}/api/application/servers?include=allocations,node`, {
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
    const response = await axios_1.default.get(`${config.url}/api/application/servers/${serverId}?include=allocations,node`, {
        headers: {
            Authorization: `Bearer ${config.key}`,
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
    return response.data.attributes;
};
exports.getPteroServer = getPteroServer;
const getPteroServersByUserId = async (userId) => {
    const config = await getPteroConfig();
    const response = await axios_1.default.get(`${config.url}/api/application/servers?filter[owner_id]=${userId}&include=allocations,node`, {
        headers: {
            Authorization: `Bearer ${config.key}`,
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
    return response.data.data.map((item) => item.attributes);
};
exports.getPteroServersByUserId = getPteroServersByUserId;
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
// Console / WebSocket Details
const getConsoleDetails = async (identifier) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    console.log(`[Console] Fetching WebSocket details for server: ${identifier}`);
    const response = await axios_1.default.get(`${config.url}/api/client/servers/${identifier}/websocket`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
    const data = response.data.data;
    console.log(`[Console] Pterodactyl returned socket URL: ${data.socket}`);
    console.log(`[Console] Token length: ${data.token?.length || 0}`);
    return data;
};
exports.getConsoleDetails = getConsoleDetails;
// File Manager Functions
const listFiles = async (identifier, directory = '') => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    const response = await axios_1.default.get(`${config.url}/api/client/servers/${identifier}/files/list?directory=${encodeURIComponent(directory)}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
    return response.data.data;
};
exports.listFiles = listFiles;
const getFileContent = async (identifier, file) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    const response = await axios_1.default.get(`${config.url}/api/client/servers/${identifier}/files/contents?file=${encodeURIComponent(file)}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/plain'
        }
    });
    return response.data;
};
exports.getFileContent = getFileContent;
const writeFileContent = async (identifier, file, content) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    await axios_1.default.post(`${config.url}/api/client/servers/${identifier}/files/write?file=${encodeURIComponent(file)}`, content, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.pterodactyl.v1+json',
            'Content-Type': 'text/plain'
        }
    });
};
exports.writeFileContent = writeFileContent;
const renameFile = async (identifier, root, files) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    await axios_1.default.put(`${config.url}/api/client/servers/${identifier}/files/rename`, { root, files }, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
};
exports.renameFile = renameFile;
const deleteFile = async (identifier, root, files) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    await axios_1.default.post(`${config.url}/api/client/servers/${identifier}/files/delete`, { root: root || '/', files }, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
};
exports.deleteFile = deleteFile;
const createFolder = async (identifier, root, name) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    await axios_1.default.post(`${config.url}/api/client/servers/${identifier}/files/create-folder`, { root, name }, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
};
exports.createFolder = createFolder;
const getUploadUrl = async (identifier, directory = '/') => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    const response = await axios_1.default.get(`${config.url}/api/client/servers/${identifier}/files/upload?directory=${encodeURIComponent(directory)}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
    return response.data.attributes.url;
};
exports.getUploadUrl = getUploadUrl;
// Reinstall
const reinstallServer = async (identifier) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    await axios_1.default.post(`${config.url}/api/client/servers/${identifier}/settings/reinstall`, {}, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
};
exports.reinstallServer = reinstallServer;
const redis_1 = __importDefault(require("../redis"));
// ... (existing imports)
const getPteroServerResources = async (identifier) => {
    const CACHE_KEY = `ptero:resources:${identifier}`;
    const cached = await redis_1.default.get(CACHE_KEY);
    if (cached) {
        return JSON.parse(cached);
    }
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    const response = await axios_1.default.get(`${config.url}/api/client/servers/${identifier}/resources`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
    const data = response.data.attributes;
    // Cache for 1 second (almost real-time)
    await redis_1.default.set(CACHE_KEY, JSON.stringify(data), 'EX', 1);
    return data;
};
exports.getPteroServerResources = getPteroServerResources;
// ==========================================
// Node Management (Wings)
// ==========================================
const getPteroNodes = async () => {
    const config = await getPteroConfig();
    try {
        const response = await axios_1.default.get(`${config.url}/api/application/nodes?include=location`, {
            headers: {
                Authorization: `Bearer ${config.key}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        });
        return response.data.data.map((item) => item.attributes);
    }
    catch (error) {
        console.error('Error fetching nodes:', error);
        throw error;
    }
};
exports.getPteroNodes = getPteroNodes;
const getPteroLocations = async () => {
    const config = await getPteroConfig();
    try {
        const response = await axios_1.default.get(`${config.url}/api/application/locations`, {
            headers: {
                Authorization: `Bearer ${config.key}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        });
        return response.data.data.map((item) => item.attributes);
    }
    catch (error) {
        console.error('Error fetching locations:', error);
        throw error;
    }
};
exports.getPteroLocations = getPteroLocations;
const createPteroNode = async (data) => {
    const config = await getPteroConfig();
    try {
        const response = await axios_1.default.post(`${config.url}/api/application/nodes`, data, {
            headers: {
                Authorization: `Bearer ${config.key}`,
                'Content-Type': 'application/json',
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        });
        return response.data.attributes;
    }
    catch (error) {
        console.error('Error creating node:', error);
        throw error;
    }
};
exports.createPteroNode = createPteroNode;
const getPteroNodeConfiguration = async (id) => {
    const config = await getPteroConfig();
    try {
        const response = await axios_1.default.get(`${config.url}/api/application/nodes/${id}/configuration`, {
            headers: {
                Authorization: `Bearer ${config.key}`,
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        });
        return response.data;
    }
    catch (error) {
        console.error('Error fetching node config:', error);
        throw error;
    }
};
exports.getPteroNodeConfiguration = getPteroNodeConfiguration;
const pullPteroFile = async (pteroIdentifier, url, directory = '/') => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    try {
        // Send both 'root' and 'directory' to support different Pterodactyl versions/docs
        // Also ensure directory doesn't have double slashes but starts with / if needed, or maybe try without?
        // Pterodactyl usually expects sending 'root' or 'directory'. We'll send both.
        // Also strip trailing slash.
        const cleanDir = directory.endsWith('/') && directory.length > 1 ? directory.slice(0, -1) : directory;
        await axios_1.default.post(`${config.url}/api/client/servers/${pteroIdentifier}/files/pull`, {
            url,
            root: cleanDir,
            directory: cleanDir,
            use_header: false,
            foreground: true // Try force foreground to ensure it happens immediately? Optional.
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/vnd.pterodactyl.v1+json'
            }
        });
        return true;
    }
    catch (error) {
        console.error('Error pulling file:', error);
        throw error;
    }
};
exports.pullPteroFile = pullPteroFile;
// Startup
const getStartup = async (identifier) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    const response = await axios_1.default.get(`${config.url}/api/client/servers/${identifier}/startup`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
    return response.data;
};
exports.getStartup = getStartup;
const updateStartupVariable = async (identifier, key, value) => {
    const config = await getPteroConfig();
    const token = config.clientKey || config.key;
    const response = await axios_1.default.put(`${config.url}/api/client/servers/${identifier}/startup/variable`, { key, value }, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
    return response.data;
};
exports.updateStartupVariable = updateStartupVariable;
// Rename file
const renamePteroFile = async (identifier, root, from, to) => {
    const config = await getPteroConfig();
    await axios_1.default.put(`${config.url}/api/client/servers/${identifier}/files/rename`, {
        root,
        files: [{ from, to }]
    }, {
        headers: {
            Authorization: `Bearer ${config.clientKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.pterodactyl.v1+json'
        }
    });
};
exports.renamePteroFile = renamePteroFile;
// Upload file (Binary/Multipart)
// Upload file (Binary/Multipart)
const uploadFileToPtero = async (identifier, directory, filename, content) => {
    // 1. Get Signed Upload URL
    const uploadUrl = await (0, exports.getUploadUrl)(identifier, directory);
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
    await axios_1.default.post(finalUrl, body, {
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
    });
};
exports.uploadFileToPtero = uploadFileToPtero;
