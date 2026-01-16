import { useState, useEffect } from 'react';
import { Search, Download, Loader2, Trash2, Package, CheckCircle2, Cloud, Filter, ExternalLink, Star, Calendar } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface PluginManagerProps {
    server: any;
}

// Comprehensive Minecraft version list
const FALLBACK_VERSIONS = [
    '1.21.1', '1.21', '1.20.6', '1.20.5', '1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20',
    '1.19.4', '1.19.3', '1.19.2', '1.19.1', '1.19', '1.18.2', '1.18.1', '1.18',
    '1.17.1', '1.17', '1.16.5', '1.16.4', '1.16.3', '1.16.2', '1.16.1', '1.16',
    '1.15.2', '1.15.1', '1.15', '1.14.4', '1.14.3', '1.14.2', '1.14.1', '1.14',
    '1.13.2', '1.13.1', '1.13', '1.12.2', '1.12.1', '1.12', '1.11.2', '1.11',
    '1.10.2', '1.10', '1.9.4', '1.9.2', '1.9', '1.8.9', '1.8.8', '1.8'
];

const PluginManager = ({ server }: PluginManagerProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [plugins, setPlugins] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [provider, setProvider] = useState<string>('modrinth');
    const [category, setCategory] = useState<'plugin' | 'mod' | 'modpack'>('plugin');
    const [selectedVersion, setSelectedVersion] = useState<string>('1.21.1');
    const [pluginVersions, setPluginVersions] = useState<Record<string, any[]>>({});
    const [selectedPluginVersions, setSelectedPluginVersions] = useState<Record<string, string>>({});
    const [loadingVersions, setLoadingVersions] = useState<Record<string, boolean>>({});

    // Fetch Minecraft Versions
    const { data: mcVersions = FALLBACK_VERSIONS } = useQuery({
        queryKey: ['minecraft-versions', server.id],
        queryFn: async () => {
            try {
                const res = await api.get(`/servers/${server.id}/minecraft/versions`);
                return res.data.versions.filter((v: any) => v.type === 'release').map((v: any) => v.id);
            } catch (e) {
                return FALLBACK_VERSIONS;
            }
        },
        staleTime: 1000 * 60 * 60
    });

    // Fetch Installed Plugins
    const { data: installedPlugins = [], refetch: refetchInstalled } = useQuery({
        queryKey: ['installed-plugins', server.id],
        queryFn: async () => {
            try {
                const res = await api.get(`/servers/${server.id}/minecraft/plugins/installed`);
                return res.data;
            } catch (e) { return []; }
        },
        refetchInterval: 10000
    });

    // Search Plugins
    const handleSearchPlugins = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        setSearching(true);
        try {
            // If no search query, get popular plugins sorted by downloads
            const params: any = {
                provider,
                category,
                version: selectedVersion
            };

            // Add search query if exists
            if (searchQuery.trim()) {
                params.q = searchQuery;
            }

            const { data } = await api.get(`/servers/${server.id}/minecraft/plugins`, { params });
            setPlugins(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Plugin search error:', error);
            toast.error('Failed to search plugins');
        } finally {
            setSearching(false);
        }
    };

    // Load plugins on mount and when filters change
    useEffect(() => {
        handleSearchPlugins();
    }, [selectedVersion, category, provider]);

    // Load Versions for a plugin
    const loadVersions = async (pluginId: string) => {
        if (pluginVersions[pluginId]) return; // Already loaded

        setLoadingVersions(prev => ({ ...prev, [pluginId]: true }));
        try {
            const loaders = category === 'plugin' ? JSON.stringify(['bukkit', 'paper', 'spigot']) : JSON.stringify(['fabric', 'forge', 'quilt']);
            const { data } = await api.get(`/servers/${server.id}/minecraft/plugins/versions`, {
                params: {
                    resourceId: pluginId,
                    provider,
                    loaders,
                    version: selectedVersion
                }
            });
            setPluginVersions(prev => ({ ...prev, [pluginId]: data }));
        } catch (error) {
            console.error('Failed to load versions:', error);
        } finally {
            setLoadingVersions(prev => ({ ...prev, [pluginId]: false }));
        }
    };

    // Install Plugin
    const installMutation = useMutation({
        mutationFn: async ({ plugin, versionId }: { plugin: any; versionId?: string }) => {
            return api.post(`/servers/${server.id}/minecraft/plugins/install`, {
                resourceId: plugin.id,
                fileName: `${plugin.name}.jar`,
                version: selectedVersion,
                provider,
                versionId
            });
        },
        onSuccess: (_, variables) => {
            toast.success(`Installing ${variables.plugin.name}...`);
            setTimeout(() => refetchInstalled(), 5000);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to install plugin.');
        }
    });

    // Delete Plugin
    const deleteMutation = useMutation({
        mutationFn: async (filename: string) => {
            return api.delete(`/servers/${server.id}/minecraft/plugins/${filename}`);
        },
        onSuccess: () => {
            toast.success('Plugin deleted');
            refetchInstalled();
        }
    });

    const isInstalled = (name: string) => installedPlugins.some((p: any) => p.name.toLowerCase().includes(name.toLowerCase()));

    const formatDownloads = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 30) return `${days} days ago`;
        if (days < 365) return `${Math.floor(days / 30)} months ago`;
        return `${Math.floor(days / 365)} years ago`;
    };

    const CategoryBadge = ({ type }: { type: string }) => {
        const colors = {
            plugin: 'bg-green-500/20 text-green-400 border-green-500/30',
            mod: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            modpack: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
        };

        return (
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${colors[type as keyof typeof colors] || colors.plugin}`}>
                {type}
            </span>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#0d1117] relative">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-[#161b22]/95 backdrop-blur z-20 shrink-0">
                <div className="max-w-7xl mx-auto space-y-4">
                    <div className="flex flex-col gap-4">
                        {/* Title */}
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Package className="text-purple-500" /> Plugin Marketplace
                            </h2>
                            <p className="text-slate-400 text-xs">
                                Powered by {provider.charAt(0).toUpperCase() + provider.slice(1)}
                            </p>
                        </div>

                        {/* Search & Filters */}
                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Search */}
                            <form onSubmit={handleSearchPlugins} className="relative flex-1">
                                <Search className="absolute left-4 top-3.5 text-slate-500" size={20} />
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search plugins (e.g. LuckPerms, Vault, EssentialsX)..."
                                    className="w-full bg-[#0d1117] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition"
                                />
                                <button type="submit" disabled={searching} className="absolute right-2 top-2 bg-purple-600 hover:bg-purple-500 px-4 py-1.5 rounded-lg text-sm font-bold text-white transition">
                                    {searching ? <Loader2 className="animate-spin" size={16} /> : 'Search'}
                                </button>
                            </form>

                            {/* Filters */}
                            <div className="flex items-center gap-3">
                                {/* Provider Selection */}
                                <div className="relative">
                                    <select
                                        value={provider}
                                        onChange={e => setProvider(e.target.value)}
                                        className="bg-[#0d1117] border border-white/10 rounded-lg px-4 py-3 text-white font-medium focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition appearance-none pr-10 cursor-pointer"
                                    >
                                        <option value="modrinth">Modrinth</option>
                                        <option value="spigot">Spigot</option>
                                        <option value="hangar">Hangar (Paper)</option>
                                        <option value="polymart">Polymart</option>
                                        <option value="curseforge">CurseForge</option>
                                    </select>
                                    <Package className="absolute right-3 top-3.5 pointer-events-none text-slate-400" size={16} />
                                </div>

                                {/* Category */}
                                <div className="relative">
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value as any)}
                                        className="bg-[#0d1117] border border-white/10 rounded-lg px-4 py-3 text-white font-medium focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition appearance-none pr-10 cursor-pointer"
                                    >
                                        <option value="plugin">Plugins</option>
                                        <option value="mod">Mods</option>
                                        <option value="modpack">Modpacks</option>
                                    </select>
                                    <Filter className="absolute right-3 top-3.5 pointer-events-none text-slate-400" size={16} />
                                </div>

                                {/* MC Version */}
                                <select
                                    value={selectedVersion}
                                    onChange={e => setSelectedVersion(e.target.value)}
                                    className="bg-[#0d1117] border border-white/10 rounded-lg px-4 py-3 text-white font-medium focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition"
                                >
                                    {mcVersions.map((v: string) => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
                <div className="max-w-7xl mx-auto">
                    {/* Installed Row */}
                    {installedPlugins.length > 0 && !searchQuery && (
                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <CheckCircle2 size={16} /> Installed ({installedPlugins.length})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {installedPlugins.map((p: any) => (
                                    <div key={p.name} className="bg-[#161b22] border border-white/5 rounded-xl p-3 flex items-center gap-3 group hover:border-white/10 transition">
                                        <div className="w-10 h-10 rounded bg-[#0d1117] flex items-center justify-center text-slate-500 font-bold border border-white/5">
                                            {p.name[0].toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-white text-sm truncate" title={p.name}>{p.name}</div>
                                            <div className="text-xs text-slate-500">{(p.size / 1024).toFixed(0)} KB</div>
                                        </div>
                                        <button
                                            onClick={() => deleteMutation.mutate(p.name)}
                                            className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Plugin Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plugins.map(plugin => {
                            const installed = isInstalled(plugin.name);
                            const versions = pluginVersions[plugin.id] || [];
                            const selectedVersionId = selectedPluginVersions[plugin.id];

                            return (
                                <div key={plugin.id} className="bg-[#161b22] border border-white/5 rounded-xl overflow-hidden group hover:border-purple-500/40 hover:shadow-[0_8px_30px_rgba(139,92,246,0.15)] transition-all duration-300 flex flex-col">
                                    {/* Plugin Icon */}
                                    <div className="h-28 bg-[#0d1117] relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#161b22] z-10" />
                                        {plugin.icon && <img src={plugin.icon} className="w-full h-full object-cover opacity-40 blur-lg scale-110 group-hover:scale-125 transition duration-700" alt="" />}
                                        <div className="absolute bottom-4 left-4 z-20 flex items-end gap-3">
                                            <img src={plugin.icon || 'https://via.placeholder.com/64'} className="w-12 h-12 rounded-lg bg-[#161b22] border-2 border-[#161b22] shadow-lg" alt={plugin.name} />
                                        </div>
                                        <div className="absolute top-2 right-2 z-20">
                                            <CategoryBadge type={plugin.projectType} />
                                        </div>
                                    </div>

                                    {/* Plugin Info */}
                                    <div className="p-4 pt-2 flex-1 flex flex-col">
                                        {/* Title & External Link */}
                                        <div className="flex items-start justify-between mb-1">
                                            <h3 className="font-bold text-white text-lg leading-tight truncate flex-1" title={plugin.name}>{plugin.name}</h3>
                                            <a
                                                href={`https://modrinth.com/${plugin.projectType}/${plugin.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-2 p-1 text-slate-400 hover:text-purple-400 transition"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                        </div>

                                        {/* Description */}
                                        <p className="text-sm text-slate-400 line-clamp-2 mb-3 leading-relaxed">{plugin.description}</p>

                                        {/* Stats */}
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                                            <span className="flex items-center gap-1">
                                                <Download size={12} className="text-purple-400" />
                                                {formatDownloads(plugin.downloads)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Star size={12} className="text-yellow-400" />
                                                {formatDownloads(plugin.follows)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} className="text-blue-400" />
                                                {formatDate(plugin.dateModified)}
                                            </span>
                                        </div>

                                        {/* Version Dropdown - Now works for all providers */}
                                        <select
                                            id={`version-${plugin.id}`}
                                            value={selectedVersionId || ''}
                                            onChange={e => setSelectedPluginVersions(prev => ({ ...prev, [plugin.id]: e.target.value }))}
                                            onFocus={() => loadVersions(plugin.id)}
                                            disabled={loadingVersions[plugin.id] || installed}
                                            className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-white text-sm mb-3 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">
                                                {versions.length > 0 ? 'Select Version' : 'Latest Version'}
                                            </option>
                                            {loadingVersions[plugin.id] && <option>Loading versions...</option>}
                                            {versions.map((v: any) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.name || v.versionNumber}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Install Button */}
                                        <button
                                            onClick={() => installMutation.mutate({ plugin, versionId: selectedVersionId })}
                                            disabled={installed || installMutation.isPending}
                                            className={`mt-auto w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${installed
                                                ? 'bg-green-900/10 text-green-600 border border-green-900/20 cursor-default'
                                                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg shadow-purple-900/20 hover:scale-105 active:scale-95'
                                                }`}
                                        >
                                            {installMutation.isPending && installMutation.variables?.plugin.id === plugin.id ?
                                                <Loader2 className="animate-spin" size={16} /> :
                                                installed ?
                                                    <><CheckCircle2 size={16} /> Installed</> :
                                                    <><Download size={16} /> Install</>
                                            }
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Empty State */}
                    {plugins.length === 0 && !searching && (
                        <div className="text-center py-20 opacity-30">
                            <Cloud size={80} className="mx-auto mb-4 text-slate-600" />
                            <p className="text-xl font-medium text-slate-500">Explore the Marketplace</p>
                            <p className="text-sm text-slate-600 mt-2">Search for plugins, mods, or modpacks</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PluginManager;
