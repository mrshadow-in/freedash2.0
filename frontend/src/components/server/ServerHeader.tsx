import { useState } from 'react';
import { motion } from 'framer-motion';
import { Power, RotateCw, Square, Skull, ExternalLink, ShoppingBag, Gamepad2, Trash2 } from 'lucide-react';

interface ServerHeaderProps {
    server: any;
    onPowerAction: (signal: string) => void;
    isPowerPending: boolean;
    onOpenShop: () => void;
    onDelete?: () => void;
    panelUrl?: string;
}

const ServerHeader = ({ server, onPowerAction, isPowerPending, onOpenShop, onDelete, panelUrl = '' }: ServerHeaderProps) => {
    const [activeSignal, setActiveSignal] = useState<string | null>(null);

    const handlePower = (signal: string) => {
        setActiveSignal(signal);
        onPowerAction(signal);
        setTimeout(() => setActiveSignal(null), 2000);
    };

    const getStatusInfo = () => {
        const status = server.status?.toLowerCase() || 'unknown';
        if (status === 'running' || status === 'active') {
            return { color: 'bg-green-500', text: 'Online', textColor: 'text-green-400', bgColor: 'bg-green-500/20' };
        } else if (status === 'starting' || status === 'installing') {
            return { color: 'bg-yellow-500', text: 'Starting', textColor: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
        } else if (status === 'stopping') {
            return { color: 'bg-orange-500', text: 'Stopping', textColor: 'text-orange-400', bgColor: 'bg-orange-500/20' };
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
                                    <Gamepad2 size={12} />
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
                            { signal: 'start', icon: Power, label: 'Start', color: 'bg-green-600 hover:bg-green-500', disabled: server.status === 'running' || server.status === 'active' },
                            { signal: 'restart', icon: RotateCw, label: 'Restart', color: 'bg-yellow-600 hover:bg-yellow-500', disabled: false },
                            { signal: 'stop', icon: Square, label: 'Stop', color: 'bg-red-600 hover:bg-red-500', disabled: server.status === 'offline' || server.status === 'stopped' },
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
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ServerHeader;
