import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import ServerCard from '../components/ServerCard';
import { Server, Plus, Coins, Activity, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDialog from '../components/ConfirmDialog';
import AdZone from '../components/AdZone';
import AdPurchaseModal from '../components/AdPurchaseModal';
import Header from '../components/Header';

const Dashboard = () => {
    const { user: authUser, setUser } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRedeemModal, setShowRedeemModal] = useState(false);
    const [serverName, setServerName] = useState('');
    const [redeemCode, setRedeemCode] = useState('');
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; serverId: string; serverName: string }>({ show: false, serverId: '', serverName: '' });
    const [showAdModal, setShowAdModal] = useState(false);
    const [selectedAdSlot, setSelectedAdSlot] = useState<string | undefined>(undefined);

    const openAdPurchase = (slotId?: string) => {
        setSelectedAdSlot(slotId);
        setShowAdModal(true);
    };


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

    // Create Server Mutation
    const createServerMutation = useMutation({
        mutationFn: async (data: { name: string, planId: string }) => {
            return api.post('/servers/create', data);
        },
        onSuccess: (response: any) => {
            queryClient.invalidateQueries({ queryKey: ['servers'] });
            setShowCreateModal(false);
            setServerName('');
            toast.success('Server deployed! Redirecting...');
            if (response.data?.server?.id) {
                navigate(`/server/${response.data.server.id}`);
            }
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
            toast.success(`Code redeemed! + ${response.data.added} coins 🎉`);
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
        <div className="min-h-screen pb-20 relative text-white font-sans bg-[#0c0229]">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
            </div>

            {/* Sidebar Left Ad Zone - Fixed Floating - Shows ALL ads stacked */}
            <div className="fixed left-4 top-1/2 -translate-y-1/2 z-20 hidden 2xl:block max-w-[200px] space-y-4 pointer-events-none">
                <div className="pointer-events-auto">
                    <AdZone position="sidebar-left" rotate={false} className="" />
                </div>
            </div>

            {/* Sidebar Right Ad Zone - Fixed Floating - Shows ALL ads stacked */}
            <div className="fixed right-4 top-1/2 -translate-y-1/2 z-20 hidden 2xl:block max-w-[200px] space-y-4 pointer-events-none">
                <div className="pointer-events-auto">
                    <AdZone position="sidebar-right" rotate={false} className="" />
                </div>
            </div>

            {/* Navigation Header */}
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10">
                {/* Top Ad Zone */}
                <AdZone
                    position="top"
                    onBuyClick={() => openAdPurchase('top')}
                    className="mb-10"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl group hover:border-purple-500/30 transition-all"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/20 rounded-2xl group-hover:scale-110 transition-transform">
                                <Server className="text-purple-400" size={24} />
                            </div>
                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Servers</div>
                        </div>
                        <div className="text-3xl font-bold font-mono text-white mb-1">{servers?.length || 0}</div>
                        <div className="text-sm text-gray-500">Active Worlds</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl group hover:border-blue-500/30 transition-all"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-2xl group-hover:scale-110 transition-transform">
                                <Activity className="text-blue-400" size={24} />
                            </div>
                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Global Status</div>
                        </div>
                        <div className="text-xl font-bold text-green-400 mb-1 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            Operational
                        </div>
                        <div className="text-sm text-gray-500">All systems online</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl group hover:border-yellow-500/30 transition-all"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-yellow-500/20 rounded-2xl group-hover:scale-110 transition-transform">
                                <Coins className="text-yellow-400" size={24} />
                            </div>
                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Coins</div>
                        </div>
                        <div className="text-3xl font-bold font-mono text-white mb-1">{user?.coins || 0}</div>
                        <div className="text-sm text-gray-500">Available Balance</div>
                    </motion.div>

                    {/* Between Stats Ad Zone - After 3rd stat card */}
                    <AdZone position="between-stats" rotate={true} rotationInterval={40} className="col-span-full" />

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl group hover:border-green-500/30 transition-all"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-500/20 rounded-2xl group-hover:scale-110 transition-transform">
                                <Plus className="text-green-400" size={24} />
                            </div>
                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Quick Actions</div>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="w-full py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-xl font-bold transition"
                        >
                            Create Server
                        </button>
                    </motion.div>
                </div>

                {/* Below Stats Ad Zone */}
                <AdZone position="below-stats" rotate={true} rotationInterval={35} className="mb-12" />

                {/* Middle Ad Zone */}
                <AdZone
                    position="after-header"
                    onBuyClick={() => openAdPurchase('after-header')}
                    className="mb-12"
                />

                {/* Before Servers Section Ad Zone */}
                <AdZone position="before-servers" rotate={true} rotationInterval={45} className="mb-8" />

                {/* Servers Section Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 sm:gap-0">
                    <div>
                        <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                            Your Servers
                            {isLoading && <Loader2 className="animate-spin text-purple-400" size={24} />}
                        </h2>
                        <p className="text-gray-400 font-medium mt-1">Manage and monitor your deployments</p>
                    </div>
                </div>

                {/* Servers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {isLoading ? (
                        [1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-3xl h-[280px] animate-pulse shadow-lg" />
                        ))
                    ) : servers?.length === 0 ? (
                        <>
                            {/* Empty Server Zone Ad - Shows when no servers */}
                            <div className="col-span-full mb-6">
                                <AdZone position="empty-server-zone" rotate={true} rotationInterval={50} className="" />
                            </div>

                            <div className="col-span-full bg-white/5 border border-white/10 rounded-3xl p-12 text-center backdrop-blur-md">
                                <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <Server className="text-purple-400" size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">No servers found</h3>
                                <p className="text-gray-400 mb-8 max-w-md mx-auto">You haven't deployed any servers yet. Get started by creating your first world!</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl font-extrabold text-white shadow-xl shadow-purple-500/25 hover:opacity-90 transition-all scale-105 active:scale-100"
                                >
                                    Deploy Server Now
                                </button>
                            </div>
                        </>
                    ) : (
                        servers?.map((server: any) => (
                            <ServerCard
                                key={server.id}
                                id={server.id}
                                name={server.name}
                                status={server.status}
                                planName={server.planId?.name || 'Standard Plan'}
                                serverIp={server.serverIp}
                                ramMb={server.ramMb || server.planId?.ramMb}
                                diskMb={server.diskMb || server.planId?.diskMb}
                                cpuCores={server.cpuCores || server.planId?.cpuCores}
                                eggImage={server.planId?.eggImage}
                                onDelete={(id) => deleteServerMutation.mutate(id)}
                            />
                        ))
                    )}
                </div>

                <div className="mt-12 group">
                    <button
                        onClick={() => setShowRedeemModal(true)}
                        className="bg-white/5 border border-white/10 rounded-3xl p-8 block w-full hover:bg-white/[0.07] transition-all hover:border-yellow-500/30 group-hover:translate-y-[-4px]"
                    >
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-yellow-500/10 rounded-3xl flex items-center justify-center text-yellow-500 ring-4 ring-yellow-500/10">
                                    <Plus size={32} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-2xl font-bold text-white mb-2 underline decoration-yellow-500/30 underline-offset-8">Redeem World Code</h3>
                                    <p className="text-gray-400 font-medium">Have a gift code? Redeem it here for coins or special rewards</p>
                                </div>
                            </div>
                            <span className="px-8 py-3 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-2xl font-bold shadow-lg shadow-yellow-500/5 group-hover:bg-yellow-500/20 transition-all">
                                Redeem Now
                            </span>
                        </div>
                    </button>
                </div>

                {/* Bottom Ad Zone */}
                <AdZone
                    position="footer"
                    onBuyClick={() => openAdPurchase('footer')}
                    className="mt-20 mb-10"
                />
            </main>

            {/* Create Server Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                            onClick={() => setShowCreateModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative bg-[#130b2e] border border-white/10 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden"
                        >
                            <div className="p-10">
                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="text-3xl font-extrabold text-white tracking-tight">Create New World</h3>
                                    <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white transition bg-white/5 p-3 rounded-full hover:bg-white/10">
                                        <Plus className="rotate-45" size={24} />
                                    </button>
                                </div>
                                <div className="space-y-8">
                                    <input
                                        value={serverName}
                                        onChange={(e) => setServerName(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-purple-500 transition shadow-inner font-medium text-lg placeholder:text-gray-600"
                                        placeholder="My Awesome Server..."
                                    />
                                    <div className="space-y-3">
                                        {plans && plans.length > 0 ? plans.map((plan: any, index: number) => (
                                            <motion.div
                                                key={plan.id}
                                                whileHover={{ scale: 1.02, x: 5 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setSelectedPlanId(plan.id)}
                                                className={`border-4 p-4 rounded-lg flex justify-between items-center cursor-pointer relative overflow-hidden transition ${selectedPlanId === plan.id
                                                    ? 'border-yellow-500 bg-gradient-to-r from-yellow-900/40 to-amber-900/40 shadow-lg shadow-yellow-500/50'
                                                    : 'border-[#654321] bg-gradient-to-r from-[#3d2817]/60 to-[#2d1f12]/60 hover:border-yellow-700'
                                                    }`}
                                            >
                                                {/* Pickaxe Icon for selected */}
                                                {selectedPlanId === plan.id && (
                                                    <motion.div
                                                        initial={{ scale: 0, rotate: -45 }}
                                                        animate={{ scale: 1, rotate: 0 }}
                                                        className="absolute top-1 left-1 text-3xl"
                                                    >
                                                        ⛏️
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
                                                        <span className={`font-extrabold text-2xl ${selectedPlanId === plan.id ? 'text-yellow-300' : 'text-yellow-500'}`} style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}>
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
                                    <div className="pt-4 flex gap-3">
                                        <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-sm font-bold text-red-200 bg-red-900/40 hover:bg-red-900/60 border-4 border-red-800/50 rounded-lg transition shadow-lg">❌ Cancel</button>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                // Validate before submitting
                                                const trimmedName = serverName.trim();
                                                if (!trimmedName) {
                                                    toast.error('Please enter a world name!');
                                                    return;
                                                }
                                                if (!selectedPlanId) {
                                                    toast.error('Please select a plan!');
                                                    return;
                                                }
                                                // Submit
                                                createServerMutation.mutate({ name: trimmedName, planId: selectedPlanId });
                                            }}
                                            disabled={!serverName.trim() || !selectedPlanId || createServerMutation.isPending}
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
            </AnimatePresence>

            {/* Redeem Code Modal */}
            <AnimatePresence>
                {showRedeemModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setShowRedeemModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-[#130b2e] border border-white/10 w-full max-w-md p-8 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-white">Redeem Code</h3>
                                <button onClick={() => setShowRedeemModal(false)} className="text-gray-500 hover:text-white transition bg-white/5 p-1 rounded-full"><Plus className="rotate-45" size={20} /></button>
                            </div>
                            <div className="space-y-6">
                                <input
                                    value={redeemCode}
                                    onChange={(e) => setRedeemCode(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 transition placeholder-gray-600 uppercase tracking-wider font-mono"
                                    placeholder="ENTER-CODE-HERE"
                                />
                                <div className="pt-4 flex gap-3">
                                    <button onClick={() => setShowRedeemModal(false)} className="flex-1 py-3 text-sm font-semibold text-gray-400 hover:bg-white/5 rounded-xl transition">Cancel</button>
                                    <button
                                        onClick={() => redeemMutation.mutate(redeemCode)}
                                        disabled={!redeemCode || redeemMutation.isPending}
                                        className="flex-[2] py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-500/25 transition"
                                    >
                                        {redeemMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : 'Redeem'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.show}
                onClose={() => setDeleteConfirm({ show: false, serverId: '', serverName: '' })}
                onConfirm={() => handleAdminDeleteServer(deleteConfirm.serverId)}
                title="Delete Server?"
                message={`Are you sure you want to delete the server "${deleteConfirm.serverName}" ? This action cannot be undone and all data will be permanently lost.`}
                confirmText="Delete Server"
                cancelText="Cancel"
                type="danger"
            />

            {/* Ad Purchase Modal */}
            <AdPurchaseModal
                isOpen={showAdModal}
                onClose={() => setShowAdModal(false)}
                initialSlotId={selectedAdSlot}
            />
        </div>
    );
};

export default Dashboard;
