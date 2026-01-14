import React, { useState } from 'react';
import { useAdStore } from '../store/adStore';
import { X, Save } from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';

const GlobalAdCreationModal: React.FC = () => {
    const { isAdModalOpen, activeSelector, setAdModalOpen, setActiveSelector } = useAdStore();
    const [rawCode, setRawCode] = useState('');
    const [title, setTitle] = useState('');
    const [saving, setSaving] = useState(false);

    if (!isAdModalOpen || !activeSelector) return null;

    const handleSave = async () => {
        if (!rawCode) return toast.error('Please enter script code');
        setSaving(true);
        try {
            await api.post('/ads/admin/create', {
                title: title || `Overlay Ad on ${activeSelector}`,
                type: 'script',
                position: `custom:${activeSelector}`,
                rawCode,
                priority: 10, // Default high priority
                scriptLocation: 'body',
                status: 'active'
            });
            toast.success('Ad created successfully!');
            setAdModalOpen(false);
            setRawCode('');
            setTitle('');
            setActiveSelector(null);

            // Force reload to apply ad immediately or trigger refetch
            window.location.reload();
        } catch (error) {
            console.error(error);
            toast.error('Failed to create ad');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-gray-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/5">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span>🎯</span> Create Overlay Ad
                        </h2>
                        <p className="text-purple-400 text-xs font-mono mt-1">
                            Attach to: <span className="bg-purple-900/40 px-1 rounded">{activeSelector}</span>
                        </p>
                    </div>
                    <button
                        onClick={() => setAdModalOpen(false)}
                        className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Ad Title (Optional)</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={`Ad for ${activeSelector}`}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Script / HTML Code</label>
                        <div className="relative">
                            <textarea
                                value={rawCode}
                                onChange={(e) => setRawCode(e.target.value)}
                                placeholder="<script>...</script> or <div>...</div>"
                                className="w-full h-40 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            This code will be injected as an absolute overlay exactly on top of the selected element. Pro tip: Ensure your ad code fits roughly within the target element's size if it's not responsive.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
                    <button
                        onClick={() => setAdModalOpen(false)}
                        className="px-6 py-2.5 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/5 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-bold text-white shadow-lg shadow-purple-900/20 transition flex items-center gap-2"
                    >
                        {saving ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <Save size={18} />
                        )}
                        {saving ? 'Creating...' : 'Create Ad Overlay'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GlobalAdCreationModal;
