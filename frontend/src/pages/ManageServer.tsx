import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { Loader2, ShoppingCart, Terminal, FolderOpen, Ghost, Package, Zap, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Components
import Header from '../components/Header';
import { useAuthStore } from '../store/authStore';
import ServerHeader from '../components/server/ServerHeader';
import ShopModal from '../components/shop/ShopModal';
import Console from '../components/server/Console';
import FileManager from '../components/server/FileManager';
import PluginManager from '../components/server/PluginManager';
import VersionManager from '../components/server/VersionManager';
import ServerProperties from '../components/server/ServerProperties';
import AdZone from '../components/AdZone';


const ManageServer = () => {
    const { id } = useParams();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'console' | 'files' | 'plugins' | 'version' | 'properties' | 'shop'>('console');

    // Fetch Server Details
    const { data: server, isLoading, error } = useQuery({
        queryKey: ['server', id],
        queryFn: async () => {
            const res = await api.get(`/servers/${id}`);
            return res.data;
        }
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

    // Fetch Real-Time Resources (Power State)
    const { data: resources } = useQuery({
        queryKey: ['server-resources', id],
        queryFn: async () => {
            const res = await api.get(`/servers/${id}/resources`);
            return res.data;
        },
        enabled: !!server && server.status !== 'suspended' && server.status !== 'installing',
        refetchInterval: 3000 // Poll every 3 seconds for real-time status
    });

    // Determine actual status
    const actualStatus = server?.status === 'suspended' || server?.status === 'installing'
        ? server.status
        : (resources?.current_state || 'offline');

    // Power Mutation
    const powerMutation = useMutation({
        mutationFn: async (signal: string) => {
            return api.post(`/servers/${id}/power`, { signal });
        },
        onSuccess: (_data, variables) => {
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

            <div className={`relative z-10 mx-auto ${activeTab === 'console' ? 'w-full h-[calc(100vh-80px)] overflow-hidden' : 'max-w-[1600px] px-4 sm:px-6 py-6 sm:py-10'}`}>

                {/* Main Split Layout */}
                <div className="flex bg-[#0f111a] rounded-2xl overflow-hidden shadow-2xl h-full border border-white/5">

                    {/* LEFT SIDEBAR NAVIGATION */}
                    <div className="w-64 bg-[#161b22] border-r border-white/5 flex flex-col shrink-0">
                        {/* Server Title / Header Area in Sidebar */}
                        <div className="p-6 border-b border-white/5 bg-[#0d1117]">
                            <h2 className="text-white font-bold truncate" title={server.name}>{server.name}</h2>
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${actualStatus === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="uppercase">{actualStatus}</span>
                            </div>
                        </div>

                        {/* Navigation Items */}
                        <div className="flex-1 overflow-y-auto py-4 space-y-1">
                            {/* Base Management */}
                            <div className="px-4 text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 mt-2">Server</div>
                            <button
                                onClick={() => setActiveTab('console')}
                                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all relative border-l-2 ${activeTab === 'console' ? 'bg-white/5 text-white border-blue-500' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}
                            >
                                <Terminal size={18} /> Console
                            </button>
                            <button
                                onClick={() => setActiveTab('files')}
                                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all relative border-l-2 ${activeTab === 'files' ? 'bg-white/5 text-white border-yellow-500' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}
                            >
                                <FolderOpen size={18} /> Files
                            </button>

                            {/* Configuration */}
                            <div className="px-4 text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 mt-6">Configuration</div>
                            <button
                                onClick={() => setActiveTab('plugins')}
                                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all relative border-l-2 ${activeTab === 'plugins' ? 'bg-white/5 text-white border-purple-500' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}
                            >
                                <Package size={18} className={activeTab === 'plugins' ? 'text-purple-400' : ''} /> Plugins
                            </button>
                            <button
                                onClick={() => setActiveTab('version')}
                                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all relative border-l-2 ${activeTab === 'version' ? 'bg-white/5 text-white border-cyan-500' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}
                            >
                                <Zap size={18} className={activeTab === 'version' ? 'text-cyan-400' : ''} /> Version
                            </button>
                            <button
                                onClick={() => setActiveTab('properties')}
                                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all relative border-l-2 ${activeTab === 'properties' ? 'bg-white/5 text-white border-blue-500' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}
                            >
                                <Settings size={18} className={activeTab === 'properties' ? 'text-blue-400' : ''} /> Properties
                            </button>

                            {/* Marketplace */}
                            <div className="px-4 text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 mt-6">Marketplace</div>
                            <button
                                onClick={() => setActiveTab('shop')}
                                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all relative border-l-2 ${activeTab === 'shop' ? 'bg-white/5 text-white border-pink-500' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}
                            >
                                <ShoppingCart size={18} className={activeTab === 'shop' ? 'text-pink-400' : ''} /> Shop
                            </button>
                        </div>

                        {/* Sidebar Footer */}
                        <div className="p-4 border-t border-white/5">
                            <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-white transition text-xs">
                                <span>← Back to Dashboard</span>
                            </Link>
                        </div>
                    </div>

                    {/* RIGHT CONTENT AREA */}
                    <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117] relative h-full">

                        {/* 
                            For Console: We want NO parent scroll. Flex column: [Header] [Console (flex-1)].
                            For Others: We want parent scroll.
                        */}
                        <div className={`flex flex-col h-full overflow-hidden`}>

                            {/* Content Padding Wrapper - Conditional */}
                            <div className={`${activeTab === 'console' ? 'h-full flex flex-col p-4' : 'h-full flex flex-col'}`}>

                                {/* Header Ad - Optional */}
                                {activeTab !== 'console' && activeTab !== 'plugins' && activeTab !== 'properties' && (
                                    <div className="p-6 pb-0">
                                        <AdZone position="server-header" className="mb-6" />
                                    </div>
                                )}

                                {/* Server Header (Start/Stop) - Show on most tabs but keep plugins/prop clean */}
                                {activeTab !== 'plugins' && activeTab !== 'version' && activeTab !== 'properties' && (
                                    <div className="px-6">
                                        <ServerHeader
                                            server={server}
                                            powerState={actualStatus}
                                            onPowerAction={(signal) => powerMutation.mutate(signal)}
                                            isPowerPending={powerMutation.isPending}
                                            onOpenShop={() => setIsShopOpen(true)}
                                            onDelete={handleDelete}
                                            panelUrl={settings?.pterodactylUrl || ''}
                                            panelAccessEnabled={settings?.security?.enablePanelAccess ?? true}
                                            userRole={user?.role || 'user'}
                                        />
                                    </div>
                                )}

                                {/* Tab Content */}
                                <div className={`${activeTab === 'console' ? 'flex-1 min-h-0 mt-4' : 'flex-1 min-h-0 bg-[#0d1117]'}`}>
                                    {server.status === 'suspended' ? (
                                        <div className="h-full flex items-center justify-center p-12">
                                            <div className="bg-white/5 rounded-xl p-12 border border-white/10 text-center">
                                                <svg className="w-16 h-16 mx-auto text-orange-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                                <h3 className="text-xl font-bold text-white mb-2">Access Restricted</h3>
                                                <p className="text-gray-400">This server is suspended. All management features are disabled.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {activeTab === 'console' && (
                                                <div className="h-[calc(100%-20px)]">
                                                    <Console serverId={id!} serverStatus={server?.status} />
                                                </div>
                                            )}

                                            {activeTab === 'files' && (
                                                <div className="h-full overflow-y-auto p-6 pt-0">
                                                    <FileManager serverId={id!} />
                                                </div>
                                            )}

                                            {activeTab === 'plugins' && (
                                                <PluginManager server={server} />
                                            )}

                                            {activeTab === 'version' && (
                                                <VersionManager server={server} />
                                            )}

                                            {activeTab === 'properties' && (
                                                <ServerProperties server={server} />
                                            )}

                                            {activeTab === 'shop' && (
                                                <div className="p-6 pt-0 overflow-y-auto h-full">
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
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <ShopModal
                                isOpen={isShopOpen}
                                onClose={() => setIsShopOpen(false)}
                                server={server}
                                pricing={pricing}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageServer;
