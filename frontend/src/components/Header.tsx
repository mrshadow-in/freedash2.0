import { useState } from 'react';
import {
    Coins, LogOut, Server, Clock, Menu,
    Disc, Twitter, Instagram, Youtube, Facebook, Github, Globe
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import MobileMenu from './MobileMenu';
import TransactionHistoryModal from './TransactionHistoryModal';
import NotificationCenter from './NotificationCenter';

const Header = () => {
    const { user: authUser, logout } = useAuthStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLogsOpen, setIsLogsOpen] = useState(false);

    // Fetch fresh user data for real-time balance updates
    const { data: userData } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            const res = await api.get('/auth/me');
            return res.data;
        },
        enabled: !!authUser,
        refetchInterval: 5000
    });

    // Fetch panel settings for branding (public endpoint)
    const { data: settings } = useQuery({
        queryKey: ['panelSettings'],
        queryFn: async () => {
            const res = await api.get('/settings');
            return res.data;
        },
        staleTime: 0,
        refetchOnMount: true
    });

    const user = userData || authUser;
    const panelName = settings?.panelName || 'Panel';
    const panelLogo = settings?.panelLogo;
    const social = settings?.socialMedia || {};

    const socialLinks = [
        { key: 'discord', icon: Disc, color: 'text-indigo-400' },
        { key: 'twitter', icon: Twitter, color: 'text-blue-400' },
        { key: 'instagram', icon: Instagram, color: 'text-pink-500' },
        { key: 'youtube', icon: Youtube, color: 'text-red-500' },
        { key: 'facebook', icon: Facebook, color: 'text-blue-600' },
        { key: 'github', icon: Github, color: 'text-gray-400' },
        { key: 'website', icon: Globe, color: 'text-emerald-400' },
    ];

    return (
        <>
            <div className="relative z-40 border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link to="/" className="flex items-center gap-3">
                            {panelLogo ? (
                                <img
                                    src={panelLogo}
                                    alt={panelName}
                                    className="w-10 h-10 rounded-xl object-cover shadow-lg"
                                />
                            ) : (
                                <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                                    <Server className="text-white" size={20} />
                                </div>
                            )}
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                                {panelName}
                            </h1>
                        </Link>

                        {/* Social Media Icons (Next to Logo) */}
                        <div className="hidden md:flex items-center gap-3 border-l border-white/10 pl-6 h-8">
                            {socialLinks.map(({ key, icon: Icon, color }) => {
                                const url = social[key];
                                if (!url) return null;
                                return (
                                    <a
                                        key={key}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`hover:scale-110 transition-transform ${color} opacity-70 hover:opacity-100`}
                                    >
                                        <Icon size={20} />
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-6">
                        {/* AFK Zone - Always visible on desktop, moved to menu on mobile but let's keep it here for accessibility if room */}
                        <Link to="/afk" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition group">
                            <Clock size={18} className="text-green-400 group-hover:animate-pulse" />
                            <span className="font-bold text-sm">AFK Zone</span>
                        </Link>

                        <NotificationCenter />

                        <button
                            onClick={() => setIsLogsOpen(true)}
                            className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md hover:bg-white/10 transition cursor-pointer"
                            title="View Transaction History"
                        >
                            <div className="bg-yellow-500/20 p-1.5 rounded-full ring-1 ring-yellow-500/30">
                                <Coins size={16} className="text-yellow-400" />
                            </div>
                            <div className="text-left">
                                <div className="text-[10px] text-gray-400 font-bold tracking-wider uppercase">Balance</div>
                                <div className="font-bold text-white text-lg leading-none">{user?.coins || 0}</div>
                            </div>
                        </button>

                        {/* Desktop User Section */}
                        <div className="hidden lg:flex items-center gap-4 pl-6 border-l border-white/10">
                            <div className="text-right">
                                <div className="font-bold text-white text-sm">{user?.username}</div>
                                <div className="text-xs text-purple-300 font-medium bg-purple-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5 capitalize border border-purple-500/20">{user?.role}</div>
                            </div>
                            {user?.role === 'admin' && (
                                <Link to="/admin" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-sm font-bold hover:opacity-90 transition">
                                    Admin Panel
                                </Link>
                            )}
                            <Link to="/account" className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-sm font-bold transition">
                                Account
                            </Link>
                            <button onClick={logout} className="p-2.5 hover:bg-red-500/10 hover:text-red-400 rounded-xl text-gray-400 transition">
                                <LogOut size={20} />
                            </button>
                        </div>

                        {/* Mobile Toggle */}
                        <div className="flex lg:hidden items-center gap-3">
                            <div className="flex sm:hidden items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md">
                                <Coins size={14} className="text-yellow-400" />
                                <span className="font-bold text-white text-sm">{user?.coins || 0}</span>
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="p-2 hover:bg-white/5 rounded-xl text-gray-400 transition"
                            >
                                <Menu size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <MobileMenu
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                user={user}
                logout={logout}
            />

            <TransactionHistoryModal
                isOpen={isLogsOpen}
                onClose={() => setIsLogsOpen(false)}
            />
        </>
    );
};

export default Header;
