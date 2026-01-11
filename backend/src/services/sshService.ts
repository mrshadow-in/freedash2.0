import { Client, ClientChannel, SFTPWrapper } from 'ssh2';
import { prisma } from '../prisma';
import { exec as localExec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execPromise = util.promisify(localExec);

interface SSHConnectionOptions {
    host: string;
    port: number;
    username: string;
    privateKeyPath?: string;
    password?: string;
}

interface ExecResult {
    stdout: string;
    stderr: string;
    code: number;
}

/**
 * SSH Service for managing connections to VPS nodes
 */
class SSHService {
    private connectionPool: Map<string, Client> = new Map();

    /**
     * Get or create an SSH connection to a node
     */
    async getConnection(nodeId: string): Promise<Client> {
        // Check if we have an active connection
        const existingConnection = this.connectionPool.get(nodeId);
        if (existingConnection) {
            return existingConnection;
        }

        // Fetch node from database
        const node = await prisma.node.findUnique({
            where: { id: nodeId }
        });

        if (!node) {
            throw new Error(`Node ${nodeId} not found`);
        }

        // Create new connection
        const client = await this.connect({
            host: node.ipAddress,
            port: node.sshPort,
            username: node.sshUser,
            privateKeyPath: node.sshKeyPath || undefined,
            password: node.sshPassword || undefined
        });

        this.connectionPool.set(nodeId, client);

        // Handle disconnection
        client.on('close', () => {
            this.connectionPool.delete(nodeId);
        });

        return client;
    }

    /**
     * Create a new SSH connection
     */
    private connect(options: SSHConnectionOptions): Promise<Client> {
        return new Promise((resolve, reject) => {
            const client = new Client();

            const connectConfig: any = {
                host: options.host,
                port: options.port,
                username: options.username,
                readyTimeout: 10000,
            };

            // Use private key if available, otherwise password
            if (options.privateKeyPath) {
                const fs = require('fs');
                try {
                    connectConfig.privateKey = fs.readFileSync(options.privateKeyPath);
                } catch (e) {
                    reject(new Error(`Failed to read SSH key: ${options.privateKeyPath}`));
                    return;
                }
            } else if (options.password) {
                connectConfig.password = options.password;
            } else {
                reject(new Error('No SSH authentication method provided'));
                return;
            }

            client.on('ready', () => {
                console.log(`[SSH] Connected to ${options.host}:${options.port}`);
                resolve(client);
            });

            client.on('error', (err) => {
                console.error(`[SSH] Connection error to ${options.host}:`, err.message);
                reject(err);
            });

            client.connect(connectConfig);
        });
    }

    /**
     * Execute a command on a node
     */
    async exec(nodeId: string, command: string): Promise<ExecResult> {
        const client = await this.getConnection(nodeId);

        return new Promise((resolve, reject) => {
            client.exec(command, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }

                let stdout = '';
                let stderr = '';

                stream.on('close', (code: number) => {
                    resolve({ stdout, stderr, code });
                });

                stream.on('data', (data: Buffer) => {
                    stdout += data.toString();
                });

                stream.stderr.on('data', (data: Buffer) => {
                    stderr += data.toString();
                });
            });
        });
    }

    /**
     * Execute a command with streaming output
     */
    async execStream(
        nodeId: string,
        command: string,
        onData: (data: string) => void,
        onError?: (data: string) => void
    ): Promise<ClientChannel> {
        const client = await this.getConnection(nodeId);

        return new Promise((resolve, reject) => {
            client.exec(command, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }

                stream.on('data', (data: Buffer) => {
                    onData(data.toString());
                });

                stream.stderr.on('data', (data: Buffer) => {
                    if (onError) onError(data.toString());
                    else onData(data.toString());
                });

                resolve(stream);
            });
        });
    }

    /**
     * Get SFTP client for file operations
     */
    async getSFTP(nodeId: string): Promise<SFTPWrapper> {
        const client = await this.getConnection(nodeId);

        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(sftp);
            });
        });
    }

    /**
     * Test connection to a node
     */
    async testConnection(options: SSHConnectionOptions): Promise<{ success: boolean; message: string }> {
        try {
            const client = await this.connect(options);

            // Run a simple command to verify
            return new Promise((resolve) => {
                client.exec('echo "Connection successful" && hostname', (err, stream) => {
                    if (err) {
                        client.end();
                        resolve({ success: false, message: err.message });
                        return;
                    }

                    let output = '';
                    stream.on('close', () => {
                        client.end();
                        resolve({ success: true, message: output.trim() });
                    });

                    stream.on('data', (data: Buffer) => {
                        output += data.toString();
                    });
                });
            });
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Close a specific connection
     */
    closeConnection(nodeId: string): void {
        const client = this.connectionPool.get(nodeId);
        if (client) {
            client.end();
            this.connectionPool.delete(nodeId);
        }
    }

    /**
     * Close all connections
     */
    closeAll(): void {
        for (const [nodeId, client] of this.connectionPool) {
            client.end();
        }
        this.connectionPool.clear();
    }
    /**
     * Get system public key (for auto-deploying nodes)
     */
    async getSystemPublicKey(): Promise<string> {
        const keyPath = path.join(os.homedir(), '.ssh', 'id_rsa');
        const pubKeyPath = keyPath + '.pub';

        if (!fs.existsSync(pubKeyPath)) {
            console.log('[SSH] Generating system SSH key pair...');
            const sshDir = path.dirname(keyPath);
            if (!fs.existsSync(sshDir)) fs.mkdirSync(sshDir, { recursive: true });

            // Generate key without passphrase
            await execPromise(`ssh-keygen -t rsa -b 4096 -f "${keyPath}" -N "" -C "freedash-panel"`);
        }

        return fs.readFileSync(pubKeyPath, 'utf8').trim();
    }
}

// Singleton instance
export const sshService = new SSHService();
