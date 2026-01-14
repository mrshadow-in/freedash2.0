import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { Plus, ExternalLink, Loader2, ScanEye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useAdStore } from '../store/adStore';

export type AdZonePosition =
    | 'top'
    | 'after-header'
    | 'between-widgets'
    | 'before-servers'
    | 'after-servers'
    | 'server-sidebar-left'
    | 'server-sidebar-right'
    | 'server-header'
    | 'server-footer'
    | 'footer'
    | 'floating-left'
    | 'floating-right'
    | 'full-width'
    | 'sidebar-left'
    | 'sidebar-right'
    | 'between-stats'
    | 'below-stats'
    | 'empty-server-zone'
    | 'afk-top'
    | 'afk-middle'
    | 'afk-bottom'
    | 'afk-sidebar-left'
    | 'afk-sidebar-right'
    | 'afk-left-1'
    | 'afk-left-2'
    | 'afk-left-3'
    | 'afk-left-4'
    | 'afk-left-5'
    | 'afk-right-1'
    | 'afk-right-2'
    | 'afk-right-3'
    | 'afk-right-4'
    | 'afk-right-5';

interface Ad {
    id: string;
    title: string;
    imageUrl?: string;
    redirectUrl?: string;
    rawCode?: string;
    type: string;
    positionIndex: number;
}

interface AdZoneProps {
    position: AdZonePosition;
    className?: string;
    showBuyButton?: boolean;
    onBuyClick?: () => void;
    rotate?: boolean;
    rotationInterval?: number; // in seconds
    isAFK?: boolean;
}

const sizeClasses: Record<string, string> = {
    leaderboard: 'w-full max-w-[728px] h-[90px]',
    banner: 'w-full max-w-[468px] h-[60px]',
    square: 'w-full max-w-[300px] h-auto min-h-[100px]',
    'promo-strip': 'w-full h-[40px]',
    'full-width': 'w-full h-auto min-h-[100px]',
    'debug': 'w-full h-[100px]'
};

const RawAdRenderer: React.FC<{ code: string }> = ({ code }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!containerRef.current || !code) return;

        // Clear previous content
        containerRef.current.innerHTML = '';

        try {
            // Create a temporary container
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = code;

            // Append non-script elements using a range to properly handle HTML parsing
            const range = document.createRange();
            range.setStart(containerRef.current, 0);
            containerRef.current.appendChild(range.createContextualFragment(code));

            // Re-run scripts
            // This is necessary because setting innerHTML or using fragments doesn't auto-execute scripts in React
            const injectedScripts = containerRef.current.querySelectorAll('script');
            injectedScripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                oldScript.parentNode?.replaceChild(newScript, oldScript);
            });

        } catch (error) {
            console.error('Error rendering raw ad:', error);
        }
    }, [code]);

    return (
        <div
            ref={containerRef}
            className="w-full h-auto overflow-visible [&>iframe]:w-full [&>iframe]:h-auto [&>iframe]:border-none"
            style={{ maxWidth: 'none', minHeight: '10px' }}
        />
    );
};

const AdZone: React.FC<AdZoneProps> = ({
    position,
    className = '',
    showBuyButton = true,
    onBuyClick,
    rotate = false,
    rotationInterval = 30,
    isAFK = false
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { user } = useAuthStore(); // Get current user
    const { isDebugMode } = useAdStore(); // Debug mode from store
    const isAdmin = user?.role === 'ADMIN';

    const { data: ads, isLoading } = useQuery({
        queryKey: ['ads', position, isAFK],
        queryFn: async () => {
            const res = await api.get(`/ads?position=${position}${isAFK ? '&isAFK=true' : ''}`);
            return res.data as Ad[];
        },
        refetchInterval: 5 * 60 * 1000, // Background refresh every 5 minutes
    });

    useEffect(() => {
        if (rotate && ads && ads.length > 1) {
            const interval = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % ads.length);
            }, rotationInterval * 1000);
            return () => clearInterval(interval);
        }
    }, [rotate, ads, rotationInterval]);

    const handleAdClick = async (adId: string) => {
        try {
            console.log('Tracking click for ad:', adId);
            const res = await api.post(`/ads/${adId}/click`);
            console.log('Click response:', res.data);

            if (res.data?.reward > 0) {
                toast.success(`You earned ${res.data.reward} coins!`, {
                    icon: '🪙',
                    style: {
                        background: '#130b2e',
                        color: '#facc15',
                        border: '1px solid #4f46e5'
                    }
                });
            } else {
                toast('Ad Clicked (No Reward Configured)', {
                    icon: 'ℹ️',
                    style: {
                        background: '#130b2e',
                        color: '#9ca3af',
                        border: '1px solid #374151'
                    }
                });
            }
        } catch (error) {
            console.error('Failed to track click:', error);
            toast.error('Failed to track click');
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-4">
                <Loader2 className="animate-spin text-purple-500 opacity-50" size={20} />
            </div>
        );
    }

    const currentAds = rotate && ads && ads.length > 0 ? [ads[currentIndex]] : ads;
    const hasAds = currentAds && currentAds.length > 0;

    // Logic: If there are no ads, normally we return null.
    // BUT if debug mode is on AND user is admin, we show a visualization.
    if (!hasAds && !isAdmin && !isDebugMode) {
        return null;
    }

    if (!hasAds && isAdmin && !isDebugMode) {
        // Old behavior: Admin sees nothing unless "show buy button" (not implemented fully here but standard behavior)
        if (!showBuyButton) return null;
        // If we want to hide "Advertise Here" for admin unless debug is on? 
        // Current logic in previous code was returning null if !currentAds && !isAdmin.
        // So admins WOULD see "Advertise Here" button if showBuyButton was true (it was default true).
        // Let's keep that but add debug overlay.
    }

    // DEBUG MODE OVERLAY
    if (isDebugMode && isAdmin && !hasAds) {
        return (
            <div className={`w-full border-2 border-dashed border-yellow-500/50 bg-yellow-500/10 rounded-lg flex flex-col items-center justify-center p-4 gap-2 ${className} min-h-[100px]`}>
                <ScanEye className="text-yellow-500" />
                <span className="text-yellow-500 font-mono text-xs font-bold">{position}</span>
                <span className="text-yellow-500/50 text-[10px] uppercase">Empty Ad Zone</span>
            </div>
        );
    }

    // If we are here, we either have ads OR we are admin showing "Advertise Here"
    if (!hasAds && !isDebugMode) return null; // Fallback to hide if no ads and not debug

    return (
        <div className={`flex flex-col items-center gap-4 w-full ${className}`}>
            {/* DEBUG LABEL FOR EXISTING ADS */}
            {isDebugMode && isAdmin && (
                <div className="w-full text-center mb-1">
                    <span className="text-[10px] bg-yellow-500 text-black px-1 rounded font-mono">{position}</span>
                </div>
            )}

            <AnimatePresence mode="wait">
                {currentAds && currentAds.length > 0 ? (
                    currentAds.map((ad) => (
                        <motion.div
                            key={`${ad.id}-${currentIndex}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.5 }}
                            className={`relative border border-white/10 rounded-lg ${ad.rawCode ? 'overflow-visible' : 'overflow-hidden'} group transition-all hover:border-purple-500/50 ${sizeClasses[ad.type] || 'w-full h-auto'}`}
                        >
                            {ad.rawCode ? (
                                <RawAdRenderer code={ad.rawCode} />
                            ) : (
                                <a
                                    href={ad.redirectUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => handleAdClick(ad.id)}
                                    className="block w-full h-full"
                                >
                                    <img
                                        src={ad.imageUrl}
                                        alt={ad.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <ExternalLink size={20} className="text-white" />
                                    </div>
                                    <div className="absolute top-1 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-bold text-gray-300 uppercase tracking-widest border border-white/10">
                                        Sponsored
                                    </div>
                                </a>
                            )}
                        </motion.div>
                    ))
                ) : (
                    // This will only show if isDebugMode is false but showBuyButton logic falls through
                    // But we actually handled empty+debug above. This is for empty+no-debug+admin (optional)
                    showBuyButton && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            whileHover={{ opacity: 1 }}
                            onClick={onBuyClick}
                            className="w-full max-w-[728px] h-[60px] border border-dashed border-white/20 rounded-lg flex items-center justify-center gap-2 text-gray-400 hover:text-purple-400 hover:border-purple-500/50 transition-all group"
                        >
                            <Plus size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Advertise Here</span>
                        </motion.button>
                    )
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdZone;
