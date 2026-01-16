import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Power, RotateCw, Square, Skull, ExternalLink, ShoppingBag, Ghost, Trash2, Clock } from 'lucide-react';

interface ServerHeaderProps {
    server: any;
    powerState?: string;
    onPowerAction: (signal: string) => void;
    isPowerPending: boolean;
    onOpenShop: () => void;
    onDelete?: () => void;
    panelUrl?: string;
    panelAccessEnabled?: boolean;
    userRole?: string;
}

const ServerHeader = ({ server, powerState, onPowerAction, isPowerPending, onOpenShop, onDelete, panelUrl = '', panelAccessEnabled = true, userRole = 'user' }: ServerHeaderProps) => {
    const [activeSignal, setActiveSignal] = useState<string | null>(null);
    const [uptime, setUptime] = useState<string>('');
    const isPanelLocked = !panelAccessEnabled && userRole !== 'admin';

    const handlePower = (signal: string) => {
        setActiveSignal(signal);
        onPowerAction(signal);
        setTimeout(() => setActiveSignal(null), 2000);
    };

    // Calculate uptime
    useEffect(() => {
        const calculateUptime = () => {
            if (powerState === 'running' && server.createdAt) {
                const now = new Date().getTime();
                const created = new Date(server.createdAt).getTime();
                const diff = now - created;

                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                if (days > 0) {
                    setUptime(`${days}d ${hours}h`);
                } else if (hours > 0) {
                    setUptime(`${hours}h ${minutes}m`);
                } else {
                    setUptime(`${minutes}m`);
                }
            } else {
                setUptime('Offline');
            }
        };

        calculateUptime();
        const interval = setInterval(calculateUptime, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [powerState, server.createdAt]);

    const getStatusInfo = () => {
        const status = powerState || server.status?.toLowerCase() || 'unknown';

        if (status === 'running') {
            return { color: 'bg-green-500', text: 'Online', textColor: 'text-green-400', bgColor: 'bg-green-500/20' };
        } else if (status === 'starting' || status === 'installing') {
            return { color: 'bg-yellow-500', text: 'Starting', textColor: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
        } else if (status === 'stopping') {
            return { color: 'bg-orange-500', text: 'Stopping', textColor: 'text-orange-400', bgColor: 'bg-orange-500/20' };
        } else if (status === 'suspended') {
            return { color: 'bg-orange-600', text: 'Suspended', textColor: 'text-orange-500', bgColor: 'bg-orange-600/20' };
        } else if (status === 'active') {
            // 'active' is DB status for provisioned, assume Offline if no powerState
            return { color: 'bg-red-500', text: 'Offline', textColor: 'text-red-400', bgColor: 'bg-red-500/20' };
        } else {
            return { color: 'bg-red-500', text: 'Offline', textColor: 'text-red-400', bgColor: 'bg-red-500/20' };
        }
    };

    const statusInfo = getStatusInfo();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl mb-6 border border-white/10"
        >
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1040] via-[#0d0620] to-[#0d1525]" />

            {/* Grid Pattern */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '30px 30px',
                }}
            />

            {/* Glow Effects */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />

            <div className="relative z-10 p-6 md:p-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    {/* Server Info */}
                    <div className="flex items-center gap-4">
                        {/* Minecraft Icon */}
                        <motion.div
                            className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center shadow-lg"
                            whileHover={{ scale: 1.05, rotate: 5 }}
                        >
                            {server.eggImage ? (
                                <img src={server.eggImage} alt="" className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <span className="text-2xl md:text-3xl">⛏️</span>
                            )}
                        </motion.div>

                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-xl md:text-2xl font-bold text-white">{server.name}</h1>
                                <motion.div
                                    className={`w-2.5 h-2.5 rounded-full ${statusInfo.color}`}
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-xs ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                                    {statusInfo.text}
                                </span>
                                <span className="text-gray-500 font-mono text-xs">{server.pteroIdentifier}</span>
                                <span className="text-gray-600">•</span>
                                <span className="text-purple-400 font-medium flex items-center gap-1 text-xs">
                                    <Ghost size={12} />
                                    {server.planId?.name || 'Minecraft'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                        <motion.button
                            onClick={onOpenShop}
                            className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-orange-500/20 text-sm"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <ShoppingBag size={16} />
                            Upgrade
                        </motion.button>

                        {isPanelLocked ? (
                            <div className="group relative">
                                <button
                                    disabled
                                    className="px-4 py-2 bg-gray-600/20 border border-gray-600/30 text-gray-500 rounded-xl font-bold flex items-center gap-2 cursor-not-allowed text-sm"
                                >
                                    <ExternalLink size={16} />
                                    <span>Panel</span>
                                    <span className="ml-1 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">LOCKED</span>
                                </button>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                                    Access restricted by Admin
                                </div>
                            </div>
                        ) : (
                            <motion.a
                                href={`${panelUrl}/server/${server.pteroIdentifier}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl font-bold flex items-center gap-2 transition border border-white/10 text-sm"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <ExternalLink size={16} />
                                Panel
                            </motion.a>
                        )}

                        {onDelete && (
                            <motion.button
                                onClick={onDelete}
                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-xl font-bold flex items-center gap-2 transition text-sm"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Trash2 size={16} />
                                Delete
                            </motion.button>
                        )}
                    </div>
                </div>

                {/* Power Controls */}
                <div className="mt-6 pt-5 border-t border-white/10">
                    <div className="flex flex-wrap gap-2">
                        {[
                            { signal: 'start', icon: Power, label: 'Start', color: 'bg-green-600 hover:bg-green-500', disabled: (statusInfo.text === 'Online' || statusInfo.text === 'Starting') },
                            { signal: 'restart', icon: RotateCw, label: 'Restart', color: 'bg-yellow-600 hover:bg-yellow-500', disabled: false },
                            { signal: 'stop', icon: Square, label: 'Stop', color: 'bg-red-600 hover:bg-red-500', disabled: statusInfo.text === 'Offline' },
                            { signal: 'kill', icon: Skull, label: 'Kill', color: 'bg-gray-700 hover:bg-gray-600', disabled: false },
                        ].map(({ signal, icon: Icon, label, color, disabled }) => (
                            <motion.button
                                key={signal}
                                onClick={() => handlePower(signal)}
                                disabled={isPowerPending || disabled}
                                className={`px-4 py-2 ${color} disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center gap-2 transition text-sm`}
                                whileHover={{ scale: disabled ? 1 : 1.02 }}
                                whileTap={{ scale: disabled ? 1 : 0.98 }}
                            >
                                <motion.div
                                    animate={{
                                        rotate: activeSignal === signal && signal === 'restart' ? 360 : 0,
                                    }}
                                    transition={{ duration: 1, repeat: activeSignal === signal ? Infinity : 0 }}
                                >
                                    <Icon size={16} />
                                </motion.div>
                                {label}
                            </motion.button>
                        ))}

                        {/* Uptime Display */}
                        <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-xl font-bold flex items-center gap-2 text-sm">
                            <Clock size={16} />
                            <span className="hidden sm:inline">Uptime:</span>
                            <span className="font-mono">{uptime}</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ServerHeader;
