import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, HardDrive, MemoryStick, Wifi, WifiOff, Trash2, Settings, Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmDialog from './ConfirmDialog';

interface ServerProps {
    id: string;
    name: string;
    status: string;
    planName: string;
    serverIp?: string;
    ramMb?: number;
    diskMb?: number;
    cpuCores?: number;
    eggImage?: string;
    onDelete: (id: string) => void;
}

// Animated particles component
const MinecraftParticles = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-green-400/40 rounded-sm"
                    initial={{
                        x: `${10 + Math.random() * 80}%`,
                        y: '100%',
                        opacity: 0,
                    }}
                    animate={{
                        y: '-10%',
                        opacity: [0, 0.6, 0],
                    }}
                    transition={{
                        duration: 4 + Math.random() * 2,
                        repeat: Infinity,
                        delay: Math.random() * 3,
                        ease: 'linear',
                    }}
                />
            ))}
        </div>
    );
};

// Glowing status indicator
const StatusIndicator = ({ status }: { status: string }) => {
    const statusLower = status?.toLowerCase() || '';
    const isOnline = statusLower === 'running' || statusLower === 'active';
    const isStarting = statusLower === 'starting' || statusLower === 'installing';

    return (
        <div className="flex items-center gap-2">
            <motion.div
                className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : isStarting ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                animate={{
                    scale: isOnline ? [1, 1.3, 1] : 1,
                    boxShadow: isOnline
                        ? ['0 0 0 0 rgba(34, 197, 94, 0.6)', '0 0 0 6px rgba(34, 197, 94, 0)', '0 0 0 0 rgba(34, 197, 94, 0)']
                        : 'none',
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
            <span
                className={`text-xs font-bold uppercase tracking-wide ${isOnline ? 'text-green-400' : isStarting ? 'text-yellow-400' : 'text-red-400'
                    }`}
            >
                {isOnline ? 'Online' : isStarting ? 'Starting' : 'Offline'}
            </span>
        </div>
    );
};

// Minecraft-style gradient background
const MinecraftGradient = () => (
    <div className="absolute inset-0 z-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-[#0d0620] to-[#1a0f2e]" />
        {/* Grid pattern overlay */}
        <div
            className="absolute inset-0 opacity-10"
            style={{
                backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
            }}
        />
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-green-500/20 rounded-full blur-3xl" />
    </div>
);

const ServerCard = ({ id, name, status, planName, serverIp, ramMb, diskMb, cpuCores, eggImage, onDelete }: ServerProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const copyIP = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (serverIp && serverIp !== 'Fetching...' && serverIp !== 'Pending') {
            navigator.clipboard.writeText(serverIp);
            setCopied(true);
            toast.success('IP copied!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const displayIp = serverIp || 'Pending';

    return (
        <motion.div
            className="relative group"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
        >
            {/* Delete Button */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                }}
                className="absolute top-3 right-3 z-20 p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-red-400 transition hover:scale-110 active:scale-95"
                title="Delete Server"
            >
                <Trash2 size={16} />
            </button>

            {/* Custom Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={() => onDelete(id)}
                title="Delete Server?"
                message={`Are you sure you want to delete "${name}"? This action cannot be undone and all server data will be permanently lost.`}
                confirmText="Delete Server"
                cancelText="Cancel"
                type="danger"
            />

            <Link to={`/server/${id}`}>
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d0620] shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 hover:border-purple-500/30">
                    {/* Background */}
                    {eggImage ? (
                        <div className="absolute inset-0 z-0">
                            <img
                                src={eggImage}
                                alt=""
                                className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0620] via-[#0d0620]/90 to-transparent" />
                        </div>
                    ) : (
                        <MinecraftGradient />
                    )}

                    {/* Animated Particles */}
                    {isHovered && <MinecraftParticles />}

                    {/* Content */}
                    <div className="relative z-10 p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <motion.div
                                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/20 flex items-center justify-center overflow-hidden"
                                    whileHover={{ rotate: [-5, 5, 0] }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {eggImage ? (
                                        <img src={eggImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl">⛏️</span>
                                    )}
                                </motion.div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-green-300 transition-colors line-clamp-1">
                                        {name}
                                    </h3>
                                    <p className="text-xs text-gray-400">{planName}</p>
                                </div>
                            </div>
                            <StatusIndicator status={status} />
                        </div>

                        {/* Server IP */}
                        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-3 mb-4 border border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {(status === 'running' || status === 'active') ? (
                                        <Wifi size={14} className="text-green-400 flex-shrink-0" />
                                    ) : (
                                        <WifiOff size={14} className="text-gray-500 flex-shrink-0" />
                                    )}
                                    <code className="text-sm font-mono text-white/90 truncate">{displayIp}</code>
                                </div>
                                <button
                                    onClick={copyIP}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition flex-shrink-0"
                                    title="Copy IP"
                                >
                                    {copied ? (
                                        <Check size={14} className="text-green-400" />
                                    ) : (
                                        <Copy size={14} className="text-gray-400" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Resource Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                                <MemoryStick size={14} className="text-blue-400 mx-auto mb-1" />
                                <p className="text-[10px] text-gray-400">RAM</p>
                                <p className="text-xs font-bold text-white">{ramMb ? (ramMb / 1024).toFixed(0) : '0'}GB</p>
                            </div>
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
                                <HardDrive size={14} className="text-green-400 mx-auto mb-1" />
                                <p className="text-[10px] text-gray-400">Disk</p>
                                <p className="text-xs font-bold text-white">{diskMb ? (diskMb / 1024).toFixed(0) : '0'}GB</p>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 text-center">
                                <Cpu size={14} className="text-purple-400 mx-auto mb-1" />
                                <p className="text-[10px] text-gray-400">CPU</p>
                                <p className="text-xs font-bold text-white">{cpuCores || 1}</p>
                            </div>
                        </div>

                        {/* Manage Button */}
                        <motion.div
                            className="w-full"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                        >
                            <div className="py-2.5 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl text-sm font-bold transition shadow-lg shadow-purple-500/20">
                                <Settings size={16} />
                                Manage
                            </div>
                        </motion.div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
};

export default ServerCard;
