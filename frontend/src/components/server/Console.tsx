import { useEffect, useRef, useState } from 'react';
import { Loader2, Cpu, Activity, Wifi, Maximize2, Minimize2, Terminal as TerminalIcon } from 'lucide-react';
import api from '../../api/client';
import { toast } from 'react-hot-toast';


interface ConsoleProps {
    serverId: string;
    serverStatus?: string;
}

const Console = ({ serverId, serverStatus }: ConsoleProps) => {
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error' | 'installing'>('connecting');
    const [stats, setStats] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [command, setCommand] = useState('');
    const [isAutoScroll, setIsAutoScroll] = useState(true);
    const [showEulaModal, setShowEulaModal] = useState(false);
    const [eulaAlreadyAccepted, setEulaAlreadyAccepted] = useState(false); // Track if EULA already accepted

    // Check if EULA is already accepted on mount
    useEffect(() => {
        const checkEulaStatus = async () => {
            try {
                const response = await api.post(`/servers/${serverId}/files/read`, {
                    file: 'eula.txt'
                });

                const eulaContent = response.data.content || '';
                // Check if eula=true exists in the file
                if (eulaContent.toLowerCase().includes('eula=true')) {
                    console.log('✅ EULA already accepted');
                    setEulaAlreadyAccepted(true);
                } else {
                    console.log('⚠️ EULA not accepted yet');
                    setEulaAlreadyAccepted(false);
                }
            } catch (error) {
                // File doesn't exist or can't be read - EULA not accepted
                console.log('⚠️ eula.txt not found - EULA not accepted');
                setEulaAlreadyAccepted(false);
            }
        };

        checkEulaStatus();
    }, [serverId]);

    const sendCommand = () => {
        if (!command.trim()) return;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ event: 'send command', args: [command] }));
            setCommand('');
        }
    };

    const connect = async () => {
        if (serverStatus === 'installing' || serverStatus === 'transferring') {
            setStatus('installing');
            return;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setStatus('connecting');
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                console.error('[Console] No auth token');
                setStatus('error');
                return;
            }

            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const host = window.location.host.includes('localhost')
                ? 'localhost:3000'
                : window.location.host;

            const wsUrl = window.location.host.includes('localhost')
                ? `${protocol}://${host}/api/ws/console?serverId=${serverId}&token=${token}`
                : `${protocol}://${window.location.host}/api/ws/console?serverId=${serverId}&token=${token}`;

            initWebSocket(wsUrl);
        } catch (error: any) {
            console.error('[Console] Failed to connect:', error.message);
            setStatus('error');
        }
    };

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, [serverId, serverStatus]);

    const initWebSocket = (url: string) => {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            // WS opened
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleEvent(data);
        };

        ws.onclose = () => setStatus('disconnected');
        ws.onerror = () => setStatus('error');
    };

    const handleEvent = (data: any) => {
        const { event, args } = data;
        switch (event) {
            case 'auth success':
                setStatus('connected');
                // Request logs immediately
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ event: 'send logs', args: [] }));
                }
                break;
            case 'console output':
                // Check if args[0] is array or single string
                const newLogs = Array.isArray(args[0]) ? args[0] : [args[0]];
                // Split multi-line logs if necessary and remove empty lines
                const validLogs: string[] = [];
                newLogs.forEach((log: string) => {
                    // Remove ANSI codes for cleaner rendering (optional, or parse them)
                    // For now, let's strip basic ANSI color codes to prevent garbled text
                    // eslint-disable-next-line no-control-regex
                    const cleanLog = log.replace(/\x1b\[[0-9;]*m/g, '');

                    // EULA Detection (Broadened)
                    const lowerLog = cleanLog.toLowerCase();

                    // Enhanced EULA Detection - catches multiple patterns
                    const eulaPatterns = [
                        'eula',
                        'end user license agreement',
                        'failed to load eula',
                        'go to eula.txt',
                        'agree to the eula',
                        'eula=false',
                        'you need to agree',
                        'stopping server'
                    ];

                    const hasEulaKeyword = eulaPatterns.some(pattern => lowerLog.includes(pattern));

                    // Only show EULA modal if:
                    // 1. EULA is NOT already accepted (checked from file)
                    // 2. Log contains EULA keywords
                    // 3. Log specifically mentions "false" or "not agreed" (means EULA not accepted)
                    // 4. Don't show if log says "eula=true" (already accepted)
                    if (!eulaAlreadyAccepted &&
                        hasEulaKeyword &&
                        (lowerLog.includes('eula') || lowerLog.includes('agree')) &&
                        (lowerLog.includes('false') || lowerLog.includes('you need to agree') || lowerLog.includes('failed to load')) &&
                        !lowerLog.includes('eula=true')) {
                        console.log('🔴 EULA NOT ACCEPTED - Showing modal:', cleanLog);
                        setShowEulaModal(prev => !prev ? true : prev);
                    }

                    cleanLog.split('\n').forEach(line => {
                        if (line.trim()) validLogs.push(line);
                    });
                });

                setLogs(prev => [...prev, ...validLogs].slice(-1000)); // Keep last 1000 lines
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
            case 'token expired':
                connect();
                break;
        }
    };

    const handleAcceptEula = async () => {
        try {
            toast.loading('Accepting EULA...');
            // 1. Write EULA file
            await api.post(`/servers/${serverId}/files/write`, {
                file: 'eula.txt',
                content: 'eula=true'
            });

            // 2. Restart Server
            await api.post(`/servers/${serverId}/power`, { signal: 'start' });

            toast.success('EULA Accepted. Starting server...');
            setShowEulaModal(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to accept EULA');
        }
    };

    // Auto-scroll effect
    useEffect(() => {
        if (isAutoScroll && scrollContainerRef.current) {
            const { scrollHeight, clientHeight } = scrollContainerRef.current;
            scrollContainerRef.current.scrollTop = scrollHeight - clientHeight;
        }
    }, [logs, isAutoScroll]);

    // Detect user scroll to disable auto-scroll
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNearBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
        setIsAutoScroll(isNearBottom);
    };

    const formatBytes = (bytes: number) => {
        if (!bytes) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    const [isFullscreen, setIsFullscreen] = useState(false);

    // Custom Log Parser to apply colors
    const renderLogLine = (log: string, index: number) => {
        let className = "text-gray-300"; // Default

        if (log.toLowerCase().includes('error') || log.toLowerCase().includes('fail')) {
            className = "text-red-400";
        } else if (log.toLowerCase().includes('warn')) {
            className = "text-orange-400";
        } else if (log.includes('[Pterodactyl Daemon]') || log.includes('Daemon')) {
            className = "text-yellow-400";
        } else if (log.toLowerCase().includes('info')) {
            className = "text-blue-300";
        }

        return (
            <div key={index} className={`py-1 px-4 border-b border-white/5 hover:bg-white/5 transition-colors font-mono text-sm break-all whitespace-pre-wrap ${className}`}>
                {/* Visual indicator for log level */}
                <span className="opacity-50 mr-2 select-none border-r border-white/10 pr-2 text-xs">
                    {String(index + 1).padStart(3, '0')}
                </span>
                {log}
            </div>
        );
    };

    return (
        <div className={`flex flex-col gap-6 w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0c0229] p-4 h-screen' : 'h-full'}`}>

            {/* Live Stats Row */}
            {!isFullscreen && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                    {/* CPU Card */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-xl p-4 shadow-lg ring-1 ring-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
                            <Cpu size={40} className="text-indigo-500" />
                        </div>
                        <h3 className="text-gray-500 text-xs uppercase font-bold mb-1 tracking-wider">CPU Usage</h3>
                        <div className="text-2xl font-mono font-bold text-white mb-2">{stats?.cpu_absolute?.toFixed(1) || 0}%</div>
                        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-300"
                                style={{ width: `${Math.min(stats?.cpu_absolute || 0, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Memory Card */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-xl p-4 shadow-lg ring-1 ring-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
                            <Activity size={40} className="text-blue-500" />
                        </div>
                        <h3 className="text-gray-500 text-xs uppercase font-bold mb-1 tracking-wider">Memory</h3>
                        <div className="flex items-end gap-2 mb-2">
                            <div className="text-2xl font-mono font-bold text-white">{formatBytes(stats?.memory_bytes || 0)}</div>
                            <div className="text-xs text-gray-500 mb-1">/ {formatBytes(stats?.memory_limit_bytes || 0)}</div>
                        </div>
                        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-300"
                                style={{ width: `${Math.min(((stats?.memory_bytes || 0) / (stats?.memory_limit_bytes || 1)) * 100, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Network Card */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-xl p-4 shadow-lg ring-1 ring-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
                            <Wifi size={40} className="text-purple-500" />
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-gray-500 text-xs uppercase font-bold mb-1 tracking-wider">Disk</h3>
                                <div className="text-lg font-mono font-bold text-white mb-2">{formatBytes(stats?.disk_bytes || 0)}</div>
                            </div>
                            <div className="text-right">
                                <h3 className="text-gray-500 text-xs uppercase font-bold mb-1 tracking-wider">Network</h3>
                                <div className="text-xs text-gray-400 font-mono">
                                    RX: <span className="text-green-400">{formatBytes(stats?.network?.rx_bytes || 0)}</span>
                                </div>
                                <div className="text-xs text-gray-400 font-mono">
                                    TX: <span className="text-orange-400">{formatBytes(stats?.network?.tx_bytes || 0)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden mt-1">
                            <div className="h-full w-full bg-gradient-to-r from-transparent via-purple-500/50 to-transparent animate-shimmer" />
                        </div>
                    </div>
                </div>
            )}

            {/* Console Container - Uses flex-1 to take REMAINING height */}
            <div className={`flex flex-col bg-[#0f111a] rounded-xl overflow-hidden border border-white/5 shadow-2xl min-w-0 ring-1 ring-white/5 w-full flex-1 min-h-0`}>
                {/* Header with Status */}
                <div className="flex items-center justify-between px-5 py-3 bg-[#13161f] border-b border-white/5 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-black/20 rounded-lg border border-white/5">
                            <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                            <span className="text-xs font-mono text-gray-300 uppercase tracking-widest font-bold">{status}</span>
                        </div>
                        {isAutoScroll && status === 'connected' && (
                            <span className="text-xs text-indigo-400 flex items-center gap-1 animate-pulse">
                                <Activity size={12} /> Live Output
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition border border-white/5"
                    >
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                </div>

                {/* Log Output Area */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 relative min-h-0 bg-[#0d1117] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent p-2 font-mono text-sm"
                >
                    {/* EULA Modal Overlay */}
                    {showEulaModal && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                            <div className="bg-[#161b22] border border-red-500/50 rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
                                <div className="flex items-center gap-3 mb-4 text-red-400">
                                    <TerminalIcon size={32} />
                                    <h3 className="text-xl font-bold text-white">EULA Acceptance Required</h3>
                                </div>
                                <p className="text-gray-300 mb-6 leading-relaxed">
                                    The server cannot start because you have not agreed to the Minecraft EULA.
                                </p>
                                <div className="bg-black/30 p-3 rounded mb-6 text-xs text-gray-500 font-mono">
                                    By clicking "I Agree", you are indicating your agreement to the <a href="https://account.mojang.com/documents/minecraft_eula" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Minecraft EULA</a>.
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowEulaModal(false)}
                                        className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        onClick={handleAcceptEula}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg shadow-red-900/20 transition-all hover:scale-105 active:scale-95"
                                    >
                                        I Agree & Start Server
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Connection Loader */}
                    {status === 'connecting' && (
                        <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                            <Loader2 className="animate-spin text-indigo-500" size={32} />
                            <span className="text-gray-400 tracking-widest text-xs">CONNECTING...</span>
                        </div>
                    )}

                    {/* Empty State */}
                    {status === 'connected' && logs.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-2 opacity-30">
                            <TerminalIcon size={48} className="text-gray-500" />
                            <p className="text-gray-500">No logs yet...</p>
                        </div>
                    )}

                    {/* Logs */}
                    <div className="flex flex-col">
                        {logs.map((log, i) => renderLogLine(log, i))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Scroll to Bottom Button */}
                    {!isAutoScroll && (
                        <button
                            onClick={() => {
                                setIsAutoScroll(true);
                                if (scrollContainerRef.current) {
                                    const { scrollHeight, clientHeight } = scrollContainerRef.current;
                                    scrollContainerRef.current.scrollTop = scrollHeight - clientHeight;
                                }
                            }}
                            className="absolute bottom-4 right-4 bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-full shadow-xl transition transform hover:scale-110 active:scale-95 animate-in fade-in zoom-in duration-200 z-10"
                            title="Scroll to Bottom"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </button>
                    )}
                </div>

                {/* Input Bar */}
                <div className="flex items-center gap-3 px-4 py-3 bg-[#13161f] border-t border-white/5 safe-area-bottom">
                    <span className="text-indigo-500 font-mono text-lg font-bold">{'>'}</span>
                    <input
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
                        placeholder="Type a command..."
                        className="flex-1 bg-transparent border-none outline-none text-gray-200 font-mono placeholder-gray-600 focus:ring-0 text-sm"
                        disabled={status !== 'connected'}
                        autoFocus
                    />
                    <div className="text-[10px] text-gray-600 font-mono hidden sm:block select-none">
                        ⏎ to send
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Console;
