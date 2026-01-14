import { useState } from 'react';
import { Search, Download, Loader2, Trash2, RefreshCw, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface PluginManagerProps {
    server: any;
}

// Popular plugins to show by default
const POPULAR_PLUGINS = [
    { id: '9089', name: 'EssentialsX', author: 'EssentialsX Team', downloads: '50M+', description: 'Essential commands and features for every server.', icon: 'https://www.spigotmc.org/data/resource_icons/9/9089.jpg?1568289456' },
    { id: '13224', name: 'WorldEdit', author: 'sk89q', downloads: '30M+', description: 'The ultimate in-game map editor.', icon: 'https://www.spigotmc.org/data/resource_icons/13/13224.jpg?1536758655' },
    { id: '34315', name: 'Vault', author: 'MilkBowl', downloads: '25M+', description: 'Economy & Permissions API.', icon: 'https://www.spigotmc.org/data/resource_icons/34/34315.jpg?1505501538' },
    { id: '19254', name: 'LuckPerms', author: 'Luck', downloads: '20M+', description: 'Advanced permissions plugin.', icon: 'https://www.spigotmc.org/data/resource_icons/28/28140.jpg?1487002012' }, // Fixed ID/Icon approximation
    { id: '274', name: 'WorldGuard', author: 'sk89q', downloads: '18M+', description: 'Protect your server with regions.', icon: 'https://www.spigotmc.org/data/resource_icons/7/7266.jpg?1432650085' }, // Fixed ID/Icon approximation
    { id: '53565', name: 'Citizens', author: 'fullwall', downloads: '10M+', description: 'The original NPC plugin.', icon: 'https://www.spigotmc.org/data/resource_icons/53/53565.jpg?1517441316' },
];

const PluginManager = ({ server }: PluginManagerProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [plugins, setPlugins] = useState<any[]>(POPULAR_PLUGINS);
    const [searching, setSearching] = useState(false);
    const [provider, setProvider] = useState('spigot');

    // Use server version or 'latest'
    // In a real app we might parse server.version, but for now defaulting to latest is safe for plugin searches usually
    const selectedVersion = 'latest';

    const isServerOnline = server.status === 'running';

    // Fetch installed plugins
    const { data: installedPlugins = [], refetch: refetchInstalled } = useQuery({
        queryKey: ['installed-plugins', server.id],
        queryFn: async () => {
            // Assuming this endpoint exists based on previous code
            try {
                const res = await api.get(`/servers/${server.id}/minecraft/plugins/installed`);
                return res.data;
            } catch (e) {
                return [];
            }
        },
        refetchInterval: 10000
    });

    const isInstalled = (pluginName: string) => {
        return installedPlugins.some((p: any) => p.name.toLowerCase().includes(pluginName.toLowerCase()) || pluginName.toLowerCase().includes(p.name.toLowerCase()));
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
            // Ensure data has the fields we need, add fallbacks if API structure differs slightly
            const formattedPlugins = Array.isArray(data) ? data : [];
            setPlugins(formattedPlugins);
        } catch (error) {
            toast.error('Failed to search plugins');
        } finally {
            setSearching(false);
        }
    };

    // Install plugin mutation
    const installMutation = useMutation({
        mutationFn: async ({ plugin }: { plugin: any }) => {
            return api.post(`/servers/${server.id}/minecraft/plugins/install`, {
                resourceId: plugin.id,
                fileName: `${plugin.name}.jar`,
                version: selectedVersion,
                provider: plugin.provider || 'spigot'
            });
        },
        onSuccess: (_, variables) => {
            toast.success(`Installing ${variables.plugin.name}...`);
            setTimeout(() => refetchInstalled(), 3000);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to install plugin.';
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

    return (
        <div className="flex flex-col h-full bg-[#0d1117]">
            {/* Header / Search Bar */}
            <div className="p-6 border-b border-white/5 bg-[#161b22]/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Package className="text-purple-500" />
                            Plugin Marketplace
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Discover and install plugins for your server.</p>
                    </div>
                    {/* Status Badge */}
                    <div className={`px-4 py-2 rounded-full border ${!isServerOnline ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-green-500/10 border-green-500/20 text-green-400'} flex items-center gap-2 text-sm font-bold`}>
                        <div className={`w-2 h-2 rounded-full ${!isServerOnline ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
                        {!isServerOnline ? 'Server Offline - Installs Safe' : 'Server Online - Restart Required'}
                    </div>
                </div>

                <form onSubmit={handleSearchPlugins} className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-500 group-focus-within:text-purple-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-11 pr-4 py-4 bg-[#0d1117] border border-white/10 rounded-xl leading-5 bg-opacity-50 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-[#0f111a] focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-lg"
                        placeholder="Search for plugins (e.g. EssentialsX, Vault, WorldEdit)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={searching}
                        className="absolute inset-y-2 right-2 px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-purple-500/20"
                    >
                        {searching ? <Loader2 className="animate-spin" size={20} /> : 'Search'}
                    </button>
                </form>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">

                {/* Installed Section (if any) */}
                {installedPlugins.length > 0 && !searchQuery && (
                    <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <CheckCircle2 size={20} className="text-green-500" />
                            Installed Plugins
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {installedPlugins.map((plugin: any) => (
                                <div key={plugin.name} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between group hover:border-white/20 transition-all hover:bg-white/[0.07]">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center text-green-400 font-bold text-lg border border-green-500/20">
                                            {plugin.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-white truncate text-sm" title={plugin.name}>{plugin.name}</h4>
                                            <p className="text-xs text-gray-500 truncate">{(plugin.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteMutation.mutate(plugin.name)}
                                        disabled={deleteMutation.isPending}
                                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Uninstall Plugin"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search Results / Popular */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    {plugins.map((plugin) => (
                        <div key={plugin.id} className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all group flex flex-col h-full relative">
                            {/* Card Content */}
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-[#0d1117] border border-white/10 flex items-center justify-center overflow-hidden">
                                        {plugin.icon ? (
                                            <img src={`https://www.spigotmc.org/${plugin.icon}`} alt={plugin.name} className="w-full h-full object-cover" onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                            }} />
                                        ) : null}
                                        <Package className={`text-gray-600 ${plugin.icon ? 'hidden' : ''}`} size={32} />
                                    </div>
                                    <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-gray-400 font-mono">
                                        {plugin.premium ? 'PREMIUM' : 'FREE'}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">{plugin.name}</h3>
                                <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                                    <span>{plugin.author || 'Unknown'}</span>
                                    <span>•</span>
                                    <span>{plugin.downloads || '0'} Downloads</span>
                                </div>

                                <p className="text-sm text-gray-400 leading-relaxed mb-4 line-clamp-3">
                                    {plugin.description || plugin.tag || 'No description available for this plugin.'}
                                </p>
                            </div>

                            {/* Footer / Action */}
                            <div className="p-4 bg-white/[0.02] border-t border-white/5 mt-auto">
                                <button
                                    onClick={() => installMutation.mutate({ plugin })}
                                    disabled={installMutation.isPending || isInstalled(plugin.name)}
                                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isInstalled(plugin.name)
                                            ? 'bg-green-500/10 text-green-500 border border-green-500/20 cursor-default'
                                            : 'bg-white/5 hover:bg-purple-600 hover:text-white text-gray-300 border border-white/10 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20'
                                        }`}
                                >
                                    {installMutation.isPending && installMutation.variables?.plugin.id === plugin.id ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Installing...
                                        </>
                                    ) : isInstalled(plugin.name) ? (
                                        <>
                                            <CheckCircle2 size={16} />
                                            Installed
                                        </>
                                    ) : (
                                        <>
                                            <Download size={16} />
                                            Install Plugin
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {plugins.length === 0 && !searching && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 opacity-50">
                        <Package size={64} className="mb-4" />
                        <p className="text-lg">No plugins found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PluginManager;
