import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, ShoppingCart, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Components
import Header from '../components/Header';
import ServerHeader from '../components/server/ServerHeader';
import ShopModal from '../components/shop/ShopModal';

const ManageServer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'resources' | 'shop'>('resources');
    const [copiedIP, setCopiedIP] = useState(false);

    // Fetch Server Details
    const { data: server, isLoading, error } = useQuery({
        queryKey: ['server', id],
        queryFn: async () => {
            const res = await api.get(`/servers/${id}`);
            return res.data;
        }
    });

    // Fetch Server Usage (Poll every 5s)
    const { data: usage } = useQuery({
        queryKey: ['serverUsage', id],
        queryFn: async () => {
            const res = await api.get(`/servers/${id}/usage`);
            return res.data;
        },
        enabled: !!server,
        refetchInterval: 5000
    });

    // Fetch Pricing (for Shop)
    const { data: pricing } = useQuery({
        queryKey: ['pricing'],
        queryFn: async () => {
            const res = await api.get('/servers/pricing');
            return res.data;
        }
    });

    // Fetch Settings (for Panel URL)
    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const res = await api.get('/settings');
            return res.data;
        }
    });

    // Power Mutation
    const powerMutation = useMutation({
        mutationFn: async (signal: string) => {
            return api.post(`/servers/${id}/power`, { signal });
        },
        onSuccess: (data, variables) => {
            toast.success(`Signal sent: ${variables}`);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Power action failed');
        }
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async () => {
            return api.delete(`/servers/${id}`);
        },
        onSuccess: () => {
            toast.success('Server deleted successfully!');
            queryClient.invalidateQueries({ queryKey: ['servers'] });
            navigate('/');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete server');
        }
    });

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete "${server?.name}"? This action cannot be undone!`)) {
            deleteMutation.mutate();
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedIP(true);
        toast.success('IP copied to clipboard!');
        setTimeout(() => setCopiedIP(false), 2000);
    };

    // Get server IP from backend (fetched from Pterodactyl)
    const serverIP = server?.serverIp || server?.allocation?.ip_alias || server?.allocation?.ip || 'Pending';
    const serverPort = server?.allocation?.port || '';
    const fullAddress = serverPort ? `${serverIP}:${serverPort}` : serverIP;

    if (isLoading) return (
        <div className="min-h-screen bg-theme flex justify-center items-center">
            <Loader2 className="animate-spin text-purple-500" size={48} />
        </div>
    );

    if (error || !server) return (
        <div className="min-h-screen bg-theme flex flex-col justify-center items-center gap-4 text-white">
            <h2 className="text-2xl font-bold text-red-500">Server Not Found</h2>
            <Link to="/" className="text-blue-400 hover:underline">Return to Dashboard</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-theme pb-20 relative overflow-x-hidden text-white font-sans">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-[-20%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute top-[20%] right-[-20%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[150px]" />
            </div>

            <Header />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                <ServerHeader
                    server={server}
                    onPowerAction={(signal) => powerMutation.mutate(signal)}
                    isPowerPending={powerMutation.isPending}
                    onOpenShop={() => setIsShopOpen(true)}
                    onDelete={handleDelete}
                    panelUrl={settings?.pterodactyl?.apiUrl || ''}
                />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-6 mb-8 backdrop-blur-sm"
                >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-400 mb-1">Server Address</h3>
                            <div className="flex items-center gap-3">
                                <code className="text-2xl font-bold text-white font-mono">{fullAddress}</code>
                                <button
                                    onClick={() => copyToClipboard(fullAddress)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition"
                                    title="Copy IP"
                                >
                                    {copiedIP ? (
                                        <Check size={20} className="text-green-400" />
                                    ) : (
                                        <Copy size={20} className="text-gray-400" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Tab Navigation - Only Resources and Shop */}
                <div className="flex gap-4 border-b border-white/10 mb-8 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveTab('resources')}
                        className={`flex items-center gap-2 px-6 py-3 font-bold transition whitespace-nowrap rounded-t-lg ${activeTab === 'resources' ? 'text-white bg-white/5 border-b-2 border-green-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Resources
                    </button>
                    <button
                        onClick={() => setActiveTab('shop')}
                        className={`flex items-center gap-2 px-6 py-3 font-bold transition whitespace-nowrap rounded-t-lg ${activeTab === 'shop' ? 'text-white bg-white/5 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <ShoppingCart size={18} /> Shop
                    </button>
                </div>

                {/* Tab Content */}
                <div className="min-h-[500px]">
                    {activeTab === 'resources' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* RAM Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-gradient-to-br from-blue-600/10 to-blue-900/10 border border-blue-500/20 rounded-2xl p-8 relative overflow-hidden group hover:border-blue-500/40 transition"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition" />
                                <div className="relative">
                                    <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-400 mb-1">RAM</h3>
                                    <div className="text-4xl font-bold text-white mb-2">
                                        {server.ramMb / 1024}<span className="text-2xl text-gray-400">GB</span>
                                    </div>
                                    {usage && (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-gray-400">Usage</span>
                                                <span className="text-blue-400 font-bold">
                                                    {usage?.memory_bytes ? (usage.memory_bytes / 1024 / 1024 / 1024).toFixed(2) : '0'}GB
                                                </span>
                                            </div>
                                            <div className="w-full bg-white/10 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all"
                                                    style={{ width: `${usage?.memory_bytes && server.ramMb ? Math.min((usage.memory_bytes / (server.ramMb * 1024 * 1024)) * 100, 100) : 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* CPU Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-gradient-to-br from-purple-600/10 to-purple-900/10 border border-purple-500/20 rounded-2xl p-8 relative overflow-hidden group hover:border-purple-500/40 transition"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition" />
                                <div className="relative">
                                    <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-400 mb-1">CPU</h3>
                                    <div className="text-4xl font-bold text-white mb-2">
                                        {server.cpuCores}<span className="text-2xl text-gray-400"> Cores</span>
                                    </div>
                                    {usage && (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-gray-400">Usage</span>
                                                <span className="text-purple-400 font-bold">
                                                    {usage?.cpu_absolute !== undefined ? Math.round(usage.cpu_absolute) : 0}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-white/10 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all"
                                                    style={{ width: `${usage?.cpu_absolute !== undefined ? Math.min(usage.cpu_absolute, 100) : 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Disk Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-gradient-to-br from-green-600/10 to-green-900/10 border border-green-500/20 rounded-2xl p-8 relative overflow-hidden group hover:border-green-500/40 transition"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition" />
                                <div className="relative">
                                    <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6M9 14h6" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-400 mb-1">Disk</h3>
                                    <div className="text-4xl font-bold text-white mb-2">
                                        {server.diskMb / 1024}<span className="text-2xl text-gray-400">GB</span>
                                    </div>
                                    {usage && (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-gray-400">Usage</span>
                                                <span className="text-green-400 font-bold">
                                                    {usage?.disk_bytes ? (usage.disk_bytes / 1024 / 1024 / 1024).toFixed(2) : '0'}GB
                                                </span>
                                            </div>
                                            <div className="w-full bg-white/10 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all"
                                                    style={{ width: `${usage?.disk_bytes && server.diskMb ? Math.min((usage.disk_bytes / (server.diskMb * 1024 * 1024)) * 100, 100) : 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {activeTab === 'shop' && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                            <div className="text-center mb-8">
                                <ShoppingCart className="mx-auto mb-4 text-purple-400" size={48} />
                                <h2 className="text-3xl font-bold text-white mb-2">Upgrade Your Server</h2>
                                <p className="text-gray-400">Scale your resources instantly with coins</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white/5 border border-blue-500/20 rounded-xl p-6 text-center">
                                    <div className="text-4xl font-bold text-blue-400 mb-2">
                                        {pricing?.ramPerGB || 100}
                                    </div>
                                    <div className="text-gray-400">Coins per GB RAM</div>
                                </div>
                                <div className="bg-white/5 border border-green-500/20 rounded-xl p-6 text-center">
                                    <div className="text-4xl font-bold text-green-400 mb-2">
                                        {pricing?.diskPerGB || 50}
                                    </div>
                                    <div className="text-gray-400">Coins per GB Disk</div>
                                </div>
                                <div className="bg-white/5 border border-purple-500/20 rounded-xl p-6 text-center">
                                    <div className="text-4xl font-bold text-purple-400 mb-2">
                                        {pricing?.cpuPerCore || 20}
                                    </div>
                                    <div className="text-gray-400">Coins per CPU Core</div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsShopOpen(true)}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-bold text-lg transition shadow-lg shadow-purple-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Open Shop Modal
                            </button>
                        </div>
                    )}
                </div>

                <ShopModal
                    isOpen={isShopOpen}
                    onClose={() => setIsShopOpen(false)}
                    server={server}
                    pricing={pricing}
                />
            </div >
        </div >
    );
};

export default ManageServer;
