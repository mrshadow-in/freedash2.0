import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import api from '../../api/client';
import { Loader2 } from 'lucide-react';

interface ConsoleProps {
    serverId: string;
    serverStatus?: string;
}

const Console = ({ serverId, serverStatus }: ConsoleProps) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error' | 'installing'>('connecting');
    const [stats, setStats] = useState<any>(null);

    const connect = async () => {
        // Check server status first
        if (serverStatus === 'installing' || serverStatus === 'transferring') {
            setStatus('installing');
            return;
        }

        setStatus('connecting');
        try {
            console.log('[Console] Fetching credentials from /servers/' + serverId + '/console');
            const res = await api.get(`/servers/${serverId}/console`);
            const { token, socket } = res.data;
            console.log('[Console] Received socket URL:', socket);
            console.log('[Console] Token length:', token?.length || 0);
            initWebSocket(socket, token);
        } catch (error: any) {
            console.error('[Console] Failed to get console credentials:', error.response?.data || error.message);
            setStatus('error');
        }
    };

    useEffect(() => {
        connect();

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (xtermRef.current) xtermRef.current.dispose();
        };
    }, [serverId, serverStatus]);

    const initWebSocket = (url: string, token: string) => {
        console.log('[Console] Connecting to WebSocket:', url);
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket opened, sending auth...');
            // Send auth immediately on connection - REQUIRED by Pterodactyl
            ws.send(JSON.stringify({ event: 'auth', args: [token] }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleEvent(data);
        };

        ws.onclose = (event) => {
            console.log('WebSocket Closed:', event.code, event.reason);
            setStatus('disconnected');
        };

        ws.onerror = (err) => {
            console.error('WebSocket Error:', err);
            setStatus('error');
        };

        // Initialize Terminal
        if (terminalRef.current && !xtermRef.current) {
            const term = new Terminal({
                cursorBlink: true,
                theme: {
                    background: '#0d1117',
                    foreground: '#c9d1d9',
                },
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                fontSize: 14,
            });
            const fitAddon = new FitAddon();
            term.loadAddon(fitAddon);
            term.open(terminalRef.current);
            fitAddon.fit();

            xtermRef.current = term;
            fitAddonRef.current = fitAddon;

            // Handle Input - use 'send command' event (Pterodactyl protocol)
            term.onData((data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ event: 'send command', args: [data] }));
                }
            });

            // Resize observer
            const resizeObserver = new ResizeObserver(() => {
                fitAddon.fit();
            });
            resizeObserver.observe(terminalRef.current);
        }
    };

    const handleEvent = (data: any) => {
        const { event, args } = data;
        switch (event) {
            case 'auth success':
                console.log('Console authenticated successfully');
                setStatus('connected');
                break;
            case 'console output':
                xtermRef.current?.write(args[0]);
                break;
            case 'status':
                console.log('Server status:', args[0]);
                break;
            case 'stats':
                try {
                    const statsData = JSON.parse(args[0]);
                    setStats(statsData);
                } catch (e) {
                    console.error('Failed to parse stats:', e);
                }
                break;
            case 'token expiring':
                console.log('Console token expiring, should reconnect...');
                // Auto-reconnect with fresh token
                connect();
                break;
            case 'token expired':
                console.log('Console token expired, reconnecting...');
                connect();
                break;
            case 'jwt error':
                console.error('JWT Error from Console Socket');
                setStatus('error');
                break;
            default:
                console.log('Console event:', event, args);
                break;
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-[#0d1117] rounded-xl overflow-hidden border border-white/10 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-xs font-mono text-gray-400 uppercase">{status}</span>
                </div>
                {stats && (
                    <div className="flex gap-4 text-xs font-mono text-gray-400">
                        <span>CPU: {Math.round(stats.cpu_absolute)}%</span>
                        <span>MEM: {(stats.memory_bytes / 1024 / 1024).toFixed(0)}MB</span>
                    </div>
                )}
            </div>

            {/* Terminal Area */}
            <div className="flex-1 relative">
                {status === 'connecting' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1117] z-10 gap-4">
                        <Loader2 className="animate-spin text-purple-500" size={32} />
                        <span className="text-gray-400">Connecting to server socket...</span>
                    </div>
                )}
                {status === 'installing' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1117] z-10 p-8 text-center text-yellow-500">
                        <Loader2 className="animate-spin mb-4" size={48} />
                        <h3 className="text-xl font-bold mb-2">Server Installing</h3>
                        <p className="text-gray-400 max-w-md">Your server is currently being set up. The console will be available once the installation is complete.</p>
                    </div>
                )}
                {status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1117] z-10 text-red-500 gap-4">
                        <span className="text-lg font-bold">Connection Failed</span>
                        <button
                            onClick={connect}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm transition"
                        >
                            Retry Connection
                        </button>
                    </div>
                )}
                {status === 'disconnected' && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="bg-[#161b22] border border-white/10 p-6 rounded-xl flex flex-col items-center shadow-2xl">
                            <h3 className="text-red-400 font-bold mb-2">Disconnected</h3>
                            <button
                                onClick={connect}
                                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition"
                            >
                                Reconnect
                            </button>
                        </div>
                    </div>
                )}
                <div ref={terminalRef} className="h-full w-full" />
            </div>
        </div>
    );
};

export default Console;
