import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { motion } from 'framer-motion';
import { Clock, Play, Pause, Coins, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Header from '../components/Header';

const AFKPage = () => {
    const queryClient = useQueryClient();
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const { data: status, isLoading } = useQuery({
        queryKey: ['afkStatus'],
        queryFn: async () => {
            const res = await api.get('/afk/status');
            return res.data;
        },
        refetchInterval: 5000 // Poll status occasionally
    });

    const startMutation = useMutation({
        mutationFn: async () => api.post('/afk/start'),
        onSuccess: () => {
            toast.success('AFK Session Started!');
            queryClient.invalidateQueries({ queryKey: ['afkStatus'] });
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to start')
    });

    const stopMutation = useMutation({
        mutationFn: async () => api.post('/afk/stop'),
        onSuccess: (data) => {
            toast.success(`Session Ended! Total earned: ${data.data.coinsEarned} coins.`);
            queryClient.invalidateQueries({ queryKey: ['afkStatus'] });
            queryClient.invalidateQueries({ queryKey: ['user'] }); // Update balance in header
        }
    });

    const heartbeatMutation = useMutation({
        mutationFn: async () => api.post('/afk/heartbeat'),
        onSuccess: (data) => {
            if (data.data.limitReached) {
                toast('Daily AFK limit reached.', { icon: '🛑' });
            }
            queryClient.invalidateQueries({ queryKey: ['afkStatus'] });
            queryClient.invalidateQueries({ queryKey: ['user'] }); // Refresh balance in header
        }
    });

    // Local Timer & Heartbeat Loop with Visibility Check
    useEffect(() => {
        let interval: any;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Pause timer logic if needed, but mainly we just won't increment/heartbeat if we check state inside interval
                // However, user requested "pause", so let's stop the interval maybe?
                // Actually, cleaner to just check document.hidden inside the interval
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        if (status?.session?.isActive) {
            interval = setInterval(() => {
                // strict check: if hidden, do not increment, do not heartbeat
                if (document.hidden) return;

                setElapsedSeconds(prev => prev + 1);

                if (elapsedSeconds > 0 && elapsedSeconds % 50 === 0) {
                    heartbeatMutation.mutate();
                }
            }, 1000);
        } else {
            setElapsedSeconds(0);
        }

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [status?.session?.isActive, elapsedSeconds]);


    if (isLoading) return (
        <div className="min-h-screen bg-theme flex justify-center items-center">
            <Loader2 className="animate-spin text-purple-500" size={48} />
        </div>
    );

    const session = status?.session;
    const settings = status?.settings;

    return (
        <div className="min-h-screen bg-theme font-sans text-white pb-20 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-[-20%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none" />

            <Header />

            <div className="max-w-4xl mx-auto px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">AFK Earning Zone</h1>
                    <p className="text-gray-400 text-lg">Keep this tab open to earn free coins automatically.</p>
                </motion.div>

                {/* Status Card */}
                <div className="bg-[#1a1b26] border border-white/5 rounded-3xl p-8 md:p-12 relative overflow-hidden relative shadow-2xl">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <Clock size={200} />
                    </div>

                    <div className="relative z-10 flex flex-col items-center justify-center gap-8">
                        {/* Circle Timer/Status */}
                        <div className={`w-48 h-48 rounded-full border-4 flex flex-col items-center justify-center gap-2 transition-all duration-500 ${session?.isActive
                            ? 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)] bg-green-500/5'
                            : 'border-white/10 bg-white/5'
                            }`}>
                            {session?.isActive ? (
                                <>
                                    <div className="text-4xl font-mono font-bold text-white">
                                        {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
                                    </div>
                                    <span className="text-green-400 text-sm font-bold uppercase tracking-wider animate-pulse">Earning...</span>
                                    <span className="text-[10px] text-gray-500">(Keep tab focused)</span>
                                </>
                            ) : (
                                <>
                                    <Clock size={48} className="text-gray-500 mb-2" />
                                    <span className="text-gray-400 text-sm font-bold uppercase tracking-wider">Stopped</span>
                                </>
                            )}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl">
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-center">
                                <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Session Earned</span>
                                <div className="text-2xl font-bold text-yellow-400 flex justify-center items-center gap-2">
                                    <Coins size={18} />
                                    {Math.floor(session?.coinsEarned || 0)}
                                </div>
                            </div>
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-center">
                                <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Earning Rate</span>
                                <div className="text-2xl font-bold text-blue-400">
                                    {settings?.coinsPerMinute || 0} <span className="text-sm text-gray-500">/ min</span>
                                </div>
                            </div>
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-center">
                                <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Daily Limit</span>
                                <div className="text-2xl font-bold text-white">
                                    {Math.floor(session?.dailyCoinsEarned || 0)} <span className="text-sm text-gray-500">/ {settings?.maxCoinsPerDay}</span>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex justify-center gap-4 mt-4">
                            {!session?.isActive ? (
                                <button
                                    onClick={() => startMutation.mutate()}
                                    disabled={startMutation.isPending}
                                    className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-lg flex items-center gap-3 transition shadow-lg shadow-green-600/20"
                                >
                                    <Play size={24} fill="currentColor" /> Start Earning
                                </button>
                            ) : (
                                <button
                                    onClick={() => stopMutation.mutate()}
                                    disabled={stopMutation.isPending}
                                    className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-lg flex items-center gap-3 transition shadow-lg shadow-red-600/20"
                                >
                                    <Pause size={24} fill="currentColor" /> Stop & Claim
                                </button>
                            )}
                        </div>

                    </div>
                </div>

                <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-4">
                    <AlertCircle className="text-blue-400 shrink-0 mt-1" size={20} />
                    <div className="text-sm text-blue-200">
                        <p className="font-bold mb-1">How it works:</p>
                        <p>Keep this tab open and active to generate coins. Coins are automatically added to your balance every minute. If you close the tab or switch away, earning will pause. Click "Stop" to end the session.</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AFKPage;
