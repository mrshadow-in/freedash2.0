import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

interface PremiumParallaxProps {
    children: React.ReactNode;
}

const PremiumParallax: React.FC<PremiumParallaxProps> = ({ children }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const prefersReducedMotion = useReducedMotion();

    // Track scroll progress
    const { scrollYProgress } = useScroll();

    // Layer 1: Deep Background (Stars/Gradients) - Moves very slowly
    const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);

    // Layer 2: Midground Elements (Subtle UI blocks) - Moves slightly faster
    const midY = useTransform(scrollYProgress, [0, 1], ['0%', '-30%']);

    // Layer 3: Foreground (Main Content) - Moves naturally but with slight inertia feel
    const fgY = useTransform(scrollYProgress, [0, 1], ['0%', '-5%']);

    // Rotation and scale for a "heavy" premium feel on background blobs
    const bgRotate = useTransform(scrollYProgress, [0, 1], [0, 45]);
    const bgScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.2, 1]);

    // If user prefers reduced motion, disable parallax
    if (prefersReducedMotion) {
        return <div className="relative">{children}</div>;
    }

    return (
        <div ref={containerRef} className="relative min-h-screen overflow-x-hidden">
            {/* Multi-layer Background Parallax */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* Deepest Layer: Main Gradient / Stars */}
                <motion.div
                    style={{ y: bgY, rotate: bgRotate, scale: bgScale, willChange: 'transform' }}
                    className="absolute inset-0 opacity-40"
                >
                    <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-transparent blur-[100px]" />
                </motion.div>

                {/* Mid Layer: Moving Blobs */}
                <motion.div
                    style={{ y: midY, willChange: 'transform' }}
                    className="absolute inset-0"
                >
                    <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[80px]" />
                    <div className="absolute top-[60%] left-[5%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[10%] right-[15%] w-80 h-80 bg-pink-500/10 rounded-full blur-[80px]" />
                </motion.div>
            </div>

            {/* Main Content Layer */}
            <motion.div
                style={{ y: fgY, willChange: 'transform' }}
                className="relative z-10"
            >
                {children}
            </motion.div>

            {/* Floating Premium Accents */}
            <div className="fixed inset-0 pointer-events-none z-20">
                <motion.div
                    style={{
                        y: useTransform(scrollYProgress, [0, 1], ['0%', '-150%']),
                        willChange: 'transform'
                    }}
                    className="absolute top-[15%] left-[2%] w-1 h-32 bg-gradient-to-b from-transparent via-white/10 to-transparent rounded-full"
                />
                <motion.div
                    style={{
                        y: useTransform(scrollYProgress, [0, 1], ['0%', '-200%']),
                        willChange: 'transform'
                    }}
                    className="absolute top-[40%] right-[3%] w-1 h-48 bg-gradient-to-b from-transparent via-blue-400/10 to-transparent rounded-full"
                />

                {/* Glass Ornaments */}
                <motion.div
                    style={{
                        y: useTransform(scrollYProgress, [0, 1], ['0%', '-100%']),
                        rotate: useTransform(scrollYProgress, [0, 1], [0, 90]),
                        willChange: 'transform'
                    }}
                    className="absolute top-[25%] left-[10%] w-16 h-16 border border-white/5 bg-white/5 backdrop-blur-sm rounded-2xl rotate-12"
                />
                <motion.div
                    style={{
                        y: useTransform(scrollYProgress, [0, 1], ['0%', '-300%']),
                        rotate: useTransform(scrollYProgress, [0, 1], [0, -120]),
                        willChange: 'transform'
                    }}
                    className="absolute top-[60%] right-[12%] w-24 h-24 border border-white/5 bg-white/5 backdrop-blur-sm rounded-3xl -rotate-12"
                />
            </div>
        </div>
    );
};

export default PremiumParallax;
