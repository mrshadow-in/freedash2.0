import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import api, { API_URL } from '../api/client';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    // Fetch settings for branding
    useEffect(() => {
        api.get('/settings').then(res => setSettings(res.data)).catch(() => { });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to send reset email');
            }

            setEmailSent(true);
            toast.success('Password reset link sent to your email!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to send reset email');
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

                    {!emailSent ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Mail className="text-white" size={32} />
                                </div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                                    Forgot Password?
                                </h1>
                                <p className="text-gray-400 text-sm">
                                    No worries! Enter your email and we'll send you reset instructions.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-3 text-gray-500 group-focus-within:text-purple-400 transition" size={20} />
                                    <input
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition"
                                        type="email"
                                        placeholder="Enter your email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transform hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <span>Sending...</span>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Send Reset Link
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <div className="text-green-400 text-4xl">✓</div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">Check Your Email!</h2>
                            <p className="text-gray-400 mb-6">
                                We've sent password reset instructions to <strong className="text-white">{email}</strong>
                            </p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition"
                            >
                                Back to Login
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default ForgotPassword;
