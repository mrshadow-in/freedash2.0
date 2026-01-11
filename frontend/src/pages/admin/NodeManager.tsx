import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import {
    Plus, Server, Trash2, RefreshCw, Activity, CheckCircle,
    XCircle, Edit2, X, Search, HardDrive, Cpu, MemoryStick
} from 'lucide-react';
import NodeDetails from './NodeDetails';

interface Node {
    id: string;
    name: string;
    ipAddress: string;
    sshPort: number;
    sshUser: string;
    sshKeyPath: string | null;
    osType: string;
    maxRam: number;
    maxCpu: number;
    maxDisk: number;
    usedRam: number;
    usedCpu: number;
    usedDisk: number;
    status: string;
    lastPing: string | null;
    _count?: { servers: number };
}

const NodeManager = () => {
    const queryClient = useQueryClient();
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');

    // Create Mode Form State
    const [formData, setFormData] = useState({
        name: '',
        ipAddress: '',
        sshPort: 22,
        sshUser: 'root',
        sshKeyPath: '',
        sshPassword: '',
        osType: 'ubuntu',
        maxRam: 8192,
        maxCpu: 4,
        maxDisk: 102400
    });

    // Fetch nodes
    const { data: nodes, isLoading, error } = useQuery({
        queryKey: ['admin-nodes'],
        queryFn: async () => {
            const res = await api.get('/admin/nodes');
            return res.data as Node[];
        }
    });

    // Create Node Mutation
    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            return api.post('/admin/nodes', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-nodes'] });
            setShowModal(false);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    // Filter nodes
    const filteredNodes = nodes?.filter(node =>
        node.name.toLowerCase().includes(search.toLowerCase()) ||
        node.ipAddress.includes(search)
    );

    // If a node is selected, show details view
    if (selectedNodeId) {
        return <NodeDetails nodeId={selectedNodeId} onBack={() => setSelectedNodeId(null)} />;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-purple-500" size={32} />
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 p-8">Failed to load nodes.</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header + Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Nodes</h2>
                    <p className="text-gray-400 text-sm">All nodes available on the system.</p>
                </div>

                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search Nodes..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-[#1a1b2e] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition w-64"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setFormData({
                                name: '',
                                ipAddress: '',
                                sshPort: 22,
                                sshUser: 'root',
                                sshKeyPath: '',
                                sshPassword: '',
                                osType: 'ubuntu',
                                maxRam: 8192,
                                maxCpu: 4,
                                maxDisk: 102400
                            });
                            setShowModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition text-sm font-bold"
                    >
                        Create New
                    </button>
                </div>
            </div>

            {/* Nodes Table */}
            <div className="bg-[#1a1b2e] border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 text-xs uppercase font-bold">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Location</th>
                            <th className="px-6 py-4">Memory</th>
                            <th className="px-6 py-4">Disk</th>
                            <th className="px-6 py-4 text-center">Servers</th>
                            <th className="px-6 py-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {filteredNodes?.map(node => (
                            <tr
                                key={node.id}
                                onClick={() => setSelectedNodeId(node.id)}
                                className="hover:bg-white/5 transition cursor-pointer group"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="font-bold text-white group-hover:text-purple-400 transition">{node.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-400">
                                    {node.ipAddress}
                                </td>
                                <td className="px-6 py-4 text-gray-300">
                                    {node.maxRam} MB
                                </td>
                                <td className="px-6 py-4 text-gray-300">
                                    {node.maxDisk} MB
                                </td>
                                <td className="px-6 py-4 text-center text-white font-bold">
                                    {node._count?.servers || 0}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {node.status === 'online' ? (
                                        <span className="text-green-400"><Activity size={16} className="inline" /></span>
                                    ) : (
                                        <span className="text-red-400"><XCircle size={16} className="inline" /></span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filteredNodes?.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    No nodes found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1b2e] border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h3 className="text-xl font-bold text-white">Create New Node</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-purple-400 font-bold text-sm uppercase">Basic Details</h4>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                            placeholder="Node 1"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">IP Address</label>
                                        <input
                                            type="text"
                                            value={formData.ipAddress}
                                            onChange={e => setFormData({ ...formData, ipAddress: e.target.value })}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                            placeholder="192.168.1.1"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-purple-400 font-bold text-sm uppercase">Resources</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">RAM (MB)</label>
                                            <input
                                                type="number"
                                                value={formData.maxRam}
                                                onChange={e => setFormData({ ...formData, maxRam: parseInt(e.target.value) })}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Disk (MB)</label>
                                            <input
                                                type="number"
                                                value={formData.maxDisk}
                                                onChange={e => setFormData({ ...formData, maxDisk: parseInt(e.target.value) })}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h4 className="text-purple-400 font-bold text-sm uppercase">SSH Configuration</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">SSH Port</label>
                                        <input
                                            type="number"
                                            value={formData.sshPort}
                                            onChange={e => setFormData({ ...formData, sshPort: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">SSH User</label>
                                        <input
                                            type="text"
                                            value={formData.sshUser}
                                            onChange={e => setFormData({ ...formData, sshUser: e.target.value })}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">SSH Password (Encrypted)</label>
                                        <input
                                            type="password"
                                            value={formData.sshPassword}
                                            onChange={e => setFormData({ ...formData, sshPassword: e.target.value })}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                            placeholder="Leave blank if using keys"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-bold transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-green-900/20"
                                >
                                    {createMutation.isPending ? 'Creating...' : 'Create Node'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NodeManager;
