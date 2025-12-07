import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import { toast } from 'react-hot-toast';
import { Mail, Lock, Shield, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Account = () => {
    const { user, setUser } = useAuthStore();
    const navigate = useNavigate();

    // Email Update
    const [newEmail, setNewEmail] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);

    // Password Update
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail || !emailPassword) return toast.error('Please fill all fields');

        setEmailLoading(true);
        try {
            await api.put('/auth/update-email', { newEmail, password: emailPassword });
            toast.success('Email updated successfully!');
            setNewEmail('');
            setEmailPassword('');

            // Refresh user data
            const res = await api.get('/auth/me');
            setUser(res.data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update email');
        } finally {
            setEmailLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPassword || !newPassword || !confirmPassword) {
            return toast.error('Please fill all fields');
        }

        if (newPassword !== confirmPassword) {
            return toast.error('New passwords do not match');
        }

        if (newPassword.length < 8) {
            return toast.error('Password must be at least 8 characters');
        }

        setPasswordLoading(true);
        try {
            await api.put('/auth/update-password', { currentPassword, newPassword, confirmPassword });
            toast.success('Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update password');
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0c0229] via-[#1a0b2e] to-[#16213e] text-white">
            {/* Header */}
            <div className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-gray-400 hover:text-white transition"
                    >
                        ← Back to Dashboard
                    </button>
                    <h1 className="text-xl font-bold">
                        <User className="inline mr-2" size={24} />
                        My Account
                    </h1>
                    <div className="w-32"></div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-10">
                {/* Update Email */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Mail className="text-purple-400" size={24} />
                        <h2 className="text-2xl font-bold">Update Email</h2>
                    </div>
                    <form onSubmit={handleUpdateEmail} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Current Email</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">New Email</label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="new@example.com"
                                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={emailPassword}
                                onChange={(e) => setEmailPassword(e.target.value)}
                                placeholder="Your current password"
                                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={emailLoading}
                            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-bold transition disabled:opacity-50"
                        >
                            {emailLoading ? 'Updating...' : 'Update Email'}
                        </button>
                    </form>
                </motion.section>

                {/* Update Password */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Lock className="text-purple-400" size={24} />
                        <h2 className="text-2xl font-bold">Update Password</h2>
                    </div>
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Current Password</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Minimum 8 characters"
                                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Your new password should be at least 8 characters in length and unique to this site.</p>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={passwordLoading}
                            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-bold transition disabled:opacity-50"
                        >
                            {passwordLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </motion.section>

                {/* Two Factor Authentication (Placeholder) */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-8 opacity-50"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Shield className="text-purple-400" size={24} />
                        <h2 className="text-2xl font-bold">Two Factor Authentication</h2>
                    </div>
                    <p className="text-gray-400 mb-4">
                        Two-factor authentication is currently being developed and will be enabled on your account soon.
                    </p>
                    <button
                        disabled
                        className="px-6 py-3 bg-gray-700 rounded-lg font-bold cursor-not-allowed opacity-50"
                    >
                        Coming Soon
                    </button>
                </motion.section>
            </div>
        </div>
    );
};

export default Account;
