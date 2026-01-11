import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Loader2, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface FileEditorProps {
    serverId: string;
    filePath: string;
    onClose: () => void;
}

const FileEditor = ({ serverId, filePath, onClose }: FileEditorProps) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const res = await api.get(`/servers/${serverId}/files/content?file=${encodeURIComponent(filePath)}`);
                setContent(res.data);
            } catch (error) {
                toast.error('Failed to load file');
                onClose();
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, [serverId, filePath, onClose]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post(`/servers/${serverId}/files/write`, {
                file: filePath,
                content
            });
            toast.success('File saved');
        } catch (error) {
            toast.error('Failed to save file');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-purple-500" size={32} />
            </div>
        );
    }

    return (
        <div className="bg-[#0d1117] rounded-xl overflow-hidden border border-white/10 flex flex-col h-[600px] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-white/10">
                <div className="font-mono text-sm text-gray-300">
                    Editing: <span className="text-white font-bold">{filePath}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Editor */}
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 w-full bg-[#0d1117] text-gray-300 font-mono p-4 resize-none focus:outline-none"
                spellCheck={false}
            />
        </div>
    );
};

export default FileEditor;
