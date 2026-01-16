import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api/client';

const DiscordCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setUser } = useAuthStore();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const state = searchParams.get('state');

            if (!code || !state) {
                setStatus('error');
                setError('Invalid Discord callback');
                setTimeout(() => navigate('/login'), 3000);
                return;
            }

            try {
                const res = await api.get(`/auth/oauth/discord/callback?code=${code}&state=${state}`);

                // Store auth data in localStorage
                localStorage.setItem('accessToken', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));

                // Update store
                setUser(res.data.user);

                setStatus('success');
                setTimeout(() => navigate('/'), 1500);
            } catch (err: any) {
                setStatus('error');
                setError(err.response?.data?.message || 'Authentication failed');
                setTimeout(() => navigate('/login'), 3000);
            }
        };

        handleCallback();
    }, [searchParams, navigate, setUser]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0c0229]">
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4"
            >
                <div className="text-center">
                    {status === 'loading' && (
                        <>
                            <Loader2 className="w-16 h-16 mx-auto text-purple-400 animate-spin mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Authenticating with Discord</h2>
                            <p className="text-gray-400">Please wait...</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Login Successful!</h2>
                            <p className="text-gray-400">Redirecting to dashboard...</p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <AlertCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Authentication Failed</h2>
                            <p className="text-gray-400">{error || 'Something went wrong'}</p>
                            <p className="text-gray-500 text-sm mt-2">Redirecting to login...</p>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default DiscordCallback;
