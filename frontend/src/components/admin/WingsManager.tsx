```javascript
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Plus, Terminal, MapPin, HardDrive, Cpu, Globe, Settings, Package, Search, Download, Save, Loader2 } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

const WingsManager = () => {
    const [nodes, setNodes] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeployModal, setShowDeployModal] = useState(false);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [deploymentData, setDeploymentData] = useState<any>(null);

    // Form Data
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location_id: '',
        fqdn: '',
        scheme: 'https',
        memory: 2048,
        memory_overallocate: 0,
        disk: 5120,
        disk_overallocate: 0,
        upload_size: 100,
        daemon_sftp: 2022,
        daemon_listen: 8080
    });

    const fetchNodes = async () => {
        try {
            const { data } = await api.get('/admin/nodes');
            setNodes(data);
        } catch (error) {
            toast.error('Failed to fetch nodes');
        } finally {
            setLoading(false);
        }
    };

    const fetchLocations = async () => {
        try {
            const { data } = await api.get('/admin/locations');
            setLocations(data);
            if (data.length > 0 && !formData.location_id) {
                setFormData(prev => ({ ...prev, location_id: data[0].id }));
            }
        } catch (error) {
            console.error('Failed to fetch locations');
        }
    };

    useEffect(() => {
        fetchNodes();
        fetchLocations();
    }, []);

    const handleCreateWrapper = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/admin/nodes', {
                ...formData,
                location_id: Number(formData.location_id)
            });
            toast.success('Node created! Click the Terminal icon to get deployment command.');
            setShowCreateModal(false);
            fetchNodes();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create node');
        }
    };

    const handleGetDeployment = async (node: any) => {
        setSelectedNode(node);
        try {
            const { data } = await api.get(`/ admin / nodes / ${ node.id }/deployment`);
setDeploymentData(data);
setShowDeployModal(true);
        } catch (error) {
    toast.error('Failed to get deployment info');
}
    };

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
};

return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Server className="w-6 h-6 text-purple-400" />
                    Wings (Nodes) Manager
                </h2>
                <p className="text-gray-400">Manage your Pterodactyl Nodes directly from here.</p>
            </div>
            <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
            >
                <Plus className="w-4 h-4" />
                Create Node
            </button>
        </div>

        {/* Nodes Table */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-white/5 text-gray-400 text-sm">
                    <tr>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4">Connection</th>
                        <th className="px-6 py-4">Resources</th>
                        <th className="px-6 py-4">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {loading ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading nodes...</td></tr>
                    ) : nodes.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No nodes found. Create one!</td></tr>
                    ) : (
                        nodes.map((node: any) => (
                            <tr key={node.id} className="hover:bg-white/5 transition">
                                <td className="px-6 py-4 text-gray-400">#{node.id}</td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-white">{node.name}</div>
                                    <div className="text-xs text-gray-500">{node.description}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <MapPin className="w-4 h-4 text-gray-500" />
                                        ID: {node.location_id}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-300">
                                    <div className="flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-blue-400" />
                                        {node.scheme}://{node.fqdn}:{node.daemon_listen}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <div className="flex flex-col gap-1">
                                        <span className="flex items-center gap-2 text-gray-300"><Cpu className="w-3 h-3" /> {node.memory} MB RAM</span>
                                        <span className="flex items-center gap-2 text-gray-300"><HardDrive className="w-3 h-3" /> {node.disk} MB Disk</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleGetDeployment(node)}
                                        className="p-2 bg-gray-700/50 hover:bg-purple-600/20 hover:text-purple-400 rounded-lg transition"
                                        title="View Deployment Command"
                                    >
                                        <Terminal className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* Create Modal */}
        <AnimatePresence>
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[#1a1b26] border border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    >
                        <h3 className="text-xl font-bold text-white mb-4">Create New Node</h3>
                        <form onSubmit={handleCreateWrapper} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Location</label>
                                    <select
                                        value={formData.location_id}
                                        onChange={e => setFormData({ ...formData, location_id: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
                                    >
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.short} ({loc.long})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-gray-400 text-sm mb-1">FQDN (Domain)</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="node1.example.com"
                                        value={formData.fqdn}
                                        onChange={e => setFormData({ ...formData, fqdn: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">RAM (MB)</label>
                                    <input
                                        type="number"
                                        value={formData.memory}
                                        onChange={e => setFormData({ ...formData, memory: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Disk (MB)</label>
                                    <input
                                        type="number"
                                        value={formData.disk}
                                        onChange={e => setFormData({ ...formData, disk: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Daemon Port</label>
                                    <input
                                        type="number"
                                        value={formData.daemon_listen}
                                        onChange={e => setFormData({ ...formData, daemon_listen: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">SFTP Port</label>
                                    <input
                                        type="number"
                                        value={formData.daemon_sftp}
                                        onChange={e => setFormData({ ...formData, daemon_sftp: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition"
                                >
                                    Create Node
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Deployment Modal */}
        <AnimatePresence>
            {showDeployModal && deploymentData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[#1a1b26] border border-white/10 rounded-xl p-6 w-full max-w-3xl"
                    >
                        <h3 className="text-xl font-bold text-white mb-4">Deploy Wings</h3>
                        <p className="text-gray-400 mb-4">
                            Run this command on your VPS to install and configure Wings automatically.
                        </p>

                        <div className="bg-black/40 rounded-lg p-4 font-mono text-sm text-gray-300 relative group overflow-x-auto">
                            <button
                                onClick={() => copyToClipboard(`cd /etc/pterodactyl && sudo wings configure --panel-url ${deploymentData.url || 'YOUR_PANEL_URL'} --token ${deploymentData.token} --node ${selectedNode.id}\nsudo systemctl start wings`)}
                                className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded opacity-0 group-hover:opacity-100 transition"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <pre className="whitespace-pre-wrap break-all">
                                {`# Automatic Configuration
cd /etc/pterodactyl && sudo wings configure --panel-url https://panel.example.com --token ${deploymentData.token} --node ${selectedNode.id}

# Start Wings
sudo systemctl enable --now wings`}
                            </pre>
                        </div>

                        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-200">
                            Note: You need Docker and Systemd installed on your node machine.
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowDeployModal(false)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
);
};

export default WingsManager;
