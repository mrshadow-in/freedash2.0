import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, Check } from 'lucide-react';
import api, { API_URL } from '../api/client';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    // Fetch settings for branding
    useEffect(() => {
        api.get('/settings').then(res => setSettings(res.data)).catch(() => { });
    }, []);

    useEffect(() => {
        if (!token) {
            toast.error('Invalid reset link');
            navigate('/login');
        }
    }, [token, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to reset password');
            }

            setIsSuccess(true);
            toast.success('Password reset successfully!');

            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error: any) {
            toast.error(error.message || 'Failed to reset password');
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

            <div className="relative z-10 w-full max-w-md p-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8"
                >
                    {/* Back Button */}
                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6"
                    >
                        <ArrowLeft size={20} />
                        <span className="text-sm">Back to Login</span>
                    </button>

                    {!isSuccess ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Lock className="text-white" size={32} />
                                </div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                                    Reset Password
                                </h1>
                                <p className="text-gray-400 text-sm">
                                    Enter your new password below
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 text-gray-500 group-focus-within:text-purple-400 transition" size={20} />
                                    <input
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition"
                                        type="password"
                                        placeholder="New Password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 text-gray-500 group-focus-within:text-purple-400 transition" size={20} />
                                    <input
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition"
                                        type="password"
                                        placeholder="Confirm Password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transform hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="text-green-400" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">Password Reset Successfully!</h2>
                            <p className="text-gray-400 mb-6">
                                Redirecting you to login...
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default ResetPassword;
