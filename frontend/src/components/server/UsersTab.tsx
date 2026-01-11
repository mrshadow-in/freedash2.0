import { useState } from 'react';
import { Users, UserPlus, Trash2, Edit2, Save, X, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface UsersTabProps {
    server: any;
}

const DEFAULT_PERMISSIONS = {
    console: { view: false, send: false },
    files: { view: false, edit: false, delete: false },
    power: { start: false, stop: false, restart: false },
    settings: { view: false, edit: false },
    plugins: { view: false, install: false, delete: false }
};

const UsersTab = ({ server }: UsersTabProps) => {
    const queryClient = useQueryClient();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

    // Fetch subusers
    const { data: subusers = [], isLoading } = useQuery({
        queryKey: ['subusers', server.id],
        queryFn: async () => {
            const res = await api.get(`/servers/${server.id}/subusers`);
            return res.data;
        }
    });

    // Add subuser mutation
    const addMutation = useMutation({
        mutationFn: async (data: { email: string; permissions: any }) => {
            return api.post(`/servers/${server.id}/subusers`, data);
        },
        onSuccess: () => {
            toast.success('Subuser added successfully');
            queryClient.invalidateQueries({ queryKey: ['subusers', server.id] });
            setShowAddModal(false);
            setNewUserEmail('');
            setPermissions(DEFAULT_PERMISSIONS);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to add subuser');
        }
    });

    // Update permissions mutation
    const updateMutation = useMutation({
        mutationFn: async ({ userId, permissions }: { userId: string; permissions: any }) => {
            return api.put(`/servers/${server.id}/subusers/${userId}`, { permissions });
        },
        onSuccess: () => {
            toast.success('Permissions updated');
            queryClient.invalidateQueries({ queryKey: ['subusers', server.id] });
            setEditingUser(null);
        },
        onError: () => {
            toast.error('Failed to update permissions');
        }
    });

    // Remove subuser mutation
    const removeMutation = useMutation({
        mutationFn: async (userId: string) => {
            return api.delete(`/servers/${server.id}/subusers/${userId}`);
        },
        onSuccess: () => {
            toast.success('Subuser removed');
            queryClient.invalidateQueries({ queryKey: ['subusers', server.id] });
        },
        onError: () => {
            toast.error('Failed to remove subuser');
        }
    });

    const handleAddSubuser = () => {
        if (!newUserEmail.trim()) {
            toast.error('Please enter an email');
            return;
        }
        addMutation.mutate({ email: newUserEmail, permissions });
    };

    const handleUpdatePermissions = (userId: string) => {
        updateMutation.mutate({ userId, permissions: editingUser.permissions });
    };

    const handlePermissionChange = (category: string, permission: string, value: boolean, isEditing = false) => {
        if (isEditing) {
            setEditingUser((prev: any) => ({
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [category]: {
                        ...prev.permissions[category],
                        [permission]: value
                    }
                }
            }));
        } else {
            setPermissions(prev => ({
                ...prev,
                [category]: {
                    ...prev[category],
                    [permission]: value
                }
            }));
        }
    };

    const PermissionCheckbox = ({ label, checked, onChange }: any) => (
        <label className="flex items-center gap-2 cursor-pointer">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
            />
            <span className="text-sm text-gray-300">{label}</span>
        </label>
    );

    const PermissionsEditor = ({ perms, onChange, isEditing = false }: any) => (
        <div className="space-y-4">
            {/* Console Permissions */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Console
                </h4>
                <div className="space-y-2">
                    <PermissionCheckbox
                        label="View Console"
                        checked={perms.console?.view || false}
                        onChange={(val: boolean) => onChange('console', 'view', val, isEditing)}
                    />
                    <PermissionCheckbox
                        label="Send Commands"
                        checked={perms.console?.send || false}
                        onChange={(val: boolean) => onChange('console', 'send', val, isEditing)}
                    />
                </div>
            </div>

            {/* Files Permissions */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Files
                </h4>
                <div className="space-y-2">
                    <PermissionCheckbox
                        label="View Files"
                        checked={perms.files?.view || false}
                        onChange={(val: boolean) => onChange('files', 'view', val, isEditing)}
                    />
                    <PermissionCheckbox
                        label="Edit Files"
                        checked={perms.files?.edit || false}
                        onChange={(val: boolean) => onChange('files', 'edit', val, isEditing)}
                    />
                    <PermissionCheckbox
                        label="Delete Files"
                        checked={perms.files?.delete || false}
                        onChange={(val: boolean) => onChange('files', 'delete', val, isEditing)}
                    />
                </div>
            </div>

            {/* Power Permissions */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    Power Controls
                </h4>
                <div className="space-y-2">
                    <PermissionCheckbox
                        label="Start Server"
                        checked={perms.power?.start || false}
                        onChange={(val: boolean) => onChange('power', 'start', val, isEditing)}
                    />
                    <PermissionCheckbox
                        label="Stop Server"
                        checked={perms.power?.stop || false}
                        onChange={(val: boolean) => onChange('power', 'stop', val, isEditing)}
                    />
                    <PermissionCheckbox
                        label="Restart Server"
                        checked={perms.power?.restart || false}
                        onChange={(val: boolean) => onChange('power', 'restart', val, isEditing)}
                    />
                </div>
            </div>

            {/* Settings Permissions */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    Settings
                </h4>
                <div className="space-y-2">
                    <PermissionCheckbox
                        label="View Settings"
                        checked={perms.settings?.view || false}
                        onChange={(val: boolean) => onChange('settings', 'view', val, isEditing)}
                    />
                    <PermissionCheckbox
                        label="Edit Settings"
                        checked={perms.settings?.edit || false}
                        onChange={(val: boolean) => onChange('settings', 'edit', val, isEditing)}
                    />
                </div>
            </div>

            {/* Plugins Permissions */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Plugins
                </h4>
                <div className="space-y-2">
                    <PermissionCheckbox
                        label="View Plugins"
                        checked={perms.plugins?.view || false}
                        onChange={(val: boolean) => onChange('plugins', 'view', val, isEditing)}
                    />
                    <PermissionCheckbox
                        label="Install Plugins"
                        checked={perms.plugins?.install || false}
                        onChange={(val: boolean) => onChange('plugins', 'install', val, isEditing)}
                    />
                    <PermissionCheckbox
                        label="Delete Plugins"
                        checked={perms.plugins?.delete || false}
                        onChange={(val: boolean) => onChange('plugins', 'delete', val, isEditing)}
                    />
                </div>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-purple-500" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Users size={24} className="text-purple-400" />
                    Subusers ({subusers.length})
                </h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold transition flex items-center gap-2"
                >
                    <UserPlus size={18} />
                    Add Subuser
                </button>
            </div>

            {/* Subusers List */}
            {subusers.length === 0 ? (
                <div className="bg-white/5 rounded-xl p-12 border border-white/10 text-center">
                    <Users size={48} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400 mb-2">No subusers yet</p>
                    <p className="text-sm text-gray-500">Add subusers to give others access to this server</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {subusers.map((subuser: any) => (
                        <div key={subuser.id} className="bg-white/5 rounded-xl p-6 border border-white/10">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-white font-bold">{subuser.user.username}</h3>
                                    <p className="text-sm text-gray-400">{subuser.user.email}</p>
                                </div>
                                <div className="flex gap-2">
                                    {editingUser?.id === subuser.id ? (
                                        <>
                                            <button
                                                onClick={() => handleUpdatePermissions(subuser.user.id)}
                                                disabled={updateMutation.isPending}
                                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition disabled:opacity-50"
                                            >
                                                <Save size={16} />
                                            </button>
                                            <button
                                                onClick={() => setEditingUser(null)}
                                                className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition"
                                            >
                                                <X size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setEditingUser(subuser)}
                                                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => removeMutation.mutate(subuser.user.id)}
                                                disabled={removeMutation.isPending}
                                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {editingUser?.id === subuser.id ? (
                                <PermissionsEditor
                                    perms={editingUser.permissions}
                                    onChange={handlePermissionChange}
                                    isEditing={true}
                                />
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                    {Object.entries(subuser.permissions).map(([category, perms]: [string, any]) => (
                                        <div key={category} className="p-2 bg-white/5 rounded">
                                            <p className="text-gray-400 capitalize mb-1">{category}</p>
                                            <p className="text-white">
                                                {Object.values(perms).filter(Boolean).length}/{Object.keys(perms).length}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add Subuser Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0d0620] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">Add Subuser</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">User Email</label>
                                <input
                                    type="email"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                />
                            </div>

                            <div>
                                <h4 className="text-white font-bold mb-4">Permissions</h4>
                                <PermissionsEditor
                                    perms={permissions}
                                    onChange={handlePermissionChange}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleAddSubuser}
                                    disabled={addMutation.isPending}
                                    className="flex-1 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {addMutation.isPending ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={18} />
                                            Add Subuser
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-bold transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersTab;
