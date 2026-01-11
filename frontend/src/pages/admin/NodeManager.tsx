import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { Plus, Server, Trash2, RefreshCw, Activity, CheckCircle, XCircle, Edit2, X } from 'lucide-react';

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
    const [showModal, setShowModal] = useState(false);
    const [editingNode, setEditingNode] = useState<Node | null>(null);
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

    // Create/Update node
    const saveMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            if (editingNode) {
                return api.put(`/admin/nodes/${editingNode.id}`, data);
            }
            return api.post('/admin/nodes', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-nodes'] });
            closeModal();
        }
    });

    // Delete node
    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/admin/nodes/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-nodes'] })
    });

    // Test connection
    const testMutation = useMutation({
        mutationFn: (id: string) => api.post(`/admin/nodes/${id}/test`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-nodes'] })
    });

    const openModal = (node?: Node) => {
        if (node) {
            setEditingNode(node);
            setFormData({
                name: node.name,
                ipAddress: node.ipAddress,
                sshPort: node.sshPort,
                sshUser: node.sshUser,
                sshKeyPath: '',
                sshPassword: '',
                osType: node.osType,
                maxRam: node.maxRam,
                maxCpu: node.maxCpu,
                maxDisk: node.maxDisk
            });
        } else {
            setEditingNode(null);
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
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingNode(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-purple-500" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500 text-center p-8">
                Failed to load nodes. Make sure you have admin access.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Node Management</h2>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition"
                >
                    <Plus size={18} />
                    Add Node
                </button>
            </div>

            {/* Nodes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nodes?.map(node => (
                    <div key={node.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Server className="text-purple-400" size={24} />
                                <div>
                                    <h3 className="font-bold text-white">{node.name}</h3>
                                    <p className="text-sm text-gray-400">{node.ipAddress}:{node.sshPort}</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${node.status === 'online' ? 'bg-green-500/20 text-green-400' :
                                    node.status === 'maintenance' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-red-500/20 text-red-400'
                                }`}>
                                {node.status === 'online' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                {node.status}
                            </div>
                        </div>

                        {/* Resources */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">RAM</span>
                                <span className="text-white">{node.usedRam}/{node.maxRam} MB</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full"
                                    style={{ width: `${(node.usedRam / node.maxRam) * 100}%` }}
                                />
                            </div>

                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">CPU</span>
                                <span className="text-white">{node.usedCpu}/{node.maxCpu} cores</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                                <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${(node.usedCpu / node.maxCpu) * 100}%` }}
                                />
                            </div>

                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Disk</span>
                                <span className="text-white">{Math.round(node.usedDisk / 1024)}/{Math.round(node.maxDisk / 1024)} GB</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                                <div
                                    className="bg-purple-500 h-2 rounded-full"
                                    style={{ width: `${(node.usedDisk / node.maxDisk) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>{node._count?.servers || 0} servers</span>
                            <span>{node.osType}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-white/10">
                            <button
                                onClick={() => testMutation.mutate(node.id)}
                                disabled={testMutation.isPending}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm transition"
                            >
                                <Activity size={14} />
                                Test
                            </button>
                            <button
                                onClick={() => openModal(node)}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm transition"
                            >
                                <Edit2 size={14} />
                                Edit
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete this node?')) {
                                        deleteMutation.mutate(node.id);
                                    }
                                }}
                                disabled={deleteMutation.isPending}
                                className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}

                {nodes?.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-400">
                        <Server className="mx-auto mb-4 opacity-50" size={48} />
                        <p>No nodes configured yet.</p>
                        <p className="text-sm">Click "Add Node" to add your first VPS node.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1b2e] border border-white/10 rounded-xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-lg font-bold text-white">
                                {editingNode ? 'Edit Node' : 'Add Node'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Node Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                    placeholder="US-East-1"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">IP Address</label>
                                    <input
                                        type="text"
                                        value={formData.ipAddress}
                                        onChange={e => setFormData({ ...formData, ipAddress: e.target.value })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        placeholder="192.168.1.100"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">SSH Port</label>
                                    <input
                                        type="number"
                                        value={formData.sshPort}
                                        onChange={e => setFormData({ ...formData, sshPort: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">SSH User</label>
                                <input
                                    type="text"
                                    value={formData.sshUser}
                                    onChange={e => setFormData({ ...formData, sshUser: e.target.value })}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                    placeholder="root"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">SSH Key Path (on backend server)</label>
                                <input
                                    type="text"
                                    value={formData.sshKeyPath}
                                    onChange={e => setFormData({ ...formData, sshKeyPath: e.target.value })}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                    placeholder="/root/.ssh/id_rsa"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">SSH Password (if no key)</label>
                                <input
                                    type="password"
                                    value={formData.sshPassword}
                                    onChange={e => setFormData({ ...formData, sshPassword: e.target.value })}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Max RAM (MB)</label>
                                    <input
                                        type="number"
                                        value={formData.maxRam}
                                        onChange={e => setFormData({ ...formData, maxRam: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Max CPU (cores)</label>
                                    <input
                                        type="number"
                                        value={formData.maxCpu}
                                        onChange={e => setFormData({ ...formData, maxCpu: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Max Disk (MB)</label>
                                    <input
                                        type="number"
                                        value={formData.maxDisk}
                                        onChange={e => setFormData({ ...formData, maxDisk: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saveMutation.isPending}
                                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition disabled:opacity-50"
                                >
                                    {saveMutation.isPending ? 'Saving...' : (editingNode ? 'Update' : 'Create')}
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
