import Docker from 'dockerode';
import fs from 'fs-extra';
import path from 'path';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

interface ServerConfig {
    uuid: string; // Container Name
    image: string;
    ports: Record<string, number>; // "25565/tcp": 25565
    env: string[]; // ["VAR=val"]
    memory: number; // MB
    cpu: number; // %
    disk: number; // MB
}

class DockerService {

    /**
     * Create a new server container
     */
    async createServer(config: ServerConfig) {
        // Ensure image exists
        await this.pullImage(config.image);

        // Prepare Port Bindings
        // Input: { "25565/tcp": 25565 }
        // Output: { "25565/tcp": [{ "HostPort": "25565" }] }
        const portBindings: any = {};
        const exposedPorts: any = {};

        for (const [containerPort, hostPort] of Object.entries(config.ports)) {
            exposedPorts[containerPort] = {};
            portBindings[containerPort] = [{ HostPort: String(hostPort) }];
        }

        // Create Container
        const container = await docker.createContainer({
            Image: config.image,
            name: config.uuid,
            Env: config.env,
            ExposedPorts: exposedPorts,
            HostConfig: {
                PortBindings: portBindings,
                Memory: config.memory * 1024 * 1024,
                NanoCpus: config.cpu * 1000000000,
                Binds: [
                    // Mount volume
                    `/var/lib/freedash/volumes/${config.uuid}:/home/container`
                ]
            },
            Tty: true,
            OpenStdin: true
        });

        return container.id;
    }

    /**
     * Pull Docker Image
     */
    async pullImage(image: string) {
        console.log(`[Docker] Pulling image ${image}...`);
        await new Promise((resolve, reject) => {
            docker.pull(image, (err: any, stream: any) => {
                if (err) return reject(err);

                docker.modem.followProgress(stream, (err: any, res: any) => {
                    if (err) reject(err);
                    else resolve(res);
                });
            });
        });
    }

    /**
     * Power Actions
     */
    async power(uuid: string, action: 'start' | 'stop' | 'restart' | 'kill') {
        const container = docker.getContainer(uuid);

        try {
            switch (action) {
                case 'start': await container.start(); break;
                case 'stop': await container.stop(); break;
                case 'restart': await container.restart(); break;
                case 'kill': await container.kill(); break;
            }
        } catch (error: any) {
            // Ignore "container already started/stopped" errors appropriately
            console.error(`[Docker] Power error for ${uuid}:`, error.message);
            throw error;
        }
    }

    /**
     * Delete Server
     */
    async deleteServer(uuid: string) {
        const container = docker.getContainer(uuid);
        try {
            await container.stop().catch(() => { }); // Try stop first
            await container.remove();

            // Cleanup volume
            await fs.remove(`/var/lib/freedash/volumes/${uuid}`);
        } catch (error) {
            console.error(`[Docker] Delete error for ${uuid}:`, error);
        }
    }

    /**
     * Attach WebSocket to Container Console
     */
    async attachConsole(uuid: string, ws: any) {
        const container = docker.getContainer(uuid);

        try {
            const stream = await container.attach({
                stream: true,
                stdin: true,
                stdout: true,
                stderr: true
            });

            // Docker Stream -> WS
            stream.on('data', (chunk: Buffer) => {
                ws.send(chunk.toString());
            });

            // WS -> Docker Stream (Input)
            ws.on('message', (msg: string) => {
                stream.write(msg);
            });

            ws.on('close', () => {
                stream.end();
            });

        } catch (error) {
            console.error(`[Docker] Attach error for ${uuid}:`, error);
            ws.close(1011, 'Failed to attach to container');
        }
    }
}

export const dockerService = new DockerService();
