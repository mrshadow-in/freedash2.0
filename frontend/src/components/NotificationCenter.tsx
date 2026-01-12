import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle, AlertOctagon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    createdAt: string;
}

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    // Fetch Notifications
    const { data } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await api.get('/notifications');
            return res.data;
        },
        refetchInterval: 10000 // Poll every 10s
    });

    const unreadCount = data?.unreadCount || 0;
    const notifications: Notification[] = data?.notifications || [];

    // Mark All Read
    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            return api.patch('/notifications/read-all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    // Mark One Read
    const markOneReadMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.patch(`/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle size={16} className="text-green-400" />;
            case 'error': return <AlertOctagon size={16} className="text-red-400" />;
            case 'warning': return <AlertTriangle size={16} className="text-orange-400" />;
            default: return <Info size={16} className="text-blue-400" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0c0229]" />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 top-full mt-2 w-80 md:w-96 max-h-[500px] flex flex-col bg-[#1a1b26] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#13141f]">
                            <h3 className="font-semibold text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllReadMutation.mutate()}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
                                >
                                    <Check size={12} /> Mark all read
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <Bell size={24} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        onClick={() => !notif.read && markOneReadMutation.mutate(notif.id)}
                                        className={`p-3 rounded-lg flex gap-3 transition cursor-pointer group ${notif.read ? 'bg-transparent hover:bg-white/5 opacity-70' : 'bg-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className="mt-1 shrink-0">
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className={`text-sm font-medium truncate ${notif.read ? 'text-gray-400' : 'text-white'}`}>
                                                    {notif.title}
                                                </h4>
                                                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5 break-words line-clamp-2">
                                                {notif.message}
                                            </p>
                                        </div>
                                        {!notif.read && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
