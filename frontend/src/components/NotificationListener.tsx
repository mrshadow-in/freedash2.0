import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

export default function NotificationListener() {
    // In a real app, you'd get this from your auth store
    const token = localStorage.getItem('token');

    // Using refs to prevent connection churn on re-renders
    const ws = useRef<WebSocket | null>(null);
    const retryTimeout = useRef<any>(null);

    useEffect(() => {
        if (!token) return;

        const connect = () => {
            // Determine WS protocol (ws or wss)
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Use current host
            const host = window.location.host;
            // Construct URL: e.g., ws://localhost:3000/api/ws/notifications?token=XYZ
            // NOTE: Ensure your vite proxy or nginx routes /api/ws correctly
            const url = `${proto}//${host}/api/ws/notifications?token=${token}`;

            // Close existing
            if (ws.current) ws.current.close();

            const socket = new WebSocket(url);
            ws.current = socket;

            socket.onopen = () => {
                console.log('[WS] Connected to Notifications');
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Expected format: { type: 'success'|'error'|'info', title, message }

                    if (data.type === 'success') {
                        toast.success(`${data.title}: ${data.message}`, { duration: 5000 });
                    } else if (data.type === 'error') {
                        toast.error(`${data.title}: ${data.message}`, { duration: 6000 });
                    } else {
                        // Custom toast for info
                        toast(() => (
                            <div className="flex flex-col gap-1">
                                <span className="font-bold">{data.title}</span>
                                <span className="text-sm">{data.message}</span>
                            </div>
                        ), { duration: 5000 });
                    }
                } catch (e) {
                    console.error('[WS] Notification Parse Error', e);
                }
            };

            socket.onclose = () => {
                console.log('[WS] Disconnected. Retrying in 5s...');
                retryTimeout.current = setTimeout(connect, 5000);
            };

            socket.onerror = (err) => {
                console.error('[WS] Notification Error', err);
                socket.close(); // Force close to trigger retry logic
            };
        };

        connect();

        return () => {
            if (ws.current) ws.current.close();
            if (retryTimeout.current) clearTimeout(retryTimeout.current);
        };
    }, [token]);

    return null; // Invisible component
}
