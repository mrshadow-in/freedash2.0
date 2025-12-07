import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, HardDrive, Zap, ShoppingBag, Server, Shield, Database, Loader2, Coins } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    server: any;
    pricing: any; // Pricing from API
}

const ShopModal = ({ isOpen, onClose, server, pricing }: ShopModalProps) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'resources' | 'addons'>('resources');
    const { user } = useAuthStore();

    // Fetch latest user data for balance
    const { data: userData } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            const res = await api.get('/auth/me');
            return res.data;
        },
        enabled: isOpen
    });

    // Resource State
    const [ramToAdd, setRamToAdd] = useState(0);
    const [diskToAdd, setDiskToAdd] = useState(0);
    const [cpuToAdd, setCpuToAdd] = useState(0);

    // Cost Calculation
    const calculateTotalCost = () => {
        let cost = 0;
        if (pricing) {
            cost += (ramToAdd / 1024) * pricing.ramPerGB;
            cost += (diskToAdd / 1024) * pricing.diskPerGB;
            cost += cpuToAdd * pricing.cpuPerCore;
        }
        return Math.ceil(cost);
    };

    const totalCost = calculateTotalCost();

    const purchaseMutation = useMutation({
        mutationFn: async () => {
            // We need to send separate requests or one batch? 
            // The backend supports single item purchase.
            // For simplicity, we'll loop through items or simpler, the user buys ONE thing at a time?
            // "Shop flow: user can buy at least RAM and Disk"
            // It is better UX to bundle, but backend `purchaseItem` takes `{ itemId, quantity }`.
            // So I'll chain them or just support one type of upgrade at a time in specific UI tabs?
            // Let's do parallel requests for now if multiple selected.

            const promises = [];
            if (ramToAdd > 0) promises.push(api.post('/servers/shop/purchase', { serverId: server._id, itemId: 'ram', quantity: ramToAdd, paymentMethod: 'coins' }));
            if (diskToAdd > 0) promises.push(api.post('/servers/shop/purchase', { serverId: server._id, itemId: 'disk', quantity: diskToAdd, paymentMethod: 'coins' }));
            if (cpuToAdd > 0) promises.push(api.post('/servers/shop/purchase', { serverId: server._id, itemId: 'cpu', quantity: cpuToAdd, paymentMethod: 'coins' }));

            return Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['server', server._id] });
            queryClient.invalidateQueries({ queryKey: ['servers'] }); // Balance update
            toast.success('Purchase successful! Resources are being applied.');
            onClose();
            // Reset state
            setRamToAdd(0);
            setDiskToAdd(0);
            setCpuToAdd(0);
        },
        onError: (error: any) => {
            console.error('Purchase error:', error);
            const errorMsg = error.response?.data?.message || 'Purchase failed';
            toast.error(errorMsg);
            // Log full error for debugging
            if (error.response) {
                console.error('Error response:', error.response.data);
                console.error('Error status:', error.response.status);
            }
        }
    });

    if (!isOpen || !server) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[#16171f] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a1b26] rounded-t-2xl">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                                <ShoppingBag className="text-yellow-400" />
                                Server Shop
                            </h2>
                            <div className="flex items-center gap-2 mt-2 text-sm">
                                <Coins size={16} className="text-yellow-400" />
                                <span className="text-gray-400">Your Balance:</span>
                                <span className="font-bold text-yellow-400">{userData?.coins || user?.coins || 0} Coins</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-white/5">
                        <button
                            onClick={() => setActiveTab('resources')}
                            className={`flex-1 py-4 text-sm font-bold transition ${activeTab === 'resources' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5' : 'text-gray-400 hover:text-white'}`}
                        >
                            Resources
                        </button>
                        <button
                            onClick={() => setActiveTab('addons')}
                            className={`flex-1 py-4 text-sm font-bold transition ${activeTab === 'addons' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/5' : 'text-gray-400 hover:text-white'}`}
                        >
                            Add-ons (Slots/IPs)
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1 space-y-8 text-white">
                        {activeTab === 'resources' ? (
                            <>
                                <div className="space-y-6">
                                    {/* RAM Selector */}
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                                    <Activity size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold">Add RAM</h3>
                                                    <p className="text-xs text-gray-400">{pricing?.ramPerGB} Coins / GB</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setRamToAdd(Math.max(0, ramToAdd - 512))}
                                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold"
                                                >-</button>
                                                <span className="w-16 text-center font-mono font-bold text-lg">{ramToAdd} MB</span>
                                                <button
                                                    onClick={() => setRamToAdd(ramToAdd + 512)}
                                                    className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center font-bold"
                                                >+</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Disk Selector */}
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                                                    <HardDrive size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold">Add Storage</h3>
                                                    <p className="text-xs text-gray-400">{pricing?.diskPerGB} Coins / GB</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setDiskToAdd(Math.max(0, diskToAdd - 1024))}
                                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold"
                                                >-</button>
                                                <span className="w-16 text-center font-mono font-bold text-lg">{diskToAdd / 1024} GB</span>
                                                <button
                                                    onClick={() => setDiskToAdd(diskToAdd + 1024)}
                                                    className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center font-bold"
                                                >+</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CPU Selector */}
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                                                    <Cpu size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold">Add CPU Cores</h3>
                                                    <p className="text-xs text-gray-400">{pricing?.cpuPerCore} Coins / Core</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setCpuToAdd(Math.max(0, cpuToAdd - 1))}
                                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold"
                                                >-</button>
                                                <span className="w-16 text-center font-mono font-bold text-lg">{cpuToAdd}</span>
                                                <button
                                                    onClick={() => setCpuToAdd(cpuToAdd + 1)}
                                                    className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center font-bold"
                                                >+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                                <Database size={48} className="mb-4 opacity-50" />
                                <p>Add-ons (Backups, Ports, Dedicated IPs) coming soon!</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/5 bg-[#1a1b26] rounded-b-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-400">Total Upgrade Cost:</span>
                            <span className="text-2xl font-bold text-yellow-400">{totalCost} Coins</span>
                        </div>
                        <button
                            onClick={() => purchaseMutation.mutate()}
                            disabled={purchaseMutation.isPending || totalCost <= 0}
                            className="w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-white shadow-lg shadow-orange-500/20"
                        >
                            {purchaseMutation.isPending ? (
                                <>
                                    <Loader2 className="animate-spin" /> Processing...
                                </>
                            ) : (
                                'Complete Purchase'
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Import helper
import { Activity } from 'lucide-react';

export default ShopModal;
