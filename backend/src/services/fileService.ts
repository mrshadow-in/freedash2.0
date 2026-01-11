import { prisma } from '../prisma';
import { sshService } from './sshService';
import path from 'path';

interface FileInfo {
    name: string;
    mode: string;
    size: number;
    isFile: boolean;
    isDirectory: boolean;
    isSymlink: boolean;
    modifiedAt: Date;
    createdAt: Date;
}

/**
 * File Service for managing server files via SFTP
 */
class FileService {

    /**
     * Get the base path for a server's files
     */
    private getServerPath(serverId: string): string {
        return `/home/servers/${serverId}`;
    }

    /**
     * Resolve and sanitize a path within the server directory
     */
    private resolvePath(serverId: string, relativePath: string): string {
        const basePath = this.getServerPath(serverId);
        const resolvedPath = path.posix.join(basePath, relativePath || '/');

        // Security: Ensure path doesn't escape the server directory
        if (!resolvedPath.startsWith(basePath)) {
            throw new Error('Invalid path: Path traversal detected');
        }

        return resolvedPath;
    }

    /**
     * List files in a directory
     */
    async listFiles(nodeId: string, serverId: string, directory: string = '/'): Promise<FileInfo[]> {
        const sftp = await sshService.getSFTP(nodeId);
        const fullPath = this.resolvePath(serverId, directory);

        return new Promise((resolve, reject) => {
            sftp.readdir(fullPath, (err, list) => {
                if (err) {
                    reject(new Error(`Failed to list files: ${err.message}`));
                    return;
                }

                const files: FileInfo[] = list.map(item => ({
                    name: item.filename,
                    mode: item.longname.substring(0, 10),
                    size: item.attrs.size,
                    isFile: item.longname.startsWith('-'),
                    isDirectory: item.longname.startsWith('d'),
                    isSymlink: item.longname.startsWith('l'),
                    modifiedAt: new Date(item.attrs.mtime * 1000),
                    createdAt: new Date(item.attrs.atime * 1000)
                }));

                // Sort: directories first, then alphabetically
                files.sort((a, b) => {
                    if (a.isDirectory && !b.isDirectory) return -1;
                    if (!a.isDirectory && b.isDirectory) return 1;
                    return a.name.localeCompare(b.name);
                });

                resolve(files);
            });
        });
    }

    /**
     * Read file contents
     */
    async readFile(nodeId: string, serverId: string, filePath: string): Promise<string> {
        const sftp = await sshService.getSFTP(nodeId);
        const fullPath = this.resolvePath(serverId, filePath);

        return new Promise((resolve, reject) => {
            // Use ssh exec for reading since SFTP readFile can be tricky with large files
            sshService.exec(nodeId, `cat "${fullPath}"`).then(result => {
                if (result.code !== 0) {
                    reject(new Error(`Failed to read file: ${result.stderr}`));
                    return;
                }
                resolve(result.stdout);
            }).catch(reject);
        });
    }

    /**
     * Write file contents
     */
    async writeFile(nodeId: string, serverId: string, filePath: string, content: string): Promise<void> {
        const fullPath = this.resolvePath(serverId, filePath);

        // Use echo with base64 to safely write content
        const base64Content = Buffer.from(content).toString('base64');
        const result = await sshService.exec(nodeId, `echo "${base64Content}" | base64 -d > "${fullPath}"`);

        if (result.code !== 0) {
            throw new Error(`Failed to write file: ${result.stderr}`);
        }
    }

    /**
     * Delete file or directory
     */
    async deleteFile(nodeId: string, serverId: string, filePath: string): Promise<void> {
        const fullPath = this.resolvePath(serverId, filePath);

        // Use rm -rf to handle both files and directories
        const result = await sshService.exec(nodeId, `rm -rf "${fullPath}"`);

        if (result.code !== 0) {
            throw new Error(`Failed to delete: ${result.stderr}`);
        }
    }

    /**
     * Create a directory
     */
    async createFolder(nodeId: string, serverId: string, folderPath: string): Promise<void> {
        const fullPath = this.resolvePath(serverId, folderPath);

        const result = await sshService.exec(nodeId, `mkdir -p "${fullPath}"`);

        if (result.code !== 0) {
            throw new Error(`Failed to create folder: ${result.stderr}`);
        }
    }

    /**
     * Rename/move file or directory
     */
    async rename(nodeId: string, serverId: string, oldPath: string, newPath: string): Promise<void> {
        const fullOldPath = this.resolvePath(serverId, oldPath);
        const fullNewPath = this.resolvePath(serverId, newPath);

        const result = await sshService.exec(nodeId, `mv "${fullOldPath}" "${fullNewPath}"`);

        if (result.code !== 0) {
            throw new Error(`Failed to rename: ${result.stderr}`);
        }
    }

    /**
     * Copy file or directory
     */
    async copy(nodeId: string, serverId: string, srcPath: string, destPath: string): Promise<void> {
        const fullSrcPath = this.resolvePath(serverId, srcPath);
        const fullDestPath = this.resolvePath(serverId, destPath);

        const result = await sshService.exec(nodeId, `cp -r "${fullSrcPath}" "${fullDestPath}"`);

        if (result.code !== 0) {
            throw new Error(`Failed to copy: ${result.stderr}`);
        }
    }

    /**
     * Compress file/directory to archive
     */
    async compress(nodeId: string, serverId: string, filePath: string): Promise<string> {
        const fullPath = this.resolvePath(serverId, filePath);
        const archivePath = `${fullPath}.tar.gz`;

        const dirName = path.posix.dirname(fullPath);
        const baseName = path.posix.basename(fullPath);

        const result = await sshService.exec(nodeId, `cd "${dirName}" && tar -czf "${archivePath}" "${baseName}"`);

        if (result.code !== 0) {
            throw new Error(`Failed to compress: ${result.stderr}`);
        }

        return archivePath;
    }

    /**
     * Decompress archive
     */
    async decompress(nodeId: string, serverId: string, archivePath: string): Promise<void> {
        const fullPath = this.resolvePath(serverId, archivePath);
        const dirName = path.posix.dirname(fullPath);

        const result = await sshService.exec(nodeId, `cd "${dirName}" && tar -xzf "${fullPath}"`);

        if (result.code !== 0) {
            throw new Error(`Failed to decompress: ${result.stderr}`);
        }
    }

    /**
     * Get file/directory info
     */
    async getInfo(nodeId: string, serverId: string, filePath: string): Promise<any> {
        const fullPath = this.resolvePath(serverId, filePath);

        const result = await sshService.exec(nodeId, `stat -c '{"size":%s,"blocks":%b,"mode":"%A","uid":%u,"gid":%g}' "${fullPath}"`);

        if (result.code !== 0) {
            throw new Error(`Failed to get file info: ${result.stderr}`);
        }

        try {
            return JSON.parse(result.stdout.trim());
        } catch (e) {
            return { raw: result.stdout.trim() };
        }
    }

    /**
     * Check if file/directory exists
     */
    async exists(nodeId: string, serverId: string, filePath: string): Promise<boolean> {
        const fullPath = this.resolvePath(serverId, filePath);

        const result = await sshService.exec(nodeId, `test -e "${fullPath}" && echo "exists" || echo "not_found"`);

        return result.stdout.trim() === 'exists';
    }
}

// Singleton instance
export const fileService = new FileService();
