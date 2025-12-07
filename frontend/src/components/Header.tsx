import { Coins, LogOut, Server, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

const Header = () => {
    const { user: authUser, logout } = useAuthStore();

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
    const panelName = settings?.panelName || 'LordCloud';
    const panelLogo = settings?.panelLogo;

    return (
        <div className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
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

                <div className="flex items-center gap-6">
                    <Link to="/afk" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition group">
                        <Clock size={18} className="text-green-400 group-hover:animate-pulse" />
                        <span className="font-bold text-sm">AFK Zone</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                        <div className="bg-yellow-500/20 p-1.5 rounded-full ring-1 ring-yellow-500/30">
                            <Coins size={16} className="text-yellow-400" />
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-400 font-bold tracking-wider uppercase">Balance</div>
                            <div className="font-bold text-white text-lg leading-none">{user?.coins || 0}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pl-6 md:border-l border-white/10">
                        <div className="text-right hidden md:block">
                            <div className="font-bold text-white text-sm">{user?.username}</div>
                            <div className="text-xs text-purple-300 font-medium bg-purple-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5 capitalize border border-purple-500/20">{user?.role}</div>
                        </div>
                        {user?.role === 'admin' && (
                            <Link to="/admin" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-sm font-bold hover:opacity-90 transition">
                                Admin Panel
                            </Link>
                        )}
                        <button onClick={logout} className="p-2.5 hover:bg-red-500/10 hover:text-red-400 rounded-xl text-gray-400 transition">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;
