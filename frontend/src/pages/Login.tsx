import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import api from '../api/client';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const { login, register } = useAuthStore();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Fetch panel settings for branding
    useEffect(() => {
        api.get('/settings').then(res => setSettings(res.data)).catch(() => { });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
                navigate('/');
            } else {
                await register(email, username, password);
                toast.success('Registration successful! Please login.');
                setIsLogin(true);
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Authentication failed';
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="relative min-h-screen flex items-center justify-center overflow-hidden"
            style={{
                backgroundColor: settings?.bgColor || '#0c0229',
                ...(settings?.loginBackgroundImage && {
                    backgroundImage: `url(${settings.loginBackgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                })
            }}
        >
            {/* Dynamic Background - only show if no custom background */}
            {!settings?.loginBackgroundImage && (
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
                </div>
            )}
            {/* Dark overlay for custom background */}
            {settings?.loginBackgroundImage && (
                <div className="absolute inset-0 bg-black/50 z-0" />
            )}

            <div className="relative z-10 w-full max-w-lg p-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-10"
                >
                    {/* Logo and Branding */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            {settings?.panelLogo ? (
                                <img
                                    src={settings.panelLogo}
                                    alt="Logo"
                                    style={{ width: `${settings?.logoSize || 48}px`, height: `${settings?.logoSize || 48}px` }}
                                    className="rounded-xl object-contain"
                                />
                            ) : (
                                <div
                                    style={{ width: `${settings?.logoSize || 48}px`, height: `${settings?.logoSize || 48}px` }}
                                    className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30"
                                >
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h.71C7.37 7.69 9.48 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3s-1.34 3-3 3z" />
                                    </svg>
                                </div>
                            )}
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                {settings?.panelName || 'LordCloud'}
                            </h2>
                        </div>
                        <h1 className="text-2xl font-semibold text-white mb-2">
                            {isLogin ? 'Welcome Back' : 'Create Account'}
                        </h1>
                        <p className="text-gray-400">
                            {isLogin ? 'Access your high-performance servers' : 'Start your free hosting journey today'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-4">
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3 text-gray-500 group-focus-within:text-purple-400 transition" size={20} />
                                <input
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition"
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <AnimatePresence>
                                {!isLogin && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="relative group mb-4">
                                            <User className="absolute left-3 top-3 text-gray-500 group-focus-within:text-purple-400 transition" size={20} />
                                            <input
                                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition"
                                                type="text"
                                                placeholder="Username"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="relative group">
                                <Lock className="absolute left-3 top-3 text-gray-500 group-focus-within:text-purple-400 transition" size={20} />
                                <input
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition"
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {isLogin && (
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/forgot-password')}
                                        className="text-sm text-purple-400 hover:text-purple-300 transition"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transform hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-400 text-sm">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-purple-400 hover:text-purple-300 font-medium transition"
                            >
                                {isLogin ? 'Sign Up' : 'Login'}
                            </button>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
