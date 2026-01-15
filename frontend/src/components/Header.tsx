import { useState } from 'react';
import {
    Coins, LogOut, Server, Clock, Menu,
    Twitter, Instagram, Youtube, Facebook, Github, Globe
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import MobileMenu from './MobileMenu';
import TransactionHistoryModal from './TransactionHistoryModal';
import NotificationCenter from './NotificationCenter';

// Custom Discord Icon Component
const DiscordIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
);

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
        { key: 'discord', icon: DiscordIcon, color: 'text-indigo-400' },
        { key: 'twitter', icon: Twitter, color: 'text-blue-400' },
        { key: 'instagram', icon: Instagram, color: 'text-pink-500' },
        { key: 'youtube', icon: Youtube, color: 'text-red-500' },
        { key: 'facebook', icon: Facebook, color: 'text-blue-600' },
        { key: 'github', icon: Github, color: 'text-gray-400' },
        { key: 'website', icon: Globe, color: 'text-emerald-400' },
    ];

    return (
        <>
            <div className="relative z-40 border-b border-theme-border bg-theme-bg/80 backdrop-blur-xl sticky top-0">
                <div className="w-full px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-3 shrink-0">
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

                        {/* Social Media Icons (Immediately Next to Logo) */}
                        <div className="hidden md:flex items-center gap-3 pl-2 h-10">
                            {socialLinks.map(({ key, icon: Icon, color }) => {
                                const url = social[key];
                                if (!url) return null;
                                return (
                                    <a
                                        key={key}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`p-1.5 rounded-lg hover:bg-white/5 hover:scale-105 transition-all ${color} opacity-70 hover:opacity-100 `}
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

                        <Link to="/games" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition group">
                            <span className="text-xl group-hover:animate-bounce">🎮</span>
                            <span className="font-bold text-sm">Games</span>
                        </Link>

                        <NotificationCenter />

                        <button
                            onClick={() => setIsLogsOpen(true)}
                            className="hidden md:flex items-center gap-3 bg-theme-card border border-theme-border px-4 py-2 rounded-xl backdrop-blur-md hover:bg-theme-card/80 transition cursor-pointer"
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
                                <Link to="/admin" className="px-4 py-2 bg-theme-primary rounded-lg text-sm font-bold hover:opacity-90 transition text-white">
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
