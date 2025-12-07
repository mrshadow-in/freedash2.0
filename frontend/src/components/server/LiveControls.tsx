import { useState, useEffect, useRef } from 'react';
import { Terminal, Send, Play, Pause, Download } from 'lucide-react';
import { motion } from 'framer-motion';

interface LiveControlsProps {
    server: any;
}

const LiveControls = ({ server }: LiveControlsProps) => {
    const [logs, setLogs] = useState<string[]>(['Connecting to server stream...']);
    const [command, setCommand] = useState('');
    const [isPaused, setIsPaused] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Mock Websocket Activity
    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            const mockLogs = [
                '[Server thread/INFO]: Keeping entity minecraft:pig that is already active',
                '[Server thread/INFO]: Can\'t keep up! Is the server overloaded? Running 2005ms or 40 ticks behind',
                `[Server thread/INFO]: ${server.name} heartbeat received`,
                '[Server thread/WARN]: Mismatched mod list string',
                '[Server thread/INFO]: UUID of player LordUser is 1234-5678-90ab',
            ];
            const randomLog = mockLogs[Math.floor(Math.random() * mockLogs.length)];
            const timestamp = new Date().toLocaleTimeString();

            setLogs(prev => {
                const newLogs = [...prev, `[${timestamp}] ${randomLog}`];
                if (newLogs.length > 100) return newLogs.slice(-100);
                return newLogs;
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [isPaused, server.name]);

    // Auto-scroll
    useEffect(() => {
        if (!isPaused && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isPaused]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!command.trim()) return;

        setLogs(prev => [...prev, `> ${command}`]);
        // Here we would call API to send command
        setCommand('');
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#12131a] rounded-2xl border border-white/5 overflow-hidden flex flex-col h-[500px]"
        >
            {/* Header */}
            <div className="bg-[#1a1b26] p-4 flex justify-between items-center border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Terminal size={18} className="text-gray-400" />
                    <span className="font-bold text-gray-200">Live Console</span>
                    <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        Online
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`p-2 rounded-lg transition ${isPaused ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-white/5 text-gray-400'}`}
                        title={isPaused ? "Resume Scroll" : "Pause Scroll"}
                    >
                        {isPaused ? <Play size={16} /> : <Pause size={16} />}
                    </button>
                    <button className="p-2 hover:bg-white/5 text-gray-400 rounded-lg transition" title="Download Logs">
                        <Download size={16} />
                    </button>
                </div>
            </div>

            {/* Logs Area */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1 bg-[#0f1016]">
                {logs.map((log, i) => (
                    <div key={i} className="break-all">
                        <span className="text-gray-500">{log.split('] ')[0]}] </span>
                        <span className={log.includes('WARN') ? 'text-yellow-400' : log.includes('ERROR') ? 'text-red-400' : log.startsWith('>') ? 'text-blue-400 font-bold' : 'text-gray-300'}>
                            {log.split('] ').slice(1).join('] ')}
                        </span>
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-[#1a1b26] border-t border-white/5 flex gap-2">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono">{'>'}</span>
                    <input
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        placeholder="Type a command..."
                        className="w-full bg-[#0f1016] border border-white/10 rounded-lg py-2 pl-8 pr-4 text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition"
                    />
                </div>
                <button
                    type="submit"
                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                >
                    <Send size={18} />
                </button>
            </form>
        </motion.div>
    );
};

export default LiveControls;
