import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useRef } from 'react';
import { Loader2, ShoppingCart, Terminal, FolderOpen, Ghost } from 'lucide-react';
import { toast } from 'react-hot-toast';


// Components
import Header from '../components/Header';
import { useAuthStore } from '../store/authStore';
import ServerHeader from '../components/server/ServerHeader';
import ShopModal from '../components/shop/ShopModal';
import Console from '../components/server/Console';
import FileManager from '../components/server/FileManager';
import MinecraftTab from '../components/server/MinecraftTab';
// import UsersTab from '../components/server/UsersTab';
import AdZone from '../components/AdZone';


const ManageServer = () => {
    const { id } = useParams();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'console' | 'files' | 'settings' | 'startup' | 'shop' | 'minecraft'>('console');

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
                            <button
                                onClick={() => setActiveTab('minecraft')}
                                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all relative border-l-2 ${activeTab === 'minecraft' ? 'bg-white/5 text-white border-green-500' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}
                            >
                                <Ghost size={18} /> Minecraft
                            </button>
                            <button
                                onClick={() => setActiveTab('shop')}
                                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all relative border-l-2 ${activeTab === 'shop' ? 'bg-white/5 text-white border-purple-500' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}
                            >
                                <ShoppingCart size={18} /> Shop
                            </button>
                        </div>

                        {/* Sidebar Footer (Optional Ad or Back) */}
                        <div className="p-4 border-t border-white/5">
                            <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-white transition text-xs">
                                <span>← Back to Dashboard</span>
                            </Link>
                        </div>
                    </div>

                    {/* RIGHT CONTENT AREA */}
                    <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117] relative">

                        {/* We need the ServerHeader for power controls. Let's put it at the top of the content area but compact. */}
                        <div className="p-6 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-white/10">

                            {/* Header Ad */}
                            <AdZone position="server-header" className="mb-6" />

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

                            {/* Tab Content */}
                            <div className="mt-4">
                                {server.status === 'suspended' ? (
                                    <div className="bg-white/5 rounded-xl p-12 border border-white/10 text-center">
                                        <svg className="w-16 h-16 mx-auto text-orange-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        <h3 className="text-xl font-bold text-white mb-2">Access Restricted</h3>
                                        <p className="text-gray-400">This server is suspended. All management features are disabled.</p>
                                    </div>
                                ) : (
                                    <>
                                        {activeTab === 'console' && (
                                            <div className="h-[calc(100%-20px)]">
                                                <Console serverId={id!} serverStatus={server?.status} />
                                            </div>
                                        )}

                                        {activeTab === 'files' && (
                                            <FileManager serverId={id!} />
                                        )}

                                        {activeTab === 'minecraft' && (
                                            <MinecraftTab server={server} />
                                        )}

                                        {activeTab === 'shop' && (
                                            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                                                <div className="text-center mb-8">
                                                    <ShoppingCart className="mx-auto mb-4 text-purple-400" size={48} />
                                                    <h2 className="text-3xl font-bold text-white mb-2">Upgrade Your Server</h2>
                                                    <p className="text-gray-400">Scale your resources instantly with coins</p>
                                                </div>

                                                {/* Pricing Cards would go here, omitting for brevity in this view logic since they are static/fetched */}

                                                <button
                                                    onClick={() => setIsShopOpen(true)}
                                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-bold text-lg transition shadow-lg shadow-purple-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
                                                >
                                                    Open Shop Modal
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
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
