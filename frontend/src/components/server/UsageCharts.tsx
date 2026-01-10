import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Activity, Cpu, HardDrive } from 'lucide-react';

interface UsageChartsProps {
    stats: any; // Real-time stats
    // In a real app, we'd pass historical data here
}

const mockData = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    cpu: Math.floor(Math.random() * 80) + 10,
    ram: Math.floor(Math.random() * 60) + 20,
    disk: Math.floor(Math.random() * 10) + 5,
}));

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1a1b26] border border-white/10 p-3 rounded-lg shadow-xl">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                {payload.map((p: any) => (
                    <p key={p.name} className="text-sm font-bold" style={{ color: p.color }}>
                        {p.name.toUpperCase()}: {p.value}%
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const UsageCharts = ({ stats }: UsageChartsProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
            {/* CPU Chart */}
            <div className="bg-[#1a1b26] border border-white/5 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-200 flex items-center gap-2">
                        <Cpu size={18} className="text-green-400" /> CPU Usage
                    </h3>
                    <span className="text-2xl font-mono font-bold text-green-400">
                        {stats?.cpu_absolute !== undefined ? Math.round(stats.cpu_absolute) : '--'}%
                    </span>
                </div>
                <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mockData}>
                            <defs>
                                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="cpu" stroke="#4ade80" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* RAM Chart */}
            <div className="bg-[#1a1b26] border border-white/5 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-200 flex items-center gap-2">
                        <Activity size={18} className="text-blue-400" /> RAM Usage
                    </h3>
                    <span className="text-2xl font-mono font-bold text-blue-400">
                        {stats?.memory_bytes ? Math.round(stats.memory_bytes / 1024 / 1024) : '--'} <span className="text-sm text-gray-500">MB</span>
                    </span>
                </div>
                <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mockData}>
                            <defs>
                                <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="ram" stroke="#60a5fa" fillOpacity={1} fill="url(#colorRam)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Disk Chart */}
            <div className="bg-[#1a1b26] border border-white/5 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-200 flex items-center gap-2">
                        <HardDrive size={18} className="text-purple-400" /> Disk Usage
                    </h3>
                    <span className="text-2xl font-mono font-bold text-purple-400">
                        {stats?.disk_bytes ? Math.round(stats.disk_bytes / 1024 / 1024) : '--'} <span className="text-sm text-gray-500">MB</span>
                    </span>
                </div>
                <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mockData}>
                            <defs>
                                <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="disk" stroke="#c084fc" fillOpacity={1} fill="url(#colorDisk)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </motion.div>
    );
};

export default UsageCharts;
