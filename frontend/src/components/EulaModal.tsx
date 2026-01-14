import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Plus } from 'lucide-react';

interface EulaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => void;
    isLoading?: boolean;
}

const EulaModal = ({ isOpen, onClose, onAccept, isLoading = false }: EulaModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className="relative bg-[#130b2e] border border-white/10 w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden"
                    >
                        <div className="p-10">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-yellow-500/20 rounded-2xl">
                                        <AlertCircle className="text-yellow-400" size={28} />
                                    </div>
                                    <h3 className="text-3xl font-extrabold text-white tracking-tight">Minecraft EULA</h3>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-gray-500 hover:text-white transition bg-white/5 p-3 rounded-full hover:bg-white/10"
                                    disabled={isLoading}
                                >
                                    <Plus className="rotate-45" size={24} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
                                    <p className="text-gray-300 leading-relaxed mb-4">
                                        By clicking "I Agree", you are indicating your agreement to be bound by the terms of the{' '}
                                        <a
                                            href="https://www.minecraft.net/en-us/eula"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-400 hover:text-purple-300 underline font-semibold"
                                        >
                                            Minecraft End User License Agreement (EULA)
                                        </a>.
                                    </p>
                                    <p className="text-gray-400 text-sm">
                                        This will create the <code className="bg-white/10 px-2 py-1 rounded text-yellow-300">eula.txt</code> file in your server directory with the value <code className="bg-white/10 px-2 py-1 rounded text-green-300">eula=true</code>.
                                    </p>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-3 text-sm font-bold text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition shadow-lg hover:text-white"
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={onAccept}
                                        disabled={isLoading}
                                        className="flex-[2] py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl text-sm font-extrabold shadow-lg shadow-green-500/25 border border-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.6)' }}
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                ✓ I Agree to EULA
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
    );
};

export default EulaModal;
