import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Package, Search, Download, Save, Loader2, Check, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface MinecraftTabProps {
    server: any;
}

const MinecraftTab = ({ server }: MinecraftTabProps) => {
    const [subTab, setSubTab] = useState<'settings' | 'plugins'>('settings');

    // Properties State
    const [properties, setProperties] = useState<any>({});
    const [loadingProps, setLoadingProps] = useState(false);
    const [savingProps, setSavingProps] = useState(false);

    // Plugins State
    const [searchQuery, setSearchQuery] = useState('');
    const [plugins, setPlugins] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [installing, setInstalling] = useState<string | null>(null);

    // Fetch Properties
    useEffect(() => {
        if (subTab === 'settings') {
            fetchProperties();
        }
    }, [subTab]);

    const fetchProperties = async () => {
        setLoadingProps(true);
        try {
            const { data } = await api.get(`/servers/${server.id}/minecraft/properties`);
            setProperties(data);
        } catch (error) {
            toast.error('Failed to load server.properties');
        } finally {
            setLoadingProps(false);
        }
    };

    const handleSaveProperties = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProps(true);
        try {
            await api.put(`/servers/${server.id}/minecraft/properties`, properties);
            toast.success('Properties saved successfully!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save properties');
        } finally {
            setSavingProps(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setProperties((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSearchPlugins = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const { data } = await api.get(`/servers/${server.id}/minecraft/plugins?q=${encodeURIComponent(searchQuery)}`);
            setPlugins(data);
        } catch (error) {
            toast.error('Failed to search plugins');
        } finally {
            setSearching(false);
        }
    };

    const handleInstallPlugin = async (plugin: any) => {
        setInstalling(plugin.id);
        try {
            await api.post(`/servers/${server.id}/minecraft/plugins/install`, {
                resourceId: plugin.id,
                fileName: `${plugin.name}.jar`
            });
            toast.success(`Started installing ${plugin.name}`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to install plugin');
        } finally {
            setInstalling(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Sub Tabs */}
            <div className="flex gap-4 border-b border-white/10 pb-2">
                <button
                    onClick={() => setSubTab('settings')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${subTab === 'settings' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'}`}
                >
                    <Settings size={18} /> properties
                </button>
                <button
                    onClick={() => setSubTab('plugins')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${subTab === 'plugins' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}
                >
                    <Package size={18} /> Plugins
                </button>
            </div>

            {/* Settings View */}
            {subTab === 'settings' && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Server Properties</h3>

                    {loadingProps ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-500" /></div>
                    ) : (
                        <form onSubmit={handleSaveProperties} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                            {/* Gamemode */}
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Gamemode</label>
                                <select
                                    value={properties['gamemode'] || 'survival'}
                                    onChange={e => handleChange('gamemode', e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                                >
                                    <option value="survival">Survival</option>
                                    <option value="creative">Creative</option>
                                    <option value="adventure">Adventure</option>
                                    <option value="spectator">Spectator</option>
                                </select>
                            </div>

                            {/* Difficulty */}
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Difficulty</label>
                                <select
                                    value={properties['difficulty'] || 'easy'}
                                    onChange={e => handleChange('difficulty', e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                                >
                                    <option value="peaceful">Peaceful</option>
                                    <option value="easy">Easy</option>
                                    <option value="normal">Normal</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>

                            {/* PVP */}
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">PvP</label>
                                <select
                                    value={properties['pvp'] || 'true'}
                                    onChange={e => handleChange('pvp', e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                                >
                                    <option value="true">Enabled</option>
                                    <option value="false">Disabled</option>
                                </select>
                            </div>

                            {/* Whitelist */}
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">White-list</label>
                                <select
                                    value={properties['white-list'] || 'false'}
                                    onChange={e => handleChange('white-list', e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                                >
                                    <option value="true">Enabled</option>
                                    <option value="false">Disabled</option>
                                </select>
                            </div>

                            {/* Max Players */}
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Max Players</label>
                                <input
                                    type="number"
                                    value={properties['max-players'] || '20'}
                                    onChange={e => handleChange('max-players', e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                                />
                            </div>

                            {/* Online Mode */}
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Online Mode</label>
                                <select
                                    value={properties['online-mode'] || 'true'}
                                    onChange={e => handleChange('online-mode', e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                                >
                                    <option value="true">True (Premium)</option>
                                    <option value="false">False (Cracked)</option>
                                </select>
                            </div>

                            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end mt-4">
                                <button
                                    disabled={savingProps}
                                    type="submit"
                                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition font-medium"
                                >
                                    {savingProps ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                                    Save Properties
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* Plugins View */}
            {subTab === 'plugins' && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Plugin Manager (Spigot)</h3>

                    <form onSubmit={handleSearchPlugins} className="flex gap-2 mb-8">
                        <input
                            type="text"
                            placeholder="Search plugins (e.g., Essentials, WorldEdit)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={searching}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition flex items-center gap-2"
                        >
                            {searching ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
                            Search
                        </button>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plugins.map((plugin) => (
                            <div key={plugin.id} className="bg-black/20 border border-white/5 rounded-lg p-4 flex gap-4 hover:border-blue-500/30 transition">
                                {plugin.icon ? (
                                    <img src={plugin.icon} alt={plugin.name} className="w-12 h-12 rounded-lg" />
                                ) : (
                                    <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center">
                                        <Package className="w-6 h-6 text-gray-500" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white truncate">{plugin.name}</h4>
                                    <p className="text-xs text-gray-400 mb-2 truncate">{plugin.tag}</p>
                                    <div className="flex gap-3 text-xs text-gray-500">
                                        <span>❤️ {plugin.likes}</span>
                                        <span>⬇️ {plugin.downloads}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleInstallPlugin(plugin)}
                                    disabled={installing === plugin.id}
                                    className="self-center bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition"
                                    title="Install Plugin"
                                >
                                    {installing === plugin.id ? <Loader2 className="animate-spin w-5 h-5" /> : <Download className="w-5 h-5" />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MinecraftTab;
