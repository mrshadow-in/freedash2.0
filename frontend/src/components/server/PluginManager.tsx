import { useState, useEffect } from 'react';
import { Search, Download, Loader2, Trash2, Package, CheckCircle2, Cloud, Filter } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface PluginManagerProps {
    server: any;
}

const MODRINTH_POPULAR = [
    { id: '1b23avLy', name: 'Sodium', author: 'JellySquid', downloads: '20M+', description: 'Modern rendering engine for Minecraft', icon: 'https://cdn.modrinth.com/data/AANobbMI/icon.png', provider: 'modrinth', premium: false },
    { id: 'P7dR8mSH', name: 'Fabric API', author: 'modmuss50', downloads: '50M+', description: 'Core API library for Fabric mods', icon: 'https://cdn.modrinth.com/data/P7dR8mSH/icon.png', provider: 'modrinth', premium: false },
    { id: 'myl4987E', name: 'Iris Shaders', author: 'coderbot', downloads: '10M+', description: 'Modern shaders mod', icon: 'https://cdn.modrinth.com/data/myl4987E/icon.png', provider: 'modrinth', premium: false },
    { id: 'qQyHxfxd', name: 'Simple Voice Chat', author: 'Henkelmax', downloads: '5M+', description: 'Proximity voice chat', icon: 'https://cdn.modrinth.com/data/9eGKb6K1/icon.png', provider: 'modrinth', premium: false },
];

const MINECRAFT_VERSIONS = [
    '1.21.1', '1.21', '1.20.6', '1.20.4', '1.20.2', '1.20.1',
    '1.19.4', '1.19.2', '1.18.2', '1.16.5', '1.12.2'
];

const PluginManager = ({ server }: PluginManagerProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [plugins, setPlugins] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [provider, setProvider] = useState<'modrinth' | 'spigot'>('modrinth');
    const [selectedVersion, setSelectedVersion] = useState<string>('1.21.1'); // Default to a common version or fetch server version?

    // Attempt to parse version from server properties or variable if available, otherwise default
    useEffect(() => {
        // If we had the server version in props, we'd use it here.
        // For now, let user pick.
    }, []);



    // Fetch installed plugins
    const { data: installedPlugins = [], refetch: refetchInstalled } = useQuery({
        queryKey: ['installed-plugins', server.id],
        queryFn: async () => {
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

    const handleSearchPlugins = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Show popular if empty
        if (!searchQuery.trim()) {
            if (provider === 'modrinth') setPlugins(MODRINTH_POPULAR);
            else setPlugins([]);
            return;
        }

        setSearching(true);
        try {
            const { data } = await api.get(`/servers/${server.id}/minecraft/plugins`, {
                params: {
                    q: searchQuery,
                    provider: provider,
                    version: selectedVersion
                }
            });
            setPlugins(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error('Failed to search plugins');
        } finally {
            setSearching(false);
        }
    };

    // Trigger search when version changes if query exists
    useEffect(() => {
        if (searchQuery) handleSearchPlugins();
        else if (provider === 'modrinth') setPlugins(MODRINTH_POPULAR);
    }, [selectedVersion, provider]);


    // Install plugin mutation
    const installMutation = useMutation({
        mutationFn: async ({ plugin }: { plugin: any }) => {
            return api.post(`/servers/${server.id}/minecraft/plugins/install`, {
                resourceId: plugin.id,
                fileName: `${plugin.name}.jar`,
                version: selectedVersion,
                provider: plugin.provider || provider
            });
        },
        onSuccess: (_, variables) => {
            toast.success(`Installing ${variables.plugin.name}...`);
            setTimeout(() => refetchInstalled(), 5000);
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

    const formatDownloads = (num: number) => {
        if (!num) return '0';
        if (num > 1000000) return (num / 1000000).toFixed(1) + 'M+';
        if (num > 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    };

    return (
        <div className="flex flex-col h-full bg-[#0d1117]">
            {/* Header / Search Bar */}
            <div className="p-6 border-b border-white/5 bg-[#161b22]/80 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-7xl mx-auto space-y-6">

                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Cloud className="text-green-500" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">Modrinth API</span>
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">Directly connected to the Modrinth database.</p>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex items-center gap-3 bg-[#0d1117] p-1.5 rounded-xl border border-white/10">
                            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/5">
                                <Filter size={14} className="text-gray-400" />
                                <select
                                    className="bg-transparent text-sm text-white focus:outline-none appearance-none cursor-pointer font-medium"
                                    value={selectedVersion}
                                    onChange={(e) => setSelectedVersion(e.target.value)}
                                >
                                    {MINECRAFT_VERSIONS.map(v => (
                                        <option key={v} value={v} className="bg-[#161b22]">{v}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-px h-6 bg-white/10" />
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setProvider('modrinth')}
                                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${provider === 'modrinth' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    MODRINTH
                                </button>
                                <button
                                    onClick={() => setProvider('spigot')}
                                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${provider === 'spigot' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    SPIGOT
                                </button>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSearchPlugins} className="relative group w-full max-w-2xl">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-500 group-focus-within:text-green-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-12 pr-32 py-4 bg-[#0d1117] border border-white/10 rounded-2xl leading-5 bg-opacity-50 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-[#0f111a] focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all shadow-xl font-medium"
                            placeholder={provider === 'modrinth' ? "Search 28,000+ plugins on Modrinth..." : "Search SpigotMC..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={searching}
                            className="absolute inset-y-2 right-2 px-6 bg-[#232730] hover:bg-white/10 text-white rounded-xl font-bold transition-all disabled:opacity-50 border border-white/5 flex items-center gap-2"
                        >
                            {searching ? <Loader2 className="animate-spin" size={18} /> : 'Search'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
                <div className="max-w-7xl mx-auto">

                    {/* Installed Section */}
                    {installedPlugins.length > 0 && !searchQuery && (
                        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <CheckCircle2 size={20} className="text-green-500" />
                                    Installed
                                </h3>
                                <div className="text-xs text-gray-500 font-mono">/plugins/ folder</div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {installedPlugins.map((plugin: any) => (
                                    <div key={plugin.name} className="bg-[#161b22] border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-white/20 transition-all shadow-lg">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-10 h-10 rounded-lg bg-[#0d1117] border border-white/10 flex items-center justify-center text-gray-400 font-bold text-lg select-none">
                                                {plugin.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-white truncate text-sm" title={plugin.name}>{plugin.name}</h4>
                                                <p className="text-xs text-gray-500 truncate font-mono">{(plugin.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteMutation.mutate(plugin.name)}
                                            disabled={deleteMutation.isPending}
                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Does not modify JAR file, just deletes it."
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Results Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                        {plugins.map((plugin) => {
                            const installed = isInstalled(plugin.name);
                            return (
                                <div key={plugin.id} className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden hover:border-green-500/30 hover:shadow-[0_0_30px_rgba(34,197,94,0.1)] transition-all group flex flex-col h-full relative">
                                    {/* Card Header Image/Gradient */}
                                    <div className="h-24 bg-[#0d1117] relative overflow-hidden group-hover:h-28 transition-all duration-300">
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#161b22] to-transparent z-10" />
                                        {plugin.icon ? (
                                            <>
                                                <img src={plugin.icon} alt={plugin.name} className="w-full h-full object-cover blur-xl opacity-50 transform scale-150 group-hover:scale-110 transition-transform duration-700" />
                                                <img src={plugin.icon} alt={plugin.name} className="w-16 h-16 rounded-2xl absolute bottom-[-10px] left-5 z-20 shadow-xl border-4 border-[#161b22]" />
                                            </>
                                        ) : (
                                            <div className="absolute bottom-[-10px] left-5 z-20 w-16 h-16 rounded-2xl bg-[#0d1117] border-4 border-[#161b22] flex items-center justify-center">
                                                <Package className="text-gray-600" size={32} />
                                            </div>
                                        )}

                                        <div className="absolute top-3 right-3 z-20 flex gap-2">
                                            {plugin.premium ? (
                                                <span className="px-2 py-1 rounded-md bg-yellow-500/20 text-yellow-400 text-[10px] font-bold border border-yellow-500/20">PREMIUM</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-md bg-white/5 text-gray-400 text-[10px] font-bold border border-white/10 backdrop-blur-sm">FREE</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5 pt-8 flex-1 flex flex-col">
                                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-green-400 transition-colors line-clamp-1" title={plugin.name}>{plugin.name}</h3>

                                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 font-mono">
                                            <span className="flex items-center gap-1 text-gray-400">
                                                <Download size={12} /> {formatDownloads(plugin.downloads)}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-white/20" />
                                            <span className="truncate max-w-[100px]">{plugin.author}</span>
                                        </div>

                                        <p className="text-sm text-gray-400 leading-relaxed mb-6 line-clamp-3 h-[4.5em]">
                                            {plugin.description || plugin.tag || 'No description provided.'}
                                        </p>

                                        {/* Actions */}
                                        <div className="mt-auto pt-4 border-t border-white/5 flex gap-2">
                                            <button
                                                onClick={() => installMutation.mutate({ plugin })}
                                                disabled={installMutation.isPending || installed}
                                                className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${installed
                                                    ? 'bg-green-500/10 text-green-500 border border-green-500/20 cursor-default opacity-50'
                                                    : 'bg-white/5 hover:bg-green-500 hover:text-white text-gray-300 border border-white/10 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20 active:scale-[0.98]'
                                                    }`}
                                            >
                                                {installMutation.isPending && installMutation.variables?.plugin.id === plugin.id ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : installed ? (
                                                    <>
                                                        <CheckCircle2 size={16} /> Installed
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download size={16} /> Install
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Empty State */}
                    {plugins.length === 0 && !searching && (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500 opacity-40">
                            <Cloud size={64} className="mb-6 stroke-1" />
                            <p className="text-xl font-medium">Ready to explore.</p>
                            <p className="text-sm">Search for plugins above.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PluginManager;
