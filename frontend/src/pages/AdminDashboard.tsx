import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [activeTab, setActiveTab] = useState('settings');
    const [settings, setSettings] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [servers, setServers] = useState<any[]>([]);
    const [codes, setCodes] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch settings
    const fetchSettings = async () => {
        try {
            const { data } = await api.get('/admin/settings');
            setSettings(data);
        } catch (error) {
            console.error('Failed to fetch settings');
        }
    };

    // Fetch users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/users');
            setUsers(data.users || []);
        } catch (error) {
            toast.error('Failed to fetch users');
        }
        setLoading(false);
    };

    // Fetch servers
    const fetchServers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/servers');
            setServers(data.servers || []);
        } catch (error) {
            toast.error('Failed to fetch servers');
        }
        setLoading(false);
    };

    // Fetch codes
    const fetchCodes = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/redeem-codes');
            setCodes(data || []);
        } catch (error) {
            toast.error('Failed to fetch codes');
        }
        setLoading(false);
    };

    // Fetch plans
    const fetchPlans = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/servers/plans');
            setPlans(data || []);
        } catch (error) {
            toast.error('Failed to fetch plans');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (activeTab === 'settings') fetchSettings();
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'servers') fetchServers();
        if (activeTab === 'codes') fetchCodes();
        if (activeTab === 'plans') fetchPlans();
    }, [activeTab]);

    return (
        <div className="min-h-screen bg-theme text-white">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            {/* Header */}
            <div className="relative z-10 bg-white/5 backdrop-blur-md border-b border-white/10">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                            Admin Panel
                        </h1>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-400">Welcome, {user?.username}</span>
                            <button
                                onClick={() => navigate('/')}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                            >
                                Back to Dashboard
                            </button>
                            <button
                                onClick={logout}
                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="relative z-10 bg-white/5 backdrop-blur-md border-b border-white/10">
                <div className="container mx-auto px-6">
                    <div className="flex gap-2">
                        {['settings', 'users', 'servers', 'plans', 'codes', 'customize', 'bot', 'social'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 capitalize transition ${activeTab === tab
                                    ? 'border-b-2 border-purple-500 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 container mx-auto px-6 py-8">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
                >
                    {activeTab === 'settings' && <SettingsTab settings={settings} setSettings={setSettings} />}
                    {activeTab === 'users' && <UsersTab users={users} fetchUsers={fetchUsers} loading={loading} />}
                    {activeTab === 'servers' && <ServersTab servers={servers} fetchServers={fetchServers} loading={loading} />}
                    {activeTab === 'plans' && <PlansTab plans={plans} fetchPlans={fetchPlans} loading={loading} />}
                    {activeTab === 'codes' && <CodesTab codes={codes} fetchCodes={fetchCodes} loading={loading} />}
                    {activeTab === 'customize' && <CustomizeTab />}
                    {activeTab === 'bot' && <BotTab settings={settings} fetchSettings={fetchSettings} />}
                    {activeTab === 'social' && <SocialTab settings={settings} fetchSettings={fetchSettings} />}
                </motion.div>
            </div>
        </div>
    );
};

// Settings Tab
const SettingsTab = ({ settings, setSettings, fetchSettings }: any) => {
    const [showTestEmailModal, setShowTestEmailModal] = useState(false);
    const [testEmailAddress, setTestEmailAddress] = useState('');

    const [formData, setFormData] = useState({
        panelName: '',
        panelLogo: '',
        afkEnabled: true,
        coinsPerMinute: 1,
        maxCoinsPerDay: 100,
        ramPerGB: 100,
        diskPerGB: 50,
        cpuPerCore: 20,
        pteroApiUrl: '',
        pteroApiKey: '',
        pteroClientApiKey: '',
        pteroEggId: 0,
        pteroNestId: 0,
        pteroLocationId: 0,
        backgroundImage: '',
        loginBackgroundImage: '',
        logoSize: 48,
        bgColor: '#0c0229',
        webhook: '',
        smtpHost: '',
        smtpPort: 587,
        smtpSecure: false,
        smtpUsername: '',
        smtpPassword: '',
        smtpFromEmail: '',
        smtpFromName: 'LordCloud'
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                panelName: settings.panelName || '',
                panelLogo: settings.panelLogo || '',
                backgroundImage: settings.backgroundImage || '',
                loginBackgroundImage: settings.loginBackgroundImage || '',
                logoSize: settings.logoSize || 48,
                bgColor: settings.bgColor || '#0c0229',
                afkEnabled: settings.afk?.enabled ?? true,
                coinsPerMinute: settings.afk?.coinsPerMinute || 1,
                maxCoinsPerDay: settings.afk?.maxCoinsPerDay || 100,
                ramPerGB: settings.upgradePricing?.ramPerGB || 100,
                diskPerGB: settings.upgradePricing?.diskPerGB || 50,
                cpuPerCore: settings.upgradePricing?.cpuPerCore || 20,
                pteroApiUrl: settings.pterodactyl?.apiUrl || '',
                pteroApiKey: settings.pterodactyl?.apiKey || '',
                pteroClientApiKey: settings.pterodactyl?.clientApiKey || '',
                pteroEggId: settings.pterodactyl?.defaultEggId || 0,
                pteroNestId: settings.pterodactyl?.defaultNestId || 0,
                pteroLocationId: settings.pterodactyl?.defaultLocationId || 0,
                smtpHost: settings.smtp?.host || '',
                smtpPort: settings.smtp?.port || 587,
                smtpSecure: settings.smtp?.secure || false,
                smtpUsername: settings.smtp?.username || '',
                smtpPassword: settings.smtp?.password || '',
                smtpFromEmail: settings.smtp?.fromEmail || '',
                smtpFromName: settings.smtp?.fromName || 'LordCloud',
                webhook: ''
            });
        }
    }, [settings]);

    const saveSettings = async (type: string) => {
        try {
            if (type === 'panel') {
                await api.put('/admin/settings/panel', {
                    panelName: formData.panelName,
                    panelLogo: formData.panelLogo,
                    backgroundImage: formData.backgroundImage,
                    loginBackgroundImage: formData.loginBackgroundImage,
                    logoSize: formData.logoSize,
                    bgColor: formData.bgColor
                });
            } else if (type === 'afk') {
                await api.put('/admin/settings/afk', {
                    enabled: formData.afkEnabled,
                    coinsPerMinute: formData.coinsPerMinute,
                    maxCoinsPerDay: formData.maxCoinsPerDay
                });
            } else if (type === 'pricing') {
                await api.put('/admin/settings/pricing', {
                    ramPerGB: formData.ramPerGB,
                    diskPerGB: formData.diskPerGB,
                    cpuPerCore: formData.cpuPerCore
                });
            } else if (type === 'pterodactyl') {
                await api.put('/admin/settings/pterodactyl', {
                    apiUrl: formData.pteroApiUrl,
                    apiKey: formData.pteroApiKey,
                    clientApiKey: formData.pteroClientApiKey,
                    defaultEggId: formData.pteroEggId,
                    defaultNestId: formData.pteroNestId,
                    defaultLocationId: formData.pteroLocationId
                });
            } else if (type === 'smtp') {
                await api.put('/admin/settings/smtp', {
                    host: formData.smtpHost,
                    port: formData.smtpPort,
                    secure: formData.smtpSecure,
                    username: formData.smtpUsername,
                    password: formData.smtpPassword,
                    fromEmail: formData.smtpFromEmail,
                    fromName: formData.smtpFromName
                });
            }
            toast.success('Settings saved!');
        } catch (error: any) {
            console.error('Save settings error:', error);
            toast.error(error.response?.data?.message || 'Failed to save settings');
        }
    };

    const addWebhook = async () => {
        try {
            await api.post('/admin/settings/webhooks', { url: formData.webhook });
            toast.success('Webhook added!');
            setFormData({ ...formData, webhook: '' });
        } catch (error) {
            toast.error('Failed to add webhook');
        }
    };

    return (
        <div className="space-y-6">


            {/* AFK Settings */}
            <div className="border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">AFK System</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.afkEnabled}
                            onChange={(e) => setFormData({ ...formData, afkEnabled: e.target.checked })}
                            className="w-5 h-5"
                        />
                        <label>Enable AFK System</label>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Coins Per Minute</label>
                        <input
                            type="number"
                            value={formData.coinsPerMinute}
                            onChange={(e) => setFormData({ ...formData, coinsPerMinute: parseInt(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Max Coins Per Day</label>
                        <input
                            type="number"
                            value={formData.maxCoinsPerDay}
                            onChange={(e) => setFormData({ ...formData, maxCoinsPerDay: parseInt(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                        />
                    </div>
                    <button
                        onClick={() => saveSettings('afk')}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition"
                    >
                        Save AFK Settings
                    </button>
                </div>
            </div>

            {/* SMTP Email Configuration */}
            <div className="border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">📧 SMTP Email Configuration</h3>
                <p className="text-sm text-gray-400 mb-4">Configure your email server to send emails from the panel</p>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">SMTP Host</label>
                            <input
                                type="text"
                                value={formData.smtpHost || ''}
                                onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">SMTP Port</label>
                            <input
                                type="number"
                                value={formData.smtpPort || 587}
                                onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.smtpSecure || false}
                            onChange={(e) => setFormData({ ...formData, smtpSecure: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <label className="text-sm text-gray-400">Use SSL/TLS (port 465)</label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Username (Email)</label>
                            <input
                                type="text"
                                value={formData.smtpUsername || ''}
                                onChange={(e) => setFormData({ ...formData, smtpUsername: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                placeholder="your-email@gmail.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Password</label>
                            <input
                                type="password"
                                value={formData.smtpPassword || ''}
                                onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                placeholder="App password for Gmail"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">From Email</label>
                            <input
                                type="email"
                                value={formData.smtpFromEmail || ''}
                                onChange={(e) => setFormData({ ...formData, smtpFromEmail: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                placeholder="no-reply@yourdomain.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">From Name</label>
                            <input
                                type="text"
                                value={formData.smtpFromName || 'LordCloud'}
                                onChange={(e) => setFormData({ ...formData, smtpFromName: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                placeholder="LordCloud"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => saveSettings('smtp')}
                            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition"
                        >
                            Save SMTP Settings
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    await api.post('/admin/settings/smtp/test');
                                    toast.success('SMTP connection successful!');
                                } catch (error: any) {
                                    toast.error(error.response?.data?.message || 'Connection failed');
                                }
                            }}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
                        >
                            Test Connection
                        </button>
                        <button
                            onClick={() => setShowTestEmailModal(true)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                        >
                            Send Test Email
                        </button>
                    </div>
                </div>

                {/* Test Email Modal */}
                {showTestEmailModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-[#1a0b2e] border border-white/10 rounded-2xl p-6 w-full max-w-md">
                            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">📧 Send Test Email</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        value={testEmailAddress}
                                        onChange={(e) => setTestEmailAddress(e.target.value)}
                                        placeholder="your-email@example.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={async () => {
                                        if (!testEmailAddress) {
                                            toast.error('Please enter an email address');
                                            return;
                                        }
                                        try {
                                            await api.post('/admin/settings/smtp/send-test', { testEmail: testEmailAddress });
                                            toast.success('Test email sent! Check your inbox.');
                                            setShowTestEmailModal(false);
                                            setTestEmailAddress('');
                                        } catch (error: any) {
                                            toast.error(error.response?.data?.message || 'Failed to send');
                                        }
                                    }}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg hover:opacity-90 transition"
                                >
                                    Send Email
                                </button>
                                <button
                                    onClick={() => {
                                        setShowTestEmailModal(false);
                                        setTestEmailAddress('');
                                    }}
                                    className="flex-1 px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Upgrade Pricing */}
            <div className="border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Upgrade Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">RAM (per GB)</label>
                        <input
                            type="number"
                            value={formData.ramPerGB}
                            onChange={(e) => setFormData({ ...formData, ramPerGB: parseInt(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Disk (per GB)</label>
                        <input
                            type="number"
                            value={formData.diskPerGB}
                            onChange={(e) => setFormData({ ...formData, diskPerGB: parseInt(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">CPU (per Core)</label>
                        <input
                            type="number"
                            value={formData.cpuPerCore}
                            onChange={(e) => setFormData({ ...formData, cpuPerCore: parseInt(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                        />
                    </div>
                </div>
                <button
                    onClick={() => saveSettings('pricing')}
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition"
                >
                    Save Pricing
                </button>
            </div>

            {/* Pterodactyl Configuration */}
            <div className="border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Pterodactyl Configuration</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Panel API URL</label>
                        <input
                            type="text"
                            value={formData.pteroApiUrl}
                            onChange={(e) => setFormData({ ...formData, pteroApiUrl: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            placeholder="https://panel.xitenodes.ovh"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">API Key</label>
                        <input
                            type="password"
                            value={formData.pteroApiKey}
                            onChange={(e) => setFormData({ ...formData, pteroApiKey: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm"
                            placeholder="ptla_..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Client API Key (Start/Stop)</label>
                        <input
                            type="password"
                            value={formData.pteroClientApiKey}
                            onChange={(e) => setFormData({ ...formData, pteroClientApiKey: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm"
                            placeholder="ptlc_..."
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Default Egg ID</label>
                            <input
                                type="number"
                                value={formData.pteroEggId}
                                onChange={(e) => setFormData({ ...formData, pteroEggId: parseInt(e.target.value) || 0 })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                placeholder="2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Default Nest ID</label>
                            <input
                                type="number"
                                value={formData.pteroNestId}
                                onChange={(e) => setFormData({ ...formData, pteroNestId: parseInt(e.target.value) || 0 })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                placeholder="1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Default Location ID</label>
                            <input
                                type="number"
                                value={formData.pteroLocationId}
                                onChange={(e) => setFormData({ ...formData, pteroLocationId: parseInt(e.target.value) || 0 })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                placeholder="1"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={async () => {
                                if (!formData.pteroApiUrl || !formData.pteroApiKey) {
                                    toast.error('Please enter API URL and API Key');
                                    return;
                                }
                                toast.loading('Testing connection...');
                                try {
                                    const { data } = await api.post('/admin/settings/pterodactyl/test', {
                                        apiUrl: formData.pteroApiUrl,
                                        apiKey: formData.pteroApiKey
                                    });
                                    toast.dismiss();
                                    if (data.success) {
                                        toast.success(data.message + ` (${data.data?.userCount || 0} users found)`);
                                    }
                                } catch (error: any) {
                                    toast.dismiss();
                                    toast.error(error.response?.data?.message || 'Test failed');
                                }
                            }}
                            className="px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg transition"
                        >
                            Test Connection
                        </button>
                        <button
                            onClick={() => saveSettings('pterodactyl')}
                            className="flex-1 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition"
                        >
                            Save Pterodactyl Settings
                        </button>
                    </div>
                </div>
            </div>

            {/* Webhooks */}
            <div className="border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Discord Webhooks</h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={formData.webhook}
                        onChange={(e) => setFormData({ ...formData, webhook: e.target.value })}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                        placeholder="https://discord.com/api/webhooks/..."
                    />
                    <button
                        onClick={addWebhook}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition"
                    >
                        Add Webhook
                    </button>
                </div>
                <div className="mt-4 space-y-2">
                    {settings?.discordWebhooks?.map((webhook: string, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                            <span className="text-sm truncate">{webhook}</span>
                            <button className="text-red-400 hover:text-red-300">Remove</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Users Tab
const UsersTab = ({ users, fetchUsers, loading }: any) => {
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showGiveCoins, setShowGiveCoins] = useState<string | null>(null);
    const [showEditUser, setShowEditUser] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
        password: '',
        coins: 0,
        role: 'user'
    });
    const [coinAmount, setCoinAmount] = useState(0);

    const createUser = async () => {
        try {
            await api.post('/admin/users', newUser);
            toast.success('User created successfully!');
            setShowCreateUser(false);
            setNewUser({ username: '', email: '', password: '', coins: 0, role: 'user' });
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create user');
        }
    };

    const openEditModal = (user: any) => {
        setEditingUser({
            _id: user._id,
            username: user.username,
            email: user.email,
            password: '',
            coins: user.coins,
            role: user.role
        });
        setShowEditUser(true);
    };

    const updateUser = async () => {
        try {
            const updateData: any = {
                email: editingUser.email,
                coins: editingUser.coins,
                role: editingUser.role
            };

            // Only include password if it's been changed
            if (editingUser.password && editingUser.password.trim() !== '') {
                updateData.password = editingUser.password;
            }

            await api.put(`/admin/users/${editingUser._id}`, updateData);
            toast.success('User updated successfully!');
            setShowEditUser(false);
            setEditingUser(null);
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update user');
        }
    };

    const giveCoins = async (userId: string) => {
        try {
            await api.put(`/admin/users/${userId}/coins`, { coins: coinAmount });
            toast.success('Coins updated!');
            setShowGiveCoins(null);
            fetchUsers();
        } catch (error) {
            toast.error('Failed to update coins');
        }
    };

    const changeRole = async (userId: string, newRole: string) => {
        try {
            await api.put(`/admin/users/${userId}/role`, { role: newRole });
            toast.success('Role updated!');
            fetchUsers();
        } catch (error) {
            toast.error('Failed to update role');
        }
    };

    const banUser = async (userId: string) => {
        try {
            await api.post(`/admin/users/${userId}/ban`);
            toast.success('User banned');
            fetchUsers();
        } catch (error) {
            toast.error('Failed to ban user');
        }
    };

    const unbanUser = async (userId: string) => {
        try {
            await api.post(`/admin/users/${userId}/unban`);
            toast.success('User unbanned');
            fetchUsers();
        } catch (error) {
            toast.error('Failed to unban user');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">User Management</h3>
                <button
                    onClick={() => setShowCreateUser(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition"
                >
                    + Add User
                </button>
            </div>

            {/* Create User Modal */}
            {showCreateUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a0b2e] border border-white/10 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Create New User</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Username</label>
                                <input
                                    type="text"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    placeholder="johndoe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Password</label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Initial Coins</label>
                                <input
                                    type="number"
                                    value={newUser.coins}
                                    onChange={(e) => setNewUser({ ...newUser, coins: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Role</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                >
                                    <option value="user">User</option>
                                    <option value="mod">Moderator</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowCreateUser(false)}
                                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createUser}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition"
                            >
                                Create User
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Give Coins Modal */}
            {showGiveCoins && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a0b2e] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-bold mb-4">Give Coins</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Amount</label>
                                <input
                                    type="number"
                                    value={coinAmount}
                                    onChange={(e) => setCoinAmount(parseInt(e.target.value) || 0)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    placeholder="Enter coin amount"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowGiveCoins(null)}
                                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    giveCoins(showGiveCoins);
                                }}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition"
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-white/10">
                            <tr>
                                <th className="text-left p-3">Username</th>
                                <th className="text-left p-3">Email</th>
                                <th className="text-left p-3">Coins</th>
                                <th className="text-left p-3">Role</th>
                                <th className="text-left p-3">Status</th>
                                <th className="text-left p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user: any) => (
                                <tr key={user._id} className="border-b border-white/5">
                                    <td className="p-3">{user.username}</td>
                                    <td className="p-3">{user.email}</td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <span>{user.coins}</span>
                                            <button
                                                onClick={() => {
                                                    setCoinAmount(user.coins);
                                                    setShowGiveCoins(user._id);
                                                }}
                                                className="px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-xs transition"
                                                title="Give Coins"
                                            >
                                                💰
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <select
                                            value={user.role}
                                            onChange={(e) => changeRole(user._id, e.target.value)}
                                            className={`px-2 py-1 rounded text-xs bg-white/10 border border-white/20 ${user.role === 'admin' ? 'text-purple-400' :
                                                user.role === 'mod' ? 'text-blue-400' : 'text-gray-400'
                                                }`}
                                        >
                                            <option value="user">User</option>
                                            <option value="mod">Mod</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="p-3">
                                        {user.isBanned ? (
                                            <span className="text-red-400">Banned</span>
                                        ) : (
                                            <span className="text-green-400">Active</span>
                                        )}
                                    </td>
                                    <td className="p-3 space-x-2">
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded text-sm"
                                        >
                                            Edit
                                        </button>
                                        {user.isBanned ? (
                                            <button
                                                onClick={() => unbanUser(user._id)}
                                                className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 rounded text-sm"
                                            >
                                                Unban
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => banUser(user._id)}
                                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-sm"
                                            >
                                                Ban
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditUser && editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a0b2e] border border-white/10 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Edit User</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Username (Read-only)</label>
                                <input
                                    type="text"
                                    value={editingUser.username}
                                    disabled
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-gray-500 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={editingUser.email}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">New Password (leave blank to keep current)</label>
                                <input
                                    type="password"
                                    value={editingUser.password}
                                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Coins</label>
                                <input
                                    type="number"
                                    value={editingUser.coins}
                                    onChange={(e) => setEditingUser({ ...editingUser, coins: parseInt(e.target.value) })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Role</label>
                                <select
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                >
                                    <option value="user">User</option>
                                    <option value="mod">Moderator</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={updateUser}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition"
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => {
                                    setShowEditUser(false);
                                    setEditingUser(null);
                                }}
                                className="flex-1 px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Servers Tab
const ServersTab = ({ servers, fetchServers, loading }: any) => {
    const navigate = useNavigate();
    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; serverId: string; serverName: string }>({ show: false, serverId: '', serverName: '' });

    const suspendServer = async (serverId: string) => {
        try {
            await api.post(`/admin/servers/${serverId}/suspend`);
            toast.success('Server suspended');
            fetchServers();
        } catch (error) {
            toast.error('Failed to suspend server');
        }
    };

    const unsuspendServer = async (serverId: string) => {
        try {
            await api.post(`/admin/servers/${serverId}/unsuspend`);
            toast.success('Server unsuspended');
            fetchServers();
        } catch (error) {
            toast.error('Failed to unsuspend server');
        }
    };

    const deleteServer = async (serverId: string) => {
        try {
            await api.delete(`/admin/servers/${serverId}`);
            toast.success('Server deleted');
            fetchServers();
            setDeleteConfirm({ show: false, serverId: '', serverName: '' });
        } catch (error) {
            toast.error('Failed to delete server');
        }
    };

    // Separate servers into active and suspended
    const activeServers = servers.filter((s: any) => s.status === 'active' && !s.isSuspended);
    const suspendedServers = servers.filter((s: any) => s.status === 'suspended' || s.isSuspended);

    const ServerTable = ({ servers: serverList, showActions = true }: any) => (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="border-b border-white/10">
                    <tr>
                        <th className="text-left p-3">Server Name</th>
                        <th className="text-left p-3">Owner</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Created</th>
                        {showActions && <th className="text-left p-3">Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {serverList.length === 0 ? (
                        <tr>
                            <td colSpan={showActions ? 5 : 4} className="p-4 text-center text-gray-400">
                                No servers found
                            </td>
                        </tr>
                    ) : (
                        serverList.map((server: any) => (
                            <tr key={server._id} className="border-b border-white/5">
                                <td className="p-3">{server.name}</td>
                                <td className="p-3">{server.ownerId?.username || 'Unknown'}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs ${server.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                        server.status === 'suspended' || server.isSuspended ? 'bg-red-500/20 text-red-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {server.isSuspended ? 'suspended' : server.status}
                                    </span>
                                </td>
                                <td className="p-3">{new Date(server.createdAt).toLocaleDateString()}</td>
                                {showActions && (
                                    <td className="p-3 space-x-2">
                                        {server.status === 'active' && !server.isSuspended ? (
                                            <>
                                                <button
                                                    onClick={() => navigate(`/server/${server._id}`)}
                                                    className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded text-sm transition"
                                                >
                                                    Access
                                                </button>
                                                <button
                                                    onClick={() => suspendServer(server._id)}
                                                    className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-sm transition"
                                                >
                                                    Suspend
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm({ show: true, serverId: server._id, serverName: server.name })}
                                                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-sm transition"
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => navigate(`/server/${server._id}`)}
                                                    className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded text-sm transition"
                                                >
                                                    Access
                                                </button>
                                                <button
                                                    onClick={() => unsuspendServer(server._id)}
                                                    className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 rounded text-sm transition"
                                                >
                                                    Unsuspend
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm({ show: true, serverId: server._id, serverName: server.name })}
                                                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-sm transition"
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="space-y-8">
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-8 bg-gradient-to-b from-green-500 to-green-600 rounded"></div>
                    <h3 className="text-xl font-bold">Active Servers</h3>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
                        {activeServers.length}
                    </span>
                </div>
                {loading ? (
                    <p className="text-gray-400">Loading...</p>
                ) : (
                    <ServerTable servers={activeServers} />
                )}
            </div>

            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded"></div>
                    <h3 className="text-xl font-bold">Suspended Servers</h3>
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm">
                        {suspendedServers.length}
                    </span>
                </div>
                {loading ? (
                    <p className="text-gray-400">Loading...</p>
                ) : (
                    <ServerTable servers={suspendedServers} />
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.show}
                onClose={() => setDeleteConfirm({ show: false, serverId: '', serverName: '' })}
                onConfirm={() => deleteServer(deleteConfirm.serverId)}
                title="Delete Server?"
                message={`Are you sure you want to delete the server "${deleteConfirm.serverName}"? This action cannot be undone and all data will be permanently lost.`}
                confirmText="Delete Server"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

// Plans Tab
const PlansTab = ({ plans, fetchPlans, loading }: any) => {
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; planId: string; planName: string }>({ show: false, planId: '', planName: '' });
    const [newPlan, setNewPlan] = useState({
        name: '',
        ramMb: 1024,
        diskMb: 5120,
        cpuPercent: 100,
        priceCoins: 100,
        pteroEggId: 0,
        pteroNestId: 0,
        eggImage: ''
    });

    const createPlan = async () => {
        try {
            await api.post('/admin/plans', newPlan);
            toast.success('Plan created!');
            setShowCreate(false);
            setNewPlan({
                name: '',
                ramMb: 1024,
                diskMb: 5120,
                cpuPercent: 100,
                priceCoins: 100,
                pteroEggId: 0,
                pteroNestId: 0,
                eggImage: ''
            });
            fetchPlans();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create plan');
        }
    };

    const openEdit = (plan: any) => {
        setEditingPlan({ ...plan });
        setShowEdit(true);
    };

    const updatePlan = async () => {
        if (!editingPlan) return;
        try {
            await api.put(`/admin/plans/${editingPlan._id}`, editingPlan);
            toast.success('Plan updated!');
            setShowEdit(false);
            setEditingPlan(null);
            fetchPlans();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update plan');
        }
    };

    const deletePlan = async (id: string) => {
        try {
            await api.delete(`/admin/plans/${id}`);
            toast.success('Plan deleted');
            fetchPlans();
            setDeleteConfirm({ show: false, planId: '', planName: '' });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete plan');
        }
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Plan Management</h3>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg"
                >
                    Create Plan
                </button>
            </div>

            {showCreate && (
                <div className="mb-6 p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Plan Name</label>
                            <input
                                type="text"
                                placeholder="Basic Tier"
                                value={newPlan.name}
                                onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Price (Coins/mo)</label>
                            <input
                                type="number"
                                placeholder="100"
                                value={newPlan.priceCoins}
                                onChange={(e) => setNewPlan({ ...newPlan, priceCoins: parseInt(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">RAM (MB)</label>
                            <input
                                type="number"
                                placeholder="1024"
                                value={newPlan.ramMb}
                                onChange={(e) => setNewPlan({ ...newPlan, ramMb: parseInt(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Disk (MB)</label>
                            <input
                                type="number"
                                placeholder="5120"
                                value={newPlan.diskMb}
                                onChange={(e) => setNewPlan({ ...newPlan, diskMb: parseInt(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">CPU (%)</label>
                            <input
                                type="number"
                                placeholder="100"
                                value={newPlan.cpuPercent}
                                onChange={(e) => setNewPlan({ ...newPlan, cpuPercent: parseInt(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Pterodactyl Egg ID</label>
                            <input
                                type="number"
                                placeholder="0 (Use Default)"
                                value={newPlan.pteroEggId}
                                onChange={(e) => setNewPlan({ ...newPlan, pteroEggId: parseInt(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Pterodactyl Nest ID</label>
                            <input
                                type="number"
                                placeholder="0 (Use Default)"
                                value={newPlan.pteroNestId}
                                onChange={(e) => setNewPlan({ ...newPlan, pteroNestId: parseInt(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                        </div>
                    </div>

                    {/* Egg Image URL */}
                    <div className="border-t border-white/10 pt-4">
                        <label className="block text-sm text-gray-400 mb-2">🖼️ Card Image URL (Optional)</label>
                        <input
                            type="text"
                            placeholder="https://example.com/minecraft.png"
                            value={newPlan.eggImage}
                            onChange={(e) => setNewPlan({ ...newPlan, eggImage: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">This image will appear as background on server cards using this plan</p>
                        {newPlan.eggImage && (
                            <div className="mt-2 flex items-center gap-2">
                                <img src={newPlan.eggImage} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-white/10" />
                                <span className="text-xs text-green-400">Preview</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={createPlan}
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg"
                    >
                        Create Plan
                    </button>
                </div>
            )}

            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="space-y-2">
                    {plans.map((plan: any) => (
                        <div key={plan._id} className="p-4 bg-white/5 border border-white/10 rounded-lg flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                {plan.eggImage && (
                                    <img src={plan.eggImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                )}
                                <div>
                                    <p className="font-bold text-lg">{plan.name}</p>
                                    <p className="text-sm text-gray-400 space-x-2">
                                        <span>{plan.ramMb}MB RAM</span>
                                        <span>•</span>
                                        <span>{plan.diskMb}MB Disk</span>
                                        <span>•</span>
                                        <span>{plan.cpuPercent}% CPU</span>
                                        <span>•</span>
                                        <span className="text-purple-400">{plan.priceCoins} Coins</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openEdit(plan)}
                                    className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm transition"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm({ show: true, planId: plan._id, planName: plan.name })}
                                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {plans.length === 0 && (
                        <p className="text-gray-400 text-center py-4">No plans found. Create one to get started.</p>
                    )}
                </div>
            )}

            {/* Edit Modal */}
            {showEdit && editingPlan && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1b26] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">Edit Plan: {editingPlan.name}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Plan Name</label>
                                <input
                                    type="text"
                                    value={editingPlan.name}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">RAM (MB)</label>
                                    <input
                                        type="number"
                                        value={editingPlan.ramMb}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, ramMb: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Disk (MB)</label>
                                    <input
                                        type="number"
                                        value={editingPlan.diskMb}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, diskMb: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">CPU (%)</label>
                                    <input
                                        type="number"
                                        value={editingPlan.cpuPercent}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, cpuPercent: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Price (Coins)</label>
                                    <input
                                        type="number"
                                        value={editingPlan.priceCoins}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, priceCoins: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Egg ID</label>
                                    <input
                                        type="number"
                                        value={editingPlan.pteroEggId}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, pteroEggId: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Nest ID</label>
                                    <input
                                        type="number"
                                        value={editingPlan.pteroNestId}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, pteroNestId: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">🖼️ Card Image URL</label>
                                <input
                                    type="text"
                                    value={editingPlan.eggImage || ''}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, eggImage: e.target.value })}
                                    placeholder="https://example.com/image.png"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                />
                                {editingPlan.eggImage && (
                                    <img src={editingPlan.eggImage} alt="Preview" className="mt-2 w-20 h-20 object-cover rounded-lg" />
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowEdit(false); setEditingPlan(null); }}
                                className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={updatePlan}
                                className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-bold"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.show}
                onClose={() => setDeleteConfirm({ show: false, planId: '', planName: '' })}
                onConfirm={() => deletePlan(deleteConfirm.planId)}
                title="Delete Plan?"
                message={`Are you sure you want to delete the plan "${deleteConfirm.planName}"? All servers using this plan will be affected. This action cannot be undone.`}
                confirmText="Delete Plan"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

// Codes Tab
const CodesTab = ({ codes, fetchCodes, loading }: any) => {
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingCode, setEditingCode] = useState<any>(null);
    const [newCode, setNewCode] = useState({ code: '', amount: 100, maxUses: 1, expiresAt: '' });

    const createCode = async () => {
        try {
            await api.post('/admin/redeem-codes', newCode);
            toast.success('Code created!');
            setShowCreate(false);
            setNewCode({ code: '', amount: 100, maxUses: 1, expiresAt: '' });
            fetchCodes();
        } catch (error) {
            toast.error('Failed to create code');
        }
    };

    const openEditModal = (code: any) => {
        setEditingCode({
            _id: code._id,
            code: code.code,
            amount: code.amount,
            maxUses: code.maxUses
        });
        setShowEdit(true);
    };

    const updateCode = async () => {
        try {
            await api.put(`/admin/redeem-codes/${editingCode._id}`, {
                code: editingCode.code,
                amount: editingCode.amount,
                maxUses: editingCode.maxUses
            });
            toast.success('Code updated!');
            setShowEdit(false);
            setEditingCode(null);
            fetchCodes();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update code');
        }
    };

    const deleteCode = async (codeId: string) => {
        if (!window.confirm('Delete this code?')) return;
        try {
            await api.delete(`/admin/redeem-codes/${codeId}`);
            toast.success('Code deleted!');
            fetchCodes();
        } catch (error) {
            toast.error('Failed to delete code');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Redeem Codes</h3>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg"
                >
                    Create Code
                </button>
            </div>

            {showCreate && (
                <div className="mb-6 p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
                    <input
                        type="text"
                        placeholder="Code"
                        value={newCode.code}
                        onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2"
                    />
                    <input
                        type="number"
                        placeholder="Amount"
                        value={newCode.amount}
                        onChange={(e) => setNewCode({ ...newCode, amount: parseInt(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2"
                    />
                    <input
                        type="number"
                        placeholder="Max Uses"
                        value={newCode.maxUses}
                        onChange={(e) => setNewCode({ ...newCode, maxUses: parseInt(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2"
                    />
                    <button
                        onClick={createCode}
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg"
                    >
                        Create
                    </button>
                </div>
            )}

            {/* Edit Modal */}
            {showEdit && editingCode && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-900 p-6 rounded-xl border border-white/10 w-full max-w-md space-y-4">
                        <h3 className="text-xl font-bold">Edit Redeem Code</h3>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Code Name</label>
                            <input
                                type="text"
                                value={editingCode.code}
                                onChange={(e) => setEditingCode({ ...editingCode, code: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Coins Amount</label>
                            <input
                                type="number"
                                value={editingCode.amount}
                                onChange={(e) => setEditingCode({ ...editingCode, amount: parseInt(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Max Uses</label>
                            <input
                                type="number"
                                value={editingCode.maxUses}
                                onChange={(e) => setEditingCode({ ...editingCode, maxUses: parseInt(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={updateCode}
                                className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg"
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => {
                                    setShowEdit(false);
                                    setEditingCode(null);
                                }}
                                className="flex-1 py-2 bg-white/5 rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="space-y-2">
                    {codes.map((code: any) => (
                        <div key={code._id} className="p-4 bg-white/5 border border-white/10 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-mono font-bold">{code.code}</p>
                                <p className="text-sm text-gray-400">
                                    {code.amount} coins • {code.usedCount}/{code.maxUses || '∞'} uses
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openEditModal(code)}
                                    className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded text-sm"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => deleteCode(code._id)}
                                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Customize Tab - Theme Customization
const CustomizeTab = () => {
    const [theme, setTheme] = useState({
        bgColor: '#0c0229',
        primaryColor: '#7c3aed',
        secondaryColor: '#3b82f6',
        cardBgColor: 'rgba(255,255,255,0.05)',
        textColor: '#ffffff',
        borderColor: 'rgba(255,255,255,0.1)',
        gradientStart: '#7c3aed',
        gradientEnd: '#3b82f6'
    });

    const [panelSettings, setPanelSettings] = useState({
        panelName: '',
        panelLogo: '',
        logoSize: 48,
        backgroundImage: '',
        loginBackgroundImage: ''
    });
    const [saving, setSaving] = useState(false);

    // Preset themes
    const presets = [
        { name: 'Dark Purple', bgColor: '#0c0229', primaryColor: '#7c3aed', secondaryColor: '#3b82f6', gradientStart: '#7c3aed', gradientEnd: '#3b82f6' },
        { name: 'Ocean Blue', bgColor: '#0f172a', primaryColor: '#0ea5e9', secondaryColor: '#06b6d4', gradientStart: '#0ea5e9', gradientEnd: '#06b6d4' },
        { name: 'Midnight', bgColor: '#030712', primaryColor: '#6366f1', secondaryColor: '#8b5cf6', gradientStart: '#6366f1', gradientEnd: '#8b5cf6' },
        { name: 'Forest Green', bgColor: '#052e16', primaryColor: '#22c55e', secondaryColor: '#10b981', gradientStart: '#22c55e', gradientEnd: '#10b981' },
        { name: 'Sunset Orange', bgColor: '#1c1917', primaryColor: '#f97316', secondaryColor: '#eab308', gradientStart: '#f97316', gradientEnd: '#eab308' },
        { name: 'Rose Pink', bgColor: '#1a0a1a', primaryColor: '#ec4899', secondaryColor: '#f472b6', gradientStart: '#ec4899', gradientEnd: '#f472b6' }
    ];

    useEffect(() => {
        // Fetch current theme
        api.get('/settings').then(res => {
            if (res.data) {
                setPanelSettings({
                    panelName: res.data.panelName || '',
                    panelLogo: res.data.panelLogo || '',
                    logoSize: res.data.logoSize || 48,
                    backgroundImage: res.data.backgroundImage || '',
                    loginBackgroundImage: res.data.loginBackgroundImage || ''
                });
                setTheme({
                    bgColor: res.data.bgColor || '#0c0229',
                    primaryColor: res.data.theme?.primaryColor || '#7c3aed',
                    secondaryColor: res.data.theme?.secondaryColor || '#3b82f6',
                    cardBgColor: res.data.theme?.cardBgColor || 'rgba(255,255,255,0.05)',
                    textColor: res.data.theme?.textColor || '#ffffff',
                    borderColor: res.data.theme?.borderColor || 'rgba(255,255,255,0.1)',
                    gradientStart: res.data.theme?.gradientStart || '#7c3aed',
                    gradientEnd: res.data.theme?.gradientEnd || '#3b82f6'
                });
            }
        }).catch(() => { });
    }, []);

    const applyPreset = (preset: any) => {
        setTheme({
            ...theme,
            bgColor: preset.bgColor,
            primaryColor: preset.primaryColor,
            secondaryColor: preset.secondaryColor,
            gradientStart: preset.gradientStart,
            gradientEnd: preset.gradientEnd
        });
    };

    const saveTheme = async () => {
        setSaving(true);
        try {
            await api.put('/admin/settings/theme', {
                bgColor: theme.bgColor,
                primaryColor: theme.primaryColor,
                secondaryColor: theme.secondaryColor,
                cardBgColor: theme.cardBgColor,
                textColor: theme.textColor,
                borderColor: theme.borderColor,
                gradientStart: theme.gradientStart,
                gradientEnd: theme.gradientEnd
            });
            toast.success('Theme saved! Refresh to see changes.');
        } catch (err: any) {
            console.error('Theme save error:', err);
            toast.error(err?.response?.data?.message || 'Failed to save theme');
        } finally {
            setSaving(false);
        }
    };

    const savePanelSettings = async () => {
        setSaving(true);
        try {
            await api.put('/admin/settings/panel', panelSettings);
            toast.success('Panel settings saved!');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold">Customize Panel</h2>

            {/* Panel Configuration */}
            <div className="border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Panel Configuration</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Panel Name</label>
                        <input
                            type="text"
                            value={panelSettings.panelName}
                            onChange={(e) => setPanelSettings({ ...panelSettings, panelName: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            placeholder="LordCloud"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Panel Logo URL</label>
                        <input
                            type="text"
                            value={panelSettings.panelLogo}
                            onChange={(e) => setPanelSettings({ ...panelSettings, panelLogo: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            placeholder="https://example.com/logo.png"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Logo Size (px)</label>
                        <input
                            type="number"
                            value={panelSettings.logoSize}
                            onChange={(e) => setPanelSettings({ ...panelSettings, logoSize: parseInt(e.target.value) || 48 })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Background Image URL</label>
                        <input
                            type="text"
                            value={panelSettings.backgroundImage}
                            onChange={(e) => setPanelSettings({ ...panelSettings, backgroundImage: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            placeholder="Optional"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Login Background Image URL</label>
                        <input
                            type="text"
                            value={panelSettings.loginBackgroundImage}
                            onChange={(e) => setPanelSettings({ ...panelSettings, loginBackgroundImage: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            placeholder="Optional"
                        />
                    </div>
                    <button
                        onClick={savePanelSettings}
                        disabled={saving}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                    >
                        Save Panel Configuration
                    </button>
                </div>
            </div>

            {/* Preset Themes */}
            <div className="border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Quick Presets</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {presets.map((preset) => (
                        <button
                            key={preset.name}
                            onClick={() => applyPreset(preset)}
                            className="p-4 rounded-xl border border-white/10 hover:border-white/30 transition text-center"
                            style={{ backgroundColor: preset.bgColor }}
                        >
                            <div
                                className="w-8 h-8 rounded-full mx-auto mb-2"
                                style={{ background: `linear-gradient(135deg, ${preset.primaryColor}, ${preset.secondaryColor})` }}
                            />
                            <span className="text-sm text-white">{preset.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Color Pickers */}
            <div className="border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Custom Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Background Color */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Background Color</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={theme.bgColor}
                                onChange={(e) => setTheme({ ...theme, bgColor: e.target.value })}
                                className="w-12 h-10 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={theme.bgColor}
                                onChange={(e) => setTheme({ ...theme, bgColor: e.target.value })}
                                className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm"
                            />
                        </div>
                    </div>
                    {/* Primary Color */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Primary Color</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={theme.primaryColor}
                                onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                                className="w-12 h-10 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={theme.primaryColor}
                                onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                                className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm"
                            />
                        </div>
                    </div>
                    {/* Secondary Color */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Secondary Color</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={theme.secondaryColor}
                                onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                                className="w-12 h-10 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={theme.secondaryColor}
                                onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                                className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm"
                            />
                        </div>
                    </div>
                    {/* Gradient Start */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Gradient Start</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={theme.gradientStart}
                                onChange={(e) => setTheme({ ...theme, gradientStart: e.target.value })}
                                className="w-12 h-10 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={theme.gradientStart}
                                onChange={(e) => setTheme({ ...theme, gradientStart: e.target.value })}
                                className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm"
                            />
                        </div>
                    </div>
                    {/* Gradient End */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Gradient End</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={theme.gradientEnd}
                                onChange={(e) => setTheme({ ...theme, gradientEnd: e.target.value })}
                                className="w-12 h-10 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={theme.gradientEnd}
                                onChange={(e) => setTheme({ ...theme, gradientEnd: e.target.value })}
                                className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm"
                            />
                        </div>
                    </div>
                    {/* Text Color */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Text Color</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={theme.textColor}
                                onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                                className="w-12 h-10 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={theme.textColor}
                                onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                                className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Preview */}
            <div className="border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Live Preview</h3>
                <div
                    className="rounded-xl p-6 border"
                    style={{
                        backgroundColor: theme.bgColor,
                        borderColor: theme.borderColor
                    }}
                >
                    <div
                        className="rounded-lg p-4 mb-4"
                        style={{ backgroundColor: theme.cardBgColor, borderColor: theme.borderColor, border: '1px solid' }}
                    >
                        <h4
                            className="font-bold mb-2"
                            style={{
                                background: `linear-gradient(to right, ${theme.gradientStart}, ${theme.gradientEnd})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}
                        >
                            Sample Card Title
                        </h4>
                        <p style={{ color: theme.textColor }}>This is how your panel will look with these colors.</p>
                    </div>
                    <button
                        className="px-6 py-2 rounded-lg text-white font-medium"
                        style={{ background: `linear-gradient(to right, ${theme.gradientStart}, ${theme.gradientEnd})` }}
                    >
                        Sample Button
                    </button>
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={saveTheme}
                disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50"
            >
                {saving ? 'Saving...' : 'Save Theme'}
            </button>
        </div>
    );
};

export default AdminDashboard;

const BotTab = ({ settings, fetchSettings }: any) => {
    const [rewards, setRewards] = useState<{ invites: number, coins: number }[]>([]);
    const [boostRewards, setBoostRewards] = useState<{ boosts: number, coins: number }[]>([]);
    const [apiKey, setApiKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [newInvites, setNewInvites] = useState(5);
    const [newCoins, setNewCoins] = useState(100);
    const [newBoosts, setNewBoosts] = useState(1);
    const [newBoostCoins, setNewBoostCoins] = useState(500);
    const [botStatus, setBotStatus] = useState<{ running: boolean, user: string | null }>({ running: false, user: null });

    const [discordConfig, setDiscordConfig] = useState({
        token: '',
        guildId: '',
        enabled: false,
        inviteChannelId: '',
        boostChannelId: ''
    });

    useEffect(() => {
        if (settings) {
            setApiKey(settings.botApiKey || '');
            setRewards(settings.inviteRewards || []);
            setBoostRewards(settings.boostRewards || []);
            if (settings.discordBot) {
                setDiscordConfig({
                    token: settings.discordBot.token || '',
                    guildId: settings.discordBot.guildId || '',
                    enabled: settings.discordBot.enabled || false,
                    inviteChannelId: settings.discordBot.inviteChannelId || '',
                    boostChannelId: settings.discordBot.boostChannelId || ''
                });
            }
        }
        fetchBotStatus();
    }, [settings]);

    const fetchBotStatus = async () => {
        try {
            const res = await api.get('/admin/settings/bot/status');
            setBotStatus(res.data);
        } catch (error) {
            console.error('Failed to fetch bot status');
        }
    };

    const regenerateKey = async () => {
        if (!confirm('Are you sure? This will invalidate the old key.')) return;
        try {
            const res = await api.post('/admin/settings/bot/key');
            setApiKey(res.data.apiKey);
            fetchSettings();
            toast.success('Bot key regenerated');
        } catch (error) {
            toast.error('Failed to regenerate key');
        }
    };

    const addReward = () => {
        if (newInvites <= 0 || newCoins <= 0) return toast.error('Invalid values');
        if (rewards.find(r => r.invites === newInvites)) return toast.error('Reward for this invite count already exists');
        setRewards([...rewards, { invites: newInvites, coins: newCoins }]);
        setNewInvites(5);
        setNewCoins(100);
    };

    const addBoostReward = () => {
        if (newBoosts <= 0 || newBoostCoins <= 0) return toast.error('Invalid values');
        if (boostRewards.find(r => r.boosts === newBoosts)) return toast.error('Reward for this boost count already exists');
        setBoostRewards([...boostRewards, { boosts: newBoosts, coins: newBoostCoins }]);
        setNewBoosts(1);
        setNewBoostCoins(500);
    };

    const removeReward = (invites: number) => {
        setRewards(rewards.filter(r => r.invites !== invites));
    };

    const removeBoostReward = (boosts: number) => {
        setBoostRewards(boostRewards.filter(r => r.boosts !== boosts));
    };

    const saveAll = async () => {
        setSaving(true);
        try {
            await api.put('/admin/settings/bot', {
                inviteRewards: rewards,
                boostRewards: boostRewards,
                discordBot: discordConfig
            });
            toast.success('Bot configuration saved!');
            fetchSettings();
            fetchBotStatus();
        } catch (error) {
            toast.error('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const toggleBot = async (action: 'start' | 'stop') => {
        try {
            await api.post('/admin/settings/bot/toggle', { action });
            toast.success(`Bot ${action}ed!`);
            fetchBotStatus();
        } catch (error) {
            toast.error(`Failed to ${action} bot`);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">🤖 Discord Bot Configuration</h2>

            {/* Bot Status */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold mb-2">Bot Status</h3>
                        <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${botStatus.running ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            <span className="text-gray-300">
                                {botStatus.running ? `Online as ${botStatus.user}` : 'Offline'}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => toggleBot('start')}
                            disabled={botStatus.running}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50"
                        >
                            Start Bot
                        </button>
                        <button
                            onClick={() => toggleBot('stop')}
                            disabled={!botStatus.running}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                        >
                            Stop Bot
                        </button>
                    </div>
                </div>
            </div>

            {/* Discord Configuration */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">⚙️ Discord Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Bot Token</label>
                        <input
                            type="password"
                            value={discordConfig.token}
                            onChange={e => setDiscordConfig({ ...discordConfig, token: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            placeholder="Your bot token from Discord Developer Portal"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Guild (Server) ID</label>
                        <input
                            type="text"
                            value={discordConfig.guildId}
                            onChange={e => setDiscordConfig({ ...discordConfig, guildId: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            placeholder="Your Discord server ID"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Invite Log Channel ID (Optional)</label>
                        <input
                            type="text"
                            value={discordConfig.inviteChannelId}
                            onChange={e => setDiscordConfig({ ...discordConfig, inviteChannelId: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            placeholder="Channel ID to log invites"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Boost Log Channel ID (Optional)</label>
                        <input
                            type="text"
                            value={discordConfig.boostChannelId}
                            onChange={e => setDiscordConfig({ ...discordConfig, boostChannelId: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            placeholder="Channel ID to log boosts"
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={discordConfig.enabled}
                            onChange={e => setDiscordConfig({ ...discordConfig, enabled: e.target.checked })}
                            className="w-5 h-5 rounded"
                        />
                        <span className="text-white">Enable Discord Bot</span>
                    </label>
                </div>
            </div>

            {/* API Key Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">🔑 Bot API Key (For External Bots)</h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        readOnly
                        value={apiKey || 'No key generated'}
                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 font-mono text-sm text-gray-300"
                    />
                    <button
                        onClick={() => { navigator.clipboard.writeText(apiKey); toast.success('Copied!'); }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                    >
                        Copy
                    </button>
                    <button
                        onClick={regenerateKey}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition text-red-400"
                    >
                        Regenerate
                    </button>
                </div>
            </div>

            {/* Invite Rewards Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">🏆 Invite Rewards</h3>
                <div className="flex gap-4 mb-6 items-end flex-wrap">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Invites Required</label>
                        <input
                            type="number"
                            value={newInvites}
                            onChange={e => setNewInvites(parseInt(e.target.value))}
                            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white w-32"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Coins Reward</label>
                        <input
                            type="number"
                            value={newCoins}
                            onChange={e => setNewCoins(parseInt(e.target.value))}
                            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white w-32"
                        />
                    </div>
                    <button onClick={addReward} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition">
                        Add Tier
                    </button>
                </div>
                <div className="space-y-2">
                    {rewards.sort((a, b) => a.invites - b.invites).map((reward, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                            <div>
                                <span className="font-bold text-lg text-purple-400">{reward.invites} Invites</span>
                                <span className="mx-3 text-gray-600">→</span>
                                <span className="font-bold text-yellow-400">{reward.coins} Coins</span>
                            </div>
                            <button onClick={() => removeReward(reward.invites)} className="text-red-400 hover:text-red-300">
                                Remove
                            </button>
                        </div>
                    ))}
                    {rewards.length === 0 && <p className="text-gray-500 text-center py-4">No invite rewards configured.</p>}
                </div>
            </div>

            {/* Boost Rewards Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">🚀 Boost Rewards</h3>
                <div className="flex gap-4 mb-6 items-end flex-wrap">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Boosts Required</label>
                        <input
                            type="number"
                            value={newBoosts}
                            onChange={e => setNewBoosts(parseInt(e.target.value))}
                            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white w-32"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Coins Reward</label>
                        <input
                            type="number"
                            value={newBoostCoins}
                            onChange={e => setNewBoostCoins(parseInt(e.target.value))}
                            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white w-32"
                        />
                    </div>
                    <button onClick={addBoostReward} className="px-6 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg transition">
                        Add Tier
                    </button>
                </div>
                <div className="space-y-2">
                    {boostRewards.sort((a, b) => a.boosts - b.boosts).map((reward, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                            <div>
                                <span className="font-bold text-lg text-pink-400">{reward.boosts} Boost{reward.boosts > 1 ? 's' : ''}</span>
                                <span className="mx-3 text-gray-600">→</span>
                                <span className="font-bold text-yellow-400">{reward.coins} Coins</span>
                            </div>
                            <button onClick={() => removeBoostReward(reward.boosts)} className="text-red-400 hover:text-red-300">
                                Remove
                            </button>
                        </div>
                    ))}
                    {boostRewards.length === 0 && <p className="text-gray-500 text-center py-4">No boost rewards configured.</p>}
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={saveAll}
                disabled={saving}
                className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl font-bold text-lg transition disabled:opacity-50"
            >
                {saving ? 'Saving...' : '💾 Save All Configuration'}
            </button>
        </div>
    );
};

// Social Media Tab
const SocialTab = ({ settings, fetchSettings }: any) => {
    const [socialMedia, setSocialMedia] = useState({
        discord: '',
        instagram: '',
        twitter: '',
        facebook: '',
        youtube: '',
        github: '',
        website: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (settings?.socialMedia) {
            setSocialMedia({
                discord: settings.socialMedia.discord || '',
                instagram: settings.socialMedia.instagram || '',
                twitter: settings.socialMedia.twitter || '',
                facebook: settings.socialMedia.facebook || '',
                youtube: settings.socialMedia.youtube || '',
                github: settings.socialMedia.github || '',
                website: settings.socialMedia.website || ''
            });
        }
    }, [settings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/admin/settings/social-media', socialMedia);
            toast.success('Social media links updated successfully!');
            fetchSettings();
        } catch (error) {
            toast.error('Failed to update social media links');
        } finally {
            setSaving(false);
        }
    };

    const socialPlatforms = [
        { key: 'discord', label: 'Discord', icon: '💬', placeholder: 'https://discord.gg/your-invite' },
        { key: 'instagram', label: 'Instagram', icon: '📷', placeholder: 'https://instagram.com/your-handle' },
        { key: 'twitter', label: 'Twitter / X', icon: '🐦', placeholder: 'https://twitter.com/your-handle' },
        { key: 'facebook', label: 'Facebook', icon: '👥', placeholder: 'https://facebook.com/your-page' },
        { key: 'youtube', label: 'YouTube', icon: '▶️', placeholder: 'https://youtube.com/@your-channel' },
        { key: 'github', label: 'GitHub', icon: '⚙️', placeholder: 'https://github.com/your-username' },
        { key: 'website', label: 'Website', icon: '🌐', placeholder: 'https://your-website.com' }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        📱 Social Media Links
                    </h2>
                    <p className="text-gray-400 mt-1">Configure your social media links that will appear on the dashboard</p>
                </div>
            </div>

            {/* Social Media Links Form */}
            <div className="space-y-4">
                {socialPlatforms.map((platform) => (
                    <div key={platform.key} className="bg-white/5 rounded-xl p-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <span className="text-xl mr-2">{platform.icon}</span>
                            {platform.label}
                        </label>
                        <input
                            type="url"
                            value={socialMedia[platform.key as keyof typeof socialMedia]}
                            onChange={(e) => setSocialMedia({ ...socialMedia, [platform.key]: e.target.value })}
                            placeholder={platform.placeholder}
                            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-500"
                        />
                    </div>
                ))}
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl font-bold text-lg transition disabled:opacity-50"
            >
                {saving ? 'Saving...' : '💾 Save Social Media Links'}
            </button>
        </div>
    );
};
