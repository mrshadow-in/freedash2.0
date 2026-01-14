import React, { useState, useEffect } from 'react';
import { MousePointer2, X } from 'lucide-react';


interface VisualAdEditorProps {
    isActive: boolean;
    onClose: () => void;
    onSelect: (selector: string) => void;
}

const VisualAdEditor: React.FC<VisualAdEditorProps> = ({ isActive, onClose, onSelect }) => {
    const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);

    // Generate a unique selector for an element
    const getUniqueSelector = (el: HTMLElement): string => {
        if (el.id) return `#${el.id}`;

        // Try precise classes
        const classes = Array.from(el.classList).filter(c =>
            !c.startsWith('hover:') &&
            !c.startsWith('focus:') &&
            !c.startsWith('active:') &&
            !c.includes('ad-overlay')
        );

        let selector = el.tagName.toLowerCase();
        if (classes.length > 0) {
            selector += `.${classes.join('.')}`;
        }

        // Add nth-child if needed for uniqueness
        const siblings = el.parentElement?.children;
        if (siblings && siblings.length > 1) {
            const index = Array.from(siblings).indexOf(el) + 1;
            selector += `:nth-child(${index})`;
        }

        // Add parent context if simple selector is too generic
        if (el.parentElement && el.parentElement.tagName !== 'BODY') {
            const parentSelector = getUniqueSelector(el.parentElement);
            return `${parentSelector} > ${selector}`;
        }

        return selector;
    };

    useEffect(() => {
        if (!isActive) return;

        const handleMouseOver = (e: MouseEvent) => {
            e.stopPropagation();
            setHoveredElement(e.target as HTMLElement);
        };

        const handleClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const target = e.target as HTMLElement;
            const selector = getUniqueSelector(target);
            onSelect(selector);
            onClose(); // Exit mode after selection
        };

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('click', handleClick, true); // Capture phase

        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('click', handleClick, true);
        };
    }, [isActive, onClose, onSelect]);

    if (!isActive) return null;

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
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                >
                    <X size={20} />
                </button>
            </div>
        </>
    );
};

export default VisualAdEditor;
