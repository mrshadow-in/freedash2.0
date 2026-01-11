import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import api from '../../api/client';
import { Loader2 } from 'lucide-react';

interface ConsoleProps {
    serverId: string;
}

const Console = ({ serverId }: ConsoleProps) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        // Fetch Credentials
        const connect = async () => {
            try {
                const res = await api.get(`/servers/${serverId}/console`);
                const { token, socket } = res.data;
                initWebSocket(socket, token);
            } catch (error) {
                console.error('Failed to get console credentials', error);
                setStatus('error');
            }
        };

        connect();

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (xtermRef.current) xtermRef.current.dispose();
        };
    }, [serverId]);

    const initWebSocket = (url: string, token: string) => {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setStatus('connected');
            ws.send(JSON.stringify({ event: 'auth', args: [token] }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleEvent(data);
        };

        ws.onclose = () => {
            setStatus('disconnected');
        };

        ws.onerror = () => {
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

            // Handle Input
            term.onData((data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ event: 'send', args: [data] }));
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
            case 'console output':
                xtermRef.current?.write(args[0]);
                break;
            case 'stats':
                const stats = JSON.parse(args[0]);
                setStats(stats);
                break;
            case 'token expiring':
                // Refresh token logic could go here
                break;
            case 'jwt error':
                setStatus('error');
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
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117] z-10">
                        <Loader2 className="animate-spin text-purple-500" />
                    </div>
                )}
                {status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117] z-10 text-red-500">
                        Connection Failed
                    </div>
                )}
                <div ref={terminalRef} className="h-full w-full" />
            </div>
        </div>
    );
};

export default Console;
