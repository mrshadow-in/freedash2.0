import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import {
    Activity, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface NodeDetailsProps {
    nodeId: string;
    onBack: () => void;
}

const NodeDetails = ({ nodeId, onBack }: NodeDetailsProps) => {
    const [activeTab, setActiveTab] = useState<'about' | 'allocation' | 'servers'>('about');
    const queryClient = useQueryClient();

    // Fetch node details
    const { data: node, isLoading } = useQuery({
        queryKey: ['admin-node', nodeId],
        queryFn: async () => {
            const res = await api.get(`/admin/nodes/${nodeId}`);
            return res.data;
        }
    });

    // Fetch allocations
    const { data: allocations } = useQuery({
        queryKey: ['admin-node-allocations', nodeId],
        queryFn: async () => {
            const res = await api.get(`/admin/nodes/${nodeId}/allocations`);
            return res.data;
        },
        enabled: activeTab === 'allocation'
    });

    // Create Allocations Mutation
    const createAllocationMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post(`/admin/nodes/${nodeId}/allocations`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-node-allocations', nodeId] });
            toast.success('Allocations created successfully');
        },
        onError: () => toast.error('Failed to create allocations')
    });

    // Delete Allocation Mutation
    const deleteAllocationMutation = useMutation({
        mutationFn: async (allocId: string) => {
            return api.delete(`/admin/nodes/${nodeId}/allocations/${allocId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-node-allocations', nodeId] });
            toast.success('Allocation deleted');
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete')
    });

    // Test Connection
    const testMutation = useMutation({
        mutationFn: () => api.post(`/admin/nodes/${nodeId}/test`),
        onSuccess: (data: any) => {
            if (data.data.success) toast.success('Connection successful');
            else toast.error('Connection failed: ' + data.data.message);
        }
    });

    if (isLoading) return <div className="p-8 text-center text-gray-400">Loading node details...</div>;

    return (
        <div className="space-y-6">
            {/* Header / Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                <button onClick={onBack} className="hover:text-white transition">Nodes</button>
                <span>/</span>
                <span className="text-white font-medium">{node.name}</span>
            </div>

            {/* Title & Status */}
            <div className="bg-[#1a1b2e] border border-white/10 rounded-xl p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">{node.name}</h1>
                        <p className="text-gray-400 max-w-2xl text-sm">
                            {node.description || 'A generic node description.'}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${node.status === 'online' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                            <Activity size={16} />
                            {node.status === 'online' ? 'Systems Operational' : 'Offline'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
                {['about', 'allocation', 'servers'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-6 py-3 text-sm font-medium capitalize transition-colors relative ${activeTab === tab ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab: About */}
            {activeTab === 'about' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Information */}
                    <div className="bg-[#1a1b2e] border border-white/10 rounded-xl p-6 h-fit">
                        <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Information</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 text-sm">
                                <span className="text-gray-400">Daemon Version</span>
                                <span className="text-right text-white">v1.12.0 (Latest)</span>
                            </div>
                            <div className="grid grid-cols-2 text-sm">
                                <span className="text-gray-400">System Information</span>
                                <span className="text-right text-white truncate">{node.osType} (amd64)</span>
                            </div>
                            <div className="grid grid-cols-2 text-sm">
                                <span className="text-gray-400">Total CPU Threads</span>
                                <span className="text-right text-white">{node.maxCpu}</span>
                            </div>
                            <div className="grid grid-cols-2 text-sm">
                                <span className="text-gray-400">Memory Capacity</span>
                                <span className="text-right text-white">{node.maxRam} MB</span>
                            </div>
                            <div className="grid grid-cols-2 text-sm">
                                <span className="text-gray-400">Disk Capacity</span>
                                <span className="text-right text-white">{node.maxDisk} MB</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-6">
                        <div className="bg-[#1a1b2e] border border-white/10 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Actions</h3>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => testMutation.mutate()}
                                    disabled={testMutation.isPending}
                                    className="flex-1 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm font-bold transition"
                                >
                                    {testMutation.isPending ? 'Testing...' : 'Test Connection'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-red-400 mb-2">Delete Node</h3>
                            <p className="text-sm text-gray-400 mb-4">
                                Deleting a node is irreversible and will remove it from the panel.
                                There must be no servers associated with this node.
                            </p>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-500 transition">
                                Yes, Delete This Node
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Allocation */}
            {activeTab === 'allocation' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Allocation Form */}
                    <div className="lg:col-span-1 bg-[#1a1b2e] border border-white/10 rounded-xl p-6 h-fit">
                        <h3 className="text-lg font-bold text-white mb-4">Assign New Allocations</h3>
                        <AllocationForm
                            ip={node.ipAddress}
                            onSubmit={(data: any) => createAllocationMutation.mutate(data)}
                            loading={createAllocationMutation.isPending}
                        />
                    </div>

                    {/* Allocation List */}
                    <div className="lg:col-span-2 bg-[#1a1b2e] border border-white/10 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-gray-400">
                                <tr>
                                    <th className="px-6 py-3 font-medium">IP Address + Port</th>
                                    <th className="px-6 py-3 font-medium">Alias</th>
                                    <th className="px-6 py-3 font-medium">Assigned To</th>
                                    <th className="px-6 py-3 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {allocations?.map((alloc: any) => (
                                    <tr key={alloc.id} className="hover:bg-white/5 transition">
                                        <td className="px-6 py-4 text-white font-mono">
                                            {alloc.ip}:{alloc.port}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {alloc.alias || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {alloc.assigned ? (
                                                <span className="text-purple-400 bg-purple-500/10 px-2 py-1 rounded text-xs">
                                                    Server #{alloc.serverId}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => deleteAllocationMutation.mutate(alloc.id)}
                                                disabled={alloc.assigned}
                                                className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {allocations?.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            No allocations found. Create some on the left.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const AllocationForm = ({ ip, onSubmit, loading }: any) => {
    const [formData, setFormData] = useState({
        ip: ip,
        alias: '',
        ports: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const portList = formData.ports.split(',').map((p: string) => p.trim()).filter((p: string) => p);
        onSubmit({
            ip: formData.ip,
            alias: formData.alias,
            ports: portList
        });
        setFormData(prev => ({ ...prev, ports: '' }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">IP Address</label>
                <input
                    type="text"
                    value={formData.ip}
                    onChange={e => setFormData({ ...formData, ip: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
                    placeholder="10.0.0.1"
                />
            </div>
            <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">IP Alias (Optional)</label>
                <input
                    type="text"
                    value={formData.alias}
                    onChange={e => setFormData({ ...formData, alias: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    placeholder="us.myserver.com"
                />
            </div>
            <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Ports</label>
                <textarea
                    value={formData.ports}
                    onChange={e => setFormData({ ...formData, ports: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white h-24 font-mono"
                    placeholder="25565, 8000-8010, 3000"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Enter individual ports or ranges separated by commas.
                </p>
            </div>
            <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-sm transition"
            >
                {loading ? 'Submitting...' : 'Submit'}
            </button>
        </form>
    );
};

export default NodeDetails;
