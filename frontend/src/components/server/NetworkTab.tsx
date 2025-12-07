import { Network, Globe, Lock } from 'lucide-react';

const NetworkTab = ({ server }: { server: any }) => {
    return (
        <div className="bg-[#1a1b26] border border-white/5 rounded-2xl p-6 min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Globe className="text-purple-400" size={24} />
                    Network & Ports
                </h3>
            </div>

            <div className="space-y-4">
                {/* Primary Allocation */}
                <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 p-4 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                            <Network size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-200">Primary Allocation</h4>
                            <p className="text-sm text-gray-400 font-mono">192.168.1.1:25565</p>
                            <span className="text-xs text-green-400 bg-green-500/10 px-2 rounded mt-1 inline-block">Default Connection</span>
                        </div>
                    </div>
                </div>

                {/* Additional Allocations List (Placeholder) */}
                <div className="text-center py-10 text-gray-500">
                    <p>Additional ports can be purchased in the Shop.</p>
                </div>
            </div>
        </div>
    );
};

export default NetworkTab;
