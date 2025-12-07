import { Archive, Download, Trash, Plus } from 'lucide-react';

const BackupsTab = ({ server }: { server: any }) => {
    // Mock Backups
    const backups = [
        // { id: 1, name: 'Pre-Upgrade Backup', size: '150MB', created: '2 days ago' }
    ];

    return (
        <div className="bg-[#1a1b26] border border-white/5 rounded-2xl p-6 min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Archive className="text-blue-400" size={24} />
                    Backups
                </h3>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold flex items-center gap-2 transition">
                    <Plus size={18} /> Create Backup
                </button>
            </div>

            {backups.length > 0 ? (
                <div className="space-y-4">
                    {backups.map((backup: any) => (
                        <div key={backup.id} className="bg-black/20 p-4 rounded-xl flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-gray-200">{backup.name}</h4>
                                <p className="text-sm text-gray-500">{backup.size} • {backup.created}</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-white/5 text-gray-400 rounded-lg transition" title="Restore">
                                    <Archive size={18} />
                                </button>
                                <button className="p-2 hover:bg-white/5 text-gray-400 rounded-lg transition" title="Download">
                                    <Download size={18} />
                                </button>
                                <button className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition" title="Delete">
                                    <Trash size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-500">
                    <Archive size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No backups found.</p>
                    <p className="text-sm">Create a backup to secure your server data.</p>
                </div>
            )}
        </div>
    );
};

export default BackupsTab;
