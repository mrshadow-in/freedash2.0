import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import ServerCard from '../components/ServerCard';
import { Plus, Coins, LogOut, Server, Activity, Loader2, Clock, Menu } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import SocialLinks from '../components/SocialLinks';
import ConfirmDialog from '../components/ConfirmDialog';
import MobileMenu from '../components/MobileMenu';



const Dashboard = () => {
    const { user: authUser, logout, setUser } = useAuthStore();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRedeemModal, setShowRedeemModal] = useState(false);
    const [serverName, setServerName] = useState('');
    const [redeemCode, setRedeemCode] = useState('');
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [showAllServers, setShowAllServers] = useState(false); // Admin toggle
    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; serverId: string; serverName: string }>({ show: false, serverId: '', serverName: '' });
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


    // Fetch User Data (with polling for real-time updates)
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            const res = await api.get('/auth/me');
            const userData = res.data;
            // Update auth store with latest data
            setUser(userData);
            return userData;
        },
        refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
        initialData: authUser
    });

    // Fetch panel settings for branding
    const { data: settings } = useQuery({
        queryKey: ['panelSettings'],
        queryFn: async () => {
            const res = await api.get('/settings');
            return res.data;
        },
        staleTime: 0,
        refetchOnMount: true
    });

    // Fetch Servers
    const { data: servers, isLoading } = useQuery({
        queryKey: ['servers'],
        queryFn: async () => {
            const res = await api.get('/servers');
            return res.data;
        }
    });

    // Fetch Plans
    const { data: plans } = useQuery({
        queryKey: ['plans'],
        queryFn: async () => {
            const res = await api.get('/servers/plans');
            return res.data || [];
        }
    });

    // Fetch All Servers (admin only)
    const { data: allServers } = useQuery({
        queryKey: ['allServers'],
        queryFn: async () => {
            const res = await api.get('/admin/servers');
            return res.data?.servers || []; // API returns { servers, total, page, pages }
        },
        enabled: user?.role === 'admin' // Only fetch if user is admin
    });

    // Create Server Mutation
    const createServerMutation = useMutation({
        mutationFn: async (data: { name: string, planId: string }) => {
            return api.post('/servers/create', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['servers'] });
            setShowCreateModal(false);
            setServerName('');
            toast.success('Server deployed! Initializing...');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create server');
        }
    });

    const deleteServerMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.delete(`/servers/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['servers'] });
            toast.success('Server deleted successfully!');
        },
        onError: (error: any) => {
            console.error('Delete error:', error);
            toast.error(error.response?.data?.message || 'Failed to delete server');
        }
    });

    // Redeem Code Mutation
    const redeemMutation = useMutation({
        mutationFn: async (code: string) => {
            return api.post('/coins/redeem', { code });
        },
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['user'] });
            setShowRedeemModal(false);
            setRedeemCode('');
            toast.success(`Code redeemed! +${response.data.added} coins 🎉`);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Invalid code');
        }
    });

    // Delete handler for admin "All Users' Servers" section
    const handleAdminDeleteServer = async (serverId: string) => {
        try {
            await api.delete(`/admin/servers/${serverId}`);
            toast.success('Server deleted');
            queryClient.invalidateQueries({ queryKey: ['allServers'] });
            setDeleteConfirm({ show: false, serverId: '', serverName: '' });
        } catch (err) {
            toast.error('Failed to delete server');
        }
    };


    return (
        <div className="min-h-screen bg-theme pb-20 relative overflow-x-hidden text-white font-sans">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-[-20%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[150px]" />
                <div className="absolute top-[20%] right-[-20%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 left-[20%] w-[30%] h-[30%] bg-pink-900/10 rounded-full blur-[120px]" />
            </div>

            {/* Topbar */}
            <div className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {settings?.panelLogo ? (
                            <img
                                src={settings.panelLogo}
                                alt={settings.panelName || 'Panel Logo'}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover shadow-lg"
                            />
                        ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Server className="text-white" size={18} />
                            </div>
                        )}
                        <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                            {settings?.panelName || 'LordCloud'}
                        </h1>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-6">
                        {/* Balance */}
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                            <div className="bg-yellow-500/20 p-1.5 rounded-full ring-1 ring-yellow-500/30">
                                <Coins size={16} className="text-yellow-400" />
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-400 font-bold tracking-wider uppercase">Balance</div>
                                <div className="font-bold text-white text-lg leading-none">{user?.coins || 0}</div>
                            </div>
                        </div>

                        <SocialLinks />

                        <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                            <div className="text-right">
                                <div className="font-bold text-white text-sm">{user?.username}</div>
                                <div className="text-xs text-purple-300 font-medium bg-purple-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5 capitalize border border-purple-500/20">{user?.role}</div>
                            </div>
                            {user?.role === 'admin' && (
                                <a href="/admin" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-sm font-bold hover:opacity-90 transition">
                                    Admin Panel
                                </a>
                            )}
                            <a href="/account" className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-sm font-bold transition">
                                My Account
                            </a>
                            <button onClick={logout} className="p-2.5 hover:bg-red-500/10 hover:text-red-400 rounded-xl text-gray-400 transition">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Mobile: Balance + Hamburger */}
                    <div className="flex lg:hidden items-center gap-3">
                        {/* Mobile Balance */}
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                            <Coins size={14} className="text-yellow-400" />
                            <span className="font-bold text-white text-sm">{user?.coins || 0}</span>
                        </div>

                        {/* Hamburger Button */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="p-2 hover:bg-white/10 rounded-lg transition"
                        >
                            <Menu size={24} className="text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <MobileMenu
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                user={user}
                logout={logout}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">My Overview</h2>
                        <p className="text-sm sm:text-base text-gray-400">Manage your high-performance game servers</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Link to="/afk" className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl font-bold transition w-full md:w-auto">
                            <Clock size={20} className="text-green-400" />
                            AFK Zone
                        </Link>
                        <button
                            onClick={() => setShowRedeemModal(true)}
                            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-green-500/25 transform hover:scale-[1.02] active:scale-[0.98] w-full md:w-auto"
                        >
                            <Coins size={20} />
                            Redeem Code
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-purple-500/25 transform hover:scale-[1.02] active:scale-[0.98] w-full md:w-auto"
                        >
                            <Plus size={20} />
                            Deploy Server
                        </button>
                    </div>
                </div>

                {/* Stats Overview */}
                {!isLoading && (
                    <div className="grid grid-cols-1 gap-6 mb-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col backdrop-blur-sm"
                        >
                            <div className="flex items-center gap-3 mb-4 text-gray-400">
                                <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                                    <Activity size={18} />
                                </div>
                                <span className="text-sm font-medium">Active Servers</span>
                            </div>
                            <span className="text-4xl font-bold text-white">{servers?.length || 0}</span>
                        </motion.div>
                    </div>
                )}

                {/* Server Grid */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Server size={20} className="text-purple-400" />
                        {showAllServers ? "All Users' Servers" : "Your Instances"}
                    </h3>
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setShowAllServers(!showAllServers)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${showAllServers
                                ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                                : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                }`}
                        >
                            {showAllServers ? '← My Servers' : 'See All Servers →'}
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-purple-500" size={40} />
                    </div>
                ) : showAllServers && user?.role === 'admin' ? (
                    // All Servers Table for Admin
                    <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5 backdrop-blur-xl">
                        <table className="w-full">
                            <thead className="bg-black/30">
                                <tr className="text-gray-400 text-sm">
                                    <th className="text-left p-4">Server Name</th>
                                    <th className="text-left p-4">Owner</th>
                                    <th className="text-left p-4">Status</th>
                                    <th className="text-left p-4">RAM</th>
                                    <th className="text-left p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allServers && allServers.length > 0 ? (
                                    allServers.map((server: any) => (
                                        <tr key={server._id} className="border-t border-white/5 hover:bg-white/5 transition">
                                            <td className="p-4 font-medium text-white">{server.name}</td>
                                            <td className="p-4 text-gray-400">{server.ownerId?.username || 'Unknown'}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${server.status === 'active' && !server.isSuspended ? 'bg-green-500/20 text-green-400' :
                                                    server.isSuspended ? 'bg-red-500/20 text-red-400' :
                                                        'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {server.isSuspended ? 'Suspended' : server.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-400">{server.ramMb} MB</td>
                                            <td className="p-4 flex gap-2">
                                                <Link
                                                    to={`/server/${server._id}`}
                                                    className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded text-sm text-blue-400 transition"
                                                >
                                                    Manage
                                                </Link>
                                                <button
                                                    onClick={() => setDeleteConfirm({ show: true, serverId: server._id, serverName: server.name })}
                                                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-sm text-red-400 transition"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-400">
                                            No servers found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {servers?.map((srv: any) => (
                                <motion.div
                                    key={srv._id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                >
                                    <ServerCard
                                        id={srv._id}
                                        name={srv.name}
                                        status={srv.status}
                                        planName={srv.planId?.name || 'Standard Plan'}
                                        serverIp={srv.serverIp || 'Fetching...'}
                                        ramMb={srv.ramMb || srv.planId?.ramMb || 1024}
                                        diskMb={srv.diskMb || srv.planId?.diskMb || 5120}
                                        cpuCores={srv.cpuCores || srv.planId?.cpuCores || 1}
                                        eggImage={srv.planId?.eggImage || ''}
                                        onDelete={(id) => deleteServerMutation.mutate(id)}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {servers?.length === 0 && (
                            <div className="col-span-full py-24 rounded-3xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-center backdrop-blur-sm">
                                <div className="w-20 h-20 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/10">
                                    <Server size={32} className="text-purple-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No active servers</h3>
                                <p className="text-gray-400 max-w-sm mb-8">You haven't deployed any game servers yet. Use your coins to start playing!</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="text-purple-400 font-semibold hover:text-purple-300 transition flex items-center gap-2"
                                >
                                    Deploy your first server <Plus size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-md"
                        onClick={() => setShowCreateModal(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, rotateX: -10 }}
                        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                        className="relative w-full max-w-lg overflow-hidden"
                        style={{ perspective: '1000px' }}
                    >
                        {/* Minecraft Block Background */}
                        <div className="relative bg-gradient-to-br from-[#2d5016] via-[#1a3010] to-[#0f1f08] border-4 border-[#8B4513] rounded-lg shadow-2xl p-8">
                            {/* Minecraft Grass Block Top Border */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-600 to-emerald-700" />

                            {/* Dirt Pattern Background */}
                            <div
                                className="absolute inset-0 opacity-10 pointer-events-none"
                                style={{
                                    backgroundImage: `
                                        repeating-linear-gradient(0deg, #8B4513 0px, #8B4513 2px, transparent 2px, transparent 8px),
                                        repeating-linear-gradient(90deg, #8B4513 0px, #8B4513 2px, transparent 2px, transparent 8px)
                                    `,
                                    backgroundSize: '8px 8px'
                                }}
                            />

                            {/* Animated Floating Blocks */}
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-4 h-4 bg-green-500/30 border border-green-600/50"
                                    initial={{
                                        x: `${Math.random() * 100}%`,
                                        y: '110%',
                                        rotate: 0
                                    }}
                                    animate={{
                                        y: '-10%',
                                        rotate: 360,
                                        opacity: [0, 0.8, 0]
                                    }}
                                    transition={{
                                        duration: 3 + Math.random() * 2,
                                        repeat: Infinity,
                                        delay: Math.random() * 2,
                                        ease: 'linear'
                                    }}
                                />
                            ))}

                            {/* Header with Pickaxe Icon */}
                            <div className="flex justify-between items-center mb-6 relative">
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">⛏️</div>
                                    <h3 className="text-2xl font-bold text-green-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide" style={{ textShadow: '2px 2px 0 #1a3010' }}>
                                        Craft Server
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-red-400 hover:text-red-300 transition bg-red-900/30 hover:bg-red-900/50 p-2 rounded border-2 border-red-700/50"
                                >
                                    <Plus className="rotate-45" size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="space-y-6 relative">
                                {/* Server Name Input */}
                                <div>
                                    <label className="block text-sm font-bold text-yellow-300 mb-2 flex items-center gap-2" style={{ textShadow: '1px 1px 0 #1a3010' }}>
                                        <span>📝</span> World Name
                                    </label>
                                    <input
                                        value={serverName}
                                        onChange={(e) => setServerName(e.target.value)}
                                        className="w-full bg-black/40 border-4 border-[#654321] rounded-lg p-3 text-white font-bold outline-none focus:border-yellow-600 transition placeholder-gray-500 shadow-inner"
                                        placeholder="My Survival World"
                                        style={{ textShadow: '1px 1px 0 black' }}
                                    />
                                </div>

                                {/* Plan Selection */}
                                <div>
                                    <label className="block text-sm font-bold text-yellow-300 mb-3 flex items-center gap-2" style={{ textShadow: '1px 1px 0 #1a3010' }}>
                                        <span>💎</span> Choose Resources
                                    </label>
                                    <div className="space-y-3">
                                        {plans && plans.length > 0 ? plans.map((plan: any, index: number) => (
                                            <motion.div
                                                key={plan._id}
                                                whileHover={{ scale: 1.02, x: 5 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setSelectedPlanId(plan._id)}
                                                className={`border-4 p-4 rounded-lg flex justify-between items-center cursor-pointer relative overflow-hidden transition ${selectedPlanId === plan._id
                                                    ? 'border-yellow-500 bg-gradient-to-r from-yellow-900/40 to-amber-900/40 shadow-lg shadow-yellow-500/50'
                                                    : 'border-[#654321] bg-gradient-to-r from-[#3d2817]/60 to-[#2d1f12]/60 hover:border-yellow-700'
                                                    }`}
                                            >
                                                {/* Pickaxe Icon for selected */}
                                                {selectedPlanId === plan._id && (
                                                    <motion.div
                                                        initial={{ rotate: -45, opacity: 0 }}
                                                        animate={{ rotate: 0, opacity: 1 }}
                                                        className="absolute -right-1 -top-1 text-4xl"
                                                    >
                                                        ✅
                                                    </motion.div>
                                                )}

                                                <div className="relative flex items-center gap-3">
                                                    <div className="text-2xl">{index === 0 ? '🏆' : '⚔️'}</div>
                                                    <div>
                                                        <div className="font-bold text-white flex items-center gap-2" style={{ textShadow: '1px 1px 0 black' }}>
                                                            {plan.name}
                                                            {index === 0 && (
                                                                <span className="bg-gradient-to-r from-yellow-500 to-amber-500 text-[10px] px-2 py-0.5 rounded-full text-black font-extrabold border-2 border-yellow-600 shadow-lg">
                                                                    POPULAR
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-green-300 mt-1 font-semibold flex items-center gap-2">
                                                            <span>💾 {plan.ramMb / 1024}GB</span>
                                                            <span>•</span>
                                                            <span>📦 {plan.diskMb / 1024}GB</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right relative flex flex-col items-end">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-yellow-400 text-xl">🪙</span>
                                                        <span className={`font-extrabold text-2xl ${selectedPlanId === plan._id ? 'text-yellow-300' : 'text-yellow-500'}`} style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}>
                                                            {plan.priceCoins}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-bold">COINS</div>
                                                </div>
                                            </motion.div>
                                        )) : (
                                            <div className="text-center text-gray-400 py-4 bg-black/30 rounded-lg border-2 border-gray-700">
                                                No plans available
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-3 text-sm font-bold text-red-200 bg-red-900/40 hover:bg-red-900/60 border-4 border-red-800/50 rounded-lg transition shadow-lg"
                                        style={{ textShadow: '1px 1px 0 black' }}
                                    >
                                        ❌ Cancel
                                    </button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => createServerMutation.mutate({
                                            name: serverName,
                                            planId: selectedPlanId
                                        })}
                                        disabled={!serverName || !selectedPlanId || createServerMutation.isPending}
                                        className="flex-[2] py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg text-sm font-extrabold shadow-lg border-4 border-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden"
                                        style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.6)' }}
                                    >
                                        {createServerMutation.isPending ? (
                                            <>
                                                {/* Animated Minecart */}
                                                <motion.div
                                                    animate={{ x: [-100, 400] }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                                    className="absolute text-2xl"
                                                >
                                                    🛤️
                                                </motion.div>
                                                <span className="relative z-10">DEPLOYING...</span>
                                            </>
                                        ) : (
                                            <>
                                                🚀 Deploy World
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Redeem Code Modal */}
            {showRedeemModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={() => setShowRedeemModal(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative bg-[#130b2e] border border-white/10 w-full max-w-md p-8 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Modal Glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-[60px] pointer-events-none -mt-10 -mr-10" />

                        <div className="flex justify-between items-center mb-6 relative">
                            <h3 className="text-2xl font-bold text-white">Redeem Code</h3>
                            <button onClick={() => setShowRedeemModal(false)} className="text-gray-400 hover:text-white transition bg-white/5 p-1 rounded-full"><Plus className="rotate-45" size={20} /></button>
                        </div>

                        <div className="space-y-6 relative">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Enter Code</label>
                                <input
                                    value={redeemCode}
                                    onChange={(e) => setRedeemCode(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition placeholder-gray-600 uppercase tracking-wider font-mono"
                                    placeholder="ENTER-CODE-HERE"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => setShowRedeemModal(false)}
                                    className="flex-1 py-3 text-sm font-semibold text-gray-400 hover:bg-white/5 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => redeemMutation.mutate(redeemCode)}
                                    disabled={!redeemCode || redeemMutation.isPending}
                                    className="flex-[2] py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {redeemMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : 'Redeem'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.show}
                onClose={() => setDeleteConfirm({ show: false, serverId: '', serverName: '' })}
                onConfirm={() => handleAdminDeleteServer(deleteConfirm.serverId)}
                title="Delete Server?"
                message={`Are you sure you want to delete the server "${deleteConfirm.serverName}"? This action cannot be undone and all data will be permanently lost.`}
                confirmText="Delete Server"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

export default Dashboard;
