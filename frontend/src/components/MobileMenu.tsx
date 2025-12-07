import { X, LogOut, User, Coins, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SocialLinks from './SocialLinks';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    logout: () => void;
}

const MobileMenu = ({ isOpen, onClose, user, logout }: MobileMenuProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    />

                    {/* Menu */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'tween', duration: 0.3 }}
                        className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-gradient-to-br from-[#1a0b2e] to-[#16213e] border-l border-white/10 z-50 overflow-y-auto lg:hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Menu</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-lg transition"
                            >
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        {/* User Info */}
                        <div className="p-6 border-b border-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                                    <User size={24} className="text-white" />
                                </div>
                                <div>
                                    <div className="font-bold text-white">{user?.username}</div>
                                    <div className="text-xs text-purple-300 font-medium bg-purple-500/10 px-2 py-0.5 rounded-full inline-block capitalize border border-purple-500/20">
                                        {user?.role}
                                    </div>
                                </div>
                            </div>

                            {/* Balance */}
                            <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="bg-yellow-500/20 p-2 rounded-full ring-1 ring-yellow-500/30">
                                        <Coins size={20} className="text-yellow-400" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 font-bold tracking-wider uppercase">Balance</div>
                                        <div className="font-bold text-white text-xl">{user?.coins || 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <div className="p-6 space-y-3">
                            {user?.role === 'admin' && (
                                <a
                                    href="/admin"
                                    className="flex items-center gap-3 w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg text-white font-bold transition"
                                    onClick={onClose}
                                >
                                    <Shield size={20} />
                                    Admin Panel
                                </a>
                            )}

                            <a
                                href="/account"
                                className="flex items-center gap-3 w-full px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-white font-bold transition"
                                onClick={onClose}
                            >
                                <User size={20} />
                                My Account
                            </a>

                            <button
                                onClick={() => {
                                    logout();
                                    onClose();
                                }}
                                className="flex items-center gap-3 w-full px-4 py-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-lg text-red-400 font-bold transition"
                            >
                                <LogOut size={20} />
                                Logout
                            </button>
                        </div>

                        {/* Social Links */}
                        <div className="p-6 border-t border-white/10">
                            <div className="mb-3 text-sm text-gray-400 font-medium">Connect with us</div>
                            <SocialLinks />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MobileMenu;
