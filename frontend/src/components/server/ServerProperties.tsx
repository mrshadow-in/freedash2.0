import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, RotateCcw } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface ServerPropertiesProps {
    server: any;
}

const ServerProperties = ({ server }: ServerPropertiesProps) => {
    const [properties, setProperties] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchProperties();
    }, []);

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/servers/${server.id}/minecraft/properties`);
            setProperties(data);
        } catch (error) {
            toast.error('Failed to load server.properties');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/servers/${server.id}/minecraft/properties`, properties);
            toast.success('Server properties saved successfully!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save properties');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setProperties((prev: any) => ({ ...prev, [key]: value }));
    };

    // Helper to format key names for display (e.g. allow-flight -> Allow Flight)
    const formatKey = (key: string) => {
        return key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Loader2 className="animate-spin mb-4 text-purple-500" size={40} />
                <p>Loading configuration...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0d1117]">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-[#161b22] flex items-center justify-between sticky top-0 z-10 backdrop-blur-md bg-opacity-90">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Settings className="text-blue-400" />
                        Server Properties
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Configure your <code>server.properties</code> file.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchProperties}
                        className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition"
                        title="Reload"
                    >
                        <RotateCcw size={20} />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Form Grid */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-white/10">
                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {Object.entries(properties).map(([key, value]: [string, any]) => (
                        <div key={key} className="bg-[#161b22] border border-white/5 p-4 rounded-xl hover:border-blue-500/30 transition-colors group">
                            <label className="block text-xs font-mono text-blue-400/70 mb-2 uppercase tracking-wider truncate" title={key}>
                                {key}
                            </label>

                            {/* Boolean Toggles */}
                            {value === 'true' || value === 'false' || value === true || value === false ? (
                                <select
                                    value={String(value)}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className={`w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-medium ${String(value) === 'true' ? 'text-green-400' : 'text-red-400'}`}
                                >
                                    <option value="true">Enabled</option>
                                    <option value="false">Disabled</option>
                                </select>
                            ) : (
                                /* Text Inputs */
                                <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                                    placeholder="Empty"
                                />
                            )}
                        </div>
                    ))}
                </form>
            </div>
        </div>
    );
};

export default ServerProperties;
