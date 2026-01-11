import { prisma } from '../prisma';
import { sshService } from './sshService';

interface CreateContainerOptions {
    nodeId: string;
    serverId: string;
    name: string;
    image: string;
    ramMb: number;
    cpuCores: number;
    diskMb: number;
    port: number;
    env?: Record<string, string>;
}

interface ContainerInfo {
    id: string;
    status: string;
    running: boolean;
    ports: any;
}

/**
 * Container Service for managing Docker containers on nodes
 */
class ContainerService {

    /**
     * Create a new Docker container on a node
     */
    async createContainer(options: CreateContainerOptions): Promise<string> {
        const { nodeId, serverId, name, image, ramMb, cpuCores, diskMb, port, env } = options;

        // Build environment variables string
        const envFlags = env
            ? Object.entries(env).map(([k, v]) => `-e "${k}=${v}"`).join(' ')
            : '';

        // Create server directory
        const serverPath = `/home/servers/${serverId}`;
        await sshService.exec(nodeId, `mkdir -p ${serverPath}`);

        // Build docker run command
        const dockerCmd = `
            docker run -d \
                --name "freedash_${serverId}" \
                --memory="${ramMb}m" \
                --cpus="${cpuCores}" \
                -v "${serverPath}:/data" \
                -p ${port}:25565 \
                ${envFlags} \
                --restart unless-stopped \
                ${image}
        `.replace(/\s+/g, ' ').trim();

        console.log(`[Container] Creating container on node ${nodeId}: ${dockerCmd}`);

        const result = await sshService.exec(nodeId, dockerCmd);

        if (result.code !== 0) {
            console.error(`[Container] Failed to create:`, result.stderr);
            throw new Error(`Failed to create container: ${result.stderr}`);
        }

        const containerId = result.stdout.trim().substring(0, 12); // Short ID
        console.log(`[Container] Created container ${containerId}`);

        return containerId;
    }

    /**
     * Start a container
     */
    async startContainer(nodeId: string, containerId: string): Promise<void> {
        console.log(`[Container] Starting ${containerId}`);
        const result = await sshService.exec(nodeId, `docker start ${containerId}`);

        if (result.code !== 0) {
            throw new Error(`Failed to start container: ${result.stderr}`);
        }
    }

    /**
     * Stop a container gracefully
     */
    async stopContainer(nodeId: string, containerId: string): Promise<void> {
        console.log(`[Container] Stopping ${containerId}`);
        const result = await sshService.exec(nodeId, `docker stop ${containerId}`);

        if (result.code !== 0 && !result.stderr.includes('is not running')) {
            throw new Error(`Failed to stop container: ${result.stderr}`);
        }
    }

    /**
     * Kill a container immediately
     */
    async killContainer(nodeId: string, containerId: string): Promise<void> {
        console.log(`[Container] Killing ${containerId}`);
        const result = await sshService.exec(nodeId, `docker kill ${containerId}`);

        if (result.code !== 0 && !result.stderr.includes('is not running')) {
            throw new Error(`Failed to kill container: ${result.stderr}`);
        }
    }

    /**
     * Restart a container
     */
    async restartContainer(nodeId: string, containerId: string): Promise<void> {
        console.log(`[Container] Restarting ${containerId}`);
        const result = await sshService.exec(nodeId, `docker restart ${containerId}`);

        if (result.code !== 0) {
            throw new Error(`Failed to restart container: ${result.stderr}`);
        }
    }

    /**
     * Delete a container and its data
     */
    async deleteContainer(nodeId: string, containerId: string, serverId: string): Promise<void> {
        console.log(`[Container] Deleting ${containerId}`);

        // Stop container first
        await sshService.exec(nodeId, `docker stop ${containerId}`).catch(() => { });

        // Remove container
        const result = await sshService.exec(nodeId, `docker rm -f ${containerId}`);

        if (result.code !== 0 && !result.stderr.includes('No such container')) {
            throw new Error(`Failed to delete container: ${result.stderr}`);
        }

        // Remove server data (optional - could be configurable)
        const serverPath = `/home/servers/${serverId}`;
        await sshService.exec(nodeId, `rm -rf ${serverPath}`).catch(() => { });
    }

    /**
     * Get container status
     */
    async getContainerStatus(nodeId: string, containerId: string): Promise<ContainerInfo> {
        const result = await sshService.exec(nodeId,
            `docker inspect --format='{"id":"{{.Id}}","status":"{{.State.Status}}","running":{{.State.Running}},"ports":"{{json .NetworkSettings.Ports}}"}' ${containerId}`
        );

        if (result.code !== 0) {
            throw new Error(`Failed to get container status: ${result.stderr}`);
        }

        try {
            return JSON.parse(result.stdout.trim());
        } catch (e) {
            throw new Error(`Failed to parse container status: ${result.stdout}`);
        }
    }

    /**
     * Get container logs (last N lines)
     */
    async getContainerLogs(nodeId: string, containerId: string, lines: number = 100): Promise<string> {
        const result = await sshService.exec(nodeId, `docker logs --tail ${lines} ${containerId}`);

        // Docker logs go to stderr for some output
        return result.stdout + result.stderr;
    }

    /**
     * Stream container logs in real-time
     */
    async streamContainerLogs(
        nodeId: string,
        containerId: string,
        onData: (data: string) => void
    ): Promise<{ close: () => void }> {
        const stream = await sshService.execStream(
            nodeId,
            `docker logs -f --tail 50 ${containerId}`,
            onData,
            onData // also send stderr to the same handler
        );

        return {
            close: () => {
                stream.close();
            }
        };
    }

    /**
     * Execute a command inside a container
     */
    async execInContainer(nodeId: string, containerId: string, command: string): Promise<string> {
        const result = await sshService.exec(nodeId, `docker exec ${containerId} ${command}`);

        if (result.code !== 0) {
            throw new Error(`Command failed: ${result.stderr}`);
        }

        return result.stdout;
    }

    /**
     * Send input to container's stdin (for game servers that use RCON or stdin)
     */
    async sendCommand(nodeId: string, containerId: string, command: string): Promise<void> {
        // For Minecraft servers with RCON
        const result = await sshService.exec(nodeId,
            `docker exec ${containerId} rcon-cli ${command} 2>/dev/null || echo "${command}" | docker attach --sig-proxy=false ${containerId} 2>/dev/null`
        );

        // We don't throw on error since some methods may not be available
        if (result.stdout) {
            console.log(`[Container] Command response: ${result.stdout}`);
        }
    }

    /**
     * Get container resource usage
     */
    async getContainerStats(nodeId: string, containerId: string): Promise<any> {
        const result = await sshService.exec(nodeId,
            `docker stats --no-stream --format '{"cpu":"{{.CPUPerc}}","mem":"{{.MemUsage}}","memPerc":"{{.MemPerc}}","net":"{{.NetIO}}","block":"{{.BlockIO}}"}' ${containerId}`
        );

        if (result.code !== 0) {
            throw new Error(`Failed to get container stats: ${result.stderr}`);
        }

        try {
            return JSON.parse(result.stdout.trim());
        } catch (e) {
            return { raw: result.stdout.trim() };
        }
    }

    /**
     * Find an available port on a node
     */
    async findAvailablePort(nodeId: string, startPort: number = 25565): Promise<number> {
        // Get list of used ports
        const result = await sshService.exec(nodeId,
            `docker ps --format '{{.Ports}}' | grep -oP '\\d+(?=->)' | sort -n | uniq`
        );

        const usedPorts = result.stdout.split('\n')
            .map(p => parseInt(p.trim()))
            .filter(p => !isNaN(p));

        // Find first available port starting from startPort
        let port = startPort;
        while (usedPorts.includes(port)) {
            port++;
        }

        return port;
    }
}

// Singleton instance
export const containerService = new ContainerService();
