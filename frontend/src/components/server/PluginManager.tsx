import { useState, useEffect } from 'react';
import { Search, Download, Loader2, Trash2, Package, CheckCircle2, Cloud, Filter } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface PluginManagerProps {
    server: any;
}

// Fallback versions if API fails
const FALLBACK_VERSIONS = [
    '1.21.1', '1.21', '1.20.6', '1.20.4', '1.20.2', '1.20.1',
    '1.19.4', '1.19.2', '1.18.2', '1.16.5', '1.12.2'
];

// **ACTUAL PLUGINS** for Bukkit/Spigot/Paper servers (NOT Fabric/Forge mods!)
const MODRINTH_POPULAR = [
    { id: 'Opn7SYjf', name: 'LuckPerms', author: 'Luck', downloads: 45000000, description: 'A permissions plugin for Minecraft servers', icon: 'https://cdn.modrinth.com/data/Opn7SYjf/c9a39346e4d4e0b7e0aa0bae8a71c99bad2f4dc5_icon.png', provider: 'modrinth', premium: false },
    { id: 'Lu3gAkPd', name: 'Vault', author: 'MilkBowl', downloads: 25000000, description: 'Vault is a Permissions, Chat, & Economy API', icon: 'https://cdn.modrinth.com/data/Lu3gAkPd/icon.png', provider: 'modrinth', premium: false },
    { id: 'fRQREgAc', name: 'EssentialsX', author: 'EssentialsX Team', downloads: 35000000, description: 'The essential plugin suite for Minecraft servers', icon: 'https://cdn.modrinth.com/data/fRQREgAc/81a5e73c0e1d3d0cb41c15c8e2050c6ce6adbf28.png', provider: 'modrinth', premium: false },
    { id: '1u6JkXh5', name: 'WorldEdit', author: 'sk89q', downloads: 40000000, description: 'In-game Minecraft map editor - build faster!', icon: 'https://cdn.modrinth.com/data/1u6JkXh5/icon.png', provider: 'modrinth', premium: false },
];

const PluginManager = ({ server }: PluginManagerProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [plugins, setPlugins] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [provider, setProvider] = useState<'modrinth' | 'spigot'>('modrinth');
    const [selectedVersion, setSelectedVersion] = useState<string>('1.21.1');

    // 1. Fetch Minecraft Versions Dynamically
    const { data: mcVersions = FALLBACK_VERSIONS } = useQuery({
        queryKey: ['minecraft-versions', server.id],
        queryFn: async () => {
            try {
                // Try fetching from backend if endpoint exists, else fallback
                // Assuming we have a general endpoint or we use the fallback list for now
                // Actually, let's use the explicit 'getMinecraftVersions' endpoint we saw in controller
                const res = await api.get(`/servers/${server.id}/minecraft/versions`);
                // Filter for releases only to keep list clean
                return res.data.versions.filter((v: any) => v.type === 'release').map((v: any) => v.id);
            } catch (e) {
                return FALLBACK_VERSIONS;
            }
        },
        staleTime: 1000 * 60 * 60 // 1 hour
    });

    // 2. Fetch Installed Plugins
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

    // 3. Search Effect
    const handleSearchPlugins = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) {
            if (provider === 'modrinth') setPlugins(MODRINTH_POPULAR);
            else setPlugins([]);
            return;
        }

        setSearching(true);
        try {
            const { data } = await api.get(`/servers/${server.id}/minecraft/plugins`, {
                params: { q: searchQuery, provider, version: selectedVersion }
            });
            setPlugins(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error('Failed to search plugins');
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        if (searchQuery) handleSearchPlugins();
        else if (provider === 'modrinth') setPlugins(MODRINTH_POPULAR);
    }, [selectedVersion, provider]);

    // 4. Install Action
    const installMutation = useMutation({
        mutationFn: async ({ plugin }: { plugin: any }) => {
            // Simplified: If we pass 'version' param to install, backend acts smart.
            return api.post(`/servers/${server.id}/minecraft/plugins/install`, {
                resourceId: plugin.id,
                fileName: `${plugin.name}.jar`,
                version: selectedVersion, // Install for this MC version
                provider: plugin.provider || provider
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
    const formatDownloads = (num: number) => num > 1000000 ? (num / 1000000).toFixed(1) + 'M+' : num > 1000 ? (num / 1000).toFixed(1) + 'k' : num;

    return (
        <div className="flex flex-col h-full bg-[#0d1117] relative">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-[#161b22]/95 backdrop-blur z-20 sticky top-0">
                <div className="max-w-7xl mx-auto space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Package className="text-green-500" /> Plugin Marketplace
                            </h2>
                            <p className="text-slate-400 text-xs">Modrinth & SpigotMC Integration</p>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-2 bg-[#0d1117] p-1 rounded-lg border border-white/10">
                            <div className="px-3 py-1.5 flex items-center gap-2 bg-white/5 rounded-md">
                                <Filter size={14} className="text-slate-400" />
                                <select
                                    value={selectedVersion}
                                    onChange={e => setSelectedVersion(e.target.value)}
                                    className="bg-transparent text-sm font-medium text-white outline-none cursor-pointer"
                                >
                                    {mcVersions.map((v: string) => <option key={v} value={v} className="bg-[#161b22]">{v}</option>)}
                                </select>
                            </div>
                            <div className="w-px h-5 bg-white/10" />
                            <button onClick={() => setProvider('modrinth')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${provider === 'modrinth' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-400 hover:text-white'}`}>MODRINTH</button>
                            <button onClick={() => setProvider('spigot')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${provider === 'spigot' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-slate-400 hover:text-white'}`}>SPIGOT</button>
                        </div>
                    </div>

                    <form onSubmit={handleSearchPlugins} className="relative">
                        <Search className="absolute left-4 top-3.5 text-slate-500" size={20} />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={provider === 'modrinth' ? "Search for plugins (e.g. Sodium, LuckPerms)..." : "Search Spigot resources..."}
                            className="w-full bg-[#0d1117] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition shadow-inner font-medium"
                        />
                        <button type="submit" disabled={searching} className="absolute right-2 top-2 bg-[#232730] hover:bg-white/10 px-4 py-1.5 rounded-lg text-sm font-bold text-white transition border border-white/5">
                            {searching ? <Loader2 className="animate-spin" size={16} /> : 'Search'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
                <div className="max-w-7xl mx-auto">
                    {/* Installed Row */}
                    {installedPlugins.length > 0 && !searchQuery && (
                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><CheckCircle2 size={16} /> Installed</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {installedPlugins.map((p: any) => (
                                    <div key={p.name} className="bg-[#161b22] border border-white/5 rounded-xl p-3 flex items-center gap-3 group hover:border-white/10 transition">
                                        <div className="w-10 h-10 rounded bg-[#0d1117] flex items-center justify-center text-slate-500 font-bold border border-white/5">{p.name[0].toUpperCase()}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-white text-sm truncate" title={p.name}>{p.name}</div>
                                            <div className="text-xs text-slate-500">{(p.size / 1024).toFixed(0)} KB</div>
                                        </div>
                                        <button onClick={() => deleteMutation.mutate(p.name)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {plugins.map(plugin => {
                            const installed = isInstalled(plugin.name);
                            return (
                                <div key={plugin.id} className="bg-[#161b22] border border-white/5 rounded-xl overflow-hidden group hover:border-green-500/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 flex flex-col">
                                    <div className="h-28 bg-[#0d1117] relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#161b22] z-10" />
                                        {plugin.icon && <img src={plugin.icon} className="w-full h-full object-cover opacity-40 blur-lg scale-110 group-hover:scale-125 transition duration-700" />}
                                        <div className="absolute bottom-4 left-4 z-20 flex items-end gap-3">
                                            <img src={plugin.icon || 'https://via.placeholder.com/64'} className="w-12 h-12 rounded-lg bg-[#161b22] border-2 border-[#161b22] shadow-lg" />

                                        </div>
                                        <div className="absolute top-2 right-2 z-20">
                                            <span className="px-2 py-0.5 rounded bg-black/40 backdrop-blur border border-white/10 text-[10px] font-mono text-slate-300">
                                                {formatDownloads(plugin.downloads)} DL
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-4 pt-2 flex-1 flex flex-col">
                                        <h3 className="font-bold text-white text-lg leading-tight mb-1 truncate" title={plugin.name}>{plugin.name}</h3>
                                        <p className="text-xs text-slate-400 mb-3 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500/50" /> {plugin.author}</p>
                                        <p className="text-sm text-slate-400 line-clamp-2 h-10 mb-4 leading-relaxed">{plugin.description || plugin.tag}</p>

                                        <button
                                            // Simple Install for now, assume latest valid for version
                                            onClick={() => installMutation.mutate({ plugin })}
                                            disabled={installed || installMutation.isPending}
                                            className={`mt-auto w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${installed
                                                ? 'bg-green-900/10 text-green-600 border border-green-900/20 cursor-default'
                                                : 'bg-white/5 text-white hover:bg-green-600 border border-white/5 hover:border-green-500 shadow-sm'}`}
                                        >
                                            {installMutation.isPending && installMutation.variables?.plugin.id === plugin.id ? <Loader2 className="animate-spin" size={16} /> :
                                                installed ? <><CheckCircle2 size={16} /> Installed</> : <><Download size={16} /> Install</>}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {plugins.length === 0 && !searching && (
                        <div className="text-center py-20 opacity-30">
                            <Cloud size={80} className="mx-auto mb-4" />
                            <p className="text-xl font-medium">Explore the Marketplace</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PluginManager;
