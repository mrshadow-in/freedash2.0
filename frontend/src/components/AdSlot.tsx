import React from 'react';

import { Plus, ExternalLink } from 'lucide-react';

export type AdSlotSize = 'leaderboard' | 'banner' | 'square';

interface AdSlotProps {
    id: string;
    size: AdSlotSize;
    activeAd?: {
        imageUrl: string;
        redirectUrl: string;
        title?: string;
    };
    onBuyClick: (slotId: string) => void;
}

const sizeConfig = {
    leaderboard: { width: 'w-[728px]', height: 'h-[90px]', label: '728x90' },
    banner: { width: 'w-[468px]', height: 'h-[60px]', label: '468x60' },
    square: { width: 'w-[300px]', height: 'h-[100px]', label: '300x100' },
};

const AdSlot: React.FC<AdSlotProps> = ({ id, size, activeAd, onBuyClick }) => {
    const config = sizeConfig[size];

    return (
        <div className="flex flex-col items-center gap-1 my-4">
            <div
                className={`relative ${config.width} ${config.height} bg-white/5 border border-dashed border-white/20 rounded-lg overflow-hidden flex items-center justify-center transition-all hover:border-purple-500/50 group`}
            >
                {activeAd ? (
                    <a
                        href={activeAd.redirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-full relative"
                    >
                        <img
                            src={activeAd.imageUrl}
                            alt={activeAd.title || 'Advertisement'}
                            className="w-full h-full object-cover"
                        />
                        {/* Overlay hint for clickable */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink size={20} className="text-white drop-shadow-lg" />
                        </div>
                        {/* Sponsored Label */}
                        <div className="absolute top-1 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-bold text-gray-300 uppercase tracking-widest border border-white/10">
                            Sponsored
                        </div>
                    </a>
                ) : (
                    <button
                        onClick={() => onBuyClick(id)}
                        className="flex flex-col items-center justify-center gap-1 w-full h-full text-gray-500 hover:text-purple-400 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Plus size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Buy Ads Spot</span>
                        </div>
                        <span className="text-[10px] opacity-50">{config.label} Available</span>
                    </button>
                )}
            </div>

            {/* Visual Artifact/Glow behind slot */}
            <div className="absolute -z-10 w-full h-full bg-purple-500/5 blur-[50px] pointer-events-none" />
        </div>
    );
};

export default AdSlot;
