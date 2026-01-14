import React, { useState, useEffect } from 'react';
import { MousePointer2, X } from 'lucide-react';
import { useAdStore } from '../store/adStore';

const VisualAdEditor: React.FC = () => {
    const { isVisualMode, setVisualMode, setActiveSelector, setAdModalOpen } = useAdStore();
    const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);

    // Generate a robust structural selector (Path-based)
    const getUniqueSelector = (el: HTMLElement): string => {
        if (el.id) return `#${CSS.escape(el.id)}`;
        if (el.tagName.toLowerCase() === 'body') return 'body';
        if (el.tagName.toLowerCase() === 'html') return 'html';

        // Get index among siblings of same type
        const siblings = Array.from(el.parentElement?.children || []);
        const sameTypeSiblings = siblings.filter(s => s.tagName === el.tagName);
        const index = sameTypeSiblings.indexOf(el) + 1;

        const tagName = el.tagName.toLowerCase();
        const selector = sameTypeSiblings.length > 1 ? `${tagName}:nth-of-type(${index})` : tagName;

        // Recurse up to parent
        if (el.parentElement) {
            const parentSelector = getUniqueSelector(el.parentElement);
            return `${parentSelector} > ${selector}`;
        }

        return selector;
    };

    useEffect(() => {
        if (!isVisualMode) return;

        const handleMouseOver = (e: MouseEvent) => {
            e.stopPropagation();
            setHoveredElement(e.target as HTMLElement);
        };

        const handleClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const target = e.target as HTMLElement;
            const selector = getUniqueSelector(target);

            // Global State Update
            setActiveSelector(selector);
            setVisualMode(false); // Turn off visual mode
            setAdModalOpen(true); // Open the creation modal

        };

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('click', handleClick, true); // Capture phase

        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('click', handleClick, true);
        };
    }, [isVisualMode, setVisualMode, setActiveSelector, setAdModalOpen]);

    if (!isVisualMode) return null;

    return (
        <>
            {/* Visual Highlight Overlay */}
            {hoveredElement && (
                <div
                    style={{
                        position: 'fixed',
                        top: hoveredElement.getBoundingClientRect().top,
                        left: hoveredElement.getBoundingClientRect().left,
                        width: hoveredElement.getBoundingClientRect().width,
                        height: hoveredElement.getBoundingClientRect().height,
                        border: '2px solid #a855f7', // Purple
                        backgroundColor: 'rgba(168, 85, 247, 0.2)',
                        pointerEvents: 'none',
                        zIndex: 99999,
                        transition: 'all 0.1s ease'
                    }}
                />
            )}

            {/* Floating Control Panel */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 border border-purple-500/50 rounded-full px-6 py-3 shadow-2xl z-[100000] flex items-center gap-4">
                <div className="flex items-center gap-2 text-purple-400 animate-pulse">
                    <MousePointer2 size={20} />
                    <span className="font-bold">Select an element to place ad</span>
                </div>
                <button
                    onClick={() => setVisualMode(false)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                >
                    <X size={20} />
                </button>
            </div>
        </>
    );
};

export default VisualAdEditor;
