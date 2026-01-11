import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import {
    Folder, FileText, Download, Edit, Trash2,
    MoreVertical, Upload, Plus, ChevronRight,
    Home, RefreshCw, FolderPlus, File as FileIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import FileEditor from './FileEditor';

interface FileManagerProps {
    serverId: string;
}

const FileManager = ({ serverId }: FileManagerProps) => {
    const queryClient = useQueryClient();
    const [directory, setDirectory] = useState('');
    const [editingFile, setEditingFile] = useState<string | null>(null);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Fetch Files
    const { data: files, isLoading, error } = useQuery({
        queryKey: ['files', serverId, directory],
        queryFn: async () => {
            const res = await api.get(`/servers/${serverId}/files/list?directory=${encodeURIComponent(directory)}`);
            return res.data; // Ptero returns list of objects
        }
    });

    // Create Folder
    const createFolderMutation = useMutation({
        mutationFn: async (name: string) => {
            return api.post(`/servers/${serverId}/files/create-folder`, {
                root: directory,
                name
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['files', serverId, directory] });
            setShowCreateFolder(false);
            setNewFolderName('');
            toast.success('Folder created');
        },
        onError: () => toast.error('Failed to create folder')
    });

    // Delete File/Folder
    const deleteMutation = useMutation({
        mutationFn: async (name: string) => {
            return api.post(`/servers/${serverId}/files/delete`, {
                root: directory,
                files: [name]
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['files', serverId, directory] });
            toast.success('Deleted successfully');
        },
        onError: () => toast.error('Failed to delete')
    });

    // Rename (Simple prompt for now)
    const renameMutation = useMutation({
        mutationFn: async ({ from, to }: { from: string, to: string }) => {
            return api.post(`/servers/${serverId}/files/rename`, {
                root: directory,
                files: [{ from, to }]
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['files', serverId, directory] });
            toast.success('Renamed successfully');
        },
        onError: () => toast.error('Failed to rename')
    });

    // Upload (Basic implementation)
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];

        try {
            // Get URL
            const urlRes = await api.get(`/servers/${serverId}/files/upload-url`);
            const uploadUrl = urlRes.data.url;

            // Upload via fetch to signed URL
            const formData = new FormData();
            formData.append('files', file);

            // Note: Pterodactyl signed URLs usually accept POST with multipart/form-data
            // Since we are proxying, this might need axios.post to external URL
            // But browser can post directly to ptero upload url to avoid backend bandwidth
            // However, CORS might be an issue if Ptero isn't configured for this Dashboard domain.
            // Let's assume CORS is fine or we proxy via ptero.
            // Actually, usually Pterodactyl requires `&directory=...` in query param of upload url 
            // but the `getUploadUrl` usually returns a base url where we append query params? 
            // Or the endpoint itself handles it.
            // Pterodactyl API: GET /upload returns { url: "..." }
            // Then POST to that URL with file and `directory` param.

            const uploadTarget = `${uploadUrl}&directory=${encodeURIComponent(directory)}`;

            await fetch(uploadTarget, {
                method: 'POST',
                body: formData
            });

            queryClient.invalidateQueries({ queryKey: ['files', serverId, directory] });
            toast.success('File uploaded');
        } catch (error) {
            console.error(error);
            toast.error('Upload failed');
        }
    };

    const handleNavigate = (path: string) => {
        // If clicking a file, open editor/download
        // If clicking a folder, append to directory
        setDirectory(path);
    };

    const handleBreadcrumbClick = (index: number) => {
        if (directory === '') return;
        const parts = directory.split('/');
        const newPath = parts.slice(0, index + 1).join('/');
        setDirectory(newPath);
    };

    if (editingFile) {
        return (
            <FileEditor
                serverId={serverId}
                filePath={editingFile}
                onClose={() => setEditingFile(null)}
            />
        );
    }

    return (
        <div className="bg-[#0d1117] rounded-xl border border-white/10 flex flex-col min-h-[500px] shadow-xl">
            {/* Toolbar */}
            <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#161b22]">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 overflow-x-auto max-w-full text-sm font-mono text-gray-400">
                    <button
                        onClick={() => setDirectory('')}
                        className={`hover:text-white transition ${directory === '' ? 'text-white font-bold' : ''}`}
                    >
                        /container
                    </button>
                    {directory.split('/').filter(Boolean).map((part, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <ChevronRight size={14} />
                            <button
                                onClick={() => handleBreadcrumbClick(i)}
                                className="hover:text-white transition whitespace-nowrap"
                            >
                                {part}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowCreateFolder(true)}
                        className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition tooltip"
                        title="New Folder"
                    >
                        <FolderPlus size={18} />
                    </button>
                    <label className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition cursor-pointer tooltip" title="Upload File">
                        <Upload size={18} />
                        <input type="file" className="hidden" onChange={handleUpload} />
                    </label>
                    <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['files'] })}
                        className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#161b22] text-xs font-bold text-gray-500 uppercase sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3 w-32">Size</th>
                            <th className="px-6 py-3 w-48">Modified</th>
                            <th className="px-6 py-3 w-20 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                        {directory !== '' && (
                            <tr
                                onClick={() => {
                                    const parts = directory.split('/');
                                    parts.pop();
                                    setDirectory(parts.join('/'));
                                }}
                                className="hover:bg-white/5 cursor-pointer transition select-none"
                            >
                                <td className="px-6 py-3 flex items-center gap-3">
                                    <Folder size={18} className="text-yellow-500" />
                                    <span className="font-mono text-yellow-500">..</span>
                                </td>
                                <td colSpan={3}></td>
                            </tr>
                        )}
                        {isLoading ? (
                            <tr><td colSpan={4} className="text-center py-8">Loading files...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={4} className="text-center py-8 text-red-500">Failed to load files</td></tr>
                        ) : files?.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-8 text-gray-500">Empty directory</td></tr>
                        ) : (
                            files?.map((file: any) => (
                                <tr
                                    key={file.attributes.name}
                                    className="hover:bg-white/5 transition group"
                                >
                                    <td className="px-6 py-3">
                                        <div
                                            className="flex items-center gap-3 cursor-pointer"
                                            onClick={() => {
                                                if (file.attributes.is_file) {
                                                    // Only edit text files roughly
                                                    if (file.attributes.size < 1024 * 1024 * 2) { // < 2MB
                                                        setEditingFile(directory ? `${directory}/${file.attributes.name}` : file.attributes.name);
                                                    } else {
                                                        toast.error('File too large to edit');
                                                    }
                                                } else {
                                                    setDirectory(directory ? `${directory}/${file.attributes.name}` : file.attributes.name);
                                                }
                                            }}
                                        >
                                            {file.attributes.is_file ? (
                                                <FileIcon size={18} className="text-blue-400" />
                                            ) : (
                                                <Folder size={18} className="text-yellow-500" />
                                            )}
                                            <span className={`${!file.attributes.is_file && 'text-yellow-500'} font-medium`}>
                                                {file.attributes.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 font-mono text-gray-500 text-xs">
                                        {file.attributes.is_file ? (file.attributes.size / 1024).toFixed(1) + ' KB' : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-gray-500 text-xs">
                                        {format(new Date(file.attributes.modified_at), 'MMM d, HH:mm')}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                            {file.attributes.is_file && (
                                                <button title="Edit" onClick={() => setEditingFile(directory ? `${directory}/${file.attributes.name}` : file.attributes.name)} className="p-1 hover:text-blue-400"><Edit size={14} /></button>
                                            )}
                                            <button
                                                title="Rename"
                                                onClick={() => {
                                                    const newName = prompt("Rename to:", file.attributes.name);
                                                    if (newName && newName !== file.attributes.name) {
                                                        renameMutation.mutate({ from: file.attributes.name, to: newName });
                                                    }
                                                }}
                                                className="p-1 hover:text-yellow-400"
                                            ><Edit size={14} /></button>
                                            <button
                                                title="Delete"
                                                onClick={() => {
                                                    if (confirm(`Delete ${file.attributes.name}?`)) deleteMutation.mutate(file.attributes.name);
                                                }}
                                                className="p-1 hover:text-red-400"
                                            ><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Folder Modal */}
            <AnimatePresence>
                {showCreateFolder && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#161b22] border border-white/10 p-6 rounded-xl w-80 shadow-2xl"
                        >
                            <h3 className="text-lg font-bold text-white mb-4">New Folder</h3>
                            <input
                                autoFocus
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Folder Name"
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2 text-white mb-4 outline-none focus:border-blue-500"
                                onKeyDown={(e) => e.key === 'Enter' && createFolderMutation.mutate(newFolderName)}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowCreateFolder(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
                                <button
                                    onClick={() => createFolderMutation.mutate(newFolderName)}
                                    disabled={!newFolderName}
                                    className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50"
                                >
                                    Create
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FileManager;
