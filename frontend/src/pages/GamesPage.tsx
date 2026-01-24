import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { toast } from 'react-hot-toast';
import { Dices, Coins, Gift, Trophy, Timer } from 'lucide-react';
import Header from '../components/Header';

const GamesPage = () => {
    const queryClient = useQueryClient();
    const [selectedGame, setSelectedGame] = useState<'dice' | 'flip' | 'slots' | null>(null);
    const [cooldown, setCooldown] = useState(0);

    // Cooldown Timer
    useEffect(() => {
        let interval: any;
        if (cooldown > 0) {
            interval = setInterval(() => {
                setCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [cooldown]);

    const handleGameComplete = (data: any) => {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        if (data.won) toast.success(data.message || 'You won!');
        else toast.error(data.message || 'You lost.');
        setCooldown(60); // Start 60s cooldown
    };

    const handleGameError = (err: any) => {
        const msg = err.response?.data?.message || 'Game failed';
        toast.error(msg);

        // If it's a rate limit error (429), parse the seconds if possible, or just default to remaining time
        if (err.response?.status === 429) {
            // Extract seconds from message "Please wait Xs..." if needed, or just set a safe default like 60
            // The backend sends: "Please wait 45s before playing again."
            const match = msg.match(/wait (\d+)s/);
            if (match && match[1]) {
                setCooldown(parseInt(match[1]));
            } else {
                setCooldown(60);
            }
        }
    };

    // --- Components ---

    // DICE
    const DiceGame = () => {
        const [bet, setBet] = useState(10);
        const [prediction, setPrediction] = useState(6);
        const [isRolling, setIsRolling] = useState(false);

        const mutation = useMutation({
            mutationFn: async () => {
                const res = await api.post('/games/dice', { betAmount: bet, prediction });
                return res.data;
            },
            onSuccess: (data) => {
                handleGameComplete(data);
                setIsRolling(false);
            },
            onError: (err: any) => {
                handleGameError(err);
                setIsRolling(false);
            }
        });

        const handlePlay = () => {
            if (cooldown > 0) return;
            setIsRolling(true);
            mutation.mutate();
        };

        return (
            <div className="space-y-6">
                <div className="flex justify-center">
                    <Dices size={64} className={`text-purple-400 ${isRolling ? 'animate-spin' : ''}`} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                        <label className="text-gray-400 text-sm">Bet Amount</label>
                        <input
                            type="number"
                            value={bet}
                            onChange={(e) => setBet(parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white"
                        />
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm">Predict (1-6)</label>
                        <div className="flex gap-1 mt-1">
                            {[1, 2, 3, 4, 5, 6].map(n => (
                                <button
                                    key={n}
                                    onClick={() => setPrediction(n)}
                                    className={`flex-1 py-2 rounded-md transition ${prediction === n ? 'bg-purple-600 text-white' : 'bg-white/5 hover:bg-white/10'}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <button
                    onClick={handlePlay}
                    disabled={isRolling || mutation.isPending || cooldown > 0}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-purple-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {cooldown > 0 ? (
                        <>
                            <Timer className="animate-pulse" /> Wait {cooldown}s
                        </>
                    ) : isRolling ? 'Rolling...' : 'Roll Dice (5x Payout)'}
                </button>
            </div>
        );
    };

    // COIN FLIP
    const CoinFlipGame = () => {
        const [bet, setBet] = useState(10);
        const [choice, setChoice] = useState<'heads' | 'tails'>('heads');
        const [isFlipping, setIsFlipping] = useState(false);

        const mutation = useMutation({
            mutationFn: async () => {
                const res = await api.post('/games/flip', { betAmount: bet, choice });
                return res.data;
            },
            onSuccess: (data) => {
                handleGameComplete(data);
                setIsFlipping(false);
            },
            onError: (err: any) => {
                handleGameError(err);
                setIsFlipping(false);
            }
        });

        const handlePlay = () => {
            if (cooldown > 0) return;
            setIsFlipping(true);
            mutation.mutate();
        };

        return (
            <div className="space-y-6">
                <div className="flex justify-center py-6">
                    <motion.div
                        animate={{ rotateY: isFlipping ? [0, 1800] : 0 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        className="w-24 h-24 rounded-full bg-yellow-500 border-4 border-yellow-300 flex items-center justify-center text-3xl font-bold text-yellow-900 shadow-xl shadow-yellow-500/20"
                    >
                        $
                    </motion.div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                        <label className="text-gray-400 text-sm">Bet Amount</label>
                        <input
                            type="number"
                            value={bet}
                            onChange={(e) => setBet(parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white"
                        />
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm">Pick Side</label>
                        <div className="flex gap-2 mt-1">
                            <button
                                onClick={() => setChoice('heads')}
                                className={`flex-1 py-2 rounded-md transition ${choice === 'heads' ? 'bg-yellow-500 text-black' : 'bg-white/5'}`}
                            >
                                Heads
                            </button>
                            <button
                                onClick={() => setChoice('tails')}
                                className={`flex-1 py-2 rounded-md transition ${choice === 'tails' ? 'bg-yellow-500 text-black' : 'bg-white/5'}`}
                            >
                                Tails
                            </button>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handlePlay}
                    disabled={isFlipping || mutation.isPending || cooldown > 0}
                    className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold text-lg text-black hover:shadow-lg hover:shadow-orange-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {cooldown > 0 ? (
                        <>
                            <Timer className="animate-pulse" /> Wait {cooldown}s
                        </>
                    ) : isFlipping ? 'Flipping...' : 'Flip Coin (1.9x Payout)'}
                </button>
            </div>
        );
    };

    // SLOTS
    const SlotsGame = () => {
        const [bet, setBet] = useState(10);
        const [isSpinning, setIsSpinning] = useState(false);
        const [reels, setReels] = useState(['🍒', '🍒', '🍒']);

        const mutation = useMutation({
            mutationFn: async () => {
                const res = await api.post('/games/slots', { betAmount: bet });
                return res.data;
            },
            onSuccess: (data) => {
                handleGameComplete(data);
                setReels(data.reels);
                setIsSpinning(false);
            },
            onError: (err: any) => {
                handleGameError(err);
                setIsSpinning(false);
            }
        });

        const handlePlay = () => {
            if (cooldown > 0) return;
            setIsSpinning(true);
            setReels(['❓', '❓', '❓']);
            mutation.mutate();
        };

        return (
            <div className="space-y-6">
                <div className="flex justify-center gap-4 py-8 bg-black/30 rounded-2xl border-4 border-yellow-500/50">
                    {reels.map((symbol, i) => (
                        <div key={i} className="w-16 h-20 bg-white rounded-lg flex items-center justify-center text-4xl shadow-inner">
                            <motion.span
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                key={isSpinning ? i : symbol + i} // Force re-render/anim
                            >
                                {isSpinning ? '🎰' : symbol}
                            </motion.span>
                        </div>
                    ))}
                </div>

                <div>
                    <label className="text-gray-400 text-sm">Bet Amount</label>
                    <input
                        type="number"
                        value={bet}
                        onChange={(e) => setBet(parseInt(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white"
                    />
                </div>

                <button
                    onClick={handlePlay}
                    disabled={isSpinning || mutation.isPending || cooldown > 0}
                    className="w-full py-4 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-red-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {cooldown > 0 ? (
                        <>
                            <Timer className="animate-pulse" /> Wait {cooldown}s
                        </>
                    ) : isSpinning ? 'Spinning...' : 'Spin Slots (Max 50x)'}
                </button>
            </div>
        );
    };


    return (
        <div className="min-h-screen bg-theme pb-20 text-white">
            {/* LordCloud Header */}
            <Header />

            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-[-20%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute top-[20%] right-[-20%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[150px]" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 space-y-8">
                <motion.div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Arcade
                    </h1>
                    <p className="text-gray-400">Play games to earn more coins!</p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    {/* Game Cards */}
                    <div
                        onClick={() => setSelectedGame('dice')}
                        className={`cursor-pointer group relative overflow-hidden rounded-2xl border ${selectedGame === 'dice' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-[#0d0620]'} hover:border-purple-500/50 transition-all p-6`}
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition">
                            <Dices size={48} className="text-purple-400" />
                        </div>
                        <h3 className="font-bold text-xl mb-2">Dice Roll</h3>
                        <p className="text-sm text-gray-400">Predict the roll. Win up to 5x!</p>
                    </div>

                    <div
                        onClick={() => setSelectedGame('flip')}
                        className={`cursor-pointer group relative overflow-hidden rounded-2xl border ${selectedGame === 'flip' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10 bg-[#0d0620]'} hover:border-yellow-500/50 transition-all p-6`}
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition">
                            <Coins size={48} className="text-yellow-400" />
                        </div>
                        <h3 className="font-bold text-xl mb-2">Coin Flip</h3>
                        <p className="text-sm text-gray-400">Heads or Tails? Double your money.</p>
                    </div>

                    <div
                        onClick={() => setSelectedGame('slots')}
                        className={`cursor-pointer group relative overflow-hidden rounded-2xl border ${selectedGame === 'slots' ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 bg-[#0d0620]'} hover:border-pink-500/50 transition-all p-6`}
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition">
                            <Gift size={48} className="text-pink-400" />
                        </div>
                        <h3 className="font-bold text-xl mb-2">Slots</h3>
                        <p className="text-sm text-gray-400">Spin to win jackpot prizes!</p>
                    </div>
                </div>

                {/* Game Area */}
                <AnimatePresence mode="wait">
                    {selectedGame && (
                        <motion.div
                            key={selectedGame}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-[#0f0726] border border-white/10 rounded-2xl p-8 max-w-2xl mx-auto shadow-2xl relative overflow-hidden"
                        >
                            {/* Background Glow */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold capitalize">{selectedGame === 'flip' ? 'Coin Flip' : selectedGame === 'dice' ? 'Dice Roll' : 'Slot Machine'}</h2>
                                    <div className="flex items-center gap-4">
                                        {cooldown > 0 && (
                                            <span className="text-yellow-400 text-sm font-mono flex items-center gap-2">
                                                <Timer size={16} />
                                                Cooldown: {cooldown}s
                                            </span>
                                        )}
                                        <button onClick={() => setSelectedGame(null)} className="text-gray-400 hover:text-white">Close</button>
                                    </div>
                                </div>

                                {selectedGame === 'dice' && <DiceGame />}
                                {selectedGame === 'flip' && <CoinFlipGame />}
                                {selectedGame === 'slots' && <SlotsGame />}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!selectedGame && (
                    <div className="text-center py-12 opacity-50">
                        <Trophy size={48} className="mx-auto mb-4 text-gray-600" />
                        <p>Select a game to start playing</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamesPage;
