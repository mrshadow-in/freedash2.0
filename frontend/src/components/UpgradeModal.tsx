import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, HardDrive, Zap, Loader2, Activity } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { toast } from 'react-hot-toast';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    server: any;
    pricing: any;
}

const UpgradeModal = ({ isOpen, onClose, server, pricing }: UpgradeModalProps) => {
    const queryClient = useQueryClient();
    const [ram, setRam] = useState(0);
    const [disk, setDisk] = useState(0);
    const [cpu, setCpu] = useState(0);

    // Initialize with current server specs
    useEffect(() => {
        if (server) {
            setRam(server.ramMb);
            setDisk(server.diskMb);
            setCpu(server.cpuCores);
        }
    }, [server]);

    // Calculate Cost
    const ramDiff = ram - server?.ramMb;
    const diskDiff = disk - server?.diskMb;
    const cpuDiff = cpu - server?.cpuCores;

    let cost = 0;
    if (pricing) {
        if (ramDiff > 0) cost += (ramDiff / 1024) * pricing.ramPerGB;
        if (diskDiff > 0) cost += (diskDiff / 1024) * pricing.diskPerGB;
        if (cpuDiff > 0) cost += cpuDiff * pricing.cpuPerCore;
    }
    cost = Math.ceil(cost);

    const upgradeMutation = useMutation({
        mutationFn: async () => {
            return api.post(`/servers/${server._id}/upgrade`, {
                ramMb: ram,
                diskMb: disk,
                cpuCores: cpu
            });
        },
        onSuccess: (res: any) => {
            queryClient.invalidateQueries({ queryKey: ['server', server._id] });
            queryClient.invalidateQueries({ queryKey: ['servers'] });
            toast.success('Server upgraded successfully!');
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Upgrade failed');
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
                    className="bg-[#1a1b26] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                    >
                        <X size={20} />
                    </button>

                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Zap className="text-yellow-400" />
                        Upgrade Server
                    </h2>

                    <div className="space-y-6">
                        {/* RAM Slider */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-gray-400 flex items-center gap-2">
                                    <Cpu size={16} /> RAM (MB)
                                </label>
                                <span className="font-mono text-blue-400">{ram} MB</span>
                            </div>
                            <input
                                type="range"
                                min={server.ramMb}
                                max={server.ramMb + 8192} // Allow +8GB
                                step={128}
                                value={ram}
                                onChange={(e) => setRam(parseInt(e.target.value))}
                                className="w-full accent-blue-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Current: {server.ramMb} MB</span>
                                <span>Max: {server.ramMb + 8192} MB</span>
                            </div>
                        </div>

                        {/* Disk Slider */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-gray-400 flex items-center gap-2">
                                    <HardDrive size={16} /> Disk (MB)
                                </label>
                                <span className="font-mono text-purple-400">{disk} MB</span>
                            </div>
                            <input
                                type="range"
                                min={server.diskMb}
                                max={server.diskMb + 10240} // Allow +10GB
                                step={512}
                                value={disk}
                                onChange={(e) => setDisk(parseInt(e.target.value))}
                                className="w-full accent-purple-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Current: {server.diskMb} MB</span>
                                <span>Max: {server.diskMb + 10240} MB</span>
                            </div>
                        </div>

                        {/* CPU Slider */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-gray-400 flex items-center gap-2">
                                    <Activity size={16} /> CPU Cores
                                </label>
                                <span className="font-mono text-green-400">{cpu} Cores</span>
                            </div>
                            <input
                                type="range"
                                min={server.cpuCores}
                                max={server.cpuCores + 4} // Allow +4 Cores
                                step={1}
                                value={cpu}
                                onChange={(e) => setCpu(parseInt(e.target.value))}
                                className="w-full accent-green-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Current: {server.cpuCores} Cores</span>
                                <span>Max: {server.cpuCores + 4} Cores</span>
                            </div>
                        </div>

                        {/* Cost & Action */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-400">Upgrade Cost:</span>
                                <span className="text-xl font-bold text-yellow-400 flex items-center gap-1">
                                    {cost} <span className="text-sm font-normal text-gray-400">Coins</span>
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">
                                This is a one-time charge for the upgrade. Recurring costs depend on your plan.
                            </p>

                            <button
                                onClick={() => upgradeMutation.mutate()}
                                disabled={upgradeMutation.isPending || cost <= 0}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {upgradeMutation.isPending ? (
                                    <>
                                        <Loader2 className="animate-spin" /> Processing...
                                    </>
                                ) : (
                                    'Pay & Upgrade'
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default UpgradeModal;
