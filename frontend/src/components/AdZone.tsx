import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { Plus, ExternalLink, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

export type AdZonePosition =
    | 'top'
    | 'after-header'
    | 'between-widgets'
    | 'before-servers'
    | 'after-servers'
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
    'full-width': 'w-full h-auto min-h-[100px]'
};

const RawAdRenderer: React.FC<{ code: string }> = ({ code }) => {
    return (
        <div className="w-full h-full flex justify-center items-center overflow-hidden">
            <iframe
                title="Advertisement"
                srcDoc={`
                    <html>
                        <body style="margin: 0; display: flex; justify-content: center; align-items: center; background: transparent;">
                            ${code}
                        </body>
                    </html>
                `}
                className="w-full h-full border-none shadow-none"
                sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
            />
        </div>
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
    const isAdmin = user?.role === 'ADMIN'; // Check if user is admin

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
            await api.post(`/ads/${adId}/click`);
        } catch (error) {
            console.error('Failed to track click:', error);
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

    // ADMIN-ONLY FEATURE: Hide ad placeholders from normal users
    // - Admin users: See "Advertise Here" placeholders to manage ad positions
    // - Normal users: See nothing if no ads exist (clean UI)
    // This applies to ALL pages (Dashboard, AFK, etc.) since AdZone is shared
    if ((!currentAds || currentAds.length === 0) && !isAdmin) {
        return null;
    }

    return (
        <div className={`flex flex-col items-center gap-4 w-full ${className}`}>
            <AnimatePresence mode="wait">
                {currentAds && currentAds.length > 0 ? (
                    currentAds.map((ad) => (
                        <motion.div
                            key={`${ad.id}-${currentIndex}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.5 }}
                            className={`relative border border-white/10 rounded-lg overflow-hidden group transition-all hover:border-purple-500/50 ${sizeClasses[ad.type] || 'w-full h-auto'}`}
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
                ) : showBuyButton && (
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
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdZone;
