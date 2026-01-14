import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Zap, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface VersionManagerProps {
    server: any;
}

const FALLBACK_VERSIONS = [
    '1.21.1', '1.21', '1.20.6', '1.20.4', '1.20.2', '1.20.1',
    '1.19.4', '1.19.3', '1.19.2', '1.18.2', '1.17.1', '1.16.5'
];

const VersionManager = ({ server }: VersionManagerProps) => {
    const [selectedPaperVersion, setSelectedPaperVersion] = useState('');

    // Fetch Paper versions
    const { data: paperVersions = FALLBACK_VERSIONS, isLoading } = useQuery({
        queryKey: ['paper-versions'],
        queryFn: async () => {
            const res = await api.get(`/servers/${server.id}/minecraft/paper-versions`);
            return res.data;
        },
        staleTime: 3600000
    });

    // Change version mutation
    const changeVersionMutation = useMutation({
        mutationFn: async (version: string) => {
            // Trigger backend version update
            await api.post(`/servers/${server.id}/minecraft/version`, { version });
            return { version };
        },
        onSuccess: (data) => {
            toast.success(`Server setup for version ${data.version} initiated! Restart required.`);
            window.location.reload(); // Quick way to refresh UI state/connection
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to change version');
        }
    });

    const handleChangeVersion = () => {
        if (!selectedPaperVersion) return;

        const confirmed = window.confirm(
            `⚠️ WARNING: CHANGING SERVER VERSION TO ${selectedPaperVersion}\n\n` +
            `This action will:\n` +
            `1. Update the startup configuration.\n` +
            `2. Trigger a server re-installation on next boot.\n` +
            `3. Overwrite the server jar file.\n\n` +
            `Make sure you have a backup of your world and data.\n\n` +
            `Are you sure you want to proceed?`
        );

        if (confirmed) {
            changeVersionMutation.mutate(selectedPaperVersion);
        }
    };

    return (
        <div className="flex flex-col h-full p-6 lg:p-10 max-w-4xl mx-auto w-full">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Zap className="text-yellow-400" size={32} />
                    Version Manager
                </h2>
                <p className="text-gray-400">Manage your server's Minecraft version. Currently supporting <strong>Paper/Spigot</strong>.</p>
            </div>

            <div className="bg-[#161b22] border border-white/5 rounded-2xl p-8 shadow-xl">
                <div className="flex items-start gap-4 mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <AlertTriangle className="text-yellow-500 shrink-0 mt-1" />
                    <div>
                        <h4 className="text-yellow-400 font-bold mb-1">Important Warning</h4>
                        <p className="text-yellow-200/70 text-sm leading-relaxed">
                            Changing your server version triggers a re-installation process.
                            This will overwrite your existing server JAR file.
                            If you are downgrading, your existing world may become incompatible/corrupted.
                            <strong>Always backup your files before proceeding.</strong>
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-3">Select Minecraft Version</label>
                        <div className="relative">
                            <select
                                value={selectedPaperVersion}
                                onChange={(e) => setSelectedPaperVersion(e.target.value)}
                                disabled={isLoading}
                                className="w-full h-14 pl-4 pr-10 bg-[#0d1117] border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:border-yellow-500 transition-colors text-lg"
                            >
                                <option value="">-- Choose Version --</option>
                                {paperVersions.map((v: string) => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleChangeVersion}
                        disabled={!selectedPaperVersion || changeVersionMutation.isPending}
                        className="w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-orange-500/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {changeVersionMutation.isPending ? (
                            <>
                                <Loader2 className="animate-spin" /> Processing...
                            </>
                        ) : (
                            <>
                                <Zap className="fill-current" /> Install Version {selectedPaperVersion || ''}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VersionManager;
