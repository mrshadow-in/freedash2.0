import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { motion } from 'framer-motion';
import { Loader2, ShoppingCart, Copy, Check, Terminal, FolderOpen, Settings, Ghost, Play, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';


// Components
import Header from '../components/Header';
import ServerHeader from '../components/server/ServerHeader';
import ShopModal from '../components/shop/ShopModal';
import Console from '../components/server/Console';
import FileManager from '../components/server/FileManager';
import MinecraftTab from '../components/server/MinecraftTab';
import StartupTab from '../components/server/StartupTab';
import UsersTab from '../components/server/UsersTab';


const ManageServer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'console' | 'files' | 'settings' | 'startup' | 'users' | 'shop' | 'minecraft'>('console');
    const [copiedIP, setCopiedIP] = useState(false);

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

    // Reinstall Mutation
    const reinstallMutation = useMutation({
        mutationFn: async () => {
            return api.post(`/servers/${id}/reinstall`);
        },
        onSuccess: () => {
            toast.success('Server reinstall started'); // Removed setShowReinstallConfirm
            queryClient.invalidateQueries({ queryKey: ['server', id] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Reinstall failed');
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
                    powerState={actualStatus}
                    onPowerAction={(signal) => powerMutation.mutate(signal)}
                    isPowerPending={powerMutation.isPending}
                    onOpenShop={() => setIsShopOpen(true)}
                    onDelete={handleDelete}
                    panelUrl={settings?.pterodactylUrl || ''}
                />

                {/* Suspended Server Banner */}
                {server.status === 'suspended' && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-2 border-orange-500/50 rounded-2xl p-6 mb-6 backdrop-blur-sm"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-orange-500/20 rounded-full">
                                <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-orange-400 mb-2">Server Suspended</h3>
                                <p className="text-gray-300 mb-3">
                                    This server has been suspended and is currently inaccessible. All management features are disabled.
                                </p>
                                {server.suspendReason && (
                                    <p className="text-sm text-gray-400">
                                        <strong>Reason:</strong> {server.suspendReason}
                                    </p>
                                )}
                                <p className="text-sm text-gray-500 mt-2">
                                    Please contact support to resolve this issue.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

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
                        onClick={() => setActiveTab('console')}
                        className={`flex items-center gap-2 px-6 py-3 font-bold transition whitespace-nowrap rounded-t-lg ${activeTab === 'console' ? 'text-white bg-white/5 border-b-2 border-slate-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Terminal size={18} /> Console
                    </button>

                    <button
                        onClick={() => setActiveTab('files')}
                        className={`flex items-center gap-2 px-6 py-3 font-bold transition whitespace-nowrap rounded-t-lg ${activeTab === 'files' ? 'text-white bg-white/5 border-b-2 border-yellow-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <FolderOpen size={18} /> Files
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-2 px-6 py-3 font-bold transition whitespace-nowrap rounded-t-lg ${activeTab === 'settings' ? 'text-white bg-white/5 border-b-2 border-red-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Settings size={18} /> Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-6 py-3 font-bold transition whitespace-nowrap rounded-t-lg ${activeTab === 'users' ? 'text-white bg-white/5 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Users size={18} /> Users
                    </button>
                    <button
                        onClick={() => setActiveTab('shop')}
                        className={`flex items-center gap-2 px-6 py-3 font-bold transition whitespace-nowrap rounded-t-lg ${activeTab === 'shop' ? 'text-white bg-white/5 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <ShoppingCart size={18} /> Shop
                    </button>
                    <button
                        onClick={() => setActiveTab('startup')}
                        className={`flex items-center gap-2 px-6 py-3 font-bold transition whitespace-nowrap rounded-t-lg ${activeTab === 'startup' ? 'text-white bg-white/5 border-b-2 border-cyan-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Play size={18} /> Startup
                    </button>
                    <button
                        onClick={() => setActiveTab('minecraft')}
                        className={`flex items-center gap-2 px-6 py-3 font-bold transition whitespace-nowrap rounded-t-lg ${activeTab === 'minecraft' ? 'text-white bg-white/5 border-b-2 border-green-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Ghost size={18} /> Minecraft
                    </button>
                </div>

                {/* Tab Content */}
                <div className="min-h-[500px]">
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
                                <Console serverId={id!} serverStatus={server?.status} />
                            )}

                            {activeTab === 'files' && (
                                <FileManager serverId={id!} />
                            )}

                            {activeTab === 'minecraft' && (
                                <MinecraftTab server={server} />
                            )}

                            {activeTab === 'startup' && <StartupTab server={server} />}
                            {activeTab === 'users' && <UsersTab server={server} />}

                            {activeTab === 'settings' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* SFTP Details */}
                                    <div className="bg-[#161b22] border border-white/10 rounded-xl p-6">
                                        <h3 className="text-gray-400 text-xs uppercase font-bold mb-4">SFTP Details</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Server Address</label>
                                                <div className="bg-black/20 rounded p-2 text-sm text-gray-200 font-mono border border-white/5">
                                                    sftp://{server.serverIp?.split(':')[0] || 'unavailable'}:{server.relationships?.allocation?.attributes?.port || 2022}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Username</label>
                                                <div className="bg-black/20 rounded p-2 text-sm text-gray-200 font-mono border border-white/5">
                                                    {server.identifier}.{server.uuid?.split('-')[0]}
                                                </div>
                                            </div>
                                            <div className="pt-2">
                                                <button onClick={() => window.open(`sftp://${server.serverIp?.split(':')[0]}`)} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition">
                                                    Launch SFTP
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Change Details (Placeholder) */}
                                    <div className="bg-[#161b22] border border-white/10 rounded-xl p-6">
                                        <h3 className="text-gray-400 text-xs uppercase font-bold mb-4">Change Server Details</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Server Name</label>
                                                <input type="text" value={server.name} readOnly className="w-full bg-black/20 border border-white/10 rounded p-2 text-sm text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Debug Info */}
                                    <div className="bg-[#161b22] border border-white/10 rounded-xl p-6">
                                        <h3 className="text-gray-400 text-xs uppercase font-bold mb-4">Debug Information</h3>
                                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                                            <span className="text-sm text-gray-400">Node</span>
                                            <span className="text-sm font-mono">{server.relationships?.node?.attributes?.name || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-sm text-gray-400">Server ID</span>
                                            <span className="text-sm font-mono">{server.uuid}</span>
                                        </div>
                                    </div>

                                    {/* Reinstall */}
                                    <div className="bg-[#161b22] border border-white/10 rounded-xl p-6">
                                        <h3 className="text-gray-400 text-xs uppercase font-bold mb-4">Reinstall Server</h3>
                                        <p className="text-sm text-gray-400 mb-6">Reinstalling your server will delete some configuration files but usually keeps data. Backup first!</p>

                                        <button
                                            onClick={() => {
                                                if (confirm("Are you SURE you want to reinstall? This will stop the server.")) {
                                                    reinstallMutation.mutate();
                                                }
                                            }}
                                            disabled={reinstallMutation.isPending}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-bold transition"
                                        >
                                            {reinstallMutation.isPending ? 'Reinstalling...' : 'Reinstall Server'}
                                        </button>
                                    </div>
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
                        </>
                    )}

                    <ShopModal
                        isOpen={isShopOpen}
                        onClose={() => setIsShopOpen(false)}
                        server={server}
                        pricing={pricing}
                    />
                </div>
            </div>
        </div>
    );
};

export default ManageServer;
