import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import api from '../api/client';

interface ButtonAdSettings {
    enabled: boolean;
    script: string;
    cooldown: number;
    // Granular Scripts
    script_createServer?: string;
    script_afkStart?: string;
    script_serverStart?: string;
    script_serverStop?: string;
    script_serverRenew?: string;
}

const GlobalButtonAdInterceptor = () => {
    const location = useLocation();
    const [settings, setSettings] = useState<ButtonAdSettings>({ enabled: false, script: '', cooldown: 10 });
    const [adOpen, setAdOpen] = useState(false);
    const [loadingAd, setLoadingAd] = useState(true);
    const [cooldownActive, setCooldownActive] = useState(false);
    const [currentAdScript, setCurrentAdScript] = useState('');

    // Safety ref to track last interaction time to prevent infinite loops
    const adContainerRef = useRef<HTMLDivElement>(null);

    // Fetch settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings');
                if (res.data) {
                    setSettings({
                        enabled: res.data.buttonAdsEnabled || false,
                        script: res.data.buttonAdScript || '', // Generic/Fallback
                        cooldown: res.data.buttonAdCooldown || 10,
                        // Map backend fields to local state
                        script_createServer: res.data.adScript_createServer,
                        script_afkStart: res.data.adScript_afkStart,
                        script_serverStart: res.data.adScript_serverStart,
                        script_serverStop: res.data.adScript_serverStop,
                        script_serverRenew: res.data.adScript_serverRenew,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch ad settings', error);
            }
        };
        fetchSettings();
    }, [location.pathname]);

    // Global Click Interceptor
    useEffect(() => {
        // Skip for Admin Dashboard or if disabled
        if (location.pathname.startsWith('/admin') || !settings.enabled) return;

        const handleClick = (e: MouseEvent) => {
            // If cooldown is active, allow the click
            if (cooldownActive) return;

            // If ad is already open, don't trigger again
            if (adOpen) return;

            // Identify target
            const target = e.target as HTMLElement;

            // IGNORE clicks inside our own ad modal
            if (document.getElementById('global-button-ad-modal')?.contains(target)) return;

            // 1. Check for specific data-ad-id
            const specificAdElement = target.closest('[data-ad-id]');
            let targetScript = '';

            if (specificAdElement) {
                const adId = specificAdElement.getAttribute('data-ad-id');
                console.log('[AdTrap] Specific Ad ID detected:', adId);

                switch (adId) {
                    case 'create-server': targetScript = settings.script_createServer || ''; break;
                    case 'afk-start': targetScript = settings.script_afkStart || ''; break;
                    case 'server-start': targetScript = settings.script_serverStart || ''; break;
                    case 'server-stop': targetScript = settings.script_serverStop || ''; break;
                    case 'server-renew': targetScript = settings.script_serverRenew || ''; break;
                }
            }

            // 2. Fallback to generic script if enabled and target is interactive
            // Only fall back if NO specific script was found but we hit an interactive element, OR if they just didn't configure a specific script
            if (!targetScript && settings.script) {
                const isInteractive =
                    target.tagName === 'BUTTON' ||
                    target.tagName === 'A' ||
                    target.closest('button') ||
                    target.closest('a') ||
                    target.classList.contains('btn') ||
                    target.classList.contains('cursor-pointer');

                if (isInteractive) {
                    targetScript = settings.script;
                }
            }

            // If we found a script to show, TRAP THE CLICK
            if (targetScript) {
                e.preventDefault();
                e.stopPropagation();

                console.log('[AdTrap] Intercepting with script');
                setCurrentAdScript(targetScript);
                setAdOpen(true);
                setLoadingAd(true);

                // Start Cooldown
                setCooldownActive(true);
                setTimeout(() => {
                    setCooldownActive(false);
                    console.log('[AdTrap] Cooldown ended.');
                }, settings.cooldown * 1000);
            }
        };

        window.addEventListener('click', handleClick, true);
        return () => window.removeEventListener('click', handleClick, true);
    }, [settings, cooldownActive, adOpen, location.pathname]);

    // Handle Script Injection for the Modal
    useEffect(() => {
        if (adOpen && currentAdScript && adContainerRef.current) {
            const container = adContainerRef.current;
            container.innerHTML = ''; // Clear previous

            // Detect if URL (Iframe) or specific Script
            if (currentAdScript.trim().startsWith('<script')) {
                // Script Injection
                const range = document.createRange();
                range.selectNode(document.body);
                const documentFragment = range.createContextualFragment(currentAdScript);
                container.appendChild(documentFragment);
            } else if (currentAdScript.startsWith('http')) {
                // Iframe logic
                const iframe = document.createElement('iframe');
                iframe.src = currentAdScript;
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
                container.appendChild(iframe);
            } else {
                // Fallback text/html
                container.innerHTML = currentAdScript;
            }
            setLoadingAd(false);
        }
    }, [adOpen, currentAdScript]);

    if (!adOpen) return null;

    return (
        <div
            id="global-button-ad-modal"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
            <div className="relative w-full max-w-4xl h-[80vh] bg-[#0f0726] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
                    <span className="text-sm text-gray-400 font-mono">Advertisement</span>
                    <button
                        onClick={() => setAdOpen(false)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Ad Content */}
                <div className="flex-1 relative bg-white">
                    {loadingAd && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#0f0726]">
                            <Loader2 className="animate-spin text-purple-500" size={48} />
                        </div>
                    )}
                    <div ref={adContainerRef} className="w-full h-full overflow-auto" />
                </div>

                {/* Footer */}
                <div className="p-3 bg-black/40 text-center text-xs text-gray-500">
                    You may continue to your destination after closing this ad.
                </div>
            </div>
        </div>
    );
};

export default GlobalButtonAdInterceptor;
