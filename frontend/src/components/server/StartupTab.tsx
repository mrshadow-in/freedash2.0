import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../api/client';
import { toast } from 'react-hot-toast';

interface StartupTabProps {
    server: any;
}

const StartupTab = ({ server }: StartupTabProps) => {
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState<any>(null);
    const [variables, setVariables] = useState<any[]>([]);
    const [savingVar, setSavingVar] = useState<string | null>(null);

    useEffect(() => {
        fetchStartup();
    }, [server.id]);

    const fetchStartup = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/servers/${server.id}/startup`);
            setMeta(data.meta);
            setVariables(data.data);
        } catch (error) {
            toast.error('Failed to load startup configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleVariableChange = (env: string, value: string) => {
        setVariables(prev => prev.map(v =>
            v.env_variable === env ? { ...v, server_value: value } : v
        ));
    };

    const saveVariable = async (env: string, value: string) => {
        setSavingVar(env);
        try {
            await api.put(`/servers/${server.id}/startup/variable`, {
                key: env,
                value: value
            });
            toast.success('Variable updated');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update variable');
        } finally {
            setSavingVar(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-purple-500" size={32} /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Startup Command */}
            <div className="bg-[#161b22] border border-white/10 rounded-xl p-6">
                <h3 className="text-gray-400 text-xs uppercase font-bold mb-4">Startup Command</h3>
                <div className="bg-black/30 rounded-lg p-4 font-mono text-sm text-gray-300 break-all border border-white/5">
                    {meta?.startup_command || 'No startup command found'}
                </div>
            </div>

            {/* Variables */}
            <div className="bg-[#161b22] border border-white/10 rounded-xl p-6">
                <h3 className="text-gray-400 text-xs uppercase font-bold mb-6">Service Variables</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {variables.map((variable) => (
                        <div key={variable.env_variable} className="bg-white/5 border border-white/5 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                                <label className="text-sm font-bold text-white block">{variable.name}</label>
                                <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-mono">
                                    {variable.env_variable}
                                </span>
                            </div>

                            <p className="text-xs text-gray-400 mb-3 min-h-[32px]">{variable.description}</p>

                            <div className="relative">
                                <input
                                    type="text"
                                    value={variable.server_value}
                                    onChange={(e) => handleVariableChange(variable.env_variable, e.target.value)}
                                    // Identify if changed? For now save on button click or separate
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-purple-500 transition"
                                />
                                {savingVar === variable.env_variable && (
                                    <div className="absolute right-3 top-2.5">
                                        <Loader2 className="animate-spin w-4 h-4 text-purple-500" />
                                    </div>
                                )}
                            </div>

                            <div className="mt-2 flex justify-end">
                                <button
                                    onClick={() => saveVariable(variable.env_variable, variable.server_value)}
                                    disabled={savingVar === variable.env_variable}
                                    className="text-xs text-purple-400 hover:text-purple-300 font-bold uppercase transition disabled:opacity-50"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StartupTab;
