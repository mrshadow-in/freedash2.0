import { useState, useEffect } from 'react';
import { Settings, Package, Search, Download, Loader2, Trash2, RefreshCw, Zap } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface MinecraftTabProps {
    server: any;
}

// Popular plugins to show by default
const POPULAR_PLUGINS = [
    { id: '9089', name: 'Essentials', author: 'EssentialsX Team', downloads: '50M+', description: 'Essential commands and features' },
    { id: '13224', name: 'WorldEdit', author: 'sk89q', downloads: '30M+', description: 'In-game map editor' },
    { id: '34315', name: 'Vault', author: 'MilkBowl', downloads: '25M+', description: 'Economy & Permissions API' },
    { id: '19254', name: 'LuckPerms', author: 'Luck', downloads: '20M+', description: 'Permissions plugin' },
    { id: '274', name: 'WorldGuard', author: 'sk89q', downloads: '18M+', description: 'Region protection' },
];

// Fallback versions if API fails
const FALLBACK_VERSIONS = [
    '1.21.1', '1.21', '1.20.6', '1.20.4', '1.20.2', '1.20.1',
    '1.19.4', '1.19.3', '1.19.2', '1.18.2', '1.17.1', '1.16.5'
];

const MinecraftTab = ({ server }: MinecraftTabProps) => {
    const [subTab, setSubTab] = useState<'settings' | 'plugins' | 'version'>('plugins');

    // Properties State
    const [properties, setProperties] = useState<any>({});
    const [loadingProps, setLoadingProps] = useState(false);
    const [savingProps, setSavingProps] = useState(false);

    // Plugins State
    const [searchQuery, setSearchQuery] = useState('');
    const [plugins, setPlugins] = useState<any[]>(POPULAR_PLUGINS);
    const [searching, setSearching] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState('latest');

    // Version Changer State
    const [selectedPaperVersion, setSelectedPaperVersion] = useState('');
    const [provider, setProvider] = useState('spigot');

    // Fetch Minecraft versions from API
    const { data: minecraftVersions = FALLBACK_VERSIONS } = useQuery({
        queryKey: ['minecraft-versions'],
        queryFn: async () => {
            const res = await api.get(`/servers/${server.id}/minecraft/versions`);
            return res.data;
        },
        staleTime: 3600000 // Cache for 1 hour
    });

    // Fetch Paper versions from API
    const { data: paperVersions = FALLBACK_VERSIONS } = useQuery({
        queryKey: ['paper-versions'],
        queryFn: async () => {
            const res = await api.get(`/servers/${server.id}/minecraft/paper-versions`);
            return res.data;
        },
        staleTime: 3600000 // Cache for 1 hour
    });

    // Fetch installed plugins
    const { data: installedPlugins = [], refetch: refetchInstalled } = useQuery({
        queryKey: ['installed-plugins', server.id],
        queryFn: async () => {
            const res = await api.get(`/servers/${server.id}/minecraft/plugins/installed`);
            return res.data;
        },
        refetchInterval: 10000 // Refresh every 10 seconds
    });

    // Install plugin mutation
    const installMutation = useMutation({
        mutationFn: async ({ plugin, version }: { plugin: any; version: string }) => {
            return api.post(`/servers/${server.id}/minecraft/plugins/install`, {
                resourceId: plugin.id,
                fileName: `${plugin.name}.jar`,
                version,
                provider: plugin.provider || 'spigot'
            });
        },
        onSuccess: (_, variables) => {
            toast.success(`Installing ${variables.plugin.name}... Check installed plugins in 5-10 seconds.`);
            setTimeout(() => refetchInstalled(), 5000);
        },
        onError: (error: any) => {
            console.error('Plugin install error:', error);
            const message = error.response?.data?.message || 'Failed to install plugin. Check server logs.';
            toast.error(message);
        }
    });

    // Delete plugin mutation
    const deleteMutation = useMutation({
        mutationFn: async (filename: string) => {
            return api.delete(`/servers/${server.id}/minecraft/plugins/${filename}`);
        },
        onSuccess: () => {
            toast.success('Plugin deleted');
            refetchInstalled();
        },
        onError: () => {
            toast.error('Failed to delete plugin');
        }
    });

    // Change version mutation (with automatic server management)
    const changeVersionMutation = useMutation({
        mutationFn: async (version: string) => {
            toast.loading('Updating version & triggering reinstall...', { id: 'version-change' });
            // Backend update variable and trigger reinstall
            await api.post(`/servers/${server.id}/minecraft/version`, { version });

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 2000));
            return { version };
        },
        onSuccess: (data) => {
            toast.success(`Reinstallation started for ${data.version}! Server will restart automatically.`, {
                id: 'version-change',
                duration: 5000
            });
            window.location.reload();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to change version', {
                id: 'version-change'
            });
        }
    });

    const handleChangeVersion = () => {
        if (!selectedPaperVersion) {
            toast.error('Please select a version');
            return;
        }

        // Confirmation dialog
        const confirmed = window.confirm(
            `⚠️ Reinstall Server to ${selectedPaperVersion}?\n\n` +
            `This will:\n` +
            `1. Update MINECRAFT_VERSION variable\n` +
            `2. Automatically REINSTALL the server\n` +
            `3. Download the new version JAR via Pterodactyl\n\n` +
            `Note: Reinstalling stops the server and runs the installer. Plugins/World should be safe, but a backup is recommended.\n\n` +
            `Continue?`
        );

        if (confirmed) {
            changeVersionMutation.mutate(selectedPaperVersion);
        }
    };

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
        if (!searchQuery.trim()) {
            setPlugins(POPULAR_PLUGINS);
            return;
        }

        setSearching(true);
        try {
            const { data } = await api.get(`/servers/${server.id}/minecraft/plugins?q=${encodeURIComponent(searchQuery)}&provider=${provider}`);
            setPlugins(data);
        } catch (error) {
            toast.error('Failed to search plugins');
        } finally {
            setSearching(false);
        }
    };

    const handleInstallPlugin = (plugin: any) => {
        if (!selectedVersion) {
            toast.error('Please select a version');
            return;
        }
        installMutation.mutate({ plugin, version: selectedVersion });
    };

    return (
        <div className="space-y-6">
            {/* Sub Tabs */}
            <div className="flex gap-4 border-b border-white/10 pb-2">
                <button
                    onClick={() => setSubTab('plugins')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${subTab === 'plugins' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'}`}
                >
                    <Package size={18} /> Plugins
                </button>
                <button
                    onClick={() => setSubTab('version')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${subTab === 'version' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'}`}
                >
                    <Zap size={18} /> Version
                </button>
                <button
                    onClick={() => setSubTab('settings')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${subTab === 'settings' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'}`}
                >
                    <Settings size={18} /> Properties
                </button>
            </div>

            {/* Plugins Tab */}
            {subTab === 'plugins' && (
                <div className="space-y-6">
                    {/* Installed Plugins */}
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Package size={20} className="text-green-400" />
                                Installed Plugins ({installedPlugins.length})
                            </h3>
                            <button
                                onClick={() => refetchInstalled()}
                                className="p-2 hover:bg-white/10 rounded-lg transition"
                            >
                                <RefreshCw size={16} className="text-gray-400" />
                            </button>
                        </div>

                        {installedPlugins.length === 0 ? (
                            <p className="text-gray-400 text-sm">No plugins installed yet</p>
                        ) : (
                            <div className="space-y-2">
                                {installedPlugins.map((plugin: any) => (
                                    <div key={plugin.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                        <div>
                                            <p className="text-white font-medium">{plugin.name}</p>
                                            <p className="text-xs text-gray-400">{(plugin.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                        <button
                                            onClick={() => deleteMutation.mutate(plugin.name)}
                                            disabled={deleteMutation.isPending}
                                            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition disabled:opacity-50"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Plugin Search */}
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                        <h3 className="text-lg font-bold text-white mb-4">Plugin Manager</h3>

                        <form onSubmit={handleSearchPlugins} className="flex gap-2 mb-6">
                            <select
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                                className="bg-[#0F1115] border border-white/10 rounded-lg text-white px-3 focus:outline-none focus:border-purple-500"
                            >
                                <option value="spigot">SpigotMC</option>
                                <option value="modrinth">Modrinth</option>
                                <option value="hangar">Hangar</option>
                                <option value="polymart">Polymart</option>
                                <option value="curseforge">CurseForge</option>
                            </select>
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search plugins (e.g., Essentials, WorldEdit)..."
                                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={searching}
                                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                Search
                            </button>
                        </form>

                        {/* Version Selector */}
                        <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-2">Minecraft Version</label>
                            <select
                                value={selectedVersion}
                                onChange={(e) => setSelectedVersion(e.target.value)}
                                className="w-full px-4 py-2 bg-[#0F1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            >
                                <option value="latest">Latest</option>
                                {minecraftVersions.map((v: string) => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>

                        {/* Plugin Results */}
                        <div className="space-y-3">
                            {plugins.length === 0 && !searching && (
                                <p className="text-gray-400 text-center py-8">Search for plugins or browse popular ones above</p>
                            )}
                            {plugins.map((plugin) => (
                                <div key={plugin.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-purple-500/50 transition">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h4 className="text-white font-bold">{plugin.name}</h4>
                                            <p className="text-sm text-gray-400 mt-1">{plugin.description || 'No description'}</p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                <span>By {plugin.author || 'Unknown'}</span>
                                                <span>• {plugin.downloads || 'N/A'} downloads</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleInstallPlugin(plugin)}
                                            disabled={installMutation.isPending}
                                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {installMutation.isPending && installMutation.variables?.plugin.id === plugin.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Download size={16} />
                                            )}
                                            Install
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Version Changer Tab */}
            {subTab === 'version' && (
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Zap size={20} className="text-yellow-400" />
                        Change Server Version (Paper)
                    </h3>
                    <p className="text-gray-400 text-sm mb-6">
                        Select a Paper version to change your server to. Server must be restarted for changes to take effect.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Select Paper Version</label>
                            <select
                                value={selectedPaperVersion}
                                onChange={(e) => setSelectedPaperVersion(e.target.value)}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            >
                                <option value="">-- Select Version --</option>
                                {paperVersions.map((v: string) => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleChangeVersion}
                            disabled={!selectedPaperVersion || changeVersionMutation.isPending}
                            className="w-full px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {changeVersionMutation.isPending ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Changing Version...
                                </>
                            ) : (
                                <>
                                    <Zap size={18} />
                                    Change Version
                                </>
                            )}
                        </button>

                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <p className="text-yellow-400 text-sm">
                                ⚠️ <strong>Warning:</strong> Changing versions may cause compatibility issues with plugins. Always backup your server before changing versions.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Properties Tab */}
            {subTab === 'settings' && (
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">Server Properties</h3>

                    {loadingProps ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="animate-spin text-purple-500" size={32} />
                        </div>
                    ) : (
                        <form onSubmit={handleSaveProperties} className="space-y-4">
                            {Object.keys(properties).length === 0 ? (
                                <p className="text-gray-400 text-center py-8">No properties found</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(properties).map(([key, value]: [string, any]) => (
                                        <div key={key}>
                                            <label className="block text-sm text-gray-400 mb-1">{key}</label>
                                            <input
                                                type="text"
                                                value={value}
                                                onChange={(e) => handleChange(key, e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={savingProps || Object.keys(properties).length === 0}
                                className="w-full px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {savingProps ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Settings size={18} />
                                        Save Properties
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

export default MinecraftTab;
