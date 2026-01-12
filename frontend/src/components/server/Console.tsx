import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { Loader2, Cpu, Activity, HardDrive, Wifi, Maximize2, Minimize2 } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

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
    const [statsHistory, setStatsHistory] = useState<any[]>([]);
    const [command, setCommand] = useState('');

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
            if (xtermRef.current) xtermRef.current.dispose();
        };
    }, [serverId, serverStatus]);

    // Initial empty data for charts
    useEffect(() => {
        const initialData = Array(20).fill(0).map((_, i) => ({
            time: i,
            cpu: 0,
            memory: 0
        }));
        setStatsHistory(initialData);
    }, []);

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

        if (terminalRef.current && !xtermRef.current) {
            const term = new Terminal({
                cursorBlink: true,
                convertEol: true,
                disableStdin: true, // Read-only console
                scrollback: 5000, // Increase buffer
                theme: {
                    background: '#0d1117',
                    foreground: '#c9d1d9',
                },
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                fontSize: 14,
                allowProposedApi: true
            });
            const fitAddon = new FitAddon();
            term.loadAddon(fitAddon);
            term.open(terminalRef.current);
            fitAddon.fit();

            xtermRef.current = term;
            fitAddonRef.current = fitAddon;

            term.onData((data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ event: 'send command', args: [data] }));
                }
            });

            const resizeObserver = new ResizeObserver(() => fitAddon.fit());
            resizeObserver.observe(terminalRef.current);

            // Initial clear on new connection
            // term.clear(); 
        }
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
                xtermRef.current?.write(args[0]);
                break;
            case 'stats':
                try {
                    const statsData = JSON.parse(args[0]);
                    setStats(statsData);
                    setStatsHistory(prev => {
                        const newData = [...prev.slice(1), {
                            time: new Date().toLocaleTimeString(),
                            cpu: statsData.cpu_absolute || 0,
                            memory: (statsData.memory_bytes || 0) / 1024 / 1024
                        }];
                        return newData;
                    });
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

    const formatBytes = (bytes: number) => {
        if (!bytes) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    const [isFullscreen, setIsFullscreen] = useState(false);

    // Trigger resize when fullscreen toggles
    useEffect(() => {
        setTimeout(() => {
            fitAddonRef.current?.fit();
        }, 100);
    }, [isFullscreen]);

    return (
        <div className={`flex flex-col lg:flex-row gap-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0c0229] p-4 h-screen w-screen' : 'min-h-[800px]'}`}>
            {/* Terminal Section */}
            <div className={`flex-1 flex flex-col bg-[#0f111a] rounded-xl overflow-hidden border border-white/5 shadow-2xl min-w-0 ring-1 ring-white/5 ${isFullscreen ? 'h-full' : 'min-h-[600px]'}`}>
                {/* Header with Status */}
                <div className="flex items-center justify-between px-5 py-3 bg-[#13161f] border-b border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                        <span className="text-xs font-mono text-gray-400 uppercase tracking-widest font-semibold">{status}</span>
                    </div>

                    {/* Fullscreen Toggle */}
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="lg:hidden flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-300 bg-white/10 hover:bg-white/20 hover:text-white rounded-lg transition border border-white/10"
                    >
                        {isFullscreen ? (
                            <>
                                <Minimize2 size={14} /> <span>Exit Fullscreen</span>
                            </>
                        ) : (
                            <>
                                <Maximize2 size={14} /> <span>Maximize</span>
                            </>
                        )}
                    </button>
                </div>

                <div className="flex-1 relative min-h-0 bg-[#0f111a]">
                    {/* Loaders/Error overlays */}
                    {status === 'connecting' && (
                        <div className="absolute inset-0 flex flex-col z-20 items-center justify-center bg-[#0f111a]/90 gap-4 backdrop-blur-sm transition-all duration-300">
                            <Loader2 className="animate-spin text-indigo-500" size={32} />
                            <span className="text-gray-400 text-sm font-mono tracking-wider">CONNECTING TO WINGS...</span>
                        </div>
                    )}

                    <div ref={terminalRef} className="h-full w-full" />
                </div>

                {/* Input */}
                <div className="flex items-center gap-3 px-5 py-4 bg-[#13161f] border-t border-white/5 safe-area-bottom">
                    <span className="text-indigo-400 font-mono text-lg font-bold">{'>'}</span>
                    <input
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
                        placeholder="Type a command..."
                        className="flex-1 bg-transparent border-none outline-none text-gray-200 font-mono placeholder-gray-600 focus:ring-0"
                        disabled={status !== 'connected'}
                    />
                </div>
            </div>

            {/* Stats Sidebar - Hidden in fullscreen */}
            {!isFullscreen && (
                <div className="w-full lg:w-72 flex flex-col gap-4">

                    {/* Uptime/State Card */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-xl p-5 shadow-lg ring-1 ring-white/5 backdrop-blur-sm">
                        <h3 className="text-gray-500 text-xs uppercase font-bold mb-2 tracking-wider">Server State</h3>
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${stats?.state === 'running' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                            <span className="text-white font-mono capitalize text-lg font-semibold">{stats?.state || 'Unknown'}</span>
                        </div>
                        <div className="mt-3 text-xs text-gray-500 font-mono flex justify-between">
                            <span>Uptime:</span>
                            <span className="text-gray-300">{stats?.uptime ? (stats.uptime / 1000).toFixed(0) + 's' : '--'}</span>
                        </div>
                    </div>

                    {/* CPU Graph */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-xl p-5 flex-1 min-h-[180px] shadow-lg ring-1 ring-white/5 flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-gray-500 text-xs uppercase font-bold flex items-center gap-2 tracking-wider"><Cpu size={14} className="text-indigo-500" /> CPU Load</h3>
                            <span className="text-indigo-400 font-mono text-sm font-bold">{stats?.cpu_absolute?.toFixed(1) || 0}%</span>
                        </div>
                        <div className="h-32 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={statsHistory}>
                                    <defs>
                                        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="cpu" stroke="#818cf8" fill="url(#cpuGradient)" strokeWidth={2} isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Memory Graph */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-xl p-5 flex-1 min-h-[180px] shadow-lg ring-1 ring-white/5 flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-gray-500 text-xs uppercase font-bold flex items-center gap-2 tracking-wider"><Activity size={14} className="text-blue-500" /> Memory</h3>
                            <span className="text-blue-400 font-mono text-sm font-bold">{formatBytes(stats?.memory_bytes || 0)}</span>
                        </div>
                        <div className="h-32 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={statsHistory}>
                                    <defs>
                                        <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="memory" stroke="#3b82f6" fill="url(#memGradient)" strokeWidth={2} isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Network / Disk Text */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0f111a] border border-white/5 rounded-xl p-4 shadow-lg ring-1 ring-white/5">
                            <h3 className="text-gray-500 text-xs uppercase font-bold mb-2 flex items-center gap-2 tracking-wider"><HardDrive size={12} className="text-purple-500" /> Disk</h3>
                            <div className="text-purple-400 font-mono text-sm font-bold truncate">
                                {formatBytes(stats?.disk_bytes || 0)}
                            </div>
                        </div>
                        <div className="bg-[#0f111a] border border-white/5 rounded-xl p-4 shadow-lg ring-1 ring-white/5">
                            <h3 className="text-gray-500 text-xs uppercase font-bold mb-2 flex items-center gap-2 tracking-wider"><Wifi size={12} className="text-yellow-500" /> Net</h3>
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>IN</span>
                                    <span className="text-yellow-400 font-mono">{formatBytes(stats?.network?.rx_bytes || 0)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>OUT</span>
                                    <span className="text-yellow-400 font-mono">{formatBytes(stats?.network?.tx_bytes || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Console;
